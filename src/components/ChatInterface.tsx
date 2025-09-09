import { useState, Dispatch, SetStateAction, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, Lightbulb, HelpCircle, MessageSquare, Sparkles, Star, BookOpen, FileText, Plus, Upload, Cloud, Files, File, FileImage, FileVideo, Music, Archive, X, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import senpaiLogo from "./logo/SenpAI2.png";
import { ApiService, ChatMessage as ApiChatMessage, uploadImage } from "@/services/api";
import "katex/dist/katex.min.css";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  isUser: boolean;
  timestamp: Date;
  isMastery?: boolean;
  responseType?: 'question' | 'explanation' | 'encouragement' | 'code' | 'warning' | 'success';
  isEdited?: boolean;
  originalContent?: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  editedMessageId?: string;
}

interface ChatInterfaceProps {
  onCreateFlashcard: (concept: string, question: string, answer: string) => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  userId: string;
  sessionId: string;
  onActionProcessed: () => void;
}

const getResponseType = (content: string): 'question' | 'explanation' | 'encouragement' | 'code' | 'warning' | 'success' => {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('```') || lowerContent.includes('`')) return 'code';
  if (lowerContent.includes('what') && lowerContent.includes('?')) return 'question';
  if (lowerContent.includes('great') || lowerContent.includes('excellent') || lowerContent.includes('perfect')) return 'success';
  if (lowerContent.includes('warning') || lowerContent.includes('careful') || lowerContent.includes('note')) return 'warning';
  if (lowerContent.includes('you can') || lowerContent.includes('keep going') || lowerContent.includes('try')) return 'encouragement';
  
  return 'explanation';
};

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

