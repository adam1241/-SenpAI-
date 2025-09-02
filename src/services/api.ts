import axios from 'axios';

// ====================================================================
// BACKEND SERVER URLS
// ====================================================================

// Python backend (Port 5001) for Socratic tutoring, memory, and flashcards
const SOCRATIC_TUTOR_API_URL = 'http://localhost:5001/api';

// Node.js backend (Port 3001) for Notebook, canvas analysis, and voice generation
const NOTEBOOK_API_URL = 'http://localhost:3001/api';

// ====================================================================
// TYPE DEFINITIONS
// ====================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// For Notebook feature (non-streaming JSON response)
export interface NotebookChatResponse {
  message: string;
  personality: string;
  timestamp: string;
  audio?: string;
  audioFormat?: string;
  voiceError?: string;
}

export interface AnalysisResponse {
  analysis: string;
  personality: string;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  type: "conversation" | "flashcard" | "quiz" | "notebook";
  masteryMoments: number;
  topics: string[];
}

// ====================================================================
// API SERVICE CLASS
// ====================================================================

export class ApiService {

  // --- Socratic Tutor Backend (Python) --- //

  static async streamSocraticTutor(
    messages: ChatMessage[],
    userId: string,
    sessionId: string
  ): Promise<Response> {
    try {
      const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, user_id: userId, session_id: sessionId }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      console.error('Socratic Tutor API Error:', error);
      throw new Error('Failed to send chat message to Socratic Tutor');
    }
  }

  static async getConversations(userId: string, sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await axios.get(`${SOCRATIC_TUTOR_API_URL}/conversations`, {
        params: { user_id: userId, session_id: sessionId }
      });
      return response.data;
    } catch (error) {
      console.error('Get Conversations API Error:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  static async getHistory(userId: string): Promise<HistoryItem[]> {
    try {
      const response = await axios.get(`${SOCRATIC_TUTOR_API_URL}/history`, {
        params: { user_id: userId }
      });
      return response.data;
    } catch (error) {
      console.error('Get History API Error:', error);
      throw new Error('Failed to fetch history');
    }
  }

  // --- Notebook Backend (Node.js) --- //

  static async getNotebookChatResponse(
    messages: ChatMessage[],
    personality: string = 'calm',
    includeVoice: boolean = false
  ): Promise<NotebookChatResponse> {
    try {
      const response = await axios.post(`${NOTEBOOK_API_URL}/chat`, {
        messages,
        personality,
        includeVoice
      });
      return response.data;
    } catch (error) {
      console.error('Notebook Chat API Error:', error);
      throw new Error('Failed to get notebook chat response');
    }
  }

  static async generateVoice(text: string, personality: string = 'calm'): Promise<Blob> {
    try {
      const response = await axios.post(`${NOTEBOOK_API_URL}/voice`, 
        { text, personality },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Voice API Error:', error);
      throw new Error('Failed to generate voice');
    }
  }

  static async analyzeCanvas(
    canvasData?: Blob,
    description?: string,
    personality: string = 'calm'
  ): Promise<AnalysisResponse> {
    try {
      const formData = new FormData();
      if (canvasData) formData.append('canvas', canvasData, 'canvas.png');
      if (description) formData.append('description', description);
      formData.append('personality', personality);

      const response = await axios.post(`${NOTEBOOK_API_URL}/analyze-canvas`, formData);
      return response.data;
    } catch (error) {
      console.error('Canvas Analysis API Error:', error);
      throw new Error('Failed to analyze canvas');
    }
  }

  static async checkNotebookHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${NOTEBOOK_API_URL.replace('/api', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('Notebook health check failed:', error);
      return false;
    }
  }
}

// ====================================================================
// STANDALONE API FUNCTIONS (for Socratic Tutor Backend)
// ====================================================================

export const getQuizzes = async () => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/quizzes`);
  if (!response.ok) throw new Error('Failed to fetch quizzes');
  return response.json();
};

export const getDecks = async () => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks`);
  if (!response.ok) throw new Error('Failed to fetch decks');
  return response.json();
};

export const getFlashcards = async () => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/flashcards`);
  if (!response.ok) throw new Error('Failed to fetch flashcards');
  return response.json();
};

// Functions for manual data manipulation
const manualPost = async (endpoint: string, data: any) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to save to ${endpoint}`);
  return response.json();
};

export const saveManualQuiz = (data: any) => manualPost('/quizzes/manual', data);
export const saveManualFlashcard = (data: any) => manualPost('/flashcards/manual', data);
export const saveManualDeck = (data: { name: string, description: string }) => manualPost('/decks/manual', data);

export const deleteDeck = async (deckId: number) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks/${deckId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete deck');
  return response.json();
};

export default ApiService;
