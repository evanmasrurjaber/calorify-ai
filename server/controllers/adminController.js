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

    // Simulated statistics since we don't have dedicated models for these yet
    // In a real app, DAU would be tracked via session logs, community posts from a Post model, etc.
    const dau = Math.max(1, Math.floor(totalUsers * 0.15));
    const mau = Math.max(1, Math.floor(totalUsers * 0.6));
    const communityPosts = 124;
    const notificationsSent = 852;

    res.json({ 
      totalUsers, 
      totalDietPlans, 
      totalScans, 
      usersLast7, 
      usersLast30, 
      usersLast90,
      dau,
      mau,
      communityPosts,
      notificationsSent
    });
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

// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Admins cannot delete other admins via this route
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlatformStats, getAllUsers, deleteUser };
