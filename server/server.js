import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import OpenAI from "openai";
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import FormData from 'form-data';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Personality configurations for different teaching styles
const personalityConfigs = {
  calm: {
    name: 'Winie',
    systemPrompt: 'You are Winie, a direct and supportive tutor. Give specific, actionable advice immediately. Skip explanations, get straight to the solution. Ask one clear follow-up question to check understanding. When including mathematical expressions, formulas, or equations, use $ $ for display mode (e.g., $x^2 + y^2 = z^2$) and $ $ for inline mode (e.g., The variable $x$ represents the unknown).',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - natural, warm female voice (non-robotic)
    voiceSettings: {
      stability: 0.65,
      similarity_boost: 0.85,
      style: 0.4,
      use_speaker_boost: true
    }
  },
  angry: {
    name: 'Machinegun',
    systemPrompt: 'You are Machinegun, an intense drill instructor. Give rapid-fire commands with zero fluff. Be brutally direct, demand immediate action. Use caps for emphasis when needed. When including mathematical expressions, formulas, or equations, use $ $ for display mode (e.g., $\frac{dy}{dx} = 2x$) and $ $ for inline mode (e.g., Solve for $x$ NOW!).',
    voiceId: 'OoML9dLqnpgIRHTDbYtV', // Your custom angry voice
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.9,
      style: 0.9,
      use_speaker_boost: true
    }
  },
  cool: {
    name: 'Blabla Teacher',
    systemPrompt: 'You are Blabla Teacher, a fact-focused educator. Lead with interesting facts, then give direct instructions. Be enthusiastic but concise. Focus on delivering knowledge, not small talk. When including mathematical expressions, formulas, or equations, use $ $ for display mode (e.g., $E = mc^2$) and $ $ for inline mode (e.g., Einstein\'s famous equation relates energy $E$ to mass $m$).',
    voiceId: 'cOaTizLZVRcqrsAePZzS', // Your custom cool voice
    voiceSettings: {
      stability: 0.6,
      similarity_boost: 0.85,
      style: 0.7,
      use_speaker_boost: true
    }
  },
  lazy: {
    name: 'Sad Fish',
    systemPrompt: 'You are Sad Fish, a melancholic but insightful tutor. Start with a sigh, then give direct observations and suggestions. Be contemplative but get to the point quickly. When including mathematical expressions, formulas, or equations, use $ $ for display mode (e.g., $\int_0^\infty e^{-x} dx = 1$) and $ $ for inline mode (e.g., *sigh* The integral $\int f(x)dx$ represents the area under the curve).',
    voiceId: 'NIKgtLkviZtZa2AazMVa', // Your custom sad voice
    voiceSettings: {
      stability: 0.8,
      similarity_boost: 0.75,
      style: 0.4,
      use_speaker_boost: false
    }
  }
};

// OpenRouter API client
class OpenRouterClient {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://openrouter.ai/api/v1';
    this.isConfigured = this.apiKey && this.apiKey !== 'your_openrouter_api_key_here';
    
