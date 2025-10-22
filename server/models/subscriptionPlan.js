const prisma = require("../utils/prisma");

const SubscriptionPlan = {
  /**
   * Get all active subscription plans
   * @returns {Promise<Array>}
   */
  getAll: async function () {
    try {
      const plans = await prisma.subscription_plans.findMany({
        where: { isActive: true },
        orderBy: { price: "asc" },
      });
      return plans;
    } catch (error) {
      console.error("FAILED TO GET SUBSCRIPTION PLANS.", error.message);
      return [];
    }
  },

  /**
   * Get a subscription plan by name
   * @param {string} name - Plan name
   * @returns {Promise<Object|null>}
   */
  getByName: async function (name) {
    try {
      const plan = await prisma.subscription_plans.findUnique({
        where: { name },
      });
      return plan;
    } catch (error) {
      console.error("FAILED TO GET SUBSCRIPTION PLAN.", error.message);
      return null;
    }
  },

  /**
   * Create or update a subscription plan
   * @param {Object} data - Plan data
   * @returns {Promise<Object>}
   */
  upsert: async function (data) {
    try {
      const plan = await prisma.subscription_plans.upsert({
        where: { name: data.name },
        update: {
          displayName: data.displayName,
          description: data.description,
          price: parseFloat(data.price),
          currency: data.currency || "usd",
          interval: data.interval || "month",
          dailyMessageLimit: data.dailyMessageLimit ? parseInt(data.dailyMessageLimit) : null,
          allowDocumentUpload: Boolean(data.allowDocumentUpload),
          stripePriceId: data.stripePriceId,
          features: data.features ? JSON.stringify(data.features) : null,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
          lastUpdatedAt: new Date(),
        },
        create: {
          name: data.name,
          displayName: data.displayName,
          description: data.description || "",
          price: parseFloat(data.price),
          currency: data.currency || "usd",
          interval: data.interval || "month",
          dailyMessageLimit: data.dailyMessageLimit ? parseInt(data.dailyMessageLimit) : null,
          allowDocumentUpload: Boolean(data.allowDocumentUpload),
          stripePriceId: data.stripePriceId,
          features: data.features ? JSON.stringify(data.features) : null,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        },
      });
      return { plan, error: null };
    } catch (error) {
      console.error("FAILED TO UPSERT SUBSCRIPTION PLAN.", error.message);
      return { plan: null, error: error.message };
    }
  },

  /**
   * Initialize default subscription plans
   * @returns {Promise<void>}
   */
  initializeDefaults: async function () {
    const defaultPlans = [
      {
        name: "free",
        displayName: "Free",
        description: "Limited messages per day, no document uploads in chat",
        price: 0,
        currency: "usd",
        interval: "month",
        dailyMessageLimit: 25,
        allowDocumentUpload: false,
        features: ["25 messages per day", "Access to all workspaces", "Basic support"],
      },
      {
        name: "premium",
        displayName: "Premium",
        description: "Unlimited messages and document uploads in chat",
        price: 29.99,
        currency: "usd",
        interval: "month",
        dailyMessageLimit: null,
        allowDocumentUpload: true,
        features: ["Unlimited messages", "Document uploads in chat", "Access to all workspaces", "Priority support"],
      },
    ];

    for (const plan of defaultPlans) {
      await this.upsert(plan);
    }
  },
};

module.exports = { SubscriptionPlan };
