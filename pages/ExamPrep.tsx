import React, { useState } from 'react';
import { generateQuiz } from '../services/geminiService';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, Play, ChevronRight, RefreshCcw } from 'lucide-react';

const ExamPrep: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const startQuiz = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setQuestions([]);
    setScore(0);
    setCurrentQIndex(0);
    setQuizFinished(false);
    
    try {
      const generatedQs = await generateQuiz(topic, difficulty);
      if (generatedQs.length > 0) {
        setQuestions(generatedQs);
      } else {
        alert("Could not generate questions. Please try a clearer topic.");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return; // Prevent changing answer
    setSelectedOption(index);
    setShowExplanation(true);
    if (index === questions[currentQIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exam Prep Mode</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Generate custom mock tests for any subject.</p>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">Topic / Chapter</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Thermodynamics, Indian Constitution, Organic Chemistry"
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-left">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary outline-none"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
                <option>Competitive Exam (JEE/NEET/UPSC)</option>
              </select>
            </div>
            <button
              onClick={startQuiz}
              disabled={loading || !topic}
              className="w-full py-3 bg-primary hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? "Generating Quiz..." : <><Play className="mr-2" size={20} /> Start Mock Test</>}
            </button>
          </div>
        </div>
      ) : !quizFinished ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Question {currentQIndex + 1}/{questions.length}</span>
            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Score: {score}</span>
          </div>
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-medium mb-6 text-gray-900 dark:text-white">{questions[currentQIndex].question}</h2>
            <div className="space-y-3">
              {questions[currentQIndex].options.map((option, idx) => {
                let btnClass = "w-full text-left p-4 rounded-lg border transition-all ";
                if (selectedOption === null) {
                  btnClass += "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700";
                } else {
                  if (idx === questions[currentQIndex].correctAnswer) {
                    btnClass += "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-300";
                  } else if (idx === selectedOption) {
                    btnClass += "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300";
                  } else {
                    btnClass += "border-gray-200 dark:border-gray-700 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={selectedOption !== null}
                    className={btnClass}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {option}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-sm">
                <span className="font-bold text-blue-800 dark:text-blue-300">Explanation: </span>
                <span className="text-blue-900 dark:text-blue-200">{questions[currentQIndex].explanation}</span>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={nextQuestion}
                disabled={selectedOption === null}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50 flex items-center"
              >
                {currentQIndex === questions.length - 1 ? "Finish" : "Next"} <ChevronRight className="ml-1" size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
          <h2 className="text-3xl font-bold mb-4">Quiz Completed!</h2>
          <div className="text-6xl font-black text-primary mb-2">
            {Math.round((score / questions.length) * 100)}%
          </div>
          <p className="text-gray-500 mb-8">You answered {score} out of {questions.length} correctly.</p>
          <button onClick={() => setQuestions([])} className="mx-auto px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg flex items-center hover:opacity-90">
             <RefreshCcw className="mr-2" /> Try Another Topic
          </button>
        </div>
      )}
    </div>
  );
};

export default ExamPrep;