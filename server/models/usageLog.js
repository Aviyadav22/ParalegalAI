const prisma = require("../utils/prisma");

const UsageLog = {
  /**
   * Log a user action
   * @param {number} userId - User ID
   * @param {string} actionType - Type of action (e.g., 'chat_message', 'document_upload')
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>}
   */
  log: async function (userId, actionType, metadata = {}) {
    try {
      const log = await prisma.usage_logs.create({
        data: {
          userId: parseInt(userId),
          actionType,
          metadata: JSON.stringify(metadata),
        },
      });
      return { log, error: null };
    } catch (error) {
      console.error("FAILED TO LOG USAGE.", error.message);
      return { log: null, error: error.message };
    }
  },

  /**
   * Get usage count for a user within a time period
   * @param {number} userId - User ID
   * @param {string} actionType - Type of action
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date (optional, defaults to now)
   * @returns {Promise<number>}
   */
  getCount: async function (userId, actionType, startDate, endDate = new Date()) {
    try {
      const count = await prisma.usage_logs.count({
        where: {
          userId: parseInt(userId),
          actionType,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      return count;
    } catch (error) {
      console.error("FAILED TO GET USAGE COUNT.", error.message);
      return 0;
    }
  },

  /**
   * Get daily message count for a user (last 24 hours)
   * @param {number} userId - User ID
   * @returns {Promise<number>}
   */
  getDailyMessageCount: async function (userId) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await this.getCount(userId, "chat_message", twentyFourHoursAgo);
  },

  /**
   * Get usage statistics for a user
   * @param {number} userId - User ID
   * @param {number} days - Number of days to look back (default 30)
   * @returns {Promise<Object>}
   */
  getStats: async function (userId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const logs = await prisma.usage_logs.findMany({
        where: {
          userId: parseInt(userId),
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Aggregate by action type
      const stats = logs.reduce((acc, log) => {
        if (!acc[log.actionType]) {
          acc[log.actionType] = 0;
        }
        acc[log.actionType]++;
        return acc;
      }, {});

      // Get daily breakdown for messages
      const dailyMessages = await this.getDailyMessageCount(userId);

      return {
        totalActions: logs.length,
        byType: stats,
        dailyMessages,
        period: days,
      };
    } catch (error) {
      console.error("FAILED TO GET USAGE STATS.", error.message);
      return {
        totalActions: 0,
        byType: {},
        dailyMessages: 0,
        period: days,
      };
    }
  },

  /**
   * Clean up old usage logs (older than specified days)
   * @param {number} days - Number of days to keep
   * @returns {Promise<number>} Number of deleted records
   */
  cleanup: async function (days = 90) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const result = await prisma.usage_logs.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });
      return result.count;
    } catch (error) {
      console.error("FAILED TO CLEANUP USAGE LOGS.", error.message);
      return 0;
    }
  },
};

module.exports = { UsageLog };
