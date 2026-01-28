import React, { useState } from 'react';
import { getCareerAdvice } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Compass, Loader2 } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';

const CareerAI: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [advice, setAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGetAdvice = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const profileStr = `Grade: ${user?.grade}, Stream: ${user?.stream}`;
      const result = await getCareerAdvice(profileStr, query);
      setAdvice(result);
    } catch (e) {
      console.error(e);
      setAdvice("Error retrieving career advice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Compass className="text-yellow-300" /> Career Guidance AI
        </h1>
        <p className="mt-2 text-indigo-100 max-w-2xl">
          Confused about Science vs Commerce? Want to know the salary of a Data Scientist in India? 
          Ask anything about your future.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What's on your mind?
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., 'Best engineering colleges in India for CS' or 'Scope of Arts stream'"
            className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
          />
          <button
            onClick={handleGetAdvice}
            disabled={loading || !query}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Get Guidance'}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {['Scope of PCM', 'Commerce without Math', 'UPSC Preparation', 'Design Careers'].map(tag => (
            <button 
              key={tag}
              onClick={() => setQuery(tag)}
              className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {advice && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border-t-4 border-violet-500 animate-fade-in">
          <h3 className="text-xl font-bold mb-4 flex items-center text-gray-900 dark:text-white">
            <Briefcase className="mr-2 text-violet-500" /> Career Insights
          </h3>
          <div className="text-gray-700 dark:text-gray-300">
            <MarkdownRenderer content={advice} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerAI;