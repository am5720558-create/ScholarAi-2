import { GoogleGenAI } from "@google/genai";
import { ChatMessage, QuizQuestion } from '../types';
import { SYSTEM_INSTRUCTION_COACH, SYSTEM_INSTRUCTION_CAREER } from '../constants';

const MODELS = {
  FAST: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview'
};

// --- Client-Side Fallback Logic ---

const getClientAI = () => {
  const key = localStorage.getItem('scholar_api_key');
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

const clientSideHandler = async (endpoint: string, body: any) => {
  const ai = getClientAI();
  if (!ai) {
    throw new Error("MISSING_LOCAL_KEY");
  }

  switch (endpoint) {
    case 'chat': {
      const { history, newMessage, userContext } = body;
      const formattedHistory = (history || []).map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));
      const chat = ai.chats.create({
        model: MODELS.FAST,
        config: {
          systemInstruction: `${SYSTEM_INSTRUCTION_COACH} \n\n User Context: ${userContext}`,
          temperature: 0.7,
        },
        history: formattedHistory
      });
      const res = await chat.sendMessage({ message: newMessage });
      return res.text;
    }

    case 'notes': {
      const { topic } = body;
      const prompt = `Role: Expert academic content writer. Task: Create exam-ready study notes on "${topic}". 
      Include: Definitions, Formulas (in Tables), Comparisons (in Tables), Step-by-step methods. 
      Format: Markdown with Headers (##) and Horizontal Rules (---).`;
      const res = await ai.models.generateContent({
        model: MODELS.FAST,
        contents: prompt,
        config: { temperature: 0.3 }
      });
      return res.text;
    }

    case 'doubt': {
      const { doubt, image } = body;
      const parts: any[] = [];
      if (image) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
      }
      parts.push({ text: `Solve this academic doubt step-by-step using Markdown. Doubt: ${doubt}` });
      const res = await ai.models.generateContent({
        model: MODELS.PRO,
        contents: { parts },
        config: { 
          systemInstruction: "You are an expert academic doubt solver. Think through the problem step-by-step.",
          thinkingConfig: { thinkingBudget: 2048 }
        }
      });
      return res.text;
    }

    case 'quiz': {
      const { topic, difficulty } = body;
      const prompt = `Generate 5 multiple choice questions (MCQs) for "${topic}" at "${difficulty}" level.
      Return ONLY a JSON array. Keys: id, question, options (array), correctAnswer (index), explanation.`;
      const res = await ai.models.generateContent({
        model: MODELS.FAST,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return JSON.parse(res.text || '[]');
    }

    case 'career': {
      const { profile, query } = body;
      const res = await ai.models.generateContent({
        model: MODELS.PRO,
        contents: `User Profile: ${profile}\n\nUser Query: ${query}\n\nUse Markdown tables and bullet points.`,
        config: { systemInstruction: SYSTEM_INSTRUCTION_CAREER }
      });
      return res.text;
    }

    case 'plan': {
      const { details } = body;
      const prompt = `Create a study plan. Subjects: ${details.subjects}. Hours: ${details.hoursPerDay}. 
      Exam: ${details.examDate}. Weakness: ${details.weakAreas}.
      Output: Weekly timetable in Markdown Table. Strategy section with bullet points.`;
      const res = await ai.models.generateContent({
        model: MODELS.PRO,
        contents: prompt,
        config: { temperature: 0.5 }
      });
      return res.text;
    }

    default:
      throw new Error("Invalid endpoint");
  }
};

// --- Main Service Function ---

const callService = async (endpoint: string, body: any) => {
  let backendError: any = null;

  // 1. Try Backend
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, ...body }),
    });

    const contentType = response.headers.get("content-type");
    
    // Check if we got an HTML error page (Vercel 404/500)
    if (contentType && contentType.includes("text/html")) {
      throw new Error("BACKEND_HTML_ERROR"); // Usually means 404 (Function not found) or 500 (Crash)
    }

    const data = await response.json();

    if (!response.ok) {
       // If the server explicitly told us what's wrong (e.g., Missing API Key),
       // we should RETURN that message directly and NOT fallback to client side.
       // This prevents masking deployment errors.
       if (data.error && (data.error.includes("Server Error") || data.error.includes("API Key"))) {
          return `⚠️ **Deployment Config Error**: ${data.error}\n\nGo to Vercel Settings > Environment Variables and ensure 'API_KEY' is set.`;
       }
       throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.result;

  } catch (error: any) {
    backendError = error;
    console.warn("Backend call failed:", error.message);
  }

  // 2. Fallback to Client Side (Only if backend was unreachable or generic error)
  try {
    const result = await clientSideHandler(endpoint, body);
    return result;
  } catch (clientError: any) {
    // If client side also fails (because no local key is set), explain WHY backend failed.
    if (clientError.message === "MISSING_LOCAL_KEY") {
      
      if (backendError?.message === "BACKEND_HTML_ERROR") {
        return "⚠️ **Backend Unreachable (404)**: The server API file `api/gemini.js` was not found.\n\n**Solution:**\n1. Ensure `api/gemini.js` exists in your repo.\n2. Ensure `vercel.json` is configured correctly.\n3. **Or** click Settings (⚙️) to use a Local API Key.";
      }

      if (backendError?.message.includes("HTTP 500")) {
        return "⚠️ **Server Error (500)**: The backend crashed. Check Vercel Function Logs for details.\n\n**Or** click Settings (⚙️) to use a Local API Key.";
      }
      
      return "⚠️ **Configuration Needed**: The backend is not responding and no Local API Key is set.\n\n**To fix:** Click the **Settings (⚙️)** icon in the top right and enter your Gemini API Key.";
    }
    
    console.error("Client side error:", clientError);
    return `⚠️ **Error**: ${clientError.message || "Unknown error occurred"}`;
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