const { reqBody, makeJWT } = require("../utils/http");
const { User } = require("../models/user");
const { OAuthAccount } = require("../models/oauthAccount");
const { Workspace } = require("../models/workspace");
const { WorkspaceUser } = require("../models/workspaceUsers");
const { EventLogs } = require("../models/eventLogs");
const { Telemetry } = require("../models/telemetry");
const { SystemSettings } = require("../models/systemSettings");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const crypto = require("crypto");

// In-memory store for OAuth state tokens (use Redis in production)
const oauthStates = new Map();
// Track processed authorization codes to prevent duplicate processing
const processedAuthCodes = new Map();
// Mutex lock for processing authorization codes
const processingLocks = new Map();

function authEndpoints(app) {
  if (!app) return;

  /**
   * Sign up with email and password
   */
  app.post("/auth/signup", async (request, response) => {
    try {
      const { username, email, password } = reqBody(request);

      if (!username || !email || !password) {
        response.status(400).json({
          success: false,
          error: "Username, email, and password are required",
        });
        return;
      }

      // Check if user already exists
      const existingUser = await User.get({ username });
      if (existingUser) {
        response.status(400).json({
          success: false,
          error: "Username already exists",
        });
        return;
      }

      const existingEmail = await User.getByEmail(email);
      if (existingEmail) {
        response.status(400).json({
          success: false,
          error: "Email already registered",
        });
        return;
      }

      // Create user with free tier
      const { user, error } = await User.create({
        username,
        email,
        password,
        role: "default",
        subscriptionTier: "free",
        emailVerified: false,
      });

      if (error) {
        response.status(400).json({
          success: false,
          error,
        });
        return;
      }

      // Assign user to all workspaces
      await assignUserToAllWorkspaces(user.id);

      // Create JWT token
      const token = makeJWT(
        { id: user.id, username: user.username },
        "30d"
      );

      await EventLogs.logEvent(
        "user_signup",
        {
          method: "email",
          username: user.username,
          email: user.email,
        },
        user.id
      );

      await Telemetry.sendTelemetry("user_signup", {
        method: "email",
      });

      response.status(200).json({
        success: true,
        user,
        token,
        message: "Account created successfully",
      });
    } catch (error) {
      console.error("Signup error:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  /**
   * Initiate Google OAuth flow
   */
  app.get("/auth/google", async (request, response) => {
    try {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 
        `${request.protocol}://${request.get("host")}/api/auth/google/callback`;

      if (!googleClientId) {
        response.status(500).json({
          error: "Google OAuth is not configured",
        });
        return;
      }

      // Generate state token for CSRF protection
      const state = crypto.randomBytes(32).toString("hex");
      oauthStates.set(state, { createdAt: Date.now() });

      // Clean up old states (older than 10 minutes)
      for (const [key, value] of oauthStates.entries()) {
        if (Date.now() - value.createdAt > 10 * 60 * 1000) {
          oauthStates.delete(key);
        }
      }

      const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      googleAuthUrl.searchParams.append("client_id", googleClientId);
      googleAuthUrl.searchParams.append("redirect_uri", googleRedirectUri);
      googleAuthUrl.searchParams.append("response_type", "code");
      googleAuthUrl.searchParams.append("scope", "openid email profile");
      googleAuthUrl.searchParams.append("state", state);
      googleAuthUrl.searchParams.append("access_type", "offline");
      googleAuthUrl.searchParams.append("prompt", "consent");

      response.redirect(googleAuthUrl.toString());
    } catch (error) {
      console.error("Google OAuth initiation error:", error);
      response.status(500).json({
        error: "Failed to initiate Google authentication",
      });
    }
  });

  /**
   * Google OAuth callback
   */
  app.get("/auth/google/callback", async (request, response) => {
    // Prevent caching of this endpoint
    response.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    try {
      const { code, state, error: oauthError } = request.query;

      if (oauthError) {
        return response.redirect(`/login?error=${encodeURIComponent(oauthError)}`);
      }

      // Verify state token
      if (!state || !oauthStates.has(state)) {
        return response.redirect("/login?error=invalid_state");
      }
      oauthStates.delete(state);

      if (!code) {
        return response.redirect("/login?error=no_code");
      }

      // Critical Section: Acquire lock for this authorization code
      // If code is already being processed or has been processed, reject immediately
      if (processingLocks.has(code) || processedAuthCodes.has(code)) {
        const lockInfo = processingLocks.get(code);
        const processedInfo = processedAuthCodes.get(code);
        console.log("Google OAuth: BLOCKED - Duplicate authorization code detected:", {
          code: code?.substring(0, 10) + "...",
          isLocked: processingLocks.has(code),
          isProcessed: processedAuthCodes.has(code),
          lockTime: lockInfo ? new Date(lockInfo).toISOString() : null,
          processedTime: processedInfo ? new Date(processedInfo.timestamp).toISOString() : null,
          timeSinceLock: lockInfo ? Date.now() - lockInfo + "ms" : null
        });
        return response.redirect("/login?error=google_auth_expired");
      }
      
      // IMMEDIATELY acquire lock (synchronous operation)
      processingLocks.set(code, Date.now());
      console.log("Google OAuth: LOCK ACQUIRED for code:", code?.substring(0, 10) + "...");
      
      // Mark as processed after acquiring lock
      processedAuthCodes.set(code, { 
        timestamp: Date.now(), 
        processing: true 
      });
      
      // Clean up old locks and processed codes (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      for (const [authCode, lockTime] of processingLocks.entries()) {
        if (lockTime < fiveMinutesAgo) {
          processingLocks.delete(authCode);
        }
      }
      for (const [authCode, info] of processedAuthCodes.entries()) {
        if (info.timestamp < fiveMinutesAgo) {
          processedAuthCodes.delete(authCode);
        }
      }
      
      console.log("Google OAuth: Processing authorization code:", {
        code: code?.substring(0, 10) + "...",
        totalLocked: processingLocks.size,
        totalProcessed: processedAuthCodes.size
      });

      // Exchange code for tokens
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
        `${request.protocol}://${request.get("host")}/api/auth/google/callback`;
      
      console.log("Google OAuth token exchange request:", {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET?.substring(0, 10) + "...",
        redirect_uri: redirectUri,
        code: code?.substring(0, 10) + "...",
      });

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        console.error("Google OAuth token exchange failed:", {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          tokens,
          code: code?.substring(0, 10) + "..."
        });
        
        // Remove from processed list to allow retry if it's a temporary error
        if (tokens.error !== 'invalid_grant') {
          processedAuthCodes.delete(code);
          console.log("Google OAuth: Removed failed code from processed list for retry");
        }
        
        // Provide more specific error messages
        const errorMsg = tokens.error === 'invalid_grant' 
          ? 'google_auth_expired' 
          : tokens.error === 'invalid_client'
          ? 'google_config_error'
          : 'token_exchange_failed';
        
        return response.redirect(`/login?error=${errorMsg}`);
      }

      // Get user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      );

      const googleUser = await userInfoResponse.json();

      if (!googleUser.email) {
        return response.redirect("/login?error=no_email");
      }

      // Check if OAuth account exists
      let oauthAccount = await OAuthAccount.findByProvider("google", googleUser.id);
      let user;

      if (oauthAccount) {
        // Existing user - update tokens
        await OAuthAccount.upsert({
          userId: oauthAccount.userId,
          provider: "google",
          providerId: googleUser.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          email: googleUser.email,
          profile: googleUser,
        });

        user = await User.get({ id: oauthAccount.userId });
      } else {
        // Check if user exists with this email
        user = await User.getByEmail(googleUser.email);

        if (user) {
          // Link OAuth account to existing user
          await OAuthAccount.upsert({
            userId: user.id,
            provider: "google",
            providerId: googleUser.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000)
              : null,
            email: googleUser.email,
            profile: googleUser,
          });
        } else {
          // Create new user
          const username = googleUser.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_\-.]/g, "");
          let uniqueUsername = username;
          let counter = 1;

          // Ensure unique username
          while (await User.get({ username: uniqueUsername })) {
            uniqueUsername = `${username}${counter}`;
            counter++;
          }

          const { user: newUser, error } = await User.create({
            username: uniqueUsername,
            email: googleUser.email,
            password: null, // OAuth users don't have passwords
            role: "default",
            subscriptionTier: "free",
            emailVerified: googleUser.verified_email || false,
          });

          if (error) {
            return response.redirect(`/login?error=${encodeURIComponent(error)}`);
          }

          user = newUser;

          // Create OAuth account link
          await OAuthAccount.upsert({
            userId: user.id,
            provider: "google",
            providerId: googleUser.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000)
              : null,
            email: googleUser.email,
            profile: googleUser,
          });

          // Assign user to all workspaces
          await assignUserToAllWorkspaces(user.id);

          await EventLogs.logEvent(
            "user_signup",
            {
              method: "google_oauth",
              email: googleUser.email,
            },
            user.id
          );

          await Telemetry.sendTelemetry("user_signup", {
            method: "google_oauth",
          });
        }
      }

      // Create JWT token
      const token = makeJWT(
        { id: user.id, username: user.username },
        "30d"
      );

      await EventLogs.logEvent(
        "login_event",
        {
          method: "google_oauth",
          email: googleUser.email,
        },
        user.id
      );

      // Redirect to frontend with token
      // Add timestamp to prevent browser caching/deduplication
      console.log("Google OAuth: SUCCESS - Releasing lock for code:", code?.substring(0, 10) + "...");
      processingLocks.delete(code); // Release lock after successful processing
      response.redirect(`/login?token=${token}&success=true&_t=${Date.now()}`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      // Release lock on error to allow retry
      if (code) {
        processingLocks.delete(code);
        console.log("Google OAuth: ERROR - Released lock for code:", code?.substring(0, 10) + "...");
      }
      response.redirect("/login?error=authentication_failed");
    }
  });

  /**
   * Get current user info
   */
  app.get("/auth/me", [validatedRequest], async (request, response) => {
    try {
      const { userFromSession } = require("../utils/http");
      const user = await userFromSession(request, response);

      if (!user) {
        response.status(401).json({
          success: false,
          error: "Not authenticated",
        });
        return;
      }

      response.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Get user error:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
}

/**
 * Assign a user to all existing workspaces
 * @param {number} userId - User ID
 */
async function assignUserToAllWorkspaces(userId) {
  try {
    const workspaces = await Workspace.where({});
    
    for (const workspace of workspaces) {
      await WorkspaceUser.create(userId, workspace.id);
    }

    console.log(`Assigned user ${userId} to ${workspaces.length} workspaces`);
  } catch (error) {
    console.error("Failed to assign user to workspaces:", error);
  }
}

module.exports = { authEndpoints };
