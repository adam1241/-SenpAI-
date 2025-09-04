import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Send, Bot, User, Brain, Lightbulb, Volume2, VolumeX, AlertCircle, Pencil, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ApiService, ChatMessage } from "@/services/api";
import "katex/dist/katex.min.css";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'analysis' | 'help' | 'feedback';
  responseType?: 'question' | 'explanation' | 'encouragement' | 'code' | 'warning' | 'success';
}

interface AIChatProps {
  className?: string;
  selectedPersonality: 'calm' | 'angry' | 'cool' | 'lazy';
  onAnalyzeCanvas?: () => void;
}

interface AIChatRef {
  addCanvasAnalysis: (analysis: string) => void;
}

// Helper function to determine response type from content
const getResponseType = (content: string): 'question' | 'explanation' | 'encouragement' | 'code' | 'warning' | 'success' => {
  const lowerContent = content.toLowerCase();
  
  if (content.includes('```') || content.includes('`')) return 'code';
  if (lowerContent.includes('what') && lowerContent.includes('?')) return 'question';
  if (lowerContent.includes('great') || lowerContent.includes('excellent') || lowerContent.includes('perfect')) return 'success';
  if (lowerContent.includes('warning') || lowerContent.includes('careful') || lowerContent.includes('note')) return 'warning';
  if (lowerContent.includes('you can') || lowerContent.includes('keep going') || lowerContent.includes('try')) return 'encouragement';
  
  return 'explanation';
};

// Helper function to get color class based on response type
const getResponseTypeColor = (type?: string) => {
  switch (type) {
    case 'question': return 'border-l-blue-500';
    case 'explanation': return 'border-l-green-500';
    case 'encouragement': return 'border-l-yellow-500';
    case 'code': return 'border-l-purple-500';
    case 'warning': return 'border-l-orange-500';
    case 'success': return 'border-l-emerald-500';
    default: return 'border-l-gray-400';
  }
};

