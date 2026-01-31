import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'nodejs',
};

// --- CONFIGURATION ---
// PRIORITY: Environment Variable > Hardcoded Key
const ENV_KEY = process.env.API_KEY;
// The key provided by the user. If this fails (401), replace with a valid key.
const HARDCODED_KEY = "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";

const getApiKey = () => {
  if (ENV_KEY && ENV_KEY.trim()) return ENV_KEY.trim();
  if (HARDCODED_KEY && HARDCODED_KEY.trim()) return HARDCODED_KEY.trim();
  return null;
};

// --- SYSTEM INSTRUCTIONS ---
const SYSTEM_INSTRUCTION_COACH = `You are "ScholarAI Coach", a friendly, encouraging, and intelligent tutor for students (Grade 9 to College) in India.
GOAL: Explain complex topics simply, using analogies, stories, and memory tricks.
FORMATTING: Use Markdown, Headings, Bullet points, Tables, Bold text.
BEHAVIOR: Adjust language to student level. Be encouraging. Provide step-by-step solutions.`;

const SYSTEM_INSTRUCTION_CAREER = `You are a Career Counselor expert for the Indian education system.
FORMATTING: Use Markdown tables, Bullet points, Bold.
CONTENT: Guidance on streams, degrees, scope, salary (INR), difficulty.`;

// --- HELPERS ---

// Google GenAI Direct Handler
const handleGoogleDirect = async (apiKey, model, params) => {
  const genAI = new GoogleGenAI({ apiKey });
  
  // Map internal model names to Google SDK expected names
  // We use gemini-1.5-flash because it has the highest free tier limits (1500/day).
  const googleModel = 'gemini-1.5-flash'; 

  let responseText = "";

  if (params.chat) {
    const { history, newMessage, systemInstruction } = params;
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const chatSession = genAI.chats.create({
      model: googleModel,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: formattedHistory
    });

    const res = await chatSession.sendMessage({ message: newMessage });
    responseText = res.text;
  } else if (params.prompt) {
    const res = await genAI.models.generateContent({
      model: googleModel,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature || 0.7,
        responseMimeType: params.jsonMode ? 'application/json' : 'text/plain'
      }
    });
    responseText = res.text;
  } else if (params.imageParts) {
    const res = await genAI.models.generateContent({
        model: googleModel,
        contents: { parts: [...params.imageParts, { text: params.promptText }] },
        config: {
            systemInstruction: params.systemInstruction
        }
    });
    responseText = res.text;
  }

  return responseText;
};

