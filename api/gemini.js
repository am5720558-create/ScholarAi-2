import { GoogleGenAI } from "@google/genai";

const MODELS = {
  FAST: 'gemini-3-flash-preview',
  PRO: 'gemini-3-pro-preview'
};

// System instructions
const SYSTEM_INSTRUCTION_COACH = `You are "ScholarAI Coach", a friendly, encouraging, and intelligent tutor for students (Grade 9 to College) in India.
GOAL: Explain complex topics simply, using analogies, stories, and memory tricks.
FORMATTING: Use Markdown, Headings, Bullet points, Tables, Bold text.
BEHAVIOR: Adjust language to student level. Be encouraging. Provide step-by-step solutions.`;

const SYSTEM_INSTRUCTION_CAREER = `You are a Career Counselor expert for the Indian education system.
FORMATTING: Use Markdown tables, Bullet points, Bold.
CONTENT: Guidance on streams, degrees, scope, salary (INR), difficulty.`;

// Fallback key for immediate functionality. 
// Ideally, this should be managed via Vercel Environment Variables.
const FALLBACK_KEY = "AIzaSyCgmQQECX5u9PHRZiIB1DpxleLSmV8xuGk";

export default async function handler(request, response) {
  // Handle CORS preflight (optional, but good for local dev if ports differ)
  if (request.method === 'OPTIONS') {
    return response.status(200).send('OK');
  }

  // 1. Get API Key (Env Var > Fallback)
  const apiKey = process.env.API_KEY || FALLBACK_KEY;

  if (!apiKey) {
    console.error("CRITICAL: API_KEY is missing.");
    return response.status(500).json({ 
      error: "Server Configuration Error: API_KEY is missing. Please set it in Vercel Settings." 
    });
  }

  // 2. Initialize the client INSIDE the handler
  const genAI = new GoogleGenAI({ apiKey });

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { endpoint, ...body } = request.body;

  try {
    let resultText = "";
    // Use Flash model by default to avoid Rate Limits on Pro
    const activeModel = MODELS.FAST; 

    switch (endpoint) {
      case 'chat': {
        const { history, newMessage, userContext } = body;
        const formattedHistory = history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));
        
        const chat = genAI.chats.create({
          model: activeModel,
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
        
        const res = await genAI.models.generateContent({
          model: activeModel,
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

        const res = await genAI.models.generateContent({
          model: activeModel,
          contents: { parts },
          config: { systemInstruction: "You are an expert academic doubt solver." }
        });
        resultText = res.text;
        break;
      }

      case 'quiz': {
        const { topic, difficulty } = body;
        const prompt = `Generate 5 multiple choice questions (MCQs) for "${topic}" at "${difficulty}" level.
        Return ONLY a JSON array. Keys: id, question, options (array), correctAnswer (index), explanation.`;

        const res = await genAI.models.generateContent({
          model: activeModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        // Return parsed JSON directly
        const jsonText = res.text;
        return response.status(200).json({ result: JSON.parse(jsonText) });
      }

      case 'career': {
        const { profile, query } = body;
        const res = await genAI.models.generateContent({
          model: activeModel,
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
        
        const res = await genAI.models.generateContent({
          model: activeModel,
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
    console.error("Server AI Error:", error);
    return response.status(500).json({ error: error.message || "Internal Server Error" });
  }
}