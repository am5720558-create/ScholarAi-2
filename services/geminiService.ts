import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION_COACH, SYSTEM_INSTRUCTION_CAREER } from '../constants';
import { ChatMessage, MessageRole, QuizQuestion, CareerPath } from '../types';

const getClient = () => {
  // In Vite via define plugin, this string replacement happens at build time.
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    console.error("API_KEY is missing!");
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

const handleGeminiError = (error: any, defaultMessage: string): string => {
  console.error("Gemini API Error Details:", error);
  
  const errString = error ? error.toString().toLowerCase() : "";
  const errMsg = error && error.message ? error.message.toLowerCase() : "";

  if (errMsg.includes("missing_api_key") || errString.includes("missing_api_key")) {
    return "⚠️ Configuration Error: API_KEY is missing.";
  }
  
  if (errMsg.includes("403") || errString.includes("403") || errString.includes("key not valid") || errString.includes("api key")) {
     return "⚠️ Access Denied: The API Key provided is invalid or expired.";
  }

  if (errMsg.includes("429") || errString.includes("quota") || errString.includes("resource exhausted")) {
      return "⚠️ Usage Limit Exceeded: The free API key quota has been exhausted. Please try again later or use a different key.";
  }
  
  return defaultMessage;
};

// --- Models ---
// We use gemini-3-flash-preview for better performance and higher rate limits on free tier.

export const chatWithCoach = async (
  history: ChatMessage[], 
  newMessage: string,
  userContext: string
) => {
  try {
    const ai = getClient();
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION_COACH} \n\n User Context: ${userContext}`,
        temperature: 0.7,
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: newMessage });
    return response.text;
  } catch (error) {
    return handleGeminiError(error, "I'm having trouble connecting to the server right now. Please try again later.");
  }
};

export const generateNotes = async (topicOrText: string) => {
  try {
    const ai = getClient();
    
    // Using the expert exam-focused writer prompt
    const prompt = `
Role:
You are an expert subject teacher and exam-focused academic content writer.

Task:
Create comprehensive, structured, exam-ready study notes on the topic: "${topicOrText}".

Audience:
High school / early college students preparing for board exams and competitive exams.

Formatting & Style Rules (STRICTLY FOLLOW):
1. **Structure & Headings**:
   - Use **Level 2 Headings (##)** for Main Sections.
   - Use **Level 3 Headings (###)** for Sub-sections.
   - **MANDATORY**: Add a **Horizontal Rule (---)** between every major section to separate content clearly.

2. **Emphasis & Key Terms**:
   - Use **Bold** for all definitions, key terms, important numbers, and emphasis.
   - Use > Blockquotes for "Note", "Tip", or "Important" callouts.

3. **Tables & Data**:
   - **MUST USE MARKDOWN TABLES** for:
     - Formulas (Name | Formula | Application).
     - Differences/Comparisons.
     - Value charts (e.g., Trigonometry angles, Physical constants).
     - Ratios or Properties.

4. **Mathematical Notation**:
   - Use professional mathematical notation.
   - Use **Unicode characters** for exponents and symbols to ensure they look professional (e.g., a² + b² = c², sin²θ, π, Δ, √x).
   - Do NOT use raw LaTeX syntax like $...$ unless it is inside a code block. Use the rendered characters directly.

5. **Lists**:
   - Use bullet points for characteristics, rules, or steps.

Content Must Include:
1. Definitions and fundamentals.
2. Key formulas and identities (in **Tables**).
3. Comparisons or Properties (in **Tables**).
4. Step-by-step methods.
5. Exam tips & common mistakes.
6. Mnemonics (if applicable).

Output strictly in Markdown format.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3, // Lower temperature for more factual output
      }
    });

    return response.text;
  } catch (error) {
    return handleGeminiError(error, "Unable to generate notes at this time. Please check your connection.");
  }
};

export const solveDoubt = async (doubt: string, imageBase64?: string) => {
  try {
    const ai = getClient();
    
    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
    }
    
    const prompt = `
    Task: Solve this academic doubt step-by-step.
    
    Formatting Requirements:
    - Use **Markdown** formatting.
    - Break the solution down into **numbered steps**.
    - Use **bold** for key numbers and the final answer.
    - Use **Markdown Tables** if comparing values.
    - Use **Horizontal Rules (---)** to separate the explanation from the final answer.
    - If explaining a concept, use **bullet points**.
    
    Doubt: ${doubt}`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: "You are an expert academic doubt solver. Be precise, accurate, and easy to understand."
      }
    });

    return response.text;
  } catch (error) {
    return handleGeminiError(error, "I couldn't solve this doubt right now. Please try again later.");
  }
};

export const generateQuiz = async (topic: string, difficulty: string): Promise<QuizQuestion[]> => {
  try {
    const ai = getClient();
    
    const prompt = `Generate 5 multiple choice questions (MCQs) for the topic "${topic}" at "${difficulty}" level.
    Return ONLY a JSON array. Each object should have:
    - id (number)
    - question (string)
    - options (array of 4 strings)
    - correctAnswer (index of correct option, 0-3)
    - explanation (string, short explanation of why it is correct)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as QuizQuestion[];
  } catch (e) {
    console.error("Failed to generate or parse quiz", e);
    const errString = e ? e.toString().toLowerCase() : "";
    if (errString.includes("missing_api_key")) {
       alert("Configuration Error: API_KEY is missing.");
    } else if (errString.includes("403") || errString.includes("invalid")) {
       alert("API Key Error: Invalid or expired key.");
    }
    return [];
  }
};

export const getCareerAdvice = async (profile: string, query: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User Profile: ${profile}\n\nUser Query: ${query}\n\nRemember to use Markdown tables for comparisons, Horizontal Rules (---) to separate sections, and bullet points for lists.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CAREER
      }
    });
    
    return response.text || "I couldn't generate advice at this moment.";
  } catch (error) {
    return handleGeminiError(error, "Service temporarily unavailable. Please try again later.");
  }
};

export const generateStudyPlan = async (details: {
  subjects: string;
  hoursPerDay: string;
  examDate: string;
  weakAreas: string;
}) => {
  try {
    const ai = getClient();
    const prompt = `Create a personalized study plan for a student.
    
    Student Details:
    - Subjects: ${details.subjects}
    - Target Study Hours/Day: ${details.hoursPerDay}
    - Upcoming Exam Date: ${details.examDate || 'None specified'}
    - Weak Areas: ${details.weakAreas}
    
    Task:
    1. Generate a structured weekly timetable. **YOU MUST USE A MARKDOWN TABLE** for the timetable (Day | Time Slot | Subject | Activity).
    2. Include specific slots for the weak areas.
    3. Add a small "Strategy Section" at the bottom with 3 **bullet points** on how to improve.
    4. Use **Bold** for emphasis.
    5. Use **Horizontal Rules** to separate the plan from the strategy.
    
    Keep it encouraging and actionable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.5,
      }
    });

    return response.text;
  } catch (error) {
    return handleGeminiError(error, "I couldn't generate a study plan right now. Please try again later.");
  }
};