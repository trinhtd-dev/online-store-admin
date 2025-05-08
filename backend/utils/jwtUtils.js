const jwt = require("jsonwebtoken");

/**
 * Generate JWT token for authentication
 * @param {Object} user - User object with ID and role
 * @returns {string} - JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "30d",
    }
  );
};

/**
 * Generate refresh token with longer expiry
 * @param {Object} user - User object with ID
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );
};

module.exports = {
  generateToken,
  generateRefreshToken,
};
