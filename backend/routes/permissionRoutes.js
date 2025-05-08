const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");
const { catchAsync, AppError } = require("../utils/errorHandler");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

/**
 * @route   GET /api/permissions
 * @desc    Get all available permissions
 * @access  Private/Admin
 */
router.get(
  "/",
  protect,
  restrictTo("admin"), // Only admins should see the full list of permissions
  catchAsync(async (req, res, next) => {
    const query = "SELECT id, name FROM permission ORDER BY name";
    const permissions = await executeQuery(query);

    if (!permissions) {
      // This might indicate a DB issue
      return next(new AppError("Failed to fetch permissions", 500));
    }

    // Return the list of permissions
    res.json(permissions);
  })
);

module.exports = router;