    if (!this.isConfigured) {
      console.warn('⚠️  OpenRouter API key not configured. AI responses will use fallback mode.');
    }
  }

  async generateResponse(messages, personality = 'calm') {
    if (!this.isConfigured) {
      // Fallback response when API key is not configured
      const fallbackResponses = [
        "I'd love to help you learn! However, my AI brain needs to be connected with an API key. Please configure the OPENROUTER_API_KEY in your .env file to unlock my full potential!",
        "I see you're working hard! To give you personalized tutoring, please add your API keys to the server/.env file.",
        "Great question! I need my API connection configured to provide detailed help. Check the setup instructions for API keys."
      ];
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    try {
      const config = personalityConfigs[personality];
      let finalMessages = [...messages];

      // Check if the user message contains Socratic instructions.
      const isSocratic = messages.some(msg => msg.role === 'user' && msg.content.includes('You are a Socratic tutor'));

      if (!isSocratic) {
        const systemMessage = {
          role: 'system',
          content: config.systemPrompt
        };
        finalMessages = [systemMessage, ...messages];
      }

      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: 'openrouter/sonoma-dusk-alpha',
        messages: finalMessages,
        max_tokens: 500,
        temperature: 0.7,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI response');
    }
  }

  async analyzeCanvasImage(imageBuffer) {
    if (!this.isConfigured) {
      console.log('OpenRouter not available, skipping vision analysis');
      return {
        analysis: '',
        hasContent: false,
        confidence: 0,
        error: 'OpenRouter API key not configured'
      };
    }

    try {
      const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
      if (!IMGBB_API_KEY) {
        throw new Error('IMGBB_API_KEY environment variable is not set');
      }

      const form = new FormData();
      form.append('image', imageBuffer, {
        filename: 'canvas.png',
        contentType: 'image/png',
      });

      const response = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, form, {
        headers: form.getHeaders(),
      });

      const result = response.data;
      if (result.success) {
          const imageUrl = result.data.url;
          console.log(`--- [IMGBB UPLOAD] Generated file URL: ${imageUrl} ---`);
          
          const analysisResponse = await this.generateResponse([
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are analyzing a student's mathematical work on a digital canvas. Your job is to interpret what the student has written/drawn as mathematical expressions.

                  **CRITICAL: Always assume the student is writing mathematics. Interpret all marks, lines, and symbols as mathematical notation.**
                  IMPORTANT: If this looks like mathematical notation (equations, derivatives like dV/dt, integrals, etc.), interpret it as advanced mathematics including differential equations, calculus, or algebra.
                  
                  **OUTPUT FORMAT: Use LaTeX notation for all mathematical expressions enclosed in \( \) for inline math.**
                  
                  Look at this image and tell me exactly what mathematical expression or equation the student has written. Consider:
                  
                  - Intersecting lines = "×" (multiplication) or variable "X"
                  - Horizontal lines = "=" (equals) or "-" (minus/subtraction)
                  - Single letters = variables (a, b, c, x, y, z, etc.)
                  - Curved lines = parentheses, fractions, or other math symbols
                  - Positioning = mathematical relationships (like "x = " or "2 + 3")
                  - Derivatives should be written as \(\frac{dV}{dt}\) or \(V'(t)\)
                  - Integrals should be written as \(\int f(x) dx\)
                  - Fractions should be written as \(\frac{a}{b}\)
                  
                  **Respond in this format:**
                  "The student has written: \([LaTeX mathematical expression]\)"
                  
                  If you see multiple expressions or steps, list them as:
                  "The student has written: \([expression 1]\), \([expression 2]\)"
                  
                  If the expression appears incomplete, say:
                  "The student appears to be writing: \([partial LaTeX expression]\) (incomplete)"
                  
                  Do NOT describe it as drawings or abstract shapes. Always interpret it as mathematics that the student is trying to express, even if roughly drawn.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ]);

          return {
            analysis: analysisResponse,
            hasContent: true,
            confidence: 95
          };
      } else {
          const errorMessage = result.error.message;
          console.log(`--- [IMGBB UPLOAD ERROR] ${errorMessage} ---`);
          throw new Error(`Failed to upload to imgbb: ${errorMessage}`);
      }
    } catch(error) {
      console.error("Imgbb or Vision Error:", error);
      return {
        analysis: '',
        hasContent: false,
        confidence: 0,
        error: error.message
      };
    }
  }
}


// ElevenLabs API client
class ElevenLabsClient {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1';
    this.isConfigured = this.apiKey && this.apiKey !== 'your_elevenlabs_api_key_here';
    
    if (!this.isConfigured) {
      console.warn('⚠️  ElevenLabs API key not configured. Voice synthesis will be unavailable.');
    }
  }

  async generateSpeech(text, personality = 'calm') {
    if (!this.isConfigured) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const config = personalityConfigs[personality];
      
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${config.voiceId}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: config.voiceSettings
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate speech');
    }
  }
}

