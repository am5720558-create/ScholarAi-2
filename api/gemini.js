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

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(request, response) {
  // --- 1. CORS Headers (Fixes domain issues) ---
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*'); 
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- 2. Smart API Key Detection ---
    let apiKey = process.env.API_KEY;

    // If API_KEY is missing, search for ANY variable that looks like a Gemini Key (starts with AIzaSy)
    if (!apiKey) {
      const foundKeyName = Object.keys(process.env).find(k => 
        typeof process.env[k] === 'string' && process.env[k].startsWith('AIzaSy')
      );
      
      if (foundKeyName) {
        console.log(`[Gemini] API_KEY not found, but found valid key in: ${foundKeyName}`);
        apiKey = process.env[foundKeyName];
      }
    }

    // 3. Final Check
    if (!apiKey) {
      console.error("CRITICAL ERROR: No environment variable found starting with 'AIzaSy'.");
      return response.status(500).json({ 
        error: "Server Error: API Key missing. Please add 'API_KEY' in Vercel Settings." 
      });
    }

    const genAI = new GoogleGenAI({ apiKey });
    
    // --- ROBUST RETRY & FALLBACK LOGIC ---
    const generateWithRetry = async (primaryModel, params) => {
      let currentModel = primaryModel;
      let currentParams = JSON.parse(JSON.stringify(params));
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await genAI.models.generateContent({
            model: currentModel,
            ...currentParams
          });
        } catch (error) {
          const isRetryable = error.status === 429 || error.status === 503;
          const isLastAttempt = attempt === MAX_RETRIES;

          if (!isRetryable || isLastAttempt) {
            console.error(`[Gemini] Final failure on attempt ${attempt}:`, error.message);
            throw error;
          }

          const delayTime = 1000 * Math.pow(2, attempt - 1);
          console.warn(`[Gemini] Attempt ${attempt} failed (${error.status}). Retrying in ${delayTime}ms...`);
          await wait(delayTime);

          if (currentModel === MODELS.PRO) {
             console.log(`[Gemini] Switching to ${MODELS.FAST} for fallback.`);
             currentModel = MODELS.FAST;
             if (currentParams.config && currentParams.config.thinkingConfig) {
               delete currentParams.config.thinkingConfig;
             }
          }
        }
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

        const chat = genAI.chats.create({
          model: MODELS.FAST,
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION_COACH} \n\n User Context: ${userContext}`,
            temperature: 0.7,
          },
          history: formattedHistory
        });
        
        try {
          const res = await chat.sendMessage({ message: newMessage });
          resultText = res.text;
        } catch (error) {
           if (error.status === 429 || error.status === 503) {
             await wait(1500);
             const res = await chat.sendMessage({ message: newMessage });
             resultText = res.text;
           } else {
             throw error;
           }
        }
        break;
      }

      case 'notes': {
        const { topic } = body;
        const prompt = `Role: Expert academic content writer. Task: Create exam-ready study notes on "${topic}". 
        Include: Definitions, Formulas (in Tables), Comparisons (in Tables), Step-by-step methods. 
        Format: Markdown with Headers (##) and Horizontal Rules (---).`;

        const res = await generateWithRetry(MODELS.FAST, {
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

        const res = await generateWithRetry(MODELS.PRO, {
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

        const res = await generateWithRetry(MODELS.FAST, {
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
        const res = await generateWithRetry(MODELS.PRO, {
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

        const res = await generateWithRetry(MODELS.PRO, {
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
    
    let userMessage = error.message;
    if (error.status === 429 || error.status === 503) {
      userMessage = "We are currently experiencing high traffic. Please try again in a few moments.";
    }

    return response.status(500).json({ error: userMessage });
  }
}