// OpenRouter / OpenAI Compatible Handler
// We switched from @google/genai to raw fetch calls to OpenRouter
// because the provided key (sk-or-v1...) is an OpenRouter key.

export const config = {
  runtime: 'nodejs',
};

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "google/gemini-2.0-flash-001"; // High performance, high throughput via OpenRouter
const SITE_URL = "https://scholarai.vercel.app"; // Recommended for OpenRouter rankings
const SITE_NAME = "ScholarAI";

// --- SYSTEM INSTRUCTIONS ---
const SYSTEM_INSTRUCTION_COACH = `You are "ScholarAI Coach", a friendly, encouraging, and intelligent tutor for students (Grade 9 to College) in India.
GOAL: Explain complex topics simply, using analogies, stories, and memory tricks.
FORMATTING: Use Markdown, Headings, Bullet points, Tables, Bold text.
BEHAVIOR: Adjust language to student level. Be encouraging. Provide step-by-step solutions.`;

const SYSTEM_INSTRUCTION_CAREER = `You are a Career Counselor expert for the Indian education system.
FORMATTING: Use Markdown tables, Bullet points, Bold.
CONTENT: Guidance on streams, degrees, scope, salary (INR), difficulty.`;

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
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: "Server Error: API Key missing." });
    }

    // Helper to call OpenRouter
    const callOpenRouter = async (messages, temperature = 0.7, jsonMode = false) => {
      const payload = {
        model: MODEL_NAME,
        messages: messages,
        temperature: temperature,
        top_p: 0.9,
      };

      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch(OPENROUTER_API_URL, {
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
        console.error("OpenRouter Error:", errText);
        throw new Error(`OpenRouter API Error: ${res.status}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    };

    if (!request.body) return response.status(400).json({ error: "Missing request body" });

    const { endpoint, ...body } = request.body;
    let resultText = "";
    let resultData = null;

    switch (endpoint) {
      case 'chat': {
        const { history, newMessage, userContext } = body;
        
        // Convert history (Google/Internal format) to OpenAI format
        // Internal: { role: 'user' | 'model', text: string }
        // OpenAI: { role: 'user' | 'assistant', content: string }
        const messages = [
          { role: "system", content: `${SYSTEM_INSTRUCTION_COACH}\n\nUser Context: ${userContext}` },
          ...(history || []).map(msg => ({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.text
          })),
          { role: "user", content: newMessage }
        ];

        resultText = await callOpenRouter(messages, 0.7);
        break;
      }

      case 'notes': {
        const { topic } = body;
        const prompt = `Role: Expert academic content writer. Task: Create exam-ready study notes on "${topic}". 
        Include: Definitions, Formulas (in Tables), Comparisons (in Tables), Step-by-step methods. 
        Format: Markdown with Headers (##) and Horizontal Rules (---).`;

        const messages = [{ role: "user", content: prompt }];
        resultText = await callOpenRouter(messages, 0.3);
        break;
      }

      case 'doubt': {
        const { doubt, image } = body;
        
        let userContent;
        if (image) {
          // OpenRouter/OpenAI Vision Format
          // Image comes in as raw base64 data from frontend. 
          userContent = [
            { type: "text", text: `Solve this academic doubt step-by-step using Markdown. Doubt: ${doubt}` },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:image/jpeg;base64,${image}` 
              } 
            }
          ];
        } else {
          userContent = `Solve this academic doubt step-by-step using Markdown. Doubt: ${doubt}`;
        }

        const messages = [
          { role: "system", content: "You are an expert academic doubt solver. Think through the problem step-by-step and provide clear, accurate solutions." },
          { role: "user", content: userContent }
        ];

        resultText = await callOpenRouter(messages, 0.2); // Lower temp for accuracy
        break;
      }

      case 'quiz': {
        const { topic, difficulty } = body;
        const prompt = `Generate 5 multiple choice questions (MCQs) for "${topic}" at "${difficulty}" level.
        Return ONLY a JSON array. Keys: id, question, options (array), correctAnswer (index), explanation.
        Do not wrap in markdown code blocks. Just raw JSON.`;

        const messages = [{ role: "user", content: prompt }];
        // Note: Not all OpenRouter models support strict json_object mode, but Gemini 2.0 is good at it.
        const rawText = await callOpenRouter(messages, 0.7);
        
        // Clean up response if it contains markdown
        let cleanText = rawText.trim();
        if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/```/g, '');
        }
        
        try {
          resultData = JSON.parse(cleanText);
        } catch (e) {
          console.error("Quiz JSON Parse Error", e);
          resultData = [];
        }
        return response.status(200).json({ result: resultData });
      }

      case 'career': {
        const { profile, query } = body;
        const messages = [
          { role: "system", content: SYSTEM_INSTRUCTION_CAREER },
          { role: "user", content: `User Profile: ${profile}\n\nUser Query: ${query}\n\nUse Markdown tables and bullet points.` }
        ];
        resultText = await callOpenRouter(messages, 0.7);
        break;
      }

      case 'plan': {
        const { details } = body;
        const prompt = `Create a study plan. Subjects: ${details.subjects}. Hours: ${details.hoursPerDay}. 
        Exam: ${details.examDate}. Weakness: ${details.weakAreas}.
        Output: Weekly timetable in Markdown Table. Strategy section with bullet points.`;

        const messages = [{ role: "user", content: prompt }];
        resultText = await callOpenRouter(messages, 0.5);
        break;
      }

      default:
        return response.status(400).json({ error: 'Invalid endpoint' });
    }

    return response.status(200).json({ result: resultText });

  } catch (error) {
    console.error("API Runtime Error:", error);
    return response.status(500).json({ 
      error: "High traffic detected or API Error. Please try again shortly." 
    });
  }
}