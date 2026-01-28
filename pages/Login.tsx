import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, ArrowRight, Check } from 'lucide-react';
import { User } from '../types';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    grade: 'Class 11',
    stream: 'Science',
    otherExam: ''
  });

  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  const toggleExam = (exam: string) => {
    setSelectedExams(prev => 
      prev.includes(exam) 
        ? prev.filter(e => e !== exam)
        : [...prev, exam]
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine selected exams and custom exam
    const finalExams = [...selectedExams];
    if (formData.otherExam.trim()) {
      finalExams.push(formData.otherExam.trim());
    }

    const newUser: User = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      grade: formData.grade,
      stream: formData.stream as 'Science' | 'Commerce' | 'Arts' | 'General',
      competitiveExams: finalExams
    };

    login(newUser);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary">
          <GraduationCap size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Join ScholarAI
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Set up your profile to get personalized guidance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-gray-700">
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Arjun Kumar"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@example.com"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Grade */}
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Class
                </label>
                <select
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-gray-50 dark:bg-gray-900 dark:text-white"
                >
                  <option>Class 9</option>
                  <option>Class 10</option>
                  <option>Class 11</option>
                  <option>Class 12</option>
                </select>
              </div>

              {/* Stream */}
              <div>
                <label htmlFor="stream" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Stream
                </label>
                <select
                  id="stream"
                  name="stream"
                  value={formData.stream}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-gray-50 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
                </select>
              </div>
            </div>

            {/* Competitive Exams */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Competitive Exams
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {['JEE', 'NEET', 'CUET', 'CLAT'].map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => toggleExam(exam)}
                    className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      selectedExams.includes(exam)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {selectedExams.includes(exam) && <Check size={14} className="mr-1.5" />}
                    {exam}
                  </button>
                ))}
              </div>
              <input
                type="text"
                name="otherExam"
                value={formData.otherExam}
                onChange={handleChange}
                placeholder="Any other exam? (e.g. UPSC, CA)"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Start Learning <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
            
            <div className="text-center text-xs text-gray-400">
               By joining, you agree to share your study preferences with our AI Coach.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;