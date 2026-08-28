import { useState, useEffect } from 'react';
import { getProgress, logProgress } from '../../services/progressService';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Flame, CheckCircle, Target } from 'lucide-react';

// Joyful and vibrant colors
const THEME = {
  primary: '#10b981', // Emerald
  secondary: '#34d399', // Light Emerald
  gradient: 'bg-gradient-to-br from-emerald-400 via-green-400 to-teal-300',
  cardBg: 'bg-white/90 backdrop-blur-md',
};

export default function Progress() {
  const [entries, setEntries] = useState([]);
  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await getProgress();
      const data = res.data || [];
      setEntries(data);
      if (data.length > 0) {
        setCurrentStreak(data[data.length - 1].streak);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await logProgress({ weight: Number(weight), adherence });
      // Reset form and refresh data
      setWeight('');
      setAdherence(false);
      fetchProgress();
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // Format data for chart
  const chartData = entries.map(entry => ({
    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: entry.weight
  })).filter(entry => entry.weight > 0);

  return (
    <div className={`min-h-screen ${THEME.gradient} p-4 sm:p-8 flex flex-col items-center`}>
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white/20 p-6 rounded-3xl shadow-lg backdrop-blur-md border border-white/30">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white rounded-full shadow-md text-emerald-500">
              <Target size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white drop-shadow-md">My Progress</h1>
              <p className="text-white/90 font-medium mt-1">Every step counts! Keep up the great work.</p>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-xl transform hover:scale-105 transition-transform">
            <Flame className="text-emerald-500 animate-pulse" size={32} />
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Current Streak</p>
              <p className="text-3xl font-extrabold text-gray-800">{currentStreak} <span className="text-lg text-gray-500">Days</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className={`${THEME.cardBg} rounded-3xl shadow-2xl p-8 lg:col-span-1 border border-white/50`}>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" /> Log Today
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-100/50 transition-colors shadow-inner" 
                onClick={() => setAdherence(!adherence)}
              >
                <div>
                  <h3 className="font-bold text-gray-800">Diet Plan Adherence</h3>
                  <p className="text-xs text-gray-500 mt-1">Did you follow your meals today?</p>
                </div>
                <div className={`w-14 h-8 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner ${adherence ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${adherence ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg shadow-lg hover:shadow-emerald-500/30 transform hover:-translate-y-1 transition-all"
              >
                Save Progress
              </button>
            </form>
          </div>

          {/* Chart */}
          <div className={`${THEME.cardBg} rounded-3xl shadow-2xl p-8 lg:col-span-2 border border-white/50 flex flex-col`}>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Weight Journey</h2>
            {chartData.length > 0 ? (
              <div className="w-full flex-grow min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888" 
                      tick={{ fill: '#888', fontSize: 12, fontWeight: 500 }} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']} 
                      stroke="#888" 
                      tick={{ fill: '#888', fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${val.toFixed(1)}kg`}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      cursor={{ stroke: '#34d399', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="url(#colorWeight)" 
                      strokeWidth={5} 
                      dot={{ r: 6, fill: '#fff', stroke: '#10b981', strokeWidth: 3 }}
                      activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full flex-grow min-h-[320px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                <Target size={48} className="mb-4 text-gray-300" />
                <p className="text-xl font-bold text-gray-400">No weight data logged yet</p>
                <p className="text-sm mt-2 text-gray-400">Log your first entry on the left to see your journey!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
