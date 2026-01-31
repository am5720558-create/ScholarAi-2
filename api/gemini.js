import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'nodejs',
};

// --- CONFIGURATION ---
const getApiKey = () => process.env.API_KEY;

// --- SYSTEM INSTRUCTIONS ---
const SYSTEM_INSTRUCTION_COACH = `You are "ScholarAI Coach", a friendly, encouraging, and intelligent tutor for students (Grade 9 to College) in India.
GOAL: Explain complex topics simply, using analogies, stories, and memory tricks.
FORMATTING: Use Markdown, Headings, Bullet points, Tables, Bold text.
BEHAVIOR: Adjust language to student level. Be encouraging. Provide step-by-step solutions.`;

const SYSTEM_INSTRUCTION_CAREER = `You are a Career Counselor expert for the Indian education system.
FORMATTING: Use Markdown tables, Bullet points, Bold.
CONTENT: Guidance on streams, degrees, scope, salary (INR), difficulty.`;

// --- MAIN HANDLER ---

export default async function handler(request, response) {
  // CORS Headers
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*'); 
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (request.method === 'OPTIONS') return response.status(200).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    const apiKey = getApiKey();
    
    // 1. Check if Key Exists
    if (!apiKey) {
      console.error("API_KEY missing in environment variables");
      return response.status(500).json({ error: "Server Error: API_KEY is missing. Please add a valid Google API Key in Vercel Settings." });
    }

    // 2. Check for Invalid OpenRouter Key (Legacy Support Removal)
    if (apiKey.startsWith("sk-or-v1")) {
      return response.status(401).json({ 
        error: "CONFIGURATION ERROR: You are using an old OpenRouter key. Please update your Vercel Environment Variables to use a valid Google Gemini API Key (starts with 'AIza')." 
      });
    }

    // 3. Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey });
    const modelName = 'gemini-1.5-flash'; // High rate limits (15 RPM)
    
    const { endpoint, ...body } = request.body;
    let resultText = "";
    
    // 4. Handle Endpoints
    switch (endpoint) {
      case 'chat': {
        const { history, newMessage, userContext } = body;
        const formattedHistory = (history || []).map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));

        const chatSession = ai.chats.create({
          model: modelName,
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION_COACH}\n\nUser Context: ${userContext}`,
            temperature: 0.7,
          },
          history: formattedHistory
        });

        const res = await chatSession.sendMessage({ message: newMessage });
        resultText = res.text;
        break;
      }

      case 'notes': {
        const { topic } = body;
        const res = await ai.models.generateContent({
          model: modelName,
          contents: `Role: Expert academic content writer. Task: Create exam-ready study notes on "${topic}". 
          Include: Definitions, Formulas (in Tables), Comparisons (in Tables), Step-by-step methods. 
          Format: Markdown with Headers (##) and Horizontal Rules (---).`,
          config: { temperature: 0.3 }
        });
        resultText = res.text;
        break;
      }

      case 'doubt': {
        const { doubt, image } = body;
        const promptText = `Solve this academic doubt step-by-step using Markdown. Doubt: ${doubt}`;
        
        const contents = image 
          ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: promptText }] }
          : promptText;

        const res = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: "You are an expert academic doubt solver.",
            temperature: 0.2
          }
        });
        resultText = res.text;
        break;
      }

      case 'quiz': {
        const { topic, difficulty } = body;
        const res = await ai.models.generateContent({
          model: modelName,
          contents: `Generate 5 multiple choice questions (MCQs) for "${topic}" at "${difficulty}" level.
          Return ONLY a JSON array. Keys: id, question, options (array), correctAnswer (index), explanation.
          Do not wrap in markdown code blocks. Just raw JSON.`,
          config: {
            responseMimeType: 'application/json'
          }
        });
        
        const cleanText = res.text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        try {
            const jsonResult = JSON.parse(cleanText);
            return response.status(200).json({ result: jsonResult });
        } catch (e) {
            console.error("JSON Parse Error on Quiz:", e);
            return response.status(200).json({ result: [] });
        }
      }

      case 'career': {
        const { profile, query } = body;
        const res = await ai.models.generateContent({
          model: modelName,
          contents: `User Profile: ${profile}\n\nUser Query: ${query}\n\nUse Markdown tables and bullet points.`,
          config: { systemInstruction: SYSTEM_INSTRUCTION_CAREER }
        });
        resultText = res.text;
        break;
      }

      case 'plan': {
        const { details } = body;
        const res = await ai.models.generateContent({
          model: modelName,
          contents: `Create a study plan. Subjects: ${details.subjects}. Hours: ${details.hoursPerDay}. 
          Exam: ${details.examDate}. Weakness: ${details.weakAreas}.
          Output: Weekly timetable in Markdown Table. Strategy section with bullet points.`,
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
    console.error("API Handler Error:", error);
    
    // Default 500
    let statusCode = 500;
    let errorMessage = error.message || "An unexpected error occurred.";

    // Map Google SDK errors to readable messages
    if (errorMessage.includes("403") || errorMessage.includes("API key not valid")) {
       statusCode = 401;
       errorMessage = "Invalid Google API Key. Please check your Vercel Settings.";
    } else if (errorMessage.includes("429")) {
       statusCode = 429;
       errorMessage = "AI Traffic limit reached (429). Please try again in a minute.";
    }

    return response.status(statusCode).json({ error: errorMessage });
  }
}