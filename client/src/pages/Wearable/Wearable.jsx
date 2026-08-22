import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Activity,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  getWearableStatus,
  getWearableAuthUrl,
  syncWearableNow,
  getWearableToday,
  disconnectWearable,
} from '../../services/wearableService';

export default function Wearable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error' | 'info', message: string }

  const DAILY_STEP_GOAL = 10000;

  // Load initial status & data on mount
  useEffect(() => {
    // Check for query parameters from OAuth callback redirect
    const connectedParam = searchParams.get('connected');
    const errorParam = searchParams.get('error');

    if (connectedParam === 'true') {
      setBanner({
        type: 'success',
        message: '🎉 Successfully connected to Google Health! Your wearable data has been synchronized.',
      });
      // Clean query params from URL
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

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const { data } = await getWearableAuthUrl();
      if (data?.url) {
        window.location.href = data.url; // Redirect to Google OAuth consent screen
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
      // Refresh status and today's data
      await fetchWearableData();
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

  const stepPercentage = Math.min(
    Math.round(((todayData.steps || 0) / DAILY_STEP_GOAL) * 100),
    100
  );

  const netCalories = (todayData.caloriesConsumed || 0) - (todayData.caloriesBurned || 0);

  // Approximate distance (avg stride ~0.75m)
  const approxDistanceKm = ((todayData.steps || 0) * 0.00075).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Top Header & Hero ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Watch size={28} />
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Wearable & Health Sync
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
                Automatically ingest daily steps, active calorie burn, and wearable fitness metrics.
              </p>
            </div>
          </div>
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

      {/* ── Status Banner Alert ── */}
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

      {/* ── Main 2-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Column: Connection Hub (5 cols) ── */}
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
              /* ── Not Connected State ── */
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

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Direct sync with Pixel Watch, Fitbit & Android Wear
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Real-time steps & active energy tracking
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-gray-600 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Feeds automatically into your Daily Calorie Balance
                  </div>
                </div>

                <button
                  onClick={handleConnectGoogle}
                  disabled={connecting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-emerald-500 text-gray-800 font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition group disabled:opacity-60"
                >
                  {connecting ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent" />
                      Redirecting to Google...
                    </div>
                  ) : (
                    <>
                      {/* Google G SVG */}
                      <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      <span className="text-sm">Connect Google Health</span>
                      <ArrowRight size={16} className="text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* ── Connected State ── */
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Live Sync Active
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-xs text-emerald-700 font-medium">
                    Your Google Health token is authenticated. Click "Sync Now" anytime to pull your latest wearable records.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-sm">
                    <span className="text-gray-500 font-medium">Auth Provider</span>
                    <span className="font-bold text-gray-800">Google Health v4</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-sm">
                    <span className="text-gray-500 font-medium">Sync Frequency</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                      Manual On-Demand
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 text-sm">
                    <span className="text-gray-500 font-medium">Last Synced</span>
                    <span className="font-semibold text-gray-800 text-xs">
                      {status.lastSyncedAt
                        ? new Date(status.lastSyncedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Never synced yet'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Fetching Live Data...' : 'Sync Fresh Data Now'}
                </button>
              </div>
            )}
          </div>

          {/* Device compatibility card */}
          <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-xs space-y-3">
            <h4 className="text-sm font-extrabold text-[#0F172A] flex items-center gap-2.5">
              <span className="p-2 bg-[#10B981]/10 text-[#10B981] rounded-xl">
                <Watch size={18} />
              </span>
              Supported Wearable Devices
            </h4>
            <p className="text-xs text-[#565e74] leading-relaxed">
              Google Pixel Watch, Samsung Galaxy Watch (via Health Connect), Fitbit Charge / Sense, Mi Band, Garmin & any fitness tracker synced with Google Health.
            </p>
          </div>
        </div>

        {/* ── Right Column: Live Data & Energy Balance (7 cols) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Steps & Burned Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Step Counter Card */}
            <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Footprints size={24} />
                </span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  Goal: {DAILY_STEP_GOAL.toLocaleString()}
                </span>
              </div>

              <div>
                <p className="text-xs text-[#565e74] font-bold uppercase tracking-wider mb-1">
                  Steps Recorded Today
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0F172A]">
                    {(todayData.steps || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-[#565e74]">steps</span>
                </div>
              </div>

              {/* Step Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-[#565e74]">
                  <span>{stepPercentage}% of daily goal</span>
                  <span>~{approxDistanceKm} km</span>
                </div>
                <div className="w-full bg-[#f2f3f9] rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-teal-400 h-full rounded-full transition-all duration-700"
                    style={{ width: `${stepPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Calorie Burn Card */}
            <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                  <Flame size={24} />
                </span>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                  Active Burn
                </span>
              </div>

              <div>
                <p className="text-xs text-[#565e74] font-bold uppercase tracking-wider mb-1">
                  Active Calories Burned
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[#0F172A]">
                    {todayData.caloriesBurned || 0}
                  </span>
                  <span className="text-xs font-semibold text-[#565e74]">kcal</span>
                </div>
              </div>

              <p className="text-xs text-[#565e74] leading-relaxed">
                Ingested from active workouts, walking, and physical movement captured by your wearable.
              </p>
            </div>
          </div>

          {/* ── Today's Calorie Balance Card ── */}
          <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#0F172A] text-lg flex items-center gap-2.5">
                <Zap size={20} className="text-amber-500" />
                Today's Calorie Balance
              </h3>
              <span className="text-xs text-[#565e74] font-medium">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {/* Consumed */}
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  Diet Consumed
                </p>
                <p className="text-xl sm:text-2xl font-black text-emerald-900">
                  {todayData.caloriesConsumed || 0}
                  <span className="text-xs font-normal text-emerald-700 ml-1">kcal</span>
                </p>
              </div>

              {/* Burned */}
              <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider mb-1">
                  Wearable Burn
                </p>
                <p className="text-xl sm:text-2xl font-black text-orange-900">
                  {todayData.caloriesBurned || 0}
                  <span className="text-xs font-normal text-orange-700 ml-1">kcal</span>
                </p>
              </div>

              {/* Net Balance */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-center">
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">
                  Net Balance
                </p>
                <p className={`text-xl sm:text-2xl font-black ${netCalories >= 0 ? 'text-blue-900' : 'text-purple-900'}`}>
                  {netCalories > 0 ? `+${netCalories}` : netCalories}
                  <span className="text-xs font-normal text-blue-700 ml-1">kcal</span>
                </p>
              </div>
            </div>

            {/* Insight explanation */}
            <div className="p-4 bg-[#f8f9ff] rounded-2xl border border-[#e1e2e8] text-xs text-[#565e74] flex items-start gap-3">
              <TrendingUp size={18} className="text-[#10B981] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Energy Balance Insight:</strong> Your Net Calorie Balance represents calories consumed minus active energy expended. Maintaining a slight deficit supports gradual weight loss, while a surplus supports muscle gain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
