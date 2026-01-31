import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'nodejs',
};

// --- SYSTEM INSTRUCTIONS ---
const SYSTEM_INSTRUCTION_COACH = `You are "ScholarAI Coach", a friendly, encouraging, and intelligent tutor for students (Grade 9 to College) in India.
GOAL: Explain complex topics simply, using analogies, stories, and memory tricks.
FORMATTING: Use Markdown, Headings, Bullet points, Tables, Bold text.
BEHAVIOR: Adjust language to student level. Be encouraging. Provide step-by-step solutions.`;

const SYSTEM_INSTRUCTION_CAREER = `You are a Career Counselor expert for the Indian education system.
FORMATTING: Use Markdown tables, Bullet points, Bold.
CONTENT: Guidance on streams, degrees, scope, salary (INR), difficulty.`;

// --- MODEL CONFIGURATION ---
// Selected Model: gemini-1.5-flash
// Reason:
// 1. STABILITY: Resolves "Resource Exhausted" (429) errors seen with preview models.
// 2. HIGH QUOTA: Offers ~1500 requests/day on free tier (vs ~50 for previews).
// 3. PERFORMANCE: Excellent speed and reasoning for high-traffic applications.
const MODEL_NAME = 'gemini-1.5-flash';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(request, response) {
  // --- CORS Headers ---
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*'); 
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') return response.status(200).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    // --- API Key Detection ---
    let apiKey = process.env.API_KEY;
    if (!apiKey) {
      const foundKeyName = Object.keys(process.env).find(k => 
        typeof process.env[k] === 'string' && process.env[k].startsWith('AIzaSy')
      );
      if (foundKeyName) apiKey = process.env[foundKeyName];
    }
    
    if (!apiKey) {
      return response.status(500).json({ error: "Server Error: API Key missing." });
    }

    const genAI = new GoogleGenAI({ apiKey });

    // --- Helper: Robust Generation ---
    const generateContent = async (params) => {
      try {
        return await genAI.models.generateContent({
          model: MODEL_NAME,
          ...params
        });
      } catch (error) {
        // Retry on 503 (Server Overload)
        if (error.status === 503) {
          console.warn("[Gemini] Service unavailable, retrying once...");
          await wait(1500);
          return await genAI.models.generateContent({
            model: MODEL_NAME,
            ...params
          });
        }
        throw error;
      }
    };

    if (!request.body) return response.status(400).json({ error: "Missing request body" });

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

        const chatSession = genAI.chats.create({
          model: MODEL_NAME,
          config: {
            systemInstruction: `${SYSTEM_INSTRUCTION_COACH} \n\n User Context: ${userContext}`,
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
        const prompt = `Role: Expert academic content writer. Task: Create exam-ready study notes on "${topic}". 
        Include: Definitions, Formulas (in Tables), Comparisons (in Tables), Step-by-step methods. 
        Format: Markdown with Headers (##) and Horizontal Rules (---).`;

        const res = await generateContent({
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

        const res = await generateContent({
          contents: { parts },
          config: { 
            systemInstruction: "You are an expert academic doubt solver. Think through the problem step-by-step and provide clear, accurate solutions."
          }
        });
        resultText = res.text;
        break;
      }

      case 'quiz': {
        const { topic, difficulty } = body;
        const prompt = `Generate 5 multiple choice questions (MCQs) for "${topic}" at "${difficulty}" level.
        Return ONLY a JSON array. Keys: id, question, options (array), correctAnswer (index), explanation.`;

        const res = await generateContent({
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        
        let cleanText = res.text || '[]';
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }
        
        resultData = JSON.parse(cleanText);
        return response.status(200).json({ result: resultData });
      }

      case 'career': {
        const { profile, query } = body;
        const res = await generateContent({
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

        const res = await generateContent({
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
    
    if (error.status === 429) {
      userMessage = "We are receiving very high traffic right now. Please wait 30 seconds and try again.";
    } else if (error.status === 503) {
      userMessage = "The AI service is temporarily busy. Please try again in a moment.";
    }

    return response.status(500).json({ error: userMessage });
  }
}