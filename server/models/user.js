const prisma = require("../utils/prisma");
const { EventLogs } = require("./eventLogs");

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {string} password
 * @property {string} pfpFilename
 * @property {string} role
 * @property {boolean} suspended
 * @property {number|null} dailyMessageLimit
 */

const User = {
  usernameRegex: new RegExp(/^[a-z0-9_\-.]+$/),
  writable: [
    // Used for generic updates so we can validate keys in request body
    "username",
    "password",
    "pfpFilename",
    "role",
    "suspended",
    "dailyMessageLimit",
    "bio",
    "email",
    "emailVerified",
    "subscriptionTier",
    "subscriptionStatus",
  ],
  validations: {
    username: (newValue = "") => {
      try {
        if (String(newValue).length > 100)
          throw new Error("Username cannot be longer than 100 characters");
        if (String(newValue).length < 2)
          throw new Error("Username must be at least 2 characters");
        return String(newValue);
      } catch (e) {
        throw new Error(e.message);
      }
    },
    role: (role = "default") => {
      const VALID_ROLES = ["default", "admin", "manager"];
      if (!VALID_ROLES.includes(role)) {
        throw new Error(
          `Invalid role. Allowed roles are: ${VALID_ROLES.join(", ")}`
        );
      }
      return String(role);
    },
    dailyMessageLimit: (dailyMessageLimit = null) => {
      if (dailyMessageLimit === null) return null;
      const limit = Number(dailyMessageLimit);
      if (isNaN(limit) || limit < 1) {
        throw new Error(
          "Daily message limit must be null or a number greater than or equal to 1"
        );
      }
      return limit;
    },
    bio: (bio = "") => {
      if (!bio || typeof bio !== "string") return "";
      if (bio.length > 1000)
        throw new Error("Bio cannot be longer than 1,000 characters");
      return String(bio);
    },
    email: (email = "") => {
      if (!email || typeof email !== "string") return null;
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }
      return String(email).toLowerCase();
    },
    emailVerified: (verified = false) => {
      return Boolean(verified);
    },
    subscriptionTier: (tier = "free") => {
      const validTiers = ["free", "premium"];
      if (!validTiers.includes(tier)) return "free";
      return String(tier);
    },
    subscriptionStatus: (status = "active") => {
      const validStatuses = ["active", "cancelled", "expired", "past_due"];
      if (!validStatuses.includes(status)) return "active";
      return String(status);
    },
  },
  // validations for the above writable fields.
  castColumnValue: function (key, value) {
    switch (key) {
      case "suspended":
        return Number(Boolean(value));
      case "dailyMessageLimit":
        return value === null ? null : Number(value);
      default:
        return String(value);
    }
  },

  filterFields: function (user = {}) {
    const { password, ...rest } = user;
    return { ...rest };
  },

  create: async function ({
    username,
    password = null,
    role = "default",
    dailyMessageLimit = null,
    bio = "",
    email = null,
    emailVerified = false,
    subscriptionTier = "free",
  }) {
    // Password is optional for OAuth users
    if (password) {
      const passwordCheck = this.checkPasswordComplexity(password);
      if (!passwordCheck.checkedOK) {
        return { user: null, error: passwordCheck.error };
      }
    }

    try {
      // Username validation - optional for OAuth users initially
      if (username && !this.usernameRegex.test(username))
        throw new Error(
          "Username must only contain lowercase letters, periods, numbers, underscores, and hyphens with no spaces"
        );

      const bcrypt = require("bcrypt");
      const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;
      
      // Get subscription plan limits
      const { SubscriptionPlan } = require("./subscriptionPlan");
      const plan = await SubscriptionPlan.getByName(subscriptionTier);
      const planDailyLimit = plan?.dailyMessageLimit || null;

      const user = await prisma.users.create({
        data: {
          username: username ? this.validations.username(username) : null,
          password: hashedPassword,
          role: this.validations.role(role),
          bio: this.validations.bio(bio),
          email: email ? this.validations.email(email) : null,
          emailVerified: Boolean(emailVerified),
          subscriptionTier: this.validations.subscriptionTier(subscriptionTier),
          subscriptionStatus: "active",
          dailyMessageLimit: dailyMessageLimit !== null ? 
            this.validations.dailyMessageLimit(dailyMessageLimit) : planDailyLimit,
        },
      });
      return { user: this.filterFields(user), error: null };
    } catch (error) {
      console.error("FAILED TO CREATE USER.", error.message);
      return { user: null, error: error.message };
    }
  },
  // Log the changes to a user object, but omit sensitive fields
  // that are not meant to be logged.
  loggedChanges: function (updates, prev = {}) {
    const changes = {};
    const sensitiveFields = ["password"];

    Object.keys(updates).forEach((key) => {
      if (!sensitiveFields.includes(key) && updates[key] !== prev[key]) {
        changes[key] = `${prev[key]} => ${updates[key]}`;
      }
    });

    return changes;
  },

  update: async function (userId, updates = {}) {
    try {
      if (!userId) throw new Error("No user id provided for update");
      const currentUser = await prisma.users.findUnique({
        where: { id: parseInt(userId) },
      });
      if (!currentUser) return { success: false, error: "User not found" };
      // Removes non-writable fields for generic updates
      // and force-casts to the proper type;
      Object.entries(updates).forEach(([key, value]) => {
        if (this.writable.includes(key)) {
          if (this.validations.hasOwnProperty(key)) {
            updates[key] = this.validations[key](
              this.castColumnValue(key, value)
            );
          } else {
            updates[key] = this.castColumnValue(key, value);
          }
          return;
        }
        delete updates[key];
      });

      if (Object.keys(updates).length === 0)
        return { success: false, error: "No valid updates applied." };

      // Handle password specific updates
      if (updates.hasOwnProperty("password")) {
        const passwordCheck = this.checkPasswordComplexity(updates.password);
        if (!passwordCheck.checkedOK) {
          return { success: false, error: passwordCheck.error };
        }
        const bcrypt = require("bcrypt");
        updates.password = bcrypt.hashSync(updates.password, 10);
      }

      if (
        updates.hasOwnProperty("username") &&
        currentUser.username !== updates.username &&
        !this.usernameRegex.test(updates.username)
      )
        return {
          success: false,
          error:
            "Username must only contain lowercase letters, periods, numbers, underscores, and hyphens with no spaces",
        };

      const user = await prisma.users.update({
        where: { id: parseInt(userId) },
        data: updates,
      });

      await EventLogs.logEvent(
        "user_updated",
        {
          username: user.username,
          changes: this.loggedChanges(updates, currentUser),
        },
        userId
      );
      return { success: true, error: null };
    } catch (error) {
      console.error(error.message);
      return { success: false, error: error.message };
    }
  },

  // Explicit direct update of user object.
  // Only use this method when directly setting a key value
  // that takes no user input for the keys being modified.
  _update: async function (id = null, data = {}) {
    if (!id) throw new Error("No user id provided for update");

    try {
      const user = await prisma.users.update({
        where: { id },
        data,
      });
      return { user, message: null };
    } catch (error) {
      console.error(error.message);
      return { user: null, message: error.message };
    }
  },

  /**
   * Returns a user object based on the clause provided.
   * @param {Object} clause - The clause to use to find the user.
   * @returns {Promise<import("@prisma/client").users|null>} The user object or null if not found.
   */
  get: async function (clause = {}) {
    try {
      const user = await prisma.users.findFirst({ where: clause });
      return user ? this.filterFields({ ...user }) : null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },
  // Returns user object with all fields
  _get: async function (clause = {}) {
    try {
      const user = await prisma.users.findFirst({ where: clause });
      return user ? { ...user } : null;
    } catch (error) {
      console.error(error.message);
      return null;
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.users.count({ where: clause });
      return count;
    } catch (error) {
      console.error(error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.users.deleteMany({ where: clause });
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  },

  where: async function (clause = {}, limit = null) {
    try {
      const users = await prisma.users.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
      });
      return users.map((usr) => this.filterFields(usr));
    } catch (error) {
      console.error(error.message);
      return [];
    }
  },

  checkPasswordComplexity: function (passwordInput = "") {
    const passwordComplexity = require("joi-password-complexity");
    // Can be set via ENV variable on boot. No frontend config at this time.
    // Docs: https://www.npmjs.com/package/joi-password-complexity
    const complexityOptions = {
      min: process.env.PASSWORDMINCHAR || 8,
      max: process.env.PASSWORDMAXCHAR || 250,
      lowerCase: process.env.PASSWORDLOWERCASE || 0,
      upperCase: process.env.PASSWORDUPPERCASE || 0,
      numeric: process.env.PASSWORDNUMERIC || 0,
      symbol: process.env.PASSWORDSYMBOL || 0,
      // reqCount should be equal to how many conditions you are testing for (1-4)
      requirementCount: process.env.PASSWORDREQUIREMENTS || 0,
    };

    const complexityCheck = passwordComplexity(
      complexityOptions,
      "password"
    ).validate(passwordInput);
    if (complexityCheck.hasOwnProperty("error")) {
      let myError = "";
      let prepend = "";
      for (let i = 0; i < complexityCheck.error.details.length; i++) {
        myError += prepend + complexityCheck.error.details[i].message;
        prepend = ", ";
      }
      return { checkedOK: false, error: myError };
    }

    return { checkedOK: true, error: "No error." };
  },

  /**
   * Check if a user can send a chat based on their daily message limit.
   * This limit is system wide and not per workspace and only applies to
   * multi-user mode AND non-admin users.
   * @param {User} user The user object record.
   * @returns {Promise<boolean>} True if the user can send a chat, false otherwise.
   */
  canSendChat: async function (user) {
    const { ROLES } = require("../utils/middleware/multiUserProtected");
    if (!user || user.role === ROLES.admin)
      return true;

    // Check subscription status
    if (user.subscriptionStatus !== "active") {
      return false;
    }

    // Premium users have unlimited messages
    if (user.subscriptionTier === "premium") {
      return true;
    }

    // Free tier users have daily limits
    if (user.dailyMessageLimit === null) {
      return true; // No limit set
    }

    const { UsageLog } = require("./usageLog");
    const currentChatCount = await UsageLog.getDailyMessageCount(user.id);

    return currentChatCount < user.dailyMessageLimit;
  },

  /**
   * Check if a user can upload documents in chat
   * @param {User} user The user object record.
   * @returns {boolean} True if the user can upload documents, false otherwise.
   */
  canUploadDocuments: function (user) {
    const { ROLES } = require("../utils/middleware/multiUserProtected");
    if (!user) return false;
    
    // Admins can always upload
    if (user.role === ROLES.admin) return true;

    // Check subscription tier
    return user.subscriptionTier === "premium" && user.subscriptionStatus === "active";
  },

  /**
   * Update user subscription
   * @param {number} userId - User ID
   * @param {string} tier - Subscription tier
   * @param {string} status - Subscription status
   * @param {Object} additionalData - Additional subscription data
   * @returns {Promise<Object>}
   */
  updateSubscription: async function (userId, tier, status = "active", additionalData = {}) {
    try {
      const { SubscriptionPlan } = require("./subscriptionPlan");
      const plan = await SubscriptionPlan.getByName(tier);
      
      if (!plan) {
        return { success: false, error: "Invalid subscription tier" };
      }

      const updateData = {
        subscriptionTier: tier,
        subscriptionStatus: status,
        dailyMessageLimit: plan.dailyMessageLimit,
        ...additionalData,
      };

      const result = await this._update(parseInt(userId), updateData);
      
      if (result.user) {
        await EventLogs.logEvent(
          "subscription_updated",
          {
            tier,
            status,
            userId,
          },
          userId
        );
      }

      return { success: !!result.user, error: result.message };
    } catch (error) {
      console.error("FAILED TO UPDATE SUBSCRIPTION.", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  getByEmail: async function (email) {
    try {
      const user = await prisma.users.findFirst({
        where: { email: email.toLowerCase() },
      });
      return user ? this.filterFields({ ...user }) : null;
    } catch (error) {
      console.error("FAILED TO GET USER BY EMAIL.", error.message);
      return null;
    }
  },

  /**
   * Find user by email (with password)
   * @param {string} email - User email
   * @returns {Promise<Object|null>}
   */
  _getByEmail: async function (email) {
    try {
      const user = await prisma.users.findFirst({
        where: { email: email.toLowerCase() },
      });
      return user ? { ...user } : null;
    } catch (error) {
      console.error("FAILED TO GET USER BY EMAIL.", error.message);
      return null;
    }
  },
};

module.exports = { User };
