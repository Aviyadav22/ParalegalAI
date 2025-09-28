const { EventLogs } = require("../models/eventLogs");
const { User } = require("../models/user");
const { EmailVerification } = require("../models/emailVerification");
const { EmailService } = require("../utils/EmailService");
const { reqBody } = require("../utils/http");
const { SystemSettings } = require("../models/systemSettings");
const { WorkspaceUser } = require("../models/workspaceUsers");
const prisma = require("../utils/prisma");

const emailService = new EmailService();

// Function to auto-enroll user in all existing workspaces
async function autoEnrollUserInAllWorkspaces(userId) {
  try {
    // Get all existing workspaces
    const workspaces = await prisma.workspaces.findMany({
      select: { id: true }
    });
    
    if (workspaces.length === 0) {
      console.log("No workspaces found to enroll user in");
      return { success: true, workspacesEnrolled: 0 };
    }

    // Extract workspace IDs
    const workspaceIds = workspaces.map(workspace => workspace.id);
    
    // Enroll user in all workspaces
    await WorkspaceUser.createMany(userId, workspaceIds);
    
    console.log(`User ${userId} enrolled in ${workspaceIds.length} workspaces`);
    return { success: true, workspacesEnrolled: workspaceIds.length };
  } catch (error) {
    console.error("Failed to auto-enroll user in workspaces:", error);
    return { success: false, error: error.message };
  }
}

function registrationEndpoints(app) {
  if (!app) return;

  // Public registration endpoint
  app.post("/register", async (request, response) => {
    try {
      // Check if multi-user mode is enabled
      const multiUserMode = await SystemSettings.isMultiUserMode();
      if (!multiUserMode) {
        response.status(403).json({
          success: false,
          error: "Registration is only available in multi-user mode",
        });
        return;
      }

      const { email, password, username } = reqBody(request);

      // Validate required fields
      if (!email || !password) {
        response.status(400).json({
          success: false,
          error: "Email and password are required",
        });
        return;
      }

      // Validate email format
      if (!User.isValidEmail(email)) {
        response.status(400).json({
          success: false,
          error: "Invalid email format",
        });
        return;
      }

      // Create user account
      const { user, error } = await User.create({
        email,
        username: username || null,
        password,
        role: "default",
        emailVerified: false,
      });

      if (!user) {
        response.status(400).json({
          success: false,
          error: error || "Failed to create user account",
        });
        return;
      }

      // Auto-enroll user in all existing workspaces
      const enrollmentResult = await autoEnrollUserInAllWorkspaces(user.id);
      if (!enrollmentResult.success) {
        console.warn("Failed to auto-enroll user in workspaces:", enrollmentResult.error);
        // Don't fail registration if workspace enrollment fails
      }

      // Create email verification token
      const { token: verificationToken, error: tokenError } = await EmailVerification.create({
        userId: user.id,
        email: user.email,
      });

      if (tokenError) {
        // If we can't create a verification token, delete the user
        await User.delete({ id: user.id });
        response.status(500).json({
          success: false,
          error: "Failed to create verification token",
        });
        return;
      }

      // Send verification email
      const emailResult = await emailService.sendVerificationEmail({
        to: user.email,
        token: verificationToken.token,
        username: user.username || user.email,
      });

      // Log the registration event
      await EventLogs.logEvent(
        "user_registered",
        {
          email: user.email,
          username: user.username,
          emailSent: emailResult.success,
          workspacesEnrolled: enrollmentResult.workspacesEnrolled || 0,
        },
        user.id
      );

      response.status(201).json({
        success: true,
        message: "Account created successfully. Please check your email to verify your account.",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          email_verified: user.email_verified,
        },
        emailSent: emailResult.success,
        workspacesEnrolled: enrollmentResult.workspacesEnrolled || 0,
      });
    } catch (error) {
      console.error("Registration error:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Email verification endpoint
  app.post("/verify-email", async (request, response) => {
    try {
      const { token } = reqBody(request);

      if (!token) {
        response.status(400).json({
          success: false,
          error: "Verification token is required",
        });
        return;
      }

      const { success, user, error } = await EmailVerification.verify({ token });

      if (!success) {
        response.status(400).json({
          success: false,
          error: error || "Invalid verification token",
        });
        return;
      }

      // Log the verification event
      await EventLogs.logEvent(
        "email_verified",
        {
          email: user.email,
          username: user.username,
        },
        user.id
      );

      response.status(200).json({
        success: true,
        message: "Email verified successfully",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          email_verified: true,
        },
      });
    } catch (error) {
      console.error("Email verification error:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Resend verification email endpoint
  app.post("/resend-verification", async (request, response) => {
    try {
      const { email } = reqBody(request);

      if (!email) {
        response.status(400).json({
          success: false,
          error: "Email is required",
        });
        return;
      }

      // Find user by email
      const user = await User._get({ email: email.toLowerCase() });
      if (!user) {
        response.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      if (user.email_verified) {
        response.status(400).json({
          success: false,
          error: "Email is already verified",
        });
        return;
      }

      // Resend verification email
      const { success, token, error } = await EmailVerification.resend({
        userId: user.id,
        email: user.email,
      });

      if (!success) {
        response.status(500).json({
          success: false,
          error: error || "Failed to resend verification email",
        });
        return;
      }

      // Send email
      const emailResult = await emailService.sendVerificationEmail({
        to: user.email,
        token,
        username: user.username || user.email,
      });

      response.status(200).json({
        success: true,
        message: "Verification email sent successfully",
        emailSent: emailResult.success,
      });
    } catch (error) {
      console.error("Resend verification error:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Check if email is available
  app.post("/check-email", async (request, response) => {
    try {
      const { email } = reqBody(request);

      if (!email) {
        response.status(400).json({
          success: false,
          error: "Email is required",
        });
        return;
      }

      if (!User.isValidEmail(email)) {
        response.status(400).json({
          success: false,
          error: "Invalid email format",
        });
        return;
      }

      const existingUser = await User._get({ email: email.toLowerCase() });
      const available = !existingUser;

      response.status(200).json({
        success: true,
        available,
        message: available ? "Email is available" : "Email is already registered",
      });
    } catch (error) {
      console.error("Check email error:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

  // Check if username is available
  app.post("/check-username", async (request, response) => {
    try {
      const { username } = reqBody(request);

      if (!username) {
        response.status(400).json({
          success: false,
          error: "Username is required",
        });
        return;
      }

      if (!User.usernameRegex.test(username)) {
        response.status(400).json({
          success: false,
          error: "Invalid username format",
        });
        return;
      }

      const existingUser = await User._get({ username });
      const available = !existingUser;

      response.status(200).json({
        success: true,
        available,
        message: available ? "Username is available" : "Username is already taken",
      });
    } catch (error) {
      console.error("Check username error:", error);
      response.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
}

module.exports = { registrationEndpoints };
