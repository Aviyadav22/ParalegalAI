const prisma = require("../utils/prisma");

const OAuthAccount = {
  /**
   * Create or update an OAuth account
   * @param {Object} data - OAuth account data
   * @returns {Promise<Object>}
   */
  upsert: async function ({ userId, provider, providerId, accessToken, refreshToken, tokenExpiry, email, profile }) {
    try {
      const account = await prisma.oauth_accounts.upsert({
        where: {
          provider_providerId: {
            provider,
            providerId,
          },
        },
        update: {
          accessToken,
          refreshToken,
          tokenExpiry,
          email,
          profile: profile ? JSON.stringify(profile) : null,
          lastUpdatedAt: new Date(),
        },
        create: {
          userId,
          provider,
          providerId,
          accessToken,
          refreshToken,
          tokenExpiry,
          email,
          profile: profile ? JSON.stringify(profile) : null,
        },
      });
      return { account, error: null };
    } catch (error) {
      console.error("FAILED TO UPSERT OAUTH ACCOUNT.", error.message);
      return { account: null, error: error.message };
    }
  },

  /**
   * Find OAuth account by provider and providerId
   * @param {string} provider - OAuth provider name
   * @param {string} providerId - Provider's user ID
   * @returns {Promise<Object|null>}
   */
  findByProvider: async function (provider, providerId) {
    try {
      const account = await prisma.oauth_accounts.findUnique({
        where: {
          provider_providerId: {
            provider,
            providerId,
          },
        },
        include: {
          user: true,
        },
      });
      return account;
    } catch (error) {
      console.error("FAILED TO FIND OAUTH ACCOUNT.", error.message);
      return null;
    }
  },

  /**
   * Find all OAuth accounts for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>}
   */
  findByUserId: async function (userId) {
    try {
      const accounts = await prisma.oauth_accounts.findMany({
        where: { userId: parseInt(userId) },
      });
      return accounts;
    } catch (error) {
      console.error("FAILED TO FIND OAUTH ACCOUNTS.", error.message);
      return [];
    }
  },

  /**
   * Delete OAuth account
   * @param {number} id - OAuth account ID
   * @returns {Promise<boolean>}
   */
  delete: async function (id) {
    try {
      await prisma.oauth_accounts.delete({
        where: { id: parseInt(id) },
      });
      return true;
    } catch (error) {
      console.error("FAILED TO DELETE OAUTH ACCOUNT.", error.message);
      return false;
    }
  },
};

module.exports = { OAuthAccount };
