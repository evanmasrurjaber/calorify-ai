import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile } from '../../services/userService';
import { getProgress } from '../../services/progressService';
import { getTodayChallenges, logChallengeProgress, completeChallenge } from '../../services/challengeService';
import {
  Flame,
  Target,
  Trophy,
  Award,
  Zap,
  Sparkles,
  Droplet,
  Moon,
  Smile,
  Dumbbell,
  Footprints,
  CheckCircle,
  HelpCircle,
  Plus,
  MessageSquare,
  Edit3,
} from 'lucide-react';

const badgesConfig = [
  {
    key: 'community_diet_pioneer',
    name: 'Community Diet Pioneer',
    description: 'Publish a diet post in the community feed.',
    icon: MessageSquare,
    color: 'from-teal-400 to-emerald-600 text-teal-600 bg-teal-50 border-teal-200'
  },
  {
    key: 'hydration_pro',
    name: 'Hydration Pro',
    description: 'Drink 2L of water in a single day.',
    icon: Droplet,
    color: 'from-blue-400 to-indigo-500 text-blue-500 bg-blue-50 border-blue-200'
  },
  {
    key: 'morning_clarity',
    name: 'Morning Clarity',
    description: 'Complete 10 mins of meditation.',
    icon: Smile,
    color: 'from-purple-400 to-pink-500 text-purple-500 bg-purple-50 border-purple-200'
  },
  {
    key: 'sleep_guardian',
    name: 'Sleep Guardian',
    description: 'Sleep 8 hours to restore body energy.',
    icon: Moon,
    color: 'from-sky-400 to-blue-600 text-sky-600 bg-sky-50 border-sky-200'
  },
  {
    key: 'speed_demon',
    name: 'Speed Demon',
    description: 'Walk 5000 steps in a day.',
    icon: Footprints,
    color: 'from-orange-400 to-red-500 text-orange-600 bg-orange-50 border-orange-200'
  },
  {
    key: 'healthy_starter',
    name: 'Healthy Starter',
    description: 'Reach 100 health points milestone.',
    icon: Sparkles,
    color: 'from-emerald-400 to-teal-500 text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    key: 'nutrition_master',
    name: 'Nutrition Master',
    description: 'Reach 200 health points milestone.',
    icon: Trophy,
    color: 'from-amber-400 to-orange-500 text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    key: 'diet_legend',
    name: 'Diet Legend',
    description: 'Reach 330 health points (Complete all daily challenges).',
    icon: Award,
    color: 'from-yellow-400 to-amber-600 text-yellow-600 bg-yellow-50 border-yellow-200'
  }
];

