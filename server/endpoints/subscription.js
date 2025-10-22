const { reqBody, userFromSession } = require("../utils/http");
const { User } = require("../models/user");
const { SubscriptionPlan } = require("../models/subscriptionPlan");
const { UsageLog } = require("../models/usageLog");
const { EventLogs } = require("../models/eventLogs");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { ROLES } = require("../utils/middleware/multiUserProtected");

function subscriptionEndpoints(app) {
  if (!app) return;

  /**
   * Get all available subscription plans
   */
  app.get("/subscription/plans", async (request, response) => {
    try {
      const plans = await SubscriptionPlan.getAll();
      
      // Parse features JSON for each plan
      const formattedPlans = plans.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : [],
      }));

      response.status(200).json({
        success: true,
        plans: formattedPlans,
      });
    } catch (error) {
      console.error("Get plans error:", error);
      response.status(500).json({
        success: false,
        error: "Failed to fetch subscription plans",
      });
    }
  });

  /**
   * Get current user's subscription info
   */
  app.get("/subscription/current", [validatedRequest], async (request, response) => {
    try {
      const user = await userFromSession(request, response);

      if (!user) {
        response.status(401).json({
          success: false,
          error: "Not authenticated",
        });
        return;
      }

      const plan = await SubscriptionPlan.getByName(user.subscriptionTier);

      response.status(200).json({
        success: true,
        subscription: {
          tier: user.subscriptionTier,
          status: user.subscriptionStatus,
          dailyMessageLimit: user.dailyMessageLimit,
          endsAt: user.subscriptionEndsAt,
          plan: plan ? {
            ...plan,
            features: plan.features ? JSON.parse(plan.features) : [],
          } : null,
        },
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      response.status(500).json({
        success: false,
        error: "Failed to fetch subscription",
      });
    }
  });

  /**
   * Get user's usage statistics
   */
  app.get("/subscription/usage", [validatedRequest], async (request, response) => {
    try {
      const user = await userFromSession(request, response);

      if (!user) {
        response.status(401).json({
          success: false,
          error: "Not authenticated",
        });
        return;
      }

      const stats = await UsageLog.getStats(user.id, 30);
      const dailyCount = await UsageLog.getDailyMessageCount(user.id);

      response.status(200).json({
        success: true,
        usage: {
          ...stats,
          messagesToday: dailyCount,
          dailyLimit: user.dailyMessageLimit,
          remainingToday: user.dailyMessageLimit 
            ? Math.max(0, user.dailyMessageLimit - dailyCount)
            : null,
        },
      });
    } catch (error) {
      console.error("Get usage error:", error);
      response.status(500).json({
        success: false,
        error: "Failed to fetch usage statistics",
      });
    }
  });

  /**
   * Upgrade/downgrade subscription (admin only for now)
   * In production, this would integrate with Stripe
   */
  app.post("/subscription/update", [validatedRequest], async (request, response) => {
    try {
      const user = await userFromSession(request, response);

      if (!user) {
        response.status(401).json({
          success: false,
          error: "Not authenticated",
        });
        return;
      }

      const { tier } = reqBody(request);

      if (!tier || !["free", "premium"].includes(tier)) {
        response.status(400).json({
          success: false,
          error: "Invalid subscription tier",
        });
        return;
      }

      // For now, allow users to upgrade themselves
      // In production, this would go through Stripe payment flow
      const result = await User.updateSubscription(user.id, tier, "active");

      if (!result.success) {
        response.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      await EventLogs.logEvent(
        "subscription_changed",
        {
          from: user.subscriptionTier,
          to: tier,
        },
        user.id
      );

      response.status(200).json({
        success: true,
        message: "Subscription updated successfully",
      });
    } catch (error) {
      console.error("Update subscription error:", error);
      response.status(500).json({
        success: false,
        error: "Failed to update subscription",
      });
    }
  });

  /**
   * Admin endpoint to manage user subscriptions
   */
  app.post("/subscription/admin/update", [validatedRequest], async (request, response) => {
    try {
      const adminUser = await userFromSession(request, response);

      if (!adminUser || adminUser.role !== ROLES.admin) {
        response.status(403).json({
          success: false,
          error: "Admin access required",
        });
        return;
      }

      const { userId, tier, status } = reqBody(request);

      if (!userId || !tier) {
        response.status(400).json({
          success: false,
          error: "User ID and tier are required",
        });
        return;
      }

      const result = await User.updateSubscription(
        userId,
        tier,
        status || "active"
      );

      if (!result.success) {
        response.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      await EventLogs.logEvent(
        "admin_subscription_update",
        {
          targetUserId: userId,
          tier,
          status,
        },
        adminUser.id
      );

      response.status(200).json({
        success: true,
        message: "User subscription updated successfully",
      });
    } catch (error) {
      console.error("Admin update subscription error:", error);
      response.status(500).json({
        success: false,
        error: "Failed to update subscription",
      });
    }
  });

  /**
   * Initialize default subscription plans
   */
  app.post("/subscription/admin/init-plans", [validatedRequest], async (request, response) => {
    try {
      const adminUser = await userFromSession(request, response);

      if (!adminUser || adminUser.role !== ROLES.admin) {
        response.status(403).json({
          success: false,
          error: "Admin access required",
        });
        return;
      }

      await SubscriptionPlan.initializeDefaults();

      response.status(200).json({
        success: true,
        message: "Default subscription plans initialized",
      });
    } catch (error) {
      console.error("Initialize plans error:", error);
      response.status(500).json({
        success: false,
        error: "Failed to initialize plans",
      });
    }
  });
}

module.exports = { subscriptionEndpoints };
