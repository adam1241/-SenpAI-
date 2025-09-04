import { useState, Dispatch, SetStateAction, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ApiService, ChatMessage } from "@/services/api";
import "katex/dist/katex.min.css";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isMastery?: boolean;
  responseType?: 'question' | 'explanation' | 'encouragement' | 'code' | 'warning' | 'success';
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  previewUrl?: string;
}

interface ChatInterfaceProps {
  onCreateFlashcard: (concept: string, question: string, answer: string) => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  userId: string;
  sessionId: string;
  onActionProcessed: () => void;
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

export const ChatInterface = ({ onCreateFlashcard, messages, setMessages, userId, sessionId, onActionProcessed }: ChatInterfaceProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isFilePanelOpen, setIsFilePanelOpen] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // Prepare the history for the API
    const apiHistory: ChatMessage[] = [...messages, userMessage].map(({ id, timestamp, isMastery, isUser, ...rest }) => ({
      ...rest,
      role: isUser ? 'user' : 'assistant'
    }));

    try {
      const response = await ApiService.streamSocraticTutor(apiHistory, userId, sessionId);

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "",
        isUser: false,
        timestamp: new Date(),
        responseType: 'explanation',
      };
      setMessages(prev => [...prev, aiMessage]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && !lastMessage.isUser) {
              lastMessage.content += chunk;
              lastMessage.responseType = getResponseType(lastMessage.content);
            }
            return [...prev];
          });
        }
      }
      onActionProcessed(); // Refresh flashcard count after response is complete
    } catch (error) {
      console.error("Error fetching AI response:", error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting to the AI. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        responseType: 'warning',
      };
      setMessages(prev => [...prev, aiMessage]);
    }
  };

  const handleLifelineClick = (type: string) => {
    const lifelines = {
      hint: "Here's a hint: Think about the fundamental principles we discussed earlier.",
      simpler: "Let me ask a simpler question: What's the most basic element of this concept?",
      clarify: "What I mean is: Let's break this down into smaller, more manageable parts.",
      lesson: "Let me create a structured lesson plan based on our conversation so far. Here's how we can organize this learning journey into clear steps with objectives and activities."
    };

    const aiMessage: Message = {
      id: Date.now().toString(),
      content: lifelines[type as keyof typeof lifelines],
      isUser: false,
      timestamp: new Date(),
      responseType: type === 'lesson' ? 'explanation' : 'encouragement',
    };

    setMessages(prev => [...prev, aiMessage]);
    toast.info("Lifeline used! 💡");
  };

  useEffect(() => {
    // Clean up object URLs on unmount
    return () => {
      uploadedFiles.forEach(file => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [uploadedFiles]);

  const handleCreateFlashcard = () => {
    onCreateFlashcard(
      "Sample Concept",
      "What is the key principle we just discussed?",
      "The principle that learning is most effective when guided through self-discovery."
    );
    toast.success("Flashcard created! 📚");
  };

  

  const handleFilesClick = () => {
    toast.info("Files in conversation feature coming soon!");
  };

  const handleImportFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles: UploadedFile[] = Array.from(files).map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      
      const fileNames = newFiles.map(file => file.name).join(", ");
      toast.success(`Files uploaded: ${fileNames}`);
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType.startsWith('image/')) return FileImage;
    if (fileType.startsWith('video/')) return FileVideo;
    if (fileType.startsWith('audio/')) return Music;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return Archive;
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(extension || '')) return FileText;
    
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev =>
      prev.filter(file => {
        if (file.id === fileId) {
          if (file.previewUrl) {
            URL.revokeObjectURL(file.previewUrl);
          }
          return false;
        }
        return true;
      })
    );
    toast.success("File removed");
  };

  const handleAddFromDrive = () => {
    toast.info("Google Drive integration coming soon!");
    // TODO: Implement Google Drive integration
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

  const handleUpdateMessage = async () => {
    if (!editingMessageId) return;

    const originalMessage = messages.find(m => m.id === editingMessageId);
    if (!originalMessage || originalMessage.content === editingContent) {
      handleCancelEdit();
      return;
    }

    // Update the message locally (no backend endpoint yet)
    try {
      setMessages(messages.map(m => 
        m.id === editingMessageId ? { ...m, content: editingContent } : m
      ));

      toast.success("Message updated!");
    } catch (error) {
      console.error("Failed to update message:", error);
      toast.error("Failed to update message. Please try again.");
    } finally {
      handleCancelEdit();
    }
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Moved Files Button to a fixed position */}
      <div className="absolute top-4 right-4 z-10">
        <Sheet open={isFilePanelOpen} onOpenChange={setIsFilePanelOpen}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Files className="w-4 h-4" />
                  {uploadedFiles.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-5 h-5 flex items-center justify-center">
                      {uploadedFiles.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Files in this conversation</p>
            </TooltipContent>
          </Tooltip>
          <SheetContent className="w-80 sm:w-96">
            <SheetHeader>
              <SheetTitle>Files in this conversation</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {uploadedFiles.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Files className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No files uploaded yet</p>
                  <p className="text-sm">Use the + button to upload files</p>
                </div>
              ) : (
                uploadedFiles.map((file) => {
                  const FileIcon = getFileIcon(file.type, file.name);
                  return (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                      <FileIcon className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Chat Messages or Idle State */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            /* Idle State with Logo */
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center w-96 h-96 rounded-full bg-gradient-learning mb-0 p-2">
                  <img src={senpaiLogo} alt="SenpAI" className="w-full h-full object-contain" />
                </div>
                <p className="text-muted-foreground text-lg mb-4">Your AI Learning Companion</p>
                <p className="text-muted-foreground max-w-md">
                  Ready to explore? Ask me anything you'd like to learn about. I'll guide you through discovery using the Socratic method.
                </p>
              </div>

              
              {/* Quick Start Suggestions */}
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
            /* Chat Messages */
            messages.map((message) => (
              <div key={message.id}>
                <div
                  className={`flex items-start gap-2 ${message.isUser ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => !editingMessageId && setHoveredMessageId(message.id)}
                  onMouseLeave={() => !editingMessageId && setHoveredMessageId(null)}
                >
                  {message.isUser && hoveredMessageId === message.id && !editingMessageId && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditClick(message)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Card className={`relative max-w-[80%] p-4 border-l-4 ${
                    message.isUser 
                      ? "bg-user-message text-user-message-foreground border-l-primary" 
                      : message.isMastery
                      ? "bg-success-light border-success animate-celebration border-l-success"
                      : `bg-card ${getResponseTypeColor(message.responseType)}`
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
                            <span className="text-sm font-semibold">Moment of Mastery!</span>
                            <Sparkles className="w-4 h-4 animate-sparkle" />
                          </div>
                        )}
                        <div className="text-sm prose prose-sm max-w-none">
                          {message.isUser ? (
                            <p>{message.content}</p>
                          ) : (
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
                        {message.isMastery && (
                          <div className="flex justify-end mt-2">
                            <Button
                              variant="mastery"
                              size="lifeline"
                              onClick={handleCreateFlashcard}
                            >
                              Save as Flashcard
                            </Button>
                          </div>
                        )}
                        {!message.isUser && (
                          <Button variant="ghost" size="icon" className="absolute bottom-1 right-1 h-7 w-7" onClick={() => handleCopyToClipboard(message.content)}>
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
            ))
          )}
          
        </div>
      </ScrollArea>

      {/* Lifeline Buttons - Only show when there are messages */}
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

      {/* Message Input */}
      <div className="p-4 border-t bg-background">
        {/* File Preview Area */}
        {uploadedFiles.length > 0 && (
          <div className="max-w-4xl mx-auto mb-3">
            <div className="flex gap-3 flex-wrap p-3 border rounded-lg bg-muted/50">
              {uploadedFiles.map(file => {
                const FileIcon = getFileIcon(file.type, file.name);
                return (
                  <div key={file.id} className="relative w-24 h-24 rounded-lg overflow-hidden border shadow-sm">
                    {file.previewUrl ? (
                      <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-card flex flex-col items-center justify-center p-2">
                        <FileIcon className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1 text-center break-all line-clamp-2">
                          {file.name}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      className="absolute top-1 right-1 bg-background/60 backdrop-blur-sm rounded-full h-6 w-6 text-foreground hover:bg-background/80"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
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
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything you'd like to learn about..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.txt,.md,image/*"
        />
      </div>
    </div>
  );
};
