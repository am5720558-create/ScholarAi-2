import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { config } from 'dotenv';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";

// Load environment variables
// 1. Try standard loading (works in most production/vercel environments)
config();

// 2. Manual Fallback: Explicitly look for .env in the current working directory
// This is often needed for 'vercel dev' or local node execution where the root might differ
if (!process.env.API_KEY) {
  const rootEnvPath = join(process.cwd(), '.env');
  if (fs.existsSync(rootEnvPath)) {
    console.log(`Loading .env from: ${rootEnvPath}`);
    config({ path: rootEnvPath });
  } else {
    // 3. Fallback: Look one level up from this file (useful if CWD is /api)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const parentEnvPath = resolve(__dirname, '..', '.env');
    if (fs.existsSync(parentEnvPath)) {
       console.log(`Loading .env from: ${parentEnvPath}`);
       config({ path: parentEnvPath });
    }
  }
}

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

export default async function handler(request, response) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).send('OK');
  }

  try {
    const apiKey = process.env.API_KEY;

    // Detailed Debugging for the user
    if (!apiKey) {
      console.error("CRITICAL ERROR: API_KEY is missing from process.env");
      console.error(`Current Directory: ${process.cwd()}`);
    } else {
      console.log(`API Key status: Loaded (Ends with ...${apiKey.slice(-4)})`);
    }

    if (!apiKey || apiKey.includes('PASTE_YOUR') || apiKey.length < 20) {
      return response.status(500).json({ 
        error: "Server Configuration Error: API_KEY is missing or invalid. Please check your .env file." 
      });
    }

    const genAI = new GoogleGenAI({ apiKey });

    if (request.method !== 'POST') {
      return response.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!request.body) {
       return response.status(400).json({ error: 'Missing request body' });
    }

    const { endpoint, ...body } = request.body;
    let resultText = "";

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
          model: MODELS.FAST,
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
          model: MODELS.PRO,
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

        const res = await genAI.models.generateContent({
          model: MODELS.FAST,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        const jsonText = res.text;
        if (!jsonText) throw new Error("Empty response from AI for Quiz");
        return response.status(200).json({ result: JSON.parse(jsonText) });
      }

      case 'career': {
        const { profile, query } = body;
        const res = await genAI.models.generateContent({
          model: MODELS.PRO,
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
          model: MODELS.PRO,
          contents: prompt,
          config: { temperature: 0.5 }
        });
        resultText = res.text;
        break;
      }

      default:
        return response.status(400).json({ error: 'Invalid endpoint' });
    }

    if (!resultText) {
       throw new Error("AI response was empty.");
    }

    return response.status(200).json({ result: resultText });

  } catch (error) {
    console.error("Server AI Error:", error);
    // Return detailed error to help debugging
    return response.status(500).json({ error: error.message || "Internal Server Error" });
  }
}