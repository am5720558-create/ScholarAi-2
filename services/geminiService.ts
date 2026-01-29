import { ChatMessage, QuizQuestion } from '../types';

// Generic fetch wrapper to talk to Vercel Backend
const callService = async (endpoint: string, body: any) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, ...body }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Throw the error message returned by the server (e.g., "API Key is missing")
      throw new Error(data.error || `Server Error: ${response.status}`);
    }

    return data.result;
  } catch (error: any) {
    console.error(`Service Call Failed [${endpoint}]:`, error);
    throw error;
  }
};

// --- Exported Functions ---

export const chatWithCoach = async (history: ChatMessage[], newMessage: string, userContext: string) => {
  return callService('chat', { history, newMessage, userContext });
};

export const generateNotes = async (topicOrText: string) => {
  return callService('notes', { topic: topicOrText });
};

export const solveDoubt = async (doubt: string, imageBase64?: string) => {
  return callService('doubt', { doubt, image: imageBase64 });
};

export const generateQuiz = async (topic: string, difficulty: string): Promise<QuizQuestion[]> => {
  const result = await callService('quiz', { topic, difficulty });
  return Array.isArray(result) ? result : [];
};

export const getCareerAdvice = async (profile: string, query: string): Promise<string> => {
  return callService('career', { profile, query });
};

export const generateStudyPlan = async (details: any) => {
  return callService('plan', { details });
};