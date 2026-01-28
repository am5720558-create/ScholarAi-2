import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Target, Clock, Trophy, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WEEKLY_DATA = [
  { name: 'Mon', hours: 2.5 },
  { name: 'Tue', hours: 3.8 },
  { name: 'Wed', hours: 4.2 },
  { name: 'Thu', hours: 3.0 },
  { name: 'Fri', hours: 5.5 },
  { name: 'Sat', hours: 6.0 },
  { name: 'Sun', hours: 4.5 },
];

const PERFORMANCE_DATA = [
  { subject: 'Math', score: 85 },
  { subject: 'Phys', score: 72 },
  { subject: 'Chem', score: 78 },
  { subject: 'Eng', score: 90 },
  { subject: 'CS', score: 95 },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <h3 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-lg ${color} text-white`}>
      {icon}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}! 👋</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ready to crush your goals today?</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-full text-orange-700 dark:text-orange-400 font-medium">
          <Flame size={20} className="mr-2" />
          <span>12 Day Streak!</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Study Hours" 
          value="24.5 hrs" 
          icon={<Clock size={20} />} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Topics Mastered" 
          value="18" 
          icon={<BookOpen size={20} />} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Mock Tests" 
          value="85% Avg" 
          icon={<Target size={20} />} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="XP Points" 
          value="2,450" 
          icon={<Trophy size={20} />} 
          color="bg-yellow-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study Activity Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Weekly Study Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="hours" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject Performance Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Subject Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PERFORMANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                />
                <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Next Goals / Plan */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Schedule</h3>
          <button onClick={() => navigate('/planner')} className="text-sm text-primary hover:underline">View Planner</button>
        </div>
        <div className="space-y-4">
          {[
            { time: '17:00', subject: 'Physics', topic: 'Thermodynamics revision', status: 'pending' },
            { time: '19:00', subject: 'Math', topic: 'Calculus problems', status: 'upcoming' },
            { time: '21:00', subject: 'Chemistry', topic: 'Organic chemistry notes', status: 'upcoming' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border-l-4 border-l-primary">
              <div className="w-16 font-mono text-sm text-gray-500 dark:text-gray-400">{item.time}</div>
              <div className="flex-1 ml-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.subject}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.topic}</p>
              </div>
              <div className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;