export const ChatInterface = ({ onCreateFlashcard, messages, setMessages, userId, sessionId, onActionProcessed }: ChatInterfaceProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const [fileToSend, setFileToSend] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentAiMessageId = useRef<string | null>(null); // New ref for current AI message ID

  // Load conversation history on component mount
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const fetchedMessages = await ApiService.getConversations(userId, sessionId);
        // Convert ApiChatMessage to Message interface, ensuring content is correctly typed
        const formattedMessages: Message[] = fetchedMessages.map(apiMsg => ({
          id: apiMsg.id || Date.now().toString(), // Assuming apiMsg also has an ID or generate one
          content: apiMsg.content, 
          isUser: apiMsg.role === 'user',
          timestamp: new Date(), // Assuming timestamp is handled or can be omitted if not critical for display
        }));
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Failed to load conversation history:", error);
        // Optionally, display a toast error to the user
        toast.error("Failed to load conversation history.");
      }
    };
    loadConversation();
  }, [userId, sessionId, setMessages]);

  // Save conversation history whenever messages change
  useEffect(() => {
    if (messages.length === 0) return; // Don't save empty chat

    const handler = setTimeout(() => {
      ApiService.saveConversation(messages.map(msg => ({ // Convert to ApiChatMessage type for saving
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content,
        id: msg.id, // Ensure ID is passed for tracking
        // Add other fields from ApiChatMessage if necessary for persistence
      })) as ApiChatMessage[], userId, sessionId);
    }, 1000); // Debounce saving to once per second

    return () => {
      clearTimeout(handler);
    };
  }, [messages, userId, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to recalculate
      const scrollHeight = textarea.scrollHeight;
      
      // Calculate max height for 11 lines
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
      const maxHeight = lineHeight * 11;

      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [inputMessage, editingContent]);

  const handleEditClick = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(Array.isArray(message.content) ? message.content.filter(part => part.type === 'text').map(part => part.text).join('') : message.content as string);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const _processAndSendToApi = async (historyToProcess: Message[], currentUserId: string, currentSessionId: string, originalMessageId?: string) => {
    let processedHistory = historyToProcess;

    if (originalMessageId) {
      const originalMessageIndex = processedHistory.findIndex(msg => msg.id === originalMessageId);
      if (originalMessageIndex !== -1) {
        // When a message is edited, we should clear all subsequent messages and their responses
        // from the `processedHistory` to ensure a clean slate for the regenerated conversation branch.
        processedHistory = processedHistory.slice(0, originalMessageIndex + 1);
      }
    }

    const apiHistory: ApiChatMessage[] = processedHistory.map(msg => {
        let contentForApi: any;
        if (Array.isArray(msg.content)) {
            contentForApi = msg.content;
        } else {
            contentForApi = [{ type: 'text', text: msg.content }];
        }
        
        return {
            role: msg.isUser ? 'user' : 'assistant',
            content: contentForApi,
        };
    });

    console.log("API History sent to backend:", apiHistory); // Debug log
    console.log("Original message ID for API call:", originalMessageId); // Debug log

    // Remove initial setMessages for adding blank AI message. This is now handled by caller.
    // const newAiMessageId = (Date.now() + 1).toString();

    // setMessages(prev => {
    //   let newMessages = [...prev];
    //   let targetAiMessageIndex: number = -1;
    //   const originalUserMessageIndex = newMessages.findIndex(m => m.id === originalMessageId);

    //   if (originalMessageId && originalUserMessageIndex !== -1) {
    //     newMessages = newMessages.slice(0, originalUserMessageIndex + 1);
    //     const newAiMessage: Message = {
    //       id: newAiMessageId,
    //       content: "",
    //       isUser: false,
    //       timestamp: new Date(),
    //       responseType: 'explanation',
    //     };
    //     newMessages.splice(originalUserMessageIndex + 1, 0, newAiMessage);
    //     targetAiMessageIndex = originalUserMessageIndex + 1;
    //   } else {
    //     const newAiMessage: Message = {
    //       id: newAiMessageId,
    //       content: "",
    //       isUser: false,
    //       timestamp: new Date(),
    //       responseType: 'explanation',
    //     };
    //     newMessages.push(newAiMessage);
    //     targetAiMessageIndex = newMessages.length - 1;
    //   }
    //   currentAiMessageId.current = newAiMessageId; 
    //   console.log("Messages after adding blank AI message:", newMessages); 
    //   return newMessages;
    // });

    try {
      const response = await ApiService.streamSocraticTutor(apiHistory, currentUserId, currentSessionId, originalMessageId);

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        console.log("Streaming - Chunk received:", chunk); // Debug log
        if (chunk) {
          setMessages(prev => {
            const messagesCopy = [...prev];
            const messageIndexToUpdate = messagesCopy.findIndex(m => m.id === currentAiMessageId.current);

            if (messageIndexToUpdate !== -1 && !messagesCopy[messageIndexToUpdate].isUser) {
              console.log("Streaming - Updating message ID:", currentAiMessageId.current, "at index:", messageIndexToUpdate); // Debug log
              const messageToUpdate = { ...messagesCopy[messageIndexToUpdate] };
              console.log("Streaming - Content before update:", messageToUpdate.content); // Debug log
              messageToUpdate.content = (messageToUpdate.content as string) + chunk;
              messageToUpdate.responseType = getResponseType(messageToUpdate.content as string);
              console.log("Streaming - Content after update:", messageToUpdate.content); // Debug log
              messagesCopy[messageIndexToUpdate] = messageToUpdate;
            }
            console.log("Messages during streaming update:", messagesCopy); // Debug log
            return messagesCopy;
          });
        }
      }
      console.log("AI response streaming finished."); // Debug log
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setMessages(prev => {
        const messagesCopy = [...prev];
        const messageToUpdate = messagesCopy.find(m => m.id === currentAiMessageId.current);
        if (messageToUpdate && !messageToUpdate.isUser) {
          messageToUpdate.content = "Sorry, I'm having trouble connecting to the AI. Please try again later.";
          messageToUpdate.responseType = 'warning';
        } else {
            messagesCopy.push({
                id: (Date.now() + 1).toString(),
                content: "Sorry, I'm having trouble connecting to the AI. Please try again later.",
                isUser: false,
                timestamp: new Date(),
                responseType: 'warning',
            });
        }
        return messagesCopy;
      });
    }
  };

  const handleSendMessage = async (messageContentOverride?: string, originalMessageId?: string) => {
    const messageToSend = messageContentOverride !== undefined ? messageContentOverride : inputMessage;

    if (!messageToSend.trim() && !fileToSend) return;

    let imageUrl: string | undefined = undefined;
    if (fileToSend) {
      try {
        const uploadResponse = await uploadImage(fileToSend);
        imageUrl = uploadResponse.filePath;
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error("Error uploading file.");
        return;
      }
    }

    const userMessageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    if (messageToSend) {
        userMessageContent.push({ type: "text", text: messageToSend });
    }
    if (imageUrl) {
        userMessageContent.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    const userMessage: Message = {
      id: originalMessageId || Date.now().toString(),
      content: userMessageContent,
      isUser: true,
      timestamp: new Date(),
      // If it's an edited message, mark it as such and link to the original
      isEdited: messageContentOverride !== undefined && !!originalMessageId,
      editedMessageId: originalMessageId,
    };

    // Create a new unique ID for the AI response that will be streamed.
    const newAiMessageId = (Date.now() + 1).toString();

    // Use functional update to ensure we have the latest `messages` state
    setMessages(prevMessages => {
      let newMessages = [...prevMessages];
      
      if (originalMessageId) {
        // If we are editing an existing message, we need to find the user message
        // and then remove all subsequent AI messages in the UI from that point forward.
        const originalUserMessageIndex = newMessages.findIndex(msg => msg.id === originalMessageId);
        if (originalUserMessageIndex !== -1) {
          newMessages = newMessages.slice(0, originalUserMessageIndex + 1);
        }
      }
      
      // For a new message, or after clearing subsequent messages for an edit, add the user message
      // if it's not an edited message (as edited messages are updated in place by handleSendMessage).
      if (!originalMessageId) {
        newMessages.push(userMessage);
      }

      // Add a blank AI message for streaming after the user message (or edited user message)
      const newAiMessage: Message = {
        id: newAiMessageId,
        content: "",
        isUser: false,
        timestamp: new Date(),
        responseType: 'explanation',
      };
      newMessages.push(newAiMessage);
      currentAiMessageId.current = newAiMessageId; // Set the current AI message ID
      
      // Now call _processAndSendToApi with the fully updated messages array
      _processAndSendToApi(newMessages, userId, sessionId, originalMessageId);
      return newMessages; // Return the updated messages for React to render
    });

    setInputMessage("");
    setFileToSend(null);
    setPreviewUrl(null);
  };

  const handleLifelineClick = async (type: string) => {
    const lifelineMessages: { [key: string]: string } = {
      hint: "Give me a hint.",
      simpler: "Ask me a simpler question.",
      clarify: "What do you mean by that?",
      lesson: "Make a lesson plan for me based on our conversation.",
    };

    const messageContent = lifelineMessages[type as keyof typeof lifelineMessages];
    if (!messageContent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      
      // Add a blank AI message for streaming after the user message
      const newAiMessageIdForLifeline = (Date.now() + 1).toString();
      const newAiMessage: Message = {
        id: newAiMessageIdForLifeline,
        content: "",
        isUser: false,
        timestamp: new Date(),
        responseType: 'explanation',
      };
      newMessages.push(newAiMessage);
      currentAiMessageId.current = newAiMessageIdForLifeline; // Set the current AI message ID for lifeline

      _processAndSendToApi(newMessages, userId, sessionId);
      return newMessages;
    });
    toast.info("Lifeline used! 💡");

  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFileToSend(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      toast.error("Only image files are supported for now.");
    }
  };

  const removeFile = () => {
    setFileToSend(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportFiles = () => {
    fileInputRef.current?.click();
  };

  const handleAddFromDrive = () => {
    toast.info("Google Drive integration coming soon!");
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleResendEditedMessage = async () => {
    if (!editingMessageId || !editingContent.trim()) {
      handleCancelEdit();
      return;
    }

    const originalMessageIndex = messages.findIndex(m => m.id === editingMessageId);
    if (originalMessageIndex === -1) {
      handleCancelEdit();
      return;
    }

    const originalMessage = messages[originalMessageIndex];
    const oldContent = Array.isArray(originalMessage.content) ? originalMessage.content.filter(part => part.type === 'text').map(part => part.text).join('') : originalMessage.content as string;

    if (oldContent === editingContent) {
      handleCancelEdit();
      return;
    }

    // Update the original message content and mark it as edited in the state
    setMessages(prevMessages => {
      const newMessages = [...prevMessages];
      const messageToUpdate = newMessages.find(m => m.id === editingMessageId);

      if (messageToUpdate) {
        if (!messageToUpdate.originalContent) {
          messageToUpdate.originalContent = messageToUpdate.content;
        }
        messageToUpdate.content = editingContent;
        messageToUpdate.isEdited = true;
      }
      return newMessages;
    });

    setInputMessage("");
    setEditingMessageId(null);
    setEditingContent("");

    // Call handleSendMessage to update the UI state and trigger API call
    handleSendMessage(editingContent, editingMessageId);
  };

  return (
    <div className="relative flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="flex items-center justify-center w-96 h-96 rounded-full bg-gradient-learning mb-0 p-2">
                  <img src={senpaiLogo} alt="SenpAI" className="w-full h-full object-contain" />
                </div>
                <p className="text-muted-foreground text-lg mb-4">Your AI Learning Companion</p>
                <p className="text-muted-foreground max-w-md">
                  Ready to explore? Ask me anything you'd like to learn about. I'll guide you through discovery using the Socratic method.
                </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("How does photosynthesis work?")}
                >
                  <div>
                    <div className="font-medium">🌱 Science</div>
                    <div className="text-sm text-muted-foreground">How does photosynthesis work?</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("Explain the quadratic formula")}
                >
                  <div>
                    <div className="font-medium">📐 Math</div>
                    <div className="text-sm text-muted-foreground">Explain the quadratic formula</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("What causes gravity?")}
                >
                  <div>
                    <div className="font-medium">🔬 Physics</div>
                    <div className="text-sm text-muted-foreground">What causes gravity?</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("How do chemical bonds form?")}
                >
                  <div>
                    <div className="font-medium">⚗️ Chemistry</div>
                    <div className="text-sm text-muted-foreground">How do chemical bonds form?</div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
              <div key={message.id}>
                <div
                  className={`flex items-start gap-2 ${message.isUser ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => !editingMessageId && setHoveredMessageId(message.id)}
                  onMouseLeave={() => !editingMessageId && setHoveredMessageId(null)}
                >
                  {message.isUser && hoveredMessageId === message.id && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(message)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Card className={`relative max-w-[80%] border-l-4 ${
                    message.isUser 
                      ? "p-4 bg-user-message text-user-message-foreground border-l-primary" 
                      : message.isMastery
                      ? "p-4 pb-8 bg-success-light border-success animate-celebration border-l-success"
                      : `p-4 pb-8 bg-card ${getResponseTypeColor(message.responseType)}`
                  }`}>
                    {editingMessageId === message.id ? (
                      <Textarea 
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full bg-background"
                        autoFocus
                      />
                    ) : (
                      <>
                        {message.isMastery && (
                          <div className="flex items-center gap-2 mb-2 text-success">
                            <Star className="w-4 h-4 animate-sparkle" />
                            <Sparkles className="w-4 h-4 animate-sparkle" />
                          </div>
                        )}
                        <div className="text-sm prose prose-sm max-w-none">
                          {message.isEdited && message.isUser && (
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <span>Message modifié</span>
                              <Button variant="ghost" size="sm" className="h-auto px-1 py-0 text-xs">
                                Afficher les versions
                              </Button>
                            </p>
                          )}
                          {Array.isArray(message.content) && message.content.some(part => part.type === 'image_url') && (
                            message.content.map((part, index) => (
                              part.type === 'image_url' && (
                                <img key={index} src={part.image_url?.url} alt="Uploaded content" className="mt-2 rounded-lg max-w-xs" />
                              )
                            ))
                          )}

                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
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
                            {Array.isArray(message.content) ? 
                                message.content.filter(part => part.type === 'text').map(part => part.text).join('') : 
                                message.content as string}
                          </ReactMarkdown>
                        </div>
                        {!message.isUser && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyToClipboard(message.content as string)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </Card>
                </div>
                {editingMessageId === message.id && (
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      Annuler
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleResendEditedMessage}
                      disabled={editingContent === (Array.isArray(messages.find(m => m.id === editingMessageId)?.content) ? (messages.find(m => m.id === editingMessageId)?.content as Array<{ type: string; text?: string; image_url?: { url: string } }>).filter(part => part.type === 'text').map(part => part.text).join('') : messages.find(m => m.id === editingMessageId)?.content as string)}
                    >
                      Renvoyer
                    </Button>
                  </div>
                )}
              </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {messages.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <div className="flex justify-center gap-2 max-w-4xl mx-auto">
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("hint")}
              className="gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Give me a hint
            </Button>
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("simpler")}
              className="gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Simpler question
            </Button>
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("clarify")}
              className="gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              What do you mean?
            </Button>
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("lesson")}
              className="gap-1"
            >
              <BookOpen className="w-3 h-3" />
              Make lesson plan
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 border-t bg-background">
        {previewUrl && (
          <div className="max-w-4xl mx-auto mb-3">
            <div className="relative w-24 h-24">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
              <Button onClick={removeFile} variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex gap-3 max-w-4xl mx-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-background border shadow-md z-50">
              <DropdownMenuItem onClick={handleImportFiles} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Add photos and files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddFromDrive} className="cursor-pointer">
                <Cloud className="w-4 h-4 mr-2" />
                Add from Drive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything you'd like to learn about..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 resize-none min-h-[40px] overflow-y-hidden custom-scrollbar"
            rows={1}
          />
          <Button onClick={() => handleSendMessage()} disabled={!inputMessage.trim() && !fileToSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*"
        />
      </div>
    </div>
  );
};
