// TODO: Implement admin analytics
// Member responsibility: Common (Evan as lead)

const User = require('../models/User');
const DietPlan = require('../models/DietPlan');
const MealLog = require('../models/MealLog');

// @route GET /api/admin/stats
const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalDietPlans = await DietPlan.countDocuments();
    const totalScans = await MealLog.countDocuments({ loggedVia: 'image' });

    // New users in last 7/30/90 days
    const now = new Date();
    const usersLast7 = await User.countDocuments({ createdAt: { $gte: new Date(now - 7 * 86400000) } });
    const usersLast30 = await User.countDocuments({ createdAt: { $gte: new Date(now - 30 * 86400000) } });
    const usersLast90 = await User.countDocuments({ createdAt: { $gte: new Date(now - 90 * 86400000) } });

    res.json({ totalUsers, totalDietPlans, totalScans, usersLast7, usersLast30, usersLast90 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlatformStats, getAllUsers };
