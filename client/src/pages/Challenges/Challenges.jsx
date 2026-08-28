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
  Plus
} from 'lucide-react';

const badgesConfig = [
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
    description: 'Reach 200 health points milestone.',
    icon: Sparkles,
    color: 'from-emerald-400 to-teal-500 text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  {
    key: 'nutrition_master',
    name: 'Nutrition Master',
    description: 'Reach 600 health points milestone.',
    icon: Trophy,
    color: 'from-amber-400 to-orange-500 text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    key: 'diet_legend',
    name: 'Diet Legend',
    description: 'Reach 1200 health points milestone.',
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
        // Sync context user
        const token = localStorage.getItem('calorify_token');
        login(profileRes.value.data, token);
      }

      if (challengeRes.status === 'fulfilled') {
        setChallenges(challengeRes.value.data);
      }

      if (progressRes.status === 'fulfilled') {
        const data = progressRes.value.data || [];
        if (data.length > 0) {
          setCurrentStreak(data[data.length - 1].streak);
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

  // Handle logging incremental progress (+Step)
  const handleLogProgress = async (id) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: true }));
      const { data } = await logChallengeProgress(id);

      // Refresh list
      setChallenges(prev => prev.map(c => c._id === id ? data.challenge : c));

      // Re-fetch profile for updated points and unlocked badges
      const profileRes = await getUserProfile();
      setProfile(profileRes.data);
      const token = localStorage.getItem('calorify_token');
      login(profileRes.data, token);

      // Check if badge unlocked
      if (data.unlockedBadge) {
        const badgeObj = badgesConfig.find(b => b.key === data.unlockedBadge);
        if (badgeObj) {
          setUnlockedMessage(`🎉 Congratulations! You have unlocked the badge "${badgeObj.name}"!`);
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
          setUnlockedMessage(`🎉 Congratulations! You have unlocked the badge "${badgeObj.name}"!`);
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
  
  // Calculate next milestone progress
  const getMilestoneDetails = () => {
    if (userPoints < 200) {
      return {
        nextName: 'Healthy Starter',
        targetPoints: 200,
        pct: Math.min(Math.round((userPoints / 200) * 100), 100),
        pointsLeft: Math.max(200 - userPoints, 0)
      };
    } else if (userPoints < 600) {
      return {
        nextName: 'Nutrition Master',
        targetPoints: 600,
        pct: Math.min(Math.round((userPoints / 600) * 100), 100),
        pointsLeft: Math.max(600 - userPoints, 0)
      };
    } else if (userPoints < 1200) {
      return {
        nextName: 'Diet Legend',
        targetPoints: 1200,
        pct: Math.min(Math.round((userPoints / 1200) * 100), 100),
        pointsLeft: Math.max(1200 - userPoints, 0)
      };
    } else {
      return {
        nextName: 'Diet Legend Max',
        targetPoints: 1200,
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
    return Target;
  };

  // Count completed badges/challenges with badges today
  const completedBadgesCount = challenges.filter(c => c.completed && c.badgeKey).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
        <span className="text-sm font-semibold text-gray-500">Loading your challenges...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Banner/Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Trophy size={28} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Challenge Yourself</h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Build healthy habits, complete micro-challenges, and collect visual achievements.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti / Achievement Announcement */}
      {showConfetti && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-3xl shadow-xl text-center animate-bounce space-y-2 border border-emerald-400">
          <h3 className="text-2xl font-black">{unlockedMessage}</h3>
          <p className="text-sm font-bold text-emerald-100">Check out your shiny new badge in the showcase below! Keep it up!</p>
        </div>
      )}

      {/* Point Dashboard and Streaks widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Points Display & Milestone Gauge */}
        <div className="lg:col-span-2 bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Your Daily Score</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-black text-gray-900 tabular-nums">{userPoints}</span>
                <span className="text-sm font-extrabold text-gray-500">pts achieved</span>
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center gap-6">
              <div className="text-center bg-orange-50 border border-orange-100 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-1.5 justify-center text-orange-600">
                  <Flame size={16} className="animate-pulse" />
                  <span className="text-lg font-black">{currentStreak}</span>
                </div>
                <p className="text-[9px] uppercase font-bold text-orange-700 tracking-wider mt-0.5">Day Streak</p>
              </div>

              <div className="text-center bg-blue-50 border border-blue-100 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-1.5 justify-center text-blue-600">
                  <Award size={16} />
                  <span className="text-lg font-black">{completedBadgesCount}</span>
                </div>
                <p className="text-[9px] uppercase font-bold text-blue-700 tracking-wider mt-0.5">Badges Completed Today</p>
              </div>
            </div>
          </div>

          {/* Progress bar to next milestone */}
          <div className="space-y-2 border-t border-gray-100 pt-6">
            <div className="flex justify-between text-xs font-bold text-gray-600">
              <span className="flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500" />
                Next Milestone: <strong className="text-gray-900">{milestone.nextName}</strong>
              </span>
              <span>{milestone.pct}% ({milestone.pointsLeft} pts left)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${milestone.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Small explanation / motivational widget */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap size={22} className="text-yellow-300 fill-yellow-300" />
            </div>
            <h3 className="text-lg font-black">Micro-Habits Matter</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Achieving long-term fitness goals isn't just about massive workout sessions—it is about daily consistency. Track micro accomplishments step-by-step to build healthy lasting streaks.
            </p>
          </div>
          <p className="text-[10px] text-emerald-200 mt-4">
            *Challenges refresh every midnight. Complete them to earn badging levels.
          </p>
        </div>

      </div>

      {/* Daily Challenges Grid Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 px-1">Today's Daily Micro-Challenges</h2>
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
                  isCompleted ? 'border-emerald-200 bg-emerald-50/10' : 'border-gray-150 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <span className={`p-3 rounded-2xl ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                      <Icon size={20} />
                    </span>
                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
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

                {/* Log buttons at bottom */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  {isCompleted ? (
                    <div className="w-full py-2.5 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle size={14} /> Completed
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {/* Log incremental bits */}
                      <button
                        onClick={() => handleLogProgress(c._id)}
                        disabled={loadingAction}
                        className="flex-1 py-2.5 rounded-2xl border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50"
                        title={`Log +${c.step}${c.unit}`}
                      >
                        {loadingAction ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent" />
                        ) : (
                          <>
                            <Plus size={14} /> +{c.step}{c.unit}
                          </>
                        )}
                      </button>

                      {/* Complete fully in one tap */}
                      <button
                        onClick={() => handleCompleteChallenge(c._id)}
                        disabled={loadingAction}
                        className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                        title="Complete Challenge fully"
                      >
                        {loadingAction ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <CheckCircle size={14} /> Complete
                          </>
                        )}
                      </button>
                    </div>
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
            Complete habit challenges or hit point thresholds to unlock these achievements.
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
                    : 'bg-gray-50/50 border-gray-200/60 opacity-60'
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
