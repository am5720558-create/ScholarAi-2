export interface User {
  id: string;
  name: string;
  email: string;
  grade: string;
  stream?: 'Science' | 'Commerce' | 'Arts' | 'General';
  competitiveExams?: string[];
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // Index
  explanation: string;
}

export interface NoteItem {
  title: string;
  content: string; // Markdown
  tags: string[];
  createdAt: string;
}

export interface StudyPlan {
  day: string;
  tasks: {
    time: string;
    subject: string;
    activity: string;
  }[];
}

export interface CareerPath {
  title: string;
  description: string;
  requirements: string[];
  salaryRange: string;
  pros: string[];
  cons: string[];
}