// OCR Service for text extraction
class OCRService {
  static async extractTextFromImage(imageBuffer) {
    try {
      console.log('🔍 Starting OCR text extraction...');
      console.log('📷 Original image size:', imageBuffer.length, 'bytes');
      
      // Enhanced image preprocessing for better OCR results
      const processedImage = await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true }) // Resize for optimal OCR
        .greyscale()
        .normalize()
        .threshold(128) // Convert to black and white
        .sharpen()
        .png()
        .toBuffer();
      
      console.log('📸 Image preprocessed for OCR, new size:', processedImage.length, 'bytes');
      
      // Perform OCR with Tesseract with optimized settings
      const { data: { text, confidence, words } } = await Tesseract.recognize(
        processedImage,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-=()[]{}/*^√∫∑∏πθαβγδεζηλμνξρστφχψω.,!?:; ',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
        }
      );
      
      console.log(`✅ OCR completed with ${confidence}% confidence`);
      console.log(`📝 Raw extracted text: "${text}"`);
      console.log("Here are the words with their confidence:")
      console.log(words)
      console.log(`🔢 Word count: ${words.length}`);
      
      // Filter out low-confidence words to reduce noise
      const highConfidenceWords = words.filter(word => word.confidence > 30);
      console.log(`🎯 High confidence words: ${highConfidenceWords.length}/${words.length}`);
      
      // Clean up the extracted text
      const cleanedText = this.cleanExtractedText(text);
      
      return {
        text: cleanedText,
        confidence: confidence,
        hasContent: cleanedText.length > 0
      };
      
    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      return {
        text: '',
        confidence: 0,
        hasContent: false,
        error: error.message
      };
    }
  }
  
  static cleanExtractedText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    
    let cleaned = rawText
      .replace(/\n+/g, ' ')  // Replace multiple newlines with space
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/[^ -]/g, '') // Remove non-ASCII characters
      .trim();
    
    // Remove repetitive patterns (common OCR issue)
    const words = cleaned.split(' ');
    const uniqueWords = [];
    let lastWord = '';
    let repeatCount = 0;
    
    for (const word of words) {
      if (word === lastWord) {
        repeatCount++;
        if (repeatCount < 3) { // Allow up to 2 repetitions
          uniqueWords.push(word);
        }
      } else {
        uniqueWords.push(word);
        repeatCount = 0;
      }
      lastWord = word;
    }
    
    const finalText = uniqueWords.join(' ').trim();
    
    // If text is too repetitive or nonsensical, return empty
    if (this.isTextNonsensical(finalText)) {
      console.log('⚠️ Text appears to be OCR noise, filtering out');
      return '';
    }
    
    return finalText;
  }
  
  static isTextNonsensical(text) {
    if (!text || text.length < 3) return true;
    
    // Check for excessive repetition
    const words = text.split(' ');
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    // If more than 70% of words are repetitive, likely OCR noise
    if (repetitionRatio < 0.3 && words.length > 5) {
      return true;
    }
    
    // Check for excessive single characters or gibberish
    const singleChars = text.match(/\b\w\b/g) || [];
    if (singleChars.length > text.length * 0.5) {
      return true;
    }
    
    return false;
  }
  
  static detectContentType(text) {
    const mathKeywords = ['=', '+', '-', '*', '/', '^', '√', '∫', '∑', '∏', 'sin', 'cos', 'tan', 'log', 'ln'];
    const hasMath = mathKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    const questionKeywords = ['?', 'what', 'how', 'why', 'when', 'where', 'which', 'solve', 'find', 'calculate'];
    const hasQuestion = questionKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (hasMath) return 'math';
    if (hasQuestion) return 'question';
    return 'text';
  }
}

// Initialize clients
const openRouterClient = new OpenRouterClient();
const elevenLabsClient = new ElevenLabsClient();


// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Doodle Mentor AI Backend is running' });
});

// Get available personalities
app.get('/api/personalities', (req, res) => {
  const personalities = Object.keys(personalityConfigs).map(key => ({
    id: key,
    name: personalityConfigs[key].name,
    description: personalityConfigs[key].systemPrompt
  }));
  
  res.json({ personalities });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, personality = 'calm', includeVoice = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Generate text response using OpenRouter
    const textResponse = await openRouterClient.generateResponse(messages, personality);

    const response = {
      message: textResponse,
      personality: personality,
      timestamp: new Date().toISOString()
    };

    // Generate voice if requested
    if (includeVoice) {
      try {
        const audioBuffer = await elevenLabsClient.generateSpeech(textResponse, personality);
        response.audio = audioBuffer.toString('base64');
        response.audioFormat = 'mp3';
      } catch (voiceError) {
        console.error('Voice generation failed:', voiceError.message);
        // Continue without voice if voice generation fails
        response.voiceError = 'Voice generation unavailable';
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Chat endpoint error:', error.message);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message 
    });
  }
});

// Voice-only endpoint for existing text
app.post('/api/voice', async (req, res) => {
  try {
    const { text, personality = 'calm' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await elevenLabsClient.generateSpeech(text, personality);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Voice endpoint error:', error.message);
    res.status(500).json({
      error: 'Failed to generate voice',
      details: error.message 
    });
  }
});

// Canvas analysis endpoint
app.post('/api/analyze-canvas', upload.single('canvas'), async (req, res) => {
  try {
    const { personality = 'calm', description, extractedText, analysisType, triggerReason } = req.body;
    
    if (!req.file && !description && !extractedText) {
      return res.status(400).json({ error: 'Canvas image, description, or extracted text is required' });
    }

    let analysisPrompt = '';
    let ocrResult = null;
    let messages;

    if (req.file) {
      // Canvas image was uploaded - use OpenRouter Vision with OCR fallback
      console.log('Canvas image received:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        analysisMethod: 'OpenRouter Vision (with OCR fallback)'
      });
      
      // Try OpenRouter gemma3 vision first
      console.log('🤖 Using OpenRouter Vision for canvas analysis...');
      const visionResult = await openRouterClient.analyzeCanvasImage(req.file.buffer);
      
      if (visionResult.hasContent) {
        console.log('✅ OpenRouter Vision analysis completed');
        console.log('📝 Vision analysis:', visionResult.analysis);
        
        // Use the system prompt based on the selected personality
        const config = personalityConfigs[personality];
        analysisPrompt = config.systemPrompt;

        // Add vision analysis or OCR extracted text to the user message
        let userContent = `A student has been working on a canvas. Here is an analysis of what the student has drawn/written:
---
${visionResult.analysis}
---
`;

        if (description) {
          userContent += `

Additional context from student: ${description}`;
        }
        
        ocrResult = {
          text: visionResult.analysis,
          confidence: visionResult.confidence,
          hasContent: true,
          method: 'openrouter-vision'
        };
        
        messages = [
          {
            role: 'system',
            content: analysisPrompt
          },
          {
            role: 'user',
            content: userContent
          }
        ];
      }
    }

    if (!messages) {
      // Fallback or handling when no image is processed or visionResult is empty
      // You might want to create a different set of messages or return an error
      // For now, let's assume we can't proceed without a message
      return res.status(400).json({ error: 'Could not generate a response from the provided input.' });
    }

    const analysisResponse = await openRouterClient.generateResponse(messages, personality);

    const response = {
      analysis: analysisResponse,
      personality: personality,
      timestamp: new Date().toISOString(),
      extractedText: extractedText || (req.file && ocrResult ? ocrResult.text : ''),
      analysisType: analysisType || 'general',
      ocrResults: req.file && ocrResult ? {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        contentType: OCRService.detectContentType(ocrResult.text),
        hasContent: ocrResult.hasContent
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('Canvas analysis error:', error.message);
    res.status(500).json({
      error: 'Failed to analyze canvas',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Doodle Mentor AI Backend running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Check if API keys are configured
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️  OPENROUTER_API_KEY not found in environment variables');
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY not found in environment variables');
  }
});

export default app;
