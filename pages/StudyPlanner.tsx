import React, { useState } from 'react';
import { generateStudyPlan } from '../services/geminiService';
import { Calendar, Clock, BookOpen, AlertCircle, Loader2, Play } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';

const StudyPlanner: React.FC = () => {
  const [details, setDetails] = useState({
    subjects: '',
    hoursPerDay: '4',
    examDate: '',
    weakAreas: ''
  });
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.subjects) return;
    setLoading(true);
    try {
      const result = await generateStudyPlan(details);
      setPlan(result || "Could not generate plan.");
    } catch (error) {
      console.error(error);
      setPlan("Error generating plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Calendar className="text-blue-100" /> Personalized Study Planner
        </h1>
        <p className="mt-2 text-blue-50 max-w-2xl">
          Tell AI your subjects and weak spots. Get a perfect timetable instantly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-fit">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjects</label>
              <input 
                type="text" 
                placeholder="Math, Physics, English..." 
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
                value={details.subjects}
                onChange={e => setDetails({...details, subjects: e.target.value})}
                required
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Study Hours</label>
               <input 
                 type="number" 
                 min="1" max="16"
                 className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
                 value={details.hoursPerDay}
                 onChange={e => setDetails({...details, hoursPerDay: e.target.value})}
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Exam Date</label>
               <input 
                 type="date" 
                 className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
                 value={details.examDate}
                 onChange={e => setDetails({...details, examDate: e.target.value})}
               />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weak Areas</label>
               <textarea 
                 placeholder="e.g. Calculus integration, Organic Chemistry reactions"
                 className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 resize-none h-24"
                 value={details.weakAreas}
                 onChange={e => setDetails({...details, weakAreas: e.target.value})}
               />
            </div>
            <button 
              type="submit" 
              disabled={loading || !details.subjects}
              className="w-full py-2 bg-primary text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Generate Plan'}
            </button>
          </form>
        </div>

        {/* Output */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[500px]">
          {plan ? (
             <div className="text-gray-800 dark:text-gray-200">
               <MarkdownRenderer content={plan} />
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
               <Calendar size={64} className="mb-4" />
               <p>Your custom study plan will appear here.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default StudyPlanner;