export default function Challenges() {
  const { login } = useAuth();
  
  // States
  const [profile, setProfile] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [customInputs, setCustomInputs] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [unlockedMessage, setUnlockedMessage] = useState('');

  // Fetch all details on mount
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [profileRes, challengeRes, progressRes] = await Promise.allSettled([
        getUserProfile(),
        getTodayChallenges(),
        getProgress()
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
        const token = localStorage.getItem('calorify_token');
        login(profileRes.value.data, token);
      }

      if (challengeRes.status === 'fulfilled') {
        setChallenges(challengeRes.value.data || []);
      }

      if (progressRes.status === 'fulfilled') {
        const data = progressRes.value.data || [];
        if (data.length > 0) {
          setCurrentStreak(data[data.length - 1].streak || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching challenges data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle logging incremental progress (+Step or custom manual amount)
  const handleLogProgress = async (id, customAmount = null) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }));
      const amountToSend = customAmount !== null ? Number(customAmount) : undefined;
      const { data } = await logChallengeProgress(id, amountToSend);

      // Refresh list
      setChallenges(prev => prev.map(c => c._id === id ? data.challenge : c));

      // Clear custom input
      setCustomInputs(prev => ({ ...prev, [id]: '' }));

      // Re-fetch profile for updated points and unlocked badges
      const profileRes = await getUserProfile();
      setProfile(profileRes.data);
      const token = localStorage.getItem('calorify_token');
      login(profileRes.data, token);

      // Check if badge unlocked
      if (data.unlockedBadge) {
        const badgeObj = badgesConfig.find(b => b.key === data.unlockedBadge);
        if (badgeObj) {
          setUnlockedMessage(`🎉 Congratulations! You unlocked the badge "${badgeObj.name}"!`);
          setShowConfetti(true);
          setTimeout(() => {
            setShowConfetti(false);
            setUnlockedMessage('');
          }, 6000);
        }
      }
    } catch (err) {
      console.error('Error logging challenge progress:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Handle 100% full completion in one tap
  const handleCompleteChallenge = async (id) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }));
      const { data } = await completeChallenge(id);

      // Refresh list
      setChallenges(prev => prev.map(c => c._id === id ? data.challenge : c));

      // Re-fetch profile
      const profileRes = await getUserProfile();
      setProfile(profileRes.data);
      const token = localStorage.getItem('calorify_token');
      login(profileRes.data, token);

      // Confetti & announcement
      if (data.unlockedBadge) {
        const badgeObj = badgesConfig.find(b => b.key === data.unlockedBadge);
        if (badgeObj) {
          setUnlockedMessage(`🎉 Congratulations! You unlocked the badge "${badgeObj.name}"!`);
          setShowConfetti(true);
          setTimeout(() => {
            setShowConfetti(false);
            setUnlockedMessage('');
          }, 6000);
        }
      }
    } catch (err) {
      console.error('Error completing challenge:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Determine user points & levels
  const userPoints = profile?.points || 0;
  const userUnlockedBadges = profile?.unlockedBadges || [];
  
  // Calculate next milestone progress (accessible daily target thresholds)
  const getMilestoneDetails = () => {
    if (userPoints < 100) {
      return {
        nextName: 'Healthy Starter',
        targetPoints: 100,
        pct: Math.min(Math.round((userPoints / 100) * 100), 100),
        pointsLeft: Math.max(100 - userPoints, 0)
      };
    } else if (userPoints < 200) {
      return {
        nextName: 'Nutrition Master',
        targetPoints: 200,
        pct: Math.min(Math.round((userPoints / 200) * 100), 100),
        pointsLeft: Math.max(200 - userPoints, 0)
      };
    } else if (userPoints < 330) {
      return {
        nextName: 'Diet Legend',
        targetPoints: 330,
        pct: Math.min(Math.round((userPoints / 330) * 100), 100),
        pointsLeft: Math.max(330 - userPoints, 0)
      };
    } else {
      return {
        nextName: 'Diet Legend Unlocked 👑',
        targetPoints: 330,
        pct: 100,
        pointsLeft: 0
      };
    }
  };

  const milestone = getMilestoneDetails();

  // Get specific challenge icon
  const getChallengeIcon = (title) => {
    const t = title.toLowerCase();
    if (t.includes('water') || t.includes('hydration')) return Droplet;
    if (t.includes('steps') || t.includes('walk')) return Footprints;
    if (t.includes('sleep')) return Moon;
    if (t.includes('meditate') || t.includes('mindful')) return Smile;
    if (t.includes('post') || t.includes('community')) return MessageSquare;
    return Target;
  };

  // Count completed badges/challenges today
  const completedBadgesCount = challenges.filter(c => c.completed).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
        <span className="text-sm font-semibold text-gray-500">Loading your challenges...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Confetti / Alert Toast */}
      {showConfetti && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl font-black text-sm animate-bounce flex items-center gap-2 border-2 border-white">
          <Sparkles size={18} />
          {unlockedMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Trophy size={28} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Daily Habit Challenges
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Complete daily micro-habits, log custom amounts, earn points & collect tier milestones.
              </p>
            </div>
          </div>
        </div>

        {/* Global Streak & Points Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl">
            <Flame className="text-amber-500 fill-amber-500" size={20} />
            <div>
              <span className="block text-[10px] font-bold text-amber-700 uppercase">Streak</span>
              <span className="text-sm font-black text-gray-900">{currentStreak} Days</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl">
            <Sparkles className="text-emerald-600" size={20} />
            <div>
              <span className="block text-[10px] font-bold text-emerald-700 uppercase">Total Points</span>
              <span className="text-sm font-black text-gray-900">{userPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Level Progress Section */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-lg">
              Next Tier Milestone
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-2">
              Level Target: {milestone.nextName}
            </h2>
            <p className="text-xs text-emerald-100 font-medium mt-1">
              {milestone.pointsLeft > 0
                ? `Earn ${milestone.pointsLeft} more points to unlock this achievement.`
                : 'All primary milestone levels unlocked! Keep challenging yourself!'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 text-center">
            <span className="text-[10px] font-extrabold uppercase text-emerald-200 block">Current Level</span>
            <span className="text-lg font-black">{profile?.badge && profile.badge !== 'none' ? profile.badge.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Healthy Starter'}</span>
          </div>
        </div>

        {/* Milestone Progress bar */}
        <div className="relative z-10 space-y-2">
          <div className="flex justify-between text-xs font-bold text-emerald-100">
            <span>{userPoints} pts</span>
            <span>{milestone.targetPoints} pts</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-3.5 p-0.5 overflow-hidden border border-white/10">
            <div
              className="bg-white h-full rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${milestone.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Challenges Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Today's Challenges</h2>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Completed {completedBadgesCount} of {challenges.length} challenges today
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c) => {
            const Icon = getChallengeIcon(c.title);
            const isCompleted = c.completed;
            const progressPct = Math.min(Math.round((c.current / c.target) * 100), 100);
            const loadingAction = actionLoading[c._id];

            return (
              <div
                key={c._id}
                className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all duration-300 ${
                  isCompleted
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-gray-150 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Row: Icon & Points Reward */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`p-3 rounded-2xl ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      +{c.pointsReward} pts
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 leading-snug">{c.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.description}</p>
                  </div>

                  {/* Increment Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-500">
                      <span>Progress</span>
                      <span className="font-extrabold text-gray-700">
                        {c.current.toLocaleString()}{c.unit} / {c.target.toLocaleString()}{c.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Log & Action Buttons */}
                <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                  {isCompleted ? (
                    <div className="w-full py-2.5 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle size={14} /> Completed
                    </div>
                  ) : (
                    <>
                      {/* Step Increment + Complete in one tap */}
                      <div className="flex gap-2">
                        {c.target > 1 && (
                          <button
                            onClick={() => handleLogProgress(c._id)}
                            disabled={loadingAction}
                            className="flex-1 py-2.5 rounded-xl border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50"
                            title={`Log +${c.step}${c.unit}`}
                          >
                            {loadingAction ? (
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent" />
                            ) : (
                              <>
                                <Plus size={13} /> +{c.step}{c.unit}
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => handleCompleteChallenge(c._id)}
                          disabled={loadingAction}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                          title="Complete Challenge fully"
                        >
                          {loadingAction ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <CheckCircle size={13} /> Complete
                            </>
                          )}
                        </button>
                      </div>

                      {/* Manual / Custom Input Option */}
                      {c.target > 1 && (
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1.5 rounded-xl">
                          <Edit3 size={13} className="text-gray-400 ml-1 shrink-0" />
                          <input
                            type="number"
                            min="1"
                            max={c.target}
                            placeholder={`e.g. ${c.target === 5000 ? '750' : Math.round(c.target / 4)}`}
                            value={customInputs[c._id] || ''}
                            onChange={(e) =>
                              setCustomInputs((prev) => ({ ...prev, [c._id]: e.target.value }))
                            }
                            className="w-full bg-transparent text-xs font-bold text-gray-800 placeholder:text-gray-400 focus:outline-none px-1"
                          />
                          <span className="text-[10px] font-bold text-gray-400 mr-1 shrink-0">
                            {c.unit}
                          </span>
                          <button
                            onClick={() => handleLogProgress(c._id, customInputs[c._id])}
                            disabled={loadingAction || !customInputs[c._id] || Number(customInputs[c._id]) <= 0}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Showcase Grid Section */}
      <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Health Badges Showcase</h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            Badges unlock exclusively when you complete the daily challenges or hit milestone point targets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-2">
          {badgesConfig.map((badge) => {
            const isUnlocked = userUnlockedBadges.includes(badge.key);
            const IconComponent = badge.icon;
            
            return (
              <div
                key={badge.key}
                className={`flex flex-col items-center text-center p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden group ${
                  isUnlocked
                    ? `bg-white border-emerald-200 shadow-md shadow-emerald-500/5`
                    : 'bg-gray-50/50 border-gray-200/60 opacity-50'
                }`}
              >
                {/* Visual Badge Icon */}
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center border-2 mb-4 transition-transform group-hover:scale-105 ${
                    isUnlocked
                      ? `${badge.color} shadow-lg`
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  <IconComponent size={28} className={isUnlocked ? 'animate-pulse' : ''} />
                </div>

                {/* Badge title & Description */}
                <h4 className={`text-sm font-black ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                  {badge.name}
                </h4>
                <p className="text-[11px] text-gray-400 font-semibold mt-1.5 leading-normal max-w-[150px]">
                  {badge.description}
                </p>

                {/* Locked indicator overlay */}
                {!isUnlocked && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] uppercase font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md">
                    Locked
                  </span>
                )}
                {isUnlocked && (
                  <span className="absolute top-2.5 right-2.5 text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                    Unlocked
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
