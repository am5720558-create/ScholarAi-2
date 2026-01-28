import { ChatMessage, QuizQuestion } from '../types';

// Helper to call our own backend
const callBackendApi = async (endpoint: string, body: any) => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint, // Specifies which logic to run (chat, notes, etc)
        ...body
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (error: any) {
    console.error("Backend API Error:", error);
    if (error.message.includes("429") || error.message.includes("quota")) {
      return "⚠️ System is currently busy (Rate Limit). Please try again in a minute.";
    }
    return null;
  }
};

export const chatWithCoach = async (
  history: ChatMessage[], 
  newMessage: string,
  userContext: string
) => {
  const result = await callBackendApi('chat', { history, newMessage, userContext });
  return result || "I'm having trouble connecting to the server right now. Please try again later.";
};

export const generateNotes = async (topicOrText: string) => {
  const result = await callBackendApi('notes', { topic: topicOrText });
  return result || "Unable to generate notes at this time.";
};

export const solveDoubt = async (doubt: string, imageBase64?: string) => {
  const result = await callBackendApi('doubt', { doubt, image: imageBase64 });
  return result || "I couldn't solve this doubt right now. Please try again later.";
};

export const generateQuiz = async (topic: string, difficulty: string): Promise<QuizQuestion[]> => {
  const result = await callBackendApi('quiz', { topic, difficulty });
  // The backend returns the parsed JSON object directly
  return result || [];
};

export const getCareerAdvice = async (profile: string, query: string): Promise<string> => {
  const result = await callBackendApi('career', { profile, query });
  return result || "I couldn't generate advice at this moment.";
};

export const generateStudyPlan = async (details: {
  subjects: string;
  hoursPerDay: string;
  examDate: string;
  weakAreas: string;
}) => {
  const result = await callBackendApi('plan', { details });
  return result || "I couldn't generate a study plan right now.";
};