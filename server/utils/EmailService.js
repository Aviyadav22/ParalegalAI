const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    try {
      // Configure email service based on environment variables
      const emailConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      // Only initialize if SMTP credentials are provided
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransport(emailConfig);
        console.log("[EmailService] Initialized with SMTP configuration");
      } else {
        console.log("[EmailService] No SMTP credentials provided - email service disabled");
      }
    } catch (error) {
      console.error("[EmailService] Failed to initialize:", error.message);
    }
  }

  async sendVerificationEmail({ to, token, username }) {
    if (!this.transporter) {
      console.log("[EmailService] Email service not configured - skipping email send");
      return { success: false, error: "Email service not configured" };
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Verify your ParalegalAI account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to ParalegalAI!</h2>
            <p>Hello ${username || "there"},</p>
            <p>Thank you for registering with ParalegalAI. To complete your registration and start using our legal AI assistant, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
            
            <p>This verification link will expire in 24 hours.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't create an account with ParalegalAI, please ignore this email.
            </p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("[EmailService] Verification email sent successfully");
      return { success: true, messageId: result.messageId, error: null };
    } catch (error) {
      console.error("[EmailService] Failed to send verification email:", error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail({ to, token, username }) {
    if (!this.transporter) {
      console.log("[EmailService] Email service not configured - skipping email send");
      return { success: false, error: "Email service not configured" };
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Reset your ParalegalAI password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hello ${username || "there"},</p>
            <p>We received a request to reset your password for your ParalegalAI account. Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
            
            <p>This reset link will expire in 1 hour.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("[EmailService] Password reset email sent successfully");
      return { success: true, messageId: result.messageId, error: null };
    } catch (error) {
      console.error("[EmailService] Failed to send password reset email:", error.message);
      return { success: false, error: error.message };
    }
  }

  isConfigured() {
    return this.transporter !== null;
  }
}

module.exports = { EmailService };
