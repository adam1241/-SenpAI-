const API_BASE_URL = 'http://localhost:5001/api';
const NOTEBOOK_API_BASE_URL = 'http://localhost:3001/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
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
  timestamp:string;
}

export class ApiService {
  static async sendChatMessage(
    messages: ChatMessage[], 
    personality: string = 'calm',
    includeVoice: boolean = false
  ): Promise<Response> { // Changed to return Response
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          personality,
          includeVoice
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to send chat message');
    }
  }

  static async generateVoice(text: string, personality: string = 'calm'): Promise<Blob> {
    try {
      const response = await fetch(`${NOTEBOOK_API_BASE_URL}/voice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          personality
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
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
      
      if (canvasData) {
        formData.append('canvas', canvasData, 'canvas.png');
      }
      
      if (description) {
        formData.append('description', description);
      }
      
      formData.append('personality', personality);

      const response = await fetch(`${NOTEBOOK_API_BASE_URL}/analyze-canvas`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Canvas Analysis API Error:', error);
      throw new Error('Failed to analyze canvas');
    }
  }

  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${NOTEBOOK_API_BASE_URL.replace('/api', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const getQuizzes = async () => {
  const response = await fetch(`${API_BASE_URL}/quizzes`);
  if (!response.ok) {
    throw new Error('Failed to fetch quizzes');
  }
  return response.json();
};

export const getDecks = async () => {
  const response = await fetch(`${API_BASE_URL}/decks`);
  if (!response.ok) {
    throw new Error('Failed to fetch decks');
  }
  return response.json();
};

export const getFlashcards = async () => {
  const response = await fetch(`${API_BASE_URL}/flashcards`);
  if (!response.ok) {
    throw new Error('Failed to fetch flashcards');
  }
  return response.json();
};

export const saveManualQuiz = async (quizData: any) => {
  const response = await fetch(`${API_BASE_URL}/quizzes/manual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(quizData),
  });
  if (!response.ok) {
    throw new Error('Failed to save quiz');
  }
  return response.json();
};

export const saveManualFlashcard = async (flashcardData: any) => {
  const response = await fetch(`${API_BASE_URL}/flashcards/manual`, {
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

export const saveManualDeck = async (deckData: { name: string, description: string }) => {
  const response = await fetch(`${API_BASE_URL}/decks/manual`, {
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

export const deleteDeck = async (deckId: number) => {
  const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete deck');
  }
  return response.json();
};

export default ApiService;