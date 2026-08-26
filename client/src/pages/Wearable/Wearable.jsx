import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Watch,
  RefreshCw,
  Unlink,
  Footprints,
  Flame,
  Zap,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Info,
  CheckCircle,
  Target,
  FileText
} from 'lucide-react';
import {
  getWearableStatus,
  getWearableAuthUrl,
  syncWearableNow,
  getWearableToday,
  disconnectWearable,
} from '../../services/wearableService';
import { getProgress, logProgress } from '../../services/progressService';
import { 
  LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function Wearable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Wearable State
  const [status, setStatus] = useState({ connected: false, lastSyncedAt: null });
  const [todayData, setTodayData] = useState({
    steps: 0,
    caloriesBurned: 0,
    caloriesConsumed: 0,
    date: null,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [banner, setBanner] = useState(null);

  // Progress State
  const [progressEntries, setProgressEntries] = useState([]);
  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState('');

  const DAILY_STEP_GOAL = 10000;

  useEffect(() => {
    const connectedParam = searchParams.get('connected');
    const errorParam = searchParams.get('error');

    if (connectedParam === 'true') {
      setBanner({
        type: 'success',
        message: '🎉 Successfully connected to Google Health! Your wearable data has been synchronized.',
      });
      searchParams.delete('connected');
      setSearchParams(searchParams, { replace: true });
    } else if (errorParam) {
      const errorMessages = {
        google_denied: 'Google authorization was cancelled. You can connect anytime.',
        google_auth_failed: 'Google authentication failed. Please check your connection and try again.',
        missing_params: 'OAuth response was missing required authentication parameters.',
        invalid_state: 'Authentication session expired or was invalid. Please try connecting again.',
      };
      setBanner({
        type: 'error',
        message: errorMessages[errorParam] || 'Failed to authenticate with Google Health.',
      });
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }

    fetchWearableData();
    fetchProgressData();
  }, []);

  const fetchWearableData = async () => {
    try {
      setLoading(true);
      const [statusRes, todayRes] = await Promise.allSettled([
        getWearableStatus(),
        getWearableToday(),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data);
      }
      if (todayRes.status === 'fulfilled') {
        setTodayData(todayRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching wearable data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressData = async () => {
    try {
      const res = await getProgress();
      const data = res.data || [];
      setProgressEntries(data);
      if (data.length > 0) {
        setCurrentStreak(data[data.length - 1].streak);
        
        // Set default month to latest entry's month if none selected
        if (!selectedMonth) {
          const latestDate = new Date(data[data.length - 1].date);
          const monthStr = `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, '0')}`;
          setSelectedMonth(monthStr);
        }
      } else {
        // Default to current month if no data
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!selectedMonth) setSelectedMonth(monthStr);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const { data } = await getWearableAuthUrl();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setBanner({ type: 'error', message: 'Unable to generate Google authorization URL.' });
      }
    } catch (err) {
      console.error('Auth URL error:', err);
      setBanner({
        type: 'error',
        message: err.response?.data?.message || 'Failed to initialize Google Health authorization.',
      });
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const { data } = await syncWearableNow();
      setBanner({
        type: 'success',
        message: `✅ Synced successfully! Recorded ${data?.data?.steps?.toLocaleString() || 0} steps & ${data?.data?.caloriesBurned || 0} kcal burned.`,
      });
      await fetchWearableData();
      await fetchProgressData(); // Sync might update today's progress
    } catch (err) {
      console.error('Manual sync error:', err);
      if (err.response?.data?.requiresReconnect) {
        setBanner({
          type: 'error',
          message: 'Google Health session expired. Please disconnect and reconnect your account.',
        });
      } else {
        setBanner({
          type: 'error',
          message: err.response?.data?.message || 'Failed to sync with Google Health.',
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Health? Your existing logged entries will remain safe.')) {
      return;
    }
    try {
      setLoading(true);
      await disconnectWearable();
      setStatus({ connected: false, lastSyncedAt: null });
      setBanner({
        type: 'info',
        message: 'Disconnected from Google Health. You can reconnect anytime.',
      });
    } catch (err) {
      console.error('Disconnect error:', err);
      setBanner({ type: 'error', message: 'Failed to disconnect Google Health.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogProgress = async (e) => {
    e.preventDefault();
    try {
      await logProgress({ weight: Number(weight), adherence });
      setWeight('');
      setAdherence(false);
      setBanner({ type: 'success', message: '✅ Progress logged successfully!' });
      fetchProgressData();
    } catch (error) {
      console.error('Error saving progress:', error);
      setBanner({ type: 'error', message: 'Failed to log progress.' });
    }
  };

  const stepPercentage = Math.min(
    Math.round(((todayData.steps || 0) / DAILY_STEP_GOAL) * 100),
    100
  );
  const netCalories = (todayData.caloriesConsumed || 0) - (todayData.caloriesBurned || 0);
  const approxDistanceKm = ((todayData.steps || 0) * 0.00075).toFixed(1);

  // Derive unique months for the dropdown
  const monthsSet = new Set();
  progressEntries.forEach(entry => {
    const d = new Date(entry.date);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(mStr);
  });
  const availableMonths = Array.from(monthsSet).sort().reverse();
  
  if (availableMonths.length === 0) {
    const now = new Date();
    availableMonths.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }

  const formatMonthLabel = (mStr) => {
    const [year, month] = mStr.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filter Data by Month
  const filteredEntries = progressEntries.filter(entry => {
    if (!selectedMonth) return true;
    const d = new Date(entry.date);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return mStr === selectedMonth;
  });

  const chartData = filteredEntries.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight,
    caloriesConsumed: entry.caloriesConsumed || 0,
    caloriesBurned: entry.caloriesBurned || 0,
    netCalories: (entry.caloriesConsumed || 0) - (entry.caloriesBurned || 0)
  }));
  
  const weightData = chartData.filter(entry => entry.weight > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* ── Top Header & Hero ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <TrendingUp size={28} />
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Progress & Wearables
                </h1>
                {status.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Track your weight journey, calorie balance, and auto-sync fitness data from Google Health.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Current Streak</p>
            <p className="text-2xl font-extrabold text-emerald-600">{currentStreak} <span className="text-sm text-gray-500">Days</span></p>
          </div>
          {status.connected && (
            <div className="flex items-center gap-3 self-start md:self-auto">
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-60"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={handleDisconnect}
                className="p-2.5 rounded-2xl border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
                title="Disconnect Google Health"
              >
                <Unlink size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-start justify-between gap-3 p-4 rounded-2xl border transition-all ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : banner.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {banner.type === 'success' && <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />}
            {banner.type === 'error' && <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />}
            {banner.type === 'info' && <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />}
            <p className="text-sm font-medium">{banner.message}</p>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Top Half: Wearable & Live Data ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Connection Hub (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2.5">
                <Smartphone size={20} className="text-emerald-600" />
                Google Health Connection
              </h3>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                API v4
              </span>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse py-4">
                <div className="h-5 bg-gray-100 rounded-lg w-3/4" />
                <div className="h-10 bg-gray-100 rounded-2xl" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ) : !status.connected ? (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-center gap-3 text-gray-800 font-semibold text-sm">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    Secure OAuth 2.0 Ingestion
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Connect your Google account to automatically import step counts and calorie burn directly from your smartwatch, fitness tracker, or phone.
                  </p>
                </div>
                <button
                  onClick={handleConnectGoogle}
                  disabled={connecting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-emerald-500 text-gray-800 font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition group disabled:opacity-60"
                >
                  {connecting ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent" />
                      Redirecting...
                    </div>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      <span className="text-sm">Connect Google Health</span>
                      <ArrowRight size={16} className="text-gray-400 group-hover:text-emerald-600 transition" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Live Sync Active</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-xs text-emerald-700 font-medium">Your Google Health token is authenticated.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-sm">
                    <span className="text-gray-500 font-medium">Auth Provider</span>
                    <span className="font-bold text-gray-800">Google Health v4</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 text-sm">
                    <span className="text-gray-500 font-medium">Last Synced</span>
                    <span className="font-semibold text-gray-800 text-xs">
                      {status.lastSyncedAt
                        ? new Date(status.lastSyncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'Never synced yet'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Supported Devices Card (Compressed to match height) */}
          <div className="bg-white rounded-3xl shadow-sm p-5 sm:p-6 border border-gray-100 flex flex-col space-y-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base">
              <Watch className="text-emerald-500" size={18} strokeWidth={2.5} /> Supported Devices
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center p-2 shrink-0">
                  <svg viewBox="0 0 48 48" className="w-full h-full">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Google Health</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">Available</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50/30 rounded-2xl border border-gray-100 opacity-70">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center p-2.5 shrink-0 text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm3.36 10.23-1.42 1.41-1.28-1.28-1.28 1.28-1.41-1.41 1.28-1.28-1.28-1.28 1.41-1.41 1.28 1.28 1.28-1.28 1.42 1.41-1.28 1.28 1.28 1.28z"/></svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-500 text-sm">Apple Health</p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Data & Energy Balance (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Footprints size={24} /></span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">Goal: {DAILY_STEP_GOAL.toLocaleString()}</span>
              </div>
              <div>
                <p className="text-xs text-[#565e74] font-bold uppercase tracking-wider mb-1">Steps Recorded Today</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0F172A]">{(todayData.steps || 0).toLocaleString()}</span>
                  <span className="text-xs font-semibold text-[#565e74]">steps</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-[#565e74]">
                  <span>{stepPercentage}% of daily goal</span>
                  <span>~{approxDistanceKm} km</span>
                </div>
                <div className="w-full bg-[#f2f3f9] rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-full rounded-full transition-all duration-700" style={{ width: `${stepPercentage}%` }} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><Flame size={24} /></span>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">Active Burn</span>
              </div>
              <div>
                <p className="text-xs text-[#565e74] font-bold uppercase tracking-wider mb-1">Active Calories Burned</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0F172A]">{todayData.caloriesBurned || 0}</span>
                  <span className="text-xs font-semibold text-[#565e74]">kcal</span>
                </div>
              </div>
              <p className="text-xs text-[#565e74] leading-relaxed">Ingested from active workouts and physical movement captured by your wearable.</p>
            </div>
          </div>
          
          <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-lg flex items-center gap-2.5">
                <Zap size={20} className="text-amber-500" />
                Today's Calorie Balance
              </h3>
              <span className="text-xs text-[#565e74] font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Diet Consumed</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-900">{todayData.caloriesConsumed || 0}<span className="text-xs font-normal text-emerald-700 ml-1">kcal</span></p>
              </div>
              <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider mb-1">Wearable Burn</p>
                <p className="text-xl sm:text-2xl font-black text-orange-900">{todayData.caloriesBurned || 0}<span className="text-xs font-normal text-orange-700 ml-1">kcal</span></p>
              </div>
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Net Balance</p>
                <p className={`text-xl sm:text-2xl font-black ${netCalories >= 0 ? 'text-blue-900' : 'text-purple-900'}`}>
                  {netCalories > 0 ? `+${netCalories}` : netCalories}
                  <span className="text-xs font-normal text-blue-700 ml-1">kcal</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Half: Progress Tracker (Form + Charts) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Log Today Form (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl shadow-xs p-6 sm:p-7 border border-[#e1e2e8]">
            <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={24} /> Log Progress Today
            </h2>
            <form onSubmit={handleLogProgress} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Weight (kg)</label>
                <input 
                  type="number" 
                  step="0.1"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-gray-50/50 border-2 border-emerald-200 rounded-xl px-4 py-3 text-gray-800 font-medium focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-400"
                  placeholder="e.g. 70.5"
                />
              </div>

              <div 
                className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-100/50 transition-colors" 
                onClick={() => setAdherence(!adherence)}
              >
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Diet Plan Adherence</h3>
                  <p className="text-xs text-gray-500 mt-1">Did you follow your meals today?</p>
                </div>
                <div className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner ${adherence ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${adherence ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md hover:bg-emerald-700 hover:shadow-emerald-500/30 transition-all active:scale-95"
              >
                Save Progress
              </button>
            </form>
          </div>
        </div>

        {/* Charts (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl shadow-xs p-6 sm:p-7 border border-[#e1e2e8] flex flex-col space-y-6">
            
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Historical Data</h2>
                <p className="text-xs text-gray-500 mt-0.5">Monthly weight & calorie tracking</p>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
                <Link
                  to="/monthly-report"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition shadow-xs"
                >
                  <FileText size={15} />
                  <span>Full Report</span>
                </Link>
              </div>
            </div>

            {/* Weight Journey Chart */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" /> Weight Journey
              </h3>
              {weightData.length > 0 ? (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorWeight" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#34d399" stopOpacity={1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} dy={10}/>
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val.toFixed(1)}kg`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e1e2e8', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="weight" name="Weight" stroke="url(#colorWeight)" strokeWidth={4} dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <Target size={32} className="mb-2 text-gray-300" />
                  <p className="text-sm font-bold">No weight data for {formatMonthLabel(selectedMonth)}</p>
                </div>
              )}
            </div>

            {/* Calorie Logs Chart */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Flame size={18} className="text-orange-500" /> Calorie Logs (Consumed vs Burned)
              </h3>
              {chartData.length > 0 ? (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} dy={10}/>
                      <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e1e2e8', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                      />
                      <Bar dataKey="caloriesConsumed" name="Consumed (kcal)" fill="#34d399" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="caloriesBurned" name="Burned (kcal)" fill="#fb923c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-full h-72 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <AlertCircle size={32} className="mb-2 text-gray-300" />
                  <p className="text-sm font-bold">No calorie data for {formatMonthLabel(selectedMonth)}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
