const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
const { catchAsync, AppError } = require("../utils/errorHandler");
const { generateToken, generateRefreshToken } = require("../utils/jwtUtils");
const bcrypt = require("bcryptjs");
const { protect } = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  "/login",
  catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    // Validate request
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(hashedPassword);
    // Find user by email
    const query = `
      SELECT a.id, a.username, a.full_name, a.email, a.password, r.name as role 
      FROM account a
      LEFT JOIN manager m ON a.id = m.account_id
      LEFT JOIN [role] r ON m.role_id = r.id
      WHERE a.email = @email`;
    const users = await executeQuery(query, { email });

    // Check if user exists
    if (!users || users.length === 0) {
      return next(new AppError("Invalid credentials", 401));
    }

    const user = users[0];
    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Return token
    res.json({
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role || "user",
      token: generateToken({ ...user, role: user.role || "user" }),
      refreshToken: generateRefreshToken({
        ...user,
        role: user.role || "user",
      }),
    });
  })
);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  catchAsync(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Validate request
    if (!name || !email || !password) {
      return next(new AppError("Please provide all required fields", 400));
    }

    // Check if user already exists
    const checkQuery = "SELECT id FROM account WHERE email = @email";
    const existingUsers = await executeQuery(checkQuery, { email });

    if (existingUsers && existingUsers.length > 0) {
      return next(new AppError("User already exists", 400));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in account table
    const insertQuery = `
    INSERT INTO account (username, password, full_name, email, status, created_at)
    OUTPUT INSERTED.id, INSERTED.username, INSERTED.full_name, INSERTED.email
    VALUES (@username, @password, @full_name, @email, @status, GETDATE())
    `;

    const newUsers = await executeQuery(insertQuery, {
      username: email.split("@")[0], // Default username from email
      password: hashedPassword,
      full_name: name,
      email,
      status: "Active",
    });

    if (!newUsers || newUsers.length === 0) {
      return next(new AppError("Failed to create user", 500));
    }

    const newUser = newUsers[0];

    // Create entry in customer table for the new account
    try {
      const customerQuery = `
        INSERT INTO customer (account_id)
        VALUES (@account_id)
      `;

      await executeQuery(customerQuery, {
        account_id: newUser.id,
      });
    } catch (error) {
      console.error("Failed to create customer record:", error);
      // Continue anyway, since the account was created
    }

    // Return token with role set to 'user' for new registrations
    res.status(201).json({
      id: newUser.id,
      name: newUser.full_name,
      email: newUser.email,
      role: "user", // Default role for registration
      token: generateToken({ ...newUser, role: "user" }),
      refreshToken: generateRefreshToken({ ...newUser, role: "user" }),
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  "/refresh",
  catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError("Refresh token is required", 400));
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );

      const query = `
        SELECT a.id, a.email, a.full_name, r.name as role
        FROM account a
        LEFT JOIN manager m ON a.id = m.account_id
        LEFT JOIN [role] r ON m.role_id = r.id
        WHERE a.id = @userId`;
      const users = await executeQuery(query, { userId: decoded.id });

      if (!users || users.length === 0) {
        return next(new AppError("Invalid refresh token", 401));
      }

      const user = users[0];

      res.json({
        token: generateToken({ ...user, role: user.role || "user" }),
      });
    } catch (error) {
      return next(new AppError("Invalid refresh token", 401));
    }
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  "/me",
  protect,
  catchAsync(async (req, res) => {
    res.json(req.user);
  })
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  protect,
  catchAsync(async (req, res, next) => {
    const { fullName } = req.body;
    const userId = req.user.id;

    if (!fullName) {
      return next(new AppError("Full name is required", 400));
    }

    // Update account table
    const updateAccountQuery = `
      UPDATE account
      SET full_name = @fullName
      WHERE id = @userId
    `;

    await executeQuery(updateAccountQuery, {
      fullName,
      userId,
    });

    // Get updated user data
    const getUserQuery = `
      SELECT a.id, a.username, a.full_name, a.email, r.name as role
      FROM account a
      LEFT JOIN manager m ON a.id = m.account_id
      LEFT JOIN [role] r ON m.role_id = r.id
      WHERE a.id = @userId
    `;

    const users = await executeQuery(getUserQuery, { userId });
    const updatedUser = users[0];

    res.json({
      id: updatedUser.id,
      name: updatedUser.full_name,
      email: updatedUser.email,
      role: updatedUser.role || "user",
    });
  })
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  "/change-password",
  protect,
  catchAsync(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return next(
        new AppError("Current password and new password are required", 400)
      );
    }

    // Get current user with password
    const getUserQuery = `
      SELECT id, password FROM account WHERE id = @userId
    `;
    const users = await executeQuery(getUserQuery, { userId });

    if (!users || users.length === 0) {
      return next(new AppError("User not found", 404));
    }

    const user = users[0];

    // Check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(new AppError("Current password is incorrect", 401));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    const updatePasswordQuery = `
      UPDATE account
      SET password = @password
      WHERE id = @userId
    `;
    await executeQuery(updatePasswordQuery, {
      password: hashedPassword,
      userId,
    });

    res.json({
      message: "Password updated successfully",
    });
  })
);

// logout
router.post(
  "/logout",
  catchAsync(async (req, res) => {
    res.clearCookie("token");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  })
);

module.exports = router;
