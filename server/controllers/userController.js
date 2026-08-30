// User Profile Controller — Member responsibility: Common

const User = require('../models/User');

// Helper: Compute TDEE using Mifflin-St Jeor formula from user metrics
function computeTDEE(user) {
  const weight = Number(user.weight);
  const height = Number(user.height);
  const age = Number(user.age);
  if (!weight || !height || !age) return user.dailyCalorieTarget || 2000;

  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };

  const genderConstant =
    user.gender === 'male' ? 5 :
    user.gender === 'female' ? -161 : -78;

  const bmr = 10 * weight + 6.25 * height - 5 * age + genderConstant;
  const multiplier = activityMultipliers[user.activityLevel] || 1.2;
  let tdee = Math.round(bmr * multiplier);

  if (user.goal === 'lose_weight') tdee = Math.round(tdee * 0.85);
  if (user.goal === 'gain_muscle') tdee = Math.round(tdee * 1.10);

  return Math.max(tdee, 1200);
}

// @route GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    let updated = false;

    // Auto-calculate and update TDEE calorie need if metrics are present
    if (user.weight && user.height && user.age) {
      const calculatedTDEE = computeTDEE(user);
      if (!user.dailyCalorieTarget || user.dailyCalorieTarget === 2000 || user.dailyCalorieTarget !== calculatedTDEE) {
        user.dailyCalorieTarget = calculatedTDEE;
        updated = true;
      }
    }

    // Synchronize unlocked badges with user points dynamically
    if (!user.unlockedBadges) user.unlockedBadges = [];
    const milestones = [
      { badge: 'healthy_starter', minPoints: 100 },
      { badge: 'nutrition_master', minPoints: 200 },
      { badge: 'diet_legend', minPoints: 330 },
    ];

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

    // If user metrics are updated, recalculate dailyCalorieTarget
    if (updates.weight || updates.height || updates.age || updates.gender || updates.activityLevel || updates.goal) {
      const existingUser = await User.findById(req.user.id);
      const mergedUser = { ...existingUser.toObject(), ...updates };
      updates.dailyCalorieTarget = computeTDEE(mergedUser);
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProfile, updateProfile, computeTDEE };
