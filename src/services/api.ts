const API_BASE_URL = 'http://localhost:5001/api';

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
  timestamp: string;
}

export interface Deck {
  id: number;
  name: string;
  description: string;
  // Stats now provided by the backend
  cardCount: number;
  newCards: number;
  reviewCards: number;
  lastStudied?: string; // This can be added later
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  deck_id: number;
  review_date: string;
  question_image?: string;
  answer_image?: string;
}

export interface Quiz {
  id: number;
  name: string;
  description: string;
  // Add other quiz properties if needed
}

export class ApiService {
  static getBaseUrl(): string {
    return API_BASE_URL.replace('/api', '');
  }

  static async sendChatMessage(
    messages: ChatMessage[], 
    personality: string = 'calm',
    includeVoice: boolean = false
  ): Promise<ChatResponse> {
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

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to send chat message');
    }
  }

  static async generateVoice(text: string, personality: string = 'calm'): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/voice`, {
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

      const response = await fetch(`${API_BASE_URL}/analyze-canvas`, {
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
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  static async getDecks(searchTerm?: string): Promise<Deck[]> {
    try {
      const url = searchTerm
        ? `${API_BASE_URL}/decks?search=${encodeURIComponent(searchTerm)}`
        : `${API_BASE_URL}/decks`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch decks');
    }
  }

  static async createDeck(name: string, description: string): Promise<Deck> {
    try {
      const response = await fetch(`${API_BASE_URL}/decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to create deck');
    }
  }

  static async uploadImage(file: File): Promise<{ url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to upload image');
    }
  }

  static async reviewFlashcard(flashcardId: number, performance: 'hard' | 'medium' | 'easy'): Promise<Flashcard> {
    try {
      const response = await fetch(`${API_BASE_URL}/flashcards/${flashcardId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performance }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to review flashcard');
    }
  }

  static async deleteDeck(deckId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/decks/${deckId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to delete deck');
    }
  }

  static async createFlashcard(
    deck_id: number,
    question: string,
    answer: string,
    question_image?: string,
    answer_image?: string
  ): Promise<Flashcard> {
    try {
      const response = await fetch(`${API_BASE_URL}/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          deck_id, 
          question, 
          answer, 
          question_image, 
          answer_image 
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to create flashcard');
    }
  }

  static async getFlashcards(): Promise<Flashcard[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/flashcards`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch flashcards');
    }
  }

  static async updateFlashcard(
    flashcardId: number, 
    data: Partial<Omit<Flashcard, 'id' | 'deck_id' | 'review_date'>>
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/flashcards/${flashcardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to update flashcard');
    }
  }

  static async deleteFlashcard(flashcardId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/flashcards/${flashcardId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to delete flashcard');
    }
  }

  static async getQuizzes(): Promise<Quiz[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/quizzes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch quizzes');
    }
  }
}

export default ApiService;