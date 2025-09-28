const prisma = require("../utils/prisma");
const crypto = require("crypto");

const EmailVerification = {
  create: async function ({ userId, email }) {
    try {
      // Delete any existing tokens for this user
      await prisma.email_verification_tokens.deleteMany({
        where: { user_id: userId },
      });

      // Generate a secure token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const verificationToken = await prisma.email_verification_tokens.create({
        data: {
          user_id: userId,
          token,
          email: email.toLowerCase(),
          expiresAt,
        },
      });

      return { token: verificationToken, error: null };
    } catch (error) {
      console.error("FAILED TO CREATE EMAIL VERIFICATION TOKEN.", error.message);
      return { token: null, error: error.message };
    }
  },

  verify: async function ({ token }) {
    try {
      const verificationToken = await prisma.email_verification_tokens.findFirst({
        where: { token },
        include: { user: true },
      });

      if (!verificationToken) {
        return { success: false, error: "Invalid verification token" };
      }

      if (verificationToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.email_verification_tokens.delete({
          where: { id: verificationToken.id },
        });
        return { success: false, error: "Verification token has expired" };
      }

      // Mark user as verified
      await prisma.users.update({
        where: { id: verificationToken.user_id },
        data: { email_verified: true },
      });

      // Delete the used token
      await prisma.email_verification_tokens.delete({
        where: { id: verificationToken.id },
      });

      return { success: true, user: verificationToken.user, error: null };
    } catch (error) {
      console.error("FAILED TO VERIFY EMAIL TOKEN.", error.message);
      return { success: false, error: error.message };
    }
  },

  resend: async function ({ userId, email }) {
    try {
      const user = await prisma.users.findFirst({
        where: { id: userId },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (user.email_verified) {
        return { success: false, error: "Email already verified" };
      }

      const { token, error } = await this.create({ userId, email });
      if (error) {
        return { success: false, error };
      }

      return { success: true, token: token.token, error: null };
    } catch (error) {
      console.error("FAILED TO RESEND VERIFICATION EMAIL.", error.message);
      return { success: false, error: error.message };
    }
  },

  cleanup: async function () {
    try {
      // Delete expired tokens
      await prisma.email_verification_tokens.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return { success: true, error: null };
    } catch (error) {
      console.error("FAILED TO CLEANUP EXPIRED TOKENS.", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = { EmailVerification };