// OpenRouter Handler
const handleOpenRouter = async (apiKey, model, params) => {
  const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
  const SITE_URL = "https://scholarai.vercel.app";
  const SITE_NAME = "ScholarAI";
  
  // Use a stable model that is free/cheap on OpenRouter
  const openRouterModel = "google/gemini-2.0-flash-lite-preview-02-05:free"; 

  const messages = [];
  if (params.systemInstruction) {
    messages.push({ role: "system", content: params.systemInstruction });
  }

  if (params.chat) {
    const { history, newMessage } = params;
    (history || []).forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      });
    });
    messages.push({ role: "user", content: newMessage });
  } else if (params.prompt) {
    // If prompt is just a string
    messages.push({ role: "user", content: params.prompt });
  } else if (params.imageParts) {
    // Vision request
    const content = [{ type: "text", text: params.promptText }];
    params.imageParts.forEach(part => {
        // Convert Google inlineData to OpenAI image_url
        if (part.inlineData && part.inlineData.data) {
            content.push({
                type: "image_url",
                image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
            });
        }
    });
    messages.push({ role: "user", content: content });
  }

  const payload = {
    model: openRouterModel,
    messages: messages,
    temperature: params.temperature || 0.7,
  };

  if (params.jsonMode) {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_NAME,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    // Pass OpenRouter error details back to the client
    throw new Error(`OpenRouter Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
};

// --- MAIN HANDLER ---

export default async function handler(request, response) {
  // CORS
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*'); 
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (request.method === 'OPTIONS') return response.status(200).end();
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return response.status(500).json({ error: "Server Error: API Key is missing in configuration." });
    }

    // Determine Provider
    const isGoogleKey = apiKey.startsWith("AIza");
    const isOpenRouterKey = apiKey.startsWith("sk-or-v1");
    
    if (!isGoogleKey && !isOpenRouterKey) {
        // Fallback assumption or error
        console.warn("Unknown API Key format, attempting OpenRouter...");
    }

    const { endpoint, ...body } = request.body;
    let resultText = "";

    // Common Params Object
    let params = {};

    switch (endpoint) {
      case 'chat':
        params = {
            chat: true,
            history: body.history,
            newMessage: body.newMessage,
            systemInstruction: `${SYSTEM_INSTRUCTION_COACH}\n\nUser Context: ${body.userContext}`
        };
        break;

      case 'notes':
        params = {
            prompt: `Role: Expert academic content writer. Task: Create exam-ready study notes on "${body.topic}". 
            Include: Definitions, Formulas (in Tables), Comparisons (in Tables), Step-by-step methods. 
            Format: Markdown with Headers (##) and Horizontal Rules (---).`,
            temperature: 0.3
        };
        break;

      case 'doubt':
        if (body.image) {
            params = {
                imageParts: [{ inlineData: { mimeType: 'image/jpeg', data: body.image } }],
                promptText: `Solve this academic doubt step-by-step using Markdown. Doubt: ${body.doubt}`,
                systemInstruction: "You are an expert academic doubt solver."
            };
        } else {
            params = {
                prompt: `Solve this academic doubt step-by-step using Markdown. Doubt: ${body.doubt}`,
                systemInstruction: "You are an expert academic doubt solver."
            };
        }
        break;

      case 'quiz':
        params = {
            prompt: `Generate 5 multiple choice questions (MCQs) for "${body.topic}" at "${body.difficulty}" level.
            Return ONLY a JSON array. Keys: id, question, options (array), correctAnswer (index), explanation.
            Do not wrap in markdown code blocks. Just raw JSON.`,
            jsonMode: true
        };
        break;

      case 'career':
        params = {
            prompt: `User Profile: ${body.profile}\n\nUser Query: ${body.query}\n\nUse Markdown tables and bullet points.`,
            systemInstruction: SYSTEM_INSTRUCTION_CAREER
        };
        break;

      case 'plan':
        params = {
            prompt: `Create a study plan. Subjects: ${body.details.subjects}. Hours: ${body.details.hoursPerDay}. 
            Exam: ${body.details.examDate}. Weakness: ${body.details.weakAreas}.
            Output: Weekly timetable in Markdown Table. Strategy section with bullet points.`,
            temperature: 0.5
        };
        break;

      default:
        return response.status(400).json({ error: 'Invalid endpoint' });
    }

    // Execute Request
    if (isGoogleKey) {
        resultText = await handleGoogleDirect(apiKey, null, params);
    } else {
        resultText = await handleOpenRouter(apiKey, null, params);
    }

    // Post-processing for JSON (Quiz)
    if (endpoint === 'quiz') {
        let cleanText = (resultText || "[]").trim();
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/```/g, '');
        }
        try {
            const jsonResult = JSON.parse(cleanText);
            return response.status(200).json({ result: jsonResult });
        } catch (e) {
            console.error("JSON Parse Error:", e);
            return response.status(200).json({ result: [] });
        }
    }

    return response.status(200).json({ result: resultText });

  } catch (error) {
    console.error("API Handler Error:", error);
    
    // Return appropriate status code
    let statusCode = 500;
    let errorMessage = error.message || "An unexpected error occurred.";

    if (errorMessage.includes("401") || errorMessage.includes("User not found")) {
        statusCode = 401;
        errorMessage = "API Authentication Failed. The provided API Key is invalid or expired.";
    } else if (errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
        statusCode = 429;
        errorMessage = "AI Usage Limit Exceeded. Please try again later or upgrade key.";
    }

    return response.status(statusCode).json({ error: errorMessage });
  }
}