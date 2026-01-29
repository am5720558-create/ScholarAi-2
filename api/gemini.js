import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'nodejs', // Force Node.js runtime for @google/genai
};

const SYSTEM_INSTRUCTION_COACH = `You are "ScholarAI Coach", a friendly, encouraging, and intelligent tutor for students (Grade 9 to College) in India.
GOAL: Explain complex topics simply, using analogies, stories, and memory tricks.
FORMATTING: Use Markdown, Headings, Bullet points, Tables, Bold text.
BEHAVIOR: Adjust language to student level. Be encouraging. Provide step-by-step solutions.`;

const SYSTEM_INSTRUCTION_CAREER = `You are a Career Counselor expert for the Indian education system.
FORMATTING: Use Markdown tables, Bullet points, Bold.
CONTENT: Guidance on streams, degrees, scope, salary (INR), difficulty.`;

const MODELS = {
  FAST: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview'
};

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    return response.status(200).send('OK');
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      // Diagnostic check for common config error
      const possibleMisplacedKey = Object.keys(process.env).find(k => k.startsWith('AIzaSy'));
      if (possibleMisplacedKey) {
        const errorMsg = "CONFIGURATION ERROR: API Key pasted in 'Name' field. Please fix in Vercel Settings.";
        console.error(errorMsg);
        return response.status(500).json({ error: errorMsg });
      }
      return response.status(500).json({ 
        error: "Server Error: GOOGLE_GENERATIVE_AI_API_KEY is missing." 
      });
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    // --- SMART FALLBACK HELPER ---
    // If the primary model fails due to quota (429) or overload (503), try the FAST model.
    const generateWithFallback = async (primaryModel, params) => {
      try {
        return await genAI.models.generateContent({
          model: primaryModel,
          ...params
        });
      } catch (error) {
        // Check for Quota Exceeded (429) or Service Unavailable (503)
        if (error.status === 429 || error.status === 503) {
          console.warn(`[Gemini] Model ${primaryModel} quota exceeded or busy. Falling back to ${MODELS.FAST}.`);
          
          // If we were already using FAST, we can't fallback further
          if (primaryModel === MODELS.FAST) {
            throw new Error("System is currently experiencing high traffic. Please try again in a minute.");
          }

          // Retry with the lighter Flash model
          return await genAI.models.generateContent({
            model: MODELS.FAST,
            ...params
          });
        }
        throw error;
      }
    };

    if (!request.body) {
      return response.status(400).json({ error: "Missing request body" });
    }

    const { endpoint, ...body } = request.body;
    let resultText = "";
    let resultData = null;

    switch (endpoint) {
      case 'chat': {
        const { history, newMessage, userContext } = body;
        const formattedHistory = (history || []).map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));

        // Chat uses FAST model by default, so usually safe from Pro limits.
        const chat = genAI.chats.create({
          model: MODELS.FAST,
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION_COACH} \n\n User Context: ${userContext}`,
            temperature: 0.7,
          },
          history: formattedHistory
        });
        
        const res = await chat.sendMessage({ message: newMessage });
        resultText = res.text;
        break;
      }

      case 'notes': {
        const { topic } = body;
        const prompt = `Role: Expert academic content writer. Task: Create exam-ready study notes on "${topic}". 
        Include: Definitions, Formulas (in Tables), Comparisons (in Tables), Step-by-step methods. 
        Format: Markdown with Headers (##) and Horizontal Rules (---).`;

        const res = await generateWithFallback(MODELS.FAST, {
          contents: prompt,
          config: { temperature: 0.3 }
        });
        resultText = res.text;
        break;
      }

      case 'doubt': {
        const { doubt, image } = body;
        const parts = [];
        if (image) {
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
        }
        parts.push({ text: `Solve this academic doubt step-by-step using Markdown. Doubt: ${doubt}` });

        // Tries PRO first (better reasoning), falls back to FAST if quota exceeded
        const res = await generateWithFallback(MODELS.PRO, {
          contents: { parts },
          config: { 
            systemInstruction: "You are an expert academic doubt solver. Think through the problem step-by-step.",
            thinkingConfig: { thinkingBudget: 2048 }
          }
        });
        resultText = res.text;
        break;
      }

      case 'quiz': {
        const { topic, difficulty } = body;
        const prompt = `Generate 5 multiple choice questions (MCQs) for "${topic}" at "${difficulty}" level.
        Return ONLY a JSON array. Keys: id, question, options (array), correctAnswer (index), explanation.`;

        const res = await generateWithFallback(MODELS.FAST, {
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        
        resultData = JSON.parse(res.text || '[]');
        return response.status(200).json({ result: resultData });
      }

      case 'career': {
        const { profile, query } = body;
        // Tries PRO first, falls back to FAST
        const res = await generateWithFallback(MODELS.PRO, {
          contents: `User Profile: ${profile}\n\nUser Query: ${query}\n\nUse Markdown tables and bullet points.`,
          config: { systemInstruction: SYSTEM_INSTRUCTION_CAREER }
        });
        resultText = res.text;
        break;
      }

      case 'plan': {
        const { details } = body;
        const prompt = `Create a study plan. Subjects: ${details.subjects}. Hours: ${details.hoursPerDay}. 
        Exam: ${details.examDate}. Weakness: ${details.weakAreas}.
        Output: Weekly timetable in Markdown Table. Strategy section with bullet points.`;

        // Tries PRO first, falls back to FAST
        const res = await generateWithFallback(MODELS.PRO, {
          contents: prompt,
          config: { temperature: 0.5 }
        });
        resultText = res.text;
        break;
      }

      default:
        return response.status(400).json({ error: 'Invalid endpoint' });
    }

    return response.status(200).json({ result: resultText });

  } catch (error) {
    console.error("Gemini API Runtime Error:", error);
    
    // Send a cleaner error message to the user if all retries fail
    let userMessage = error.message;
    if (error.status === 429) {
      userMessage = "We are currently experiencing high traffic. Please try again in a few moments.";
    }

    return response.status(500).json({ error: userMessage });
  }
}