export const AIChat = forwardRef<AIChatRef, AIChatProps>(({ className, selectedPersonality, onAnalyzeCanvas }, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [backendError, setBackendError] = useState<string>("");
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addCanvasAnalysis: async (analysis: string) => {
      console.log('📝 Canvas analysis received:', analysis);
      
      setIsTyping(true);
      
      try {
        // Send analysis directly to chatbot without showing raw analysis
        const contextMessages = convertToChatMessages(messages);
        contextMessages.push({
          role: 'user' as const,
          content: `I need help with my canvas work. Here's what I've created: ${analysis}. Please speak directly to me as the student and provide teaching guidance and ask follow-up questions.`
        });

        const chatResponse = await ApiService.getNotebookChatResponse(
          contextMessages,
          selectedPersonality,
          isVoiceEnabled
        );

        // Add only the AI's intelligent response
        const aiResponseMessage: Message = {
          id: Date.now().toString(),
          content: chatResponse.message,
          isUser: false,
          timestamp: new Date(chatResponse.timestamp),
          responseType: getResponseType(chatResponse.message)
        };

        setMessages(prev => [...prev, aiResponseMessage]);
        
        // Play audio if available
        if (chatResponse.audio) {
          await playAudio(chatResponse.audio);
        } else if (isVoiceEnabled) {
          await fallbackTextToSpeech(chatResponse.message);
        }
        
      } catch (error) {
        console.error('Canvas analysis error:', error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          content: "Sorry, I couldn't analyze your work right now. Please try again later.",
          isUser: false,
          timestamp: new Date(),
          responseType: 'warning'
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    }
  }));

  // Check backend connection
  const checkBackendConnection = useCallback(async () => {
    try {
      const isConnected = await ApiService.checkNotebookHealth();
      setIsBackendConnected(isConnected);
      if (!isConnected) {
        setBackendError("Notebook server is not running. Please start the server first.");
      } else {
        setBackendError("");
      }
    } catch (error) {
      setIsBackendConnected(false);
      setBackendError("Failed to connect to Notebook server.");
    }
  }, []);

  // Stop all audio playback
  const stopAudio = useCallback(() => {
    // Stop HTML5 audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
  }, []);

  // Play audio from base64 or blob
  const playAudio = useCallback(async (audioData?: string, audioBlob?: Blob) => {
    if (!isVoiceEnabled) {
      console.log('🔇 Voice disabled, skipping audio playback');
      return;
    }
    
    console.log('🎧 Starting audio playback...');
    
    try {
      let audioUrl: string;
      
      if (audioData) {
        console.log('📥 Converting base64 audio data to blob...');
        // Convert base64 to blob and create URL
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(blob);
        console.log('✅ Audio blob created, size:', blob.size, 'bytes');
      } else if (audioBlob) {
        audioUrl = URL.createObjectURL(audioBlob);
        console.log('✅ Audio URL created from provided blob');
      } else {
        console.log('❌ No audio data provided');
        return;
      }

      if (audioRef.current) {
        console.log('🎵 Setting audio source and attempting to play...');
        audioRef.current.src = audioUrl;
        setIsPlaying(true);
        
        // Add error handler
        audioRef.current.onerror = (e) => {
          console.error('❌ Audio element error:', e);
          setIsPlaying(false);
        };
        
        await audioRef.current.play();
        console.log('✅ Audio playback started successfully');
        
        // Clean up URL after playing
        audioRef.current.onended = () => {
          console.log('🏁 Audio playback ended');
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
        };
        
        // Handle pause/stop events
        audioRef.current.onpause = () => {
          console.log('⏸️ Audio playback paused');
          setIsPlaying(false);
        };
      } else {
        console.error('❌ Audio ref not available');
      }
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setIsPlaying(false);
      // Fallback to text-to-speech if audio fails
      console.log('🔄 Falling back to browser TTS due to audio error');
      await fallbackTextToSpeech('');
    }
  }, [isVoiceEnabled]);

  // Fallback text-to-speech function
  const fallbackTextToSpeech = async (text: string) => {
    if (!isVoiceEnabled || !text) return;
    
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Adjust voice characteristics based on personality
        switch (selectedPersonality) {
          case 'calm':
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            break;
          case 'angry':
            utterance.rate = 1.2;
            utterance.pitch = 1.2;
            utterance.volume = 0.9;
            break;
          case 'cool':
            utterance.rate = 0.9;
            utterance.pitch = 0.8;
            break;
          case 'lazy':
            utterance.rate = 0.6;
            utterance.pitch = 0.7;
            break;
        }
        
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, [checkBackendConnection]);

  // Update greeting message when personality changes
  useEffect(() => {
    const personalityGreetings = {
      calm: "Hello there! I'm your calm and patient AI tutor. Take your time, and I'll guide you through each step carefully.",
      angry: "Listen up! I'm here to push you to excellence! Don't waste time - let's tackle this exercise with determination!",
      cool: "Hey! 😎 Your cool AI tutor is here. We'll make learning this exercise smooth and fun!",
      lazy: "Oh... hi... I'm your... *yawn* ...laid-back tutor. Don't worry, we'll figure this out... eventually... 😴"
    };

    setMessages([
      {
        id: Date.now().toString(),
        content: personalityGreetings[selectedPersonality],
        isUser: false,
        timestamp: new Date(),
        type: 'help',
        responseType: 'encouragement'
      }
    ]);
  }, [selectedPersonality]);

  // Convert messages to chat format for API
  const convertToChatMessages = (messages: Message[]): ChatMessage[] => {
    const safe = Array.isArray(messages) ? messages : [];
    return safe
      .filter(msg => msg.isUser || !msg.type || msg.type === 'feedback')
      .map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isBackendConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    setBackendError("");

    try {
      // Convert current messages to chat format
      const chatMessages = convertToChatMessages([...messages, userMessage]);
      
      // Send to backend API
      const chatResponse = await ApiService.getNotebookChatResponse(
        chatMessages, 
        selectedPersonality, 
        isVoiceEnabled
      );

      const aiResponse: Message = {
        id: Date.now().toString(),
        content: chatResponse.message,
        isUser: false,
        timestamp: new Date(chatResponse.timestamp),
        type: 'feedback',
        responseType: getResponseType(chatResponse.message)
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Play audio if available
      if (chatResponse.audio) {
        await playAudio(chatResponse.audio);
      } else if (isVoiceEnabled) {
        // Fallback to text-to-speech
        await fallbackTextToSpeech(chatResponse.message);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setBackendError("Failed to get AI response. Please try again.");
      
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        type: 'feedback',
        responseType: 'warning'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAnalyzeCanvas = async () => {
    if (!isBackendConnected) return;
    
    // Trigger canvas analysis from DrawingCanvas component
    onAnalyzeCanvas?.();
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleEditClick = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleUpdateMessage = () => {
    if (!editingMessageId) return;

    setMessages(messages.map(m => 
      m.id === editingMessageId ? { ...m, content: editingContent } : m
    ));

    toast.success("Message updated locally!");
    handleCancelEdit();
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'analysis': return <Brain className="h-4 w-4" />;
      case 'help': return <Lightbulb className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getPersonalityColor = () => {
    switch (selectedPersonality) {
      case 'calm': return 'ai-calm';
      case 'angry': return 'ai-angry';
      case 'cool': return 'ai-cool';
      case 'lazy': return 'ai-lazy';
      default: return 'primary';
    }
  };

  return (
    <Card className={`flex flex-col h-full ${className} min-h-0`}>
      {/* Hidden audio element for playing ElevenLabs audio */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      {/* Backend connection error alert */}
      {backendError && (
        <Alert className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{backendError}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full bg-${getPersonalityColor()}/20`}>
            <Bot className={`h-5 w-5 text-${getPersonalityColor()}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">AI Tutor</h3>
              {isBackendConnected ? (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected to backend" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full" title="Backend disconnected" />
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedPersonality.charAt(0).toUpperCase() + selectedPersonality.slice(1)} Mode
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const newVoiceState = !isVoiceEnabled;
              setIsVoiceEnabled(newVoiceState);
              
              // Stop any playing audio when voice is disabled
              if (!newVoiceState) {
                stopAudio();
              }
            }}
            className={`gap-2 ${isPlaying ? 'bg-green-100 border-green-300' : ''}`}
          >
            {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {isPlaying ? 'Stop Voice' : 'Voice'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAnalyzeCanvas}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            Analyze Work
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="space-y-4 overflow-y-auto " style={{ minHeight: 'calc(100vh - 280px)', maxHeight: 'calc(100vh - 280px)', position: 'relative' }}>
          {messages.map((message) => (
            <div key={message.id}>
              <div
                className={`flex items-start gap-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}
                onMouseEnter={() => !editingMessageId && setHoveredMessageId(message.id)}
                onMouseLeave={() => !editingMessageId && setHoveredMessageId(null)}
              >
                {!message.isUser && (
                  <div className={`p-2 rounded-full bg-${getPersonalityColor()}/20 flex-shrink-0`}>
                    {getMessageIcon(message.type)}
                  </div>
                )}

                {message.isUser && hoveredMessageId === message.id && !editingMessageId && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(message)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                )}
                
                <div
                  className={`relative max-w-[80%] rounded-lg border-l-4 ${
                    message.isUser
                      ? 'p-3 bg-user-message text-user-message-foreground border-l-primary'
                      : `p-3 pb-8 bg-card text-card-foreground border shadow-sm ${getResponseTypeColor(message.responseType)}`
                  }`}>
                  <div className="text-sm prose prose-sm max-w-none">
                    {editingMessageId === message.id ? (
                      <Textarea 
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full bg-background"
                        autoFocus
                      />
                    ) : message.isUser ? (
                      <p className="font-medium">{message.content}</p>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0 font-medium text-foreground">{children}</p>,
                          code: ({children, className}) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                            ) : (
                              <code className="block bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap">{children}</code>
                            );
                          },
                          pre: ({children}) => <pre className="bg-muted p-2 rounded overflow-x-auto mb-2">{children}</pre>,
                          strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({children}) => <em className="italic">{children}</em>,
                          ul: ({children}) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          li: ({children}) => <li className="mb-1">{children}</li>,
                          // Style math elements
                          span: ({children, className}) => {
                            if (className?.includes('math')) {
                              return <span className={`${className} inline-block`}>{children}</span>;
                            }
                            return <span className={className}>{children}</span>;
                          },
                          div: ({children, className}) => {
                            if (className?.includes('math')) {
                              return <div className={`${className} my-4 overflow-x-auto`}>{children}</div>;
                            }
                            return <div className={className}>{children}</div>;
                          }
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {!message.isUser && editingMessageId !== message.id && (
                    <Button variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => handleCopyToClipboard(message.content)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {message.isUser && (
                  <div className="p-2 rounded-full bg-primary/20 flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                )}
              </div>
              {editingMessageId === message.id && (
                <div className="flex justify-end gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleUpdateMessage}
                    disabled={editingContent === message.content}
                  >
                    Update
                  </Button>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className={`p-2 rounded-full bg-${getPersonalityColor()}/20 flex-shrink-0`}>
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card text-foreground p-3 rounded-lg border shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask for help or guidance..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isTyping || !isBackendConnected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
});
