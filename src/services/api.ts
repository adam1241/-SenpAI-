import axios from 'axios';

// ====================================================================
// ENVIRONMENT DETECTION AND BACKEND CONFIGURATION
// ====================================================================

// Detect if we're in development (local) or production (Lovable)
const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Backend URLs based on environment
const SOCRATIC_TUTOR_API_URL = isLocalDevelopment 
  ? 'http://localhost:5001/api' 
  : '/api/supabase'; // Will use Supabase functions

const NOTEBOOK_API_URL = isLocalDevelopment 
  ? 'http://localhost:3001/api'
  : '/api/supabase'; // Will use Supabase functions

// ====================================================================
// TYPE DEFINITIONS
// ====================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
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
    sessionId: string,
    originalMessageId?: string
  ): Promise<Response> {
    try {
      const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, user_id: userId, session_id: sessionId, original_message_id: originalMessageId }),
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

export const getDeck = async (deckId: number) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks/${deckId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch deck');
  }
  return response.json();
}

export const getFlashcardsForDeck = async (deckId: number) => {
    const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks/${deckId}/flashcards`);
    if (!response.ok) {
        throw new Error('Failed to fetch flashcards for deck');
    }
    return response.json();
}

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


export const saveManualQuiz = async (quizData: any) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/quizzes/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quizData),
  });
  if (!response.ok) throw new Error(`Failed to save quiz`);
  return response.json();
};

export const saveManualFlashcard = async (flashcardData: any) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/flashcards/manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(flashcardData),
  });
  if (!response.ok) {
    throw new Error('Failed to save flashcard');
  }
  return response.json();
};

export const updateFlashcard = async (cardId: number, flashcardData: { 
    question?: string, 
    answer?: string, 
    question_image_url?: string, 
    answer_image_url?: string,
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD',
    last_reviewed?: string,
}) => {
    const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/flashcards/${cardId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(flashcardData),
    });
    if (!response.ok) {
        throw new Error('Failed to update flashcard');
    }
    return response.json();
};

export const deleteFlashcard = async (cardId: number) => {
    const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/flashcards/${cardId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Failed to delete flashcard');
    }
    return response.json();
};

export const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to upload image');
    }
    return response.json();
};

export const importDeck = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/import`, {
        method: 'POST',
        body: formData, // The browser will automatically set Content-Type to multipart/form-data
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import deck');
    }
    return response.json();
};

export const saveManualDeck = async (deckData: { name: string, description: string }) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks/manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deckData),
  });
  if (!response.ok) {
    throw new Error('Failed to save deck');
  }
  return response.json();
};

export const updateDeck = async (deckId: number, deckData: { name: string, description: string }) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks/${deckId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deckData),
  });
  if (!response.ok) {
    throw new Error('Failed to update deck');
  }
  return response.json();
};

export const deleteDeck = async (deckId: number) => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks/${deckId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete deck');
  return response.json();
};

export const exportDeck = async (deckId: number, format: 'json' | 'csv') => {
  const url = `${SOCRATIC_TUTOR_API_URL}/decks/${deckId}/export/${format}`;
  
  // Use window.open for GET requests to trigger browser download
  window.open(url, '_blank');
  
  // No response to return, as the browser handles the download.
  // You could return a promise that resolves on success if you implement
  // a more complex fetch-based download with blob creation.
  return Promise.resolve();
};

export const exportDecksBatch = async (deckIds: number[], format: 'json' | 'csv') => {
  const response = await fetch(`${SOCRATIC_TUTOR_API_URL}/decks/export/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deck_ids: deckIds, format: format }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to export decks`);
  }
  
  // Handle the file download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  
  // Extract filename from Content-Disposition header
  const disposition = response.headers.get('Content-Disposition');
  let filename = `decks_export.${format}`;
  if (disposition && disposition.indexOf('attachment') !== -1) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }
  
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};

export default ApiService;
