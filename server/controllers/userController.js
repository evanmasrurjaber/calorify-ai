// User Profile Controller — Member responsibility: Common

const User = require('../models/User');

// @route GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Synchronize unlocked badges with user points dynamically
    if (!user.unlockedBadges) user.unlockedBadges = [];
    const milestones = [
      { badge: 'healthy_starter', minPoints: 100 },
      { badge: 'nutrition_master', minPoints: 200 },
      { badge: 'diet_legend', minPoints: 330 },
    ];
    let updated = false;
    for (const m of milestones) {
      if ((user.points || 0) >= m.minPoints && !user.unlockedBadges.includes(m.badge)) {
        user.unlockedBadges.push(m.badge);
        user.badge = m.badge;
        updated = true;
      }
    }
    if (updated) {
      await user.save();
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password update via this route
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProfile, updateProfile };
