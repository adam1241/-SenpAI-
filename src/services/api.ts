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
    includeVoice: boolean = false,
    useJavaScriptServer: boolean = false
  ): Promise<Response> { 
    try {
      const baseUrl = useJavaScriptServer ? NOTEBOOK_API_BASE_URL : API_BASE_URL;
      const response = await fetch(`${baseUrl}/chat`, {
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

export const getDeck = async (deckId: number) => {
  const response = await fetch(`${API_BASE_URL}/decks/${deckId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch deck');
  }
  return response.json();
}

export const getFlashcardsForDeck = async (deckId: number) => {
    const response = await fetch(`${API_BASE_URL}/decks/${deckId}/flashcards`);
    if (!response.ok) {
        throw new Error('Failed to fetch flashcards for deck');
    }
    return response.json();
}

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

export const updateFlashcard = async (cardId: number, flashcardData: { 
    question?: string, 
    answer?: string, 
    question_image_url?: string, 
    answer_image_url?: string,
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD',
    last_reviewed?: string,
}) => {
    const response = await fetch(`${API_BASE_URL}/flashcards/${cardId}`, {
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
    const response = await fetch(`${API_BASE_URL}/flashcards/${cardId}`, {
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

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to upload image');
    }
    return response.json();
};

export const importDeck = async (deckData: any) => {
    const response = await fetch(`${API_BASE_URL}/import`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(deckData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import deck');
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

export const updateDeck = async (deckId: number, deckData: { name: string, description: string }) => {
  const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
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
  const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete deck');
  }
  return response.json();
};

export default ApiService;