import React, { useState } from 'react';
import { solveDoubt } from '../services/geminiService';
import { Camera, Send, Loader2, AlertCircle } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';

const DoubtSolver: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!question.trim() && !image) || loading) return;

    setLoading(true);
    setAnswer(null);

    try {
      // Clean base64 string if present (remove "data:image/jpeg;base64,")
      const base64Data = image ? image.split(',')[1] : undefined;
      const response = await solveDoubt(question, base64Data);
      setAnswer(response || "Sorry, I couldn't solve that right now.");
    } catch (error) {
      console.error(error);
      setAnswer("An error occurred while fetching the solution.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Instant Doubt Solver</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Stuck on a problem? Upload a photo or type it out.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here... (e.g. 'Solve for x: 2x + 5 = 15')"
            className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none resize-none h-32"
          />
          
          <div className="flex items-center space-x-4">
             <label className="cursor-pointer flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
               <Camera size={20} className="text-gray-500" />
               <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Image</span>
               <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
             </label>
             {image && (
               <div className="relative h-12 w-12 rounded overflow-hidden border border-gray-300">
                 <img src={image} alt="Preview" className="h-full w-full object-cover" />
                 <button 
                   type="button" 
                   onClick={() => setImage(null)}
                   className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-bl text-xs"
                 >
                   ×
                 </button>
               </div>
             )}
             <div className="flex-1"></div>
             <button
               type="submit"
               disabled={loading || (!question && !image)}
               className="flex items-center space-x-2 bg-secondary hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-md disabled:opacity-50"
             >
               {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
               <span>Solve</span>
             </button>
          </div>
        </form>
      </div>

      {answer && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-secondary to-emerald-600 p-4 text-white font-medium flex items-center">
            <AlertCircle className="mr-2" size={20} /> Solution
          </div>
          <div className="p-6">
            <div className="text-gray-800 dark:text-gray-200">
              <MarkdownRenderer content={answer} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubtSolver;