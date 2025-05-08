const jwt = require("jsonwebtoken");
const { executeQuery } = require("../config/db");
const { AppError, catchAsync } = require("../utils/errorHandler");

/**
 * Protect routes - verify JWT token and set user on request object
 */
const protect = catchAsync(async (req, res, next) => {
  // 1) Get token from Authorization header
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Not authorized. No token provided", 401));
  }

  try {
    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const query = `
      SELECT a.id, a.email, a.full_name, r.name as role
      FROM account a
      LEFT JOIN manager m ON a.id = m.account_id
      LEFT JOIN [role] r ON m.role_id = r.id
      WHERE a.id = @userId
    `;
    const users = await executeQuery(query, { userId: decoded.id });

    if (!users || users.length === 0) {
      return next(
        new AppError("User belonging to this token no longer exists", 401)
      );
    }

    // 4) Set user on request object
    req.user = users[0];

    // Add default role if null
    if (!req.user.role) {
      req.user.role = "user";
    }

    console.log("User authenticated:", {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
    });

    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return next(new AppError("Not authorized. Invalid token", 401));
  }
});

/**
 * Restrict access to certain roles
 * @param  {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles: ['admin', 'manager']
    if (!req.user) {
      return next(new AppError("User not found. Please login again", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
