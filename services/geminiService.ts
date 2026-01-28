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
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (e) {
        // If response is not JSON
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.result;
  } catch (error: any) {
    console.error("Backend API Error:", error);
    
    // Handle Rate Limits
    if (error.message.includes("429") || error.message.includes("quota")) {
      return "⚠️ System is currently busy (Rate Limit). Please try again in a minute.";
    }
    
    // Handle Leaked/Invalid Key
    if (error.message.includes("403") || error.message.includes("leaked") || error.message.includes("PERMISSION_DENIED")) {
      return "⚠️ Authorization Error: The API Key has been revoked or is invalid. Please update the API_KEY in your server settings.";
    }

    // Handle Missing Key
    if (error.message.includes("API_KEY is missing")) {
      return "⚠️ System Error: The Server API Key is missing. Please configure it in Vercel Settings or .env file.";
    }

    // Return the actual error message so the user knows what went wrong
    return `⚠️ Error: ${error.message || "Unknown error occurred"}`;
  }
};

export const chatWithCoach = async (
  history: ChatMessage[], 
  newMessage: string,
  userContext: string
) => {
  const result = await callBackendApi('chat', { history, newMessage, userContext });
  if (result && result.startsWith("⚠️")) return result;
  return result || "I'm having trouble connecting to the server. Please check your connection or API configuration.";
};

export const generateNotes = async (topicOrText: string) => {
  const result = await callBackendApi('notes', { topic: topicOrText });
  return result || "Unable to generate notes at this time. Server might be misconfigured.";
};

export const solveDoubt = async (doubt: string, imageBase64?: string) => {
  const result = await callBackendApi('doubt', { doubt, image: imageBase64 });
  return result || "I couldn't solve this doubt right now. Please try again later.";
};

export const generateQuiz = async (topic: string, difficulty: string): Promise<QuizQuestion[]> => {
  const result = await callBackendApi('quiz', { topic, difficulty });
  // The backend returns the parsed JSON object directly. 
  // If it's a string (error message), we return empty array or handle it in UI.
  if (Array.isArray(result)) return result;
  // If it's an error string, we can't show it in the quiz component easily, 
  // but logging it helps debugging. 
  console.error("Quiz Generation Error:", result);
  return [];
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