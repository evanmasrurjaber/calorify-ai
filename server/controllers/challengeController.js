// TODO: Implement gamified challenges
// Member responsibility: Jarin Tasnim Dia

const Challenge = require('../models/Challenge');
const User = require('../models/User');

// @route GET /api/challenges/today
const getTodayChallenges = async (req, res) => {
  try {
    // TODO: Generate or fetch today's daily micro-challenges for the user
    res.status(501).json({ message: 'getTodayChallenges not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/challenges/:id/complete
const completeChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { completed: true, completedAt: new Date() },
      { new: true }
    );
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    // Award points
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: challenge.pointsReward } });

    // TODO: Check badge tier upgrade (Healthy Starter / Nutrition Master / Diet Legend)

    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTodayChallenges, completeChallenge };
