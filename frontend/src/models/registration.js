import { API_BASE } from "../utils/constants";

const Registration = {
  register: async function ({ email, password, username }) {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          username: username || null,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  },

  verifyEmail: async function (token) {
    try {
      const response = await fetch(`${API_BASE}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Email verification error:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  },

  resendVerification: async function (email) {
    try {
      const response = await fetch(`${API_BASE}/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Resend verification error:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  },

  checkEmail: async function (email) {
    try {
      const response = await fetch(`${API_BASE}/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Check email error:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  },

  checkUsername: async function (username) {
    try {
      const response = await fetch(`${API_BASE}/check-username`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Check username error:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  },
};

export default Registration;
