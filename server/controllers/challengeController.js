const Challenge = require('../models/Challenge');
const User = require('../models/User');
const { sendEmail } = require('../services/gmailService');

// Helper to get local start and end of day (defaults to today)
const getStartAndEndOfDay = (dateStr) => {
  let anchor;
  if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    anchor = new Date(y, m - 1, d);
  } else {
    anchor = new Date();
  }
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Helper for today's start and end
const getStartAndEndOfToday = () => getStartAndEndOfDay();

// Helper to send badge unlock email notification
const sendBadgeUnlockEmail = async (userEmail, userName, badgeLabel, userId) => {
  try {
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.notifications?.challengeAlerts === false) {
        console.log(`[Email Suppressed]: User ${userEmail} has challengeAlerts disabled.`);
        return;
      }
    }

    const subject = `🎉 congratulations! you have unlocked the badge "${badgeLabel}"`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">🏆 Badge Unlocked!</h2>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">Congratulations! You have successfully completed your daily challenge and unlocked the <strong>${badgeLabel}</strong> badge on Calorify today.</p>
        <div style="text-align: center; margin: 40px 0; background-color: #f8fafc; padding: 20px; border-radius: 16px;">
          <span style="font-size: 64px;">✨</span>
          <h3 style="margin-top: 15px; margin-bottom: 5px; color: #0f172a; font-size: 20px; font-weight: 800;">${badgeLabel}</h3>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Unlocked on Calorify</p>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; border-t: 1px solid #f1f5f9; pt-15;">Keep logging your habits, tracking your daily nutrition intake, and challenging yourself to unlock the next level milestones!</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br/><strong>The Calorify Team</strong></p>
      </div>
    `;
    await sendEmail(userEmail, subject, html);
    console.log(`[Email Sent]: Badge unlock email sent to ${userEmail}`);
  } catch (err) {
    console.log(`[Email Mocked/Failed]: Failed to send email to ${userEmail}: ${err.message}`);
  }
};

// Helper to check and send all completed challenges email
const checkAndSendAllCompletedEmail = async (userId, userEmail, userName) => {
  try {
    const user = await User.findById(userId);
    if (user && user.notifications?.challengeAlerts === false) {
      console.log(`[Email Suppressed]: User ${userEmail} has challengeAlerts disabled.`);
      return;
    }

    const { start, end } = getStartAndEndOfDay();
    const todayChallenges = await Challenge.find({
      user: userId,
      date: { $gte: start, $lte: end },
    });
    if (todayChallenges.length > 0 && todayChallenges.every((c) => c.completed)) {
      const subject = '🌟 Congratulations! You completed ALL your Daily Challenges today!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">🏆 All Daily Challenges Completed!</h2>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Outstanding dedication! You have successfully completed <strong>all 5 of your daily healthy habit challenges</strong> on Calorify today.</p>
          <div style="text-align: center; margin: 25px 0; background-color: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0;">
            <span style="font-size: 48px;">🌟</span>
            <h3 style="margin-top: 10px; margin-bottom: 5px; color: #0f172a; font-size: 18px; font-weight: 800;">100% Daily Goals Achieved</h3>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Habit Streak Active & Points Boosted!</p>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;">Your consistency is paving the way to a healthier and more energetic lifestyle. Keep up this winning streak tomorrow!</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 25px;">Warm regards,<br/><strong>The Calorify Team</strong></p>
        </div>
      `;
      await sendEmail(userEmail, subject, html);
      console.log(`[AllChallengesEmail]: Sent to ${userEmail}`);
    }
  } catch (err) {
    console.error('[AllChallengesEmail Error]:', err.message);
  }
};

// @route GET /api/challenges/today
const getTodayChallenges = async (req, res) => {
  try {
    const { start, end } = getStartAndEndOfDay(req.query.date);

    // Fetch existing challenges for today
    let challenges = await Challenge.find({
      user: req.user.id,
      date: { $gte: start, $lte: end },
    });

    // If challenges exist but count is not 5 (outdated seed), delete and re-seed
    if (challenges.length > 0 && challenges.length !== 5) {
      await Challenge.deleteMany({
        user: req.user.id,
        date: { $gte: start, $lte: end },
      });
      challenges = [];
    }

    // If no challenges exist, seed the daily challenges
    if (challenges.length === 0) {
      const defaultChallenges = [
        {
          user: req.user.id,
          date: new Date(),
          title: "Drink 2L Water",
          description: "Keep hydrated throughout the day. Log in increments or custom amount.",
          pointsReward: 50,
          target: 2000,
          current: 0,
          step: 250,
          unit: "ml",
          badgeKey: "hydration_pro",
        },
        {
          user: req.user.id,
          date: new Date(),
          title: "Walk 5000 Steps",
          description: "Stay active! Log your steps in increments or custom amount.",
          pointsReward: 100,
          target: 5000,
          current: 0,
          step: 1000,
          unit: "steps",
          badgeKey: "speed_demon",
        },
        {
          user: req.user.id,
          date: new Date(),
          title: "sleep 8 hrs",
          description: "Ensure your body recovers well. Log in increments or custom amount.",
          pointsReward: 80,
          target: 8,
          current: 0,
          step: 1,
          unit: "hrs",
          badgeKey: "sleep_guardian",
        },
        {
          user: req.user.id,
          date: new Date(),
          title: "meditate 10 mins a day",
          description: "Take some time for mindfulness. Log in increments or custom amount.",
          pointsReward: 40,
          target: 10,
          current: 0,
          step: 5,
          unit: "mins",
          badgeKey: "morning_clarity",
        },
        {
          user: req.user.id,
          date: new Date(),
          title: "Publish 1 Diet Post",
          description: "Share a healthy meal tip, suggestion, or recipe with the community.",
          pointsReward: 60,
          target: 1,
          current: 0,
          step: 1,
          unit: "post",
          badgeKey: "community_diet_pioneer",
        },
      ];

      challenges = await Challenge.insertMany(defaultChallenges);
    }

    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/challenges/:id/progress
const logChallengeProgress = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, user: req.user.id });
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    if (challenge.completed) {
      return res.status(400).json({ message: 'Challenge already completed' });
    }

    // Support custom manual input amount or default step
    const increment =
      req.body.amount && Number(req.body.amount) > 0
        ? Number(req.body.amount)
        : challenge.step;

    challenge.current = Math.min(challenge.current + increment, challenge.target);

    let newlyCompleted = false;
    if (challenge.current >= challenge.target) {
      challenge.completed = true;
      challenge.completedAt = new Date();
      newlyCompleted = true;
    }

    await challenge.save();

    let pointsAwarded = 0;
    let unlockedBadge = null;

    if (newlyCompleted) {
      pointsAwarded = challenge.pointsReward;
      const user = await User.findById(req.user.id);

      if (!user.unlockedBadges) {
        user.unlockedBadges = [];
      }

      user.points = (user.points || 0) + pointsAwarded;

      // Unlock challenge-specific badge
      const badgeKey = challenge.badgeKey;
      if (badgeKey && !user.unlockedBadges.includes(badgeKey)) {
        user.unlockedBadges.push(badgeKey);
        unlockedBadge = badgeKey;
      }

      // Check tier-based milestones (lowered to accessible targets)
      const currentPoints = user.points;
      const milestones = [
        { badge: 'healthy_starter', minPoints: 100 },
        { badge: 'nutrition_master', minPoints: 200 },
        { badge: 'diet_legend', minPoints: 330 },
      ];

      for (const m of milestones) {
        if (currentPoints >= m.minPoints && !user.unlockedBadges.includes(m.badge)) {
          user.unlockedBadges.push(m.badge);
          user.badge = m.badge; // update active tier
          if (!unlockedBadge) {
            unlockedBadge = m.badge;
          }
        }
      }

      await user.save();

      // Send badge unlock email notification
      const emailBadgeKey = challenge.badgeKey || unlockedBadge;
      if (emailBadgeKey) {
        const badgeLabel = emailBadgeKey
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        sendBadgeUnlockEmail(user.email, user.name, badgeLabel, user._id).catch((err) => {
          console.error('Failed to send email:', err.message);
        });
      }

      // Check if ALL challenges for today are now completed
      checkAndSendAllCompletedEmail(user._id, user.email, user.name);
    }

    res.json({ challenge, pointsAwarded, unlockedBadge });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/challenges/:id/complete (fallback / manual complete)
const completeChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, user: req.user.id });
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    if (challenge.completed) {
      return res.status(400).json({ message: 'Challenge already completed' });
    }

    challenge.current = challenge.target;
    challenge.completed = true;
    challenge.completedAt = new Date();
    await challenge.save();

    const user = await User.findById(req.user.id);
    if (!user.unlockedBadges) user.unlockedBadges = [];
    user.points = (user.points || 0) + challenge.pointsReward;

    let unlockedBadge = null;
    const badgeKey = challenge.badgeKey;
    if (badgeKey && !user.unlockedBadges.includes(badgeKey)) {
      user.unlockedBadges.push(badgeKey);
      unlockedBadge = badgeKey;
    }

    // Check milestones
    const milestones = [
      { badge: 'healthy_starter', minPoints: 100 },
      { badge: 'nutrition_master', minPoints: 200 },
      { badge: 'diet_legend', minPoints: 330 },
    ];
    for (const m of milestones) {
      if (user.points >= m.minPoints && !user.unlockedBadges.includes(m.badge)) {
        user.unlockedBadges.push(m.badge);
        user.badge = m.badge;
        if (!unlockedBadge) unlockedBadge = m.badge;
      }
    }

    await user.save();

    // Send badge unlock email notification
    const emailBadgeKey = challenge.badgeKey || unlockedBadge;
    if (emailBadgeKey) {
      const badgeLabel = emailBadgeKey
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      sendBadgeUnlockEmail(user.email, user.name, badgeLabel, user._id).catch((err) => {
        console.error('Failed to send email:', err.message);
      });
    }

    // Check if ALL challenges for today are now completed
    checkAndSendAllCompletedEmail(user._id, user.email, user.name);

    res.json({ challenge, pointsAwarded: challenge.pointsReward, unlockedBadge });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTodayChallenges,
  logChallengeProgress,
  completeChallenge,
  sendBadgeUnlockEmail,
  checkAndSendAllCompletedEmail,
  getStartAndEndOfToday,
};
