import { useState, useRef } from "react";
import { PenTool, Brain } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { AIChat } from "@/components/AIChat";
import { PersonalitySelector } from "@/components/PersonalitySelector";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface NotebookViewProps {
  onSectionChange: (section: "chat" | "notebook" | "quiz" | "history" | "flashcards") => void;
}

export const NotebookView = ({ onSectionChange }: NotebookViewProps) => {
  const [selectedPersonality, setSelectedPersonality] = useState<'calm' | 'angry' | 'cool' | 'lazy'>('calm');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [canvasAnalysis, setCanvasAnalysis] = useState<string | null>(null);
  const canvasRef = useRef<{ analyzeCanvas: () => void } | null>(null);
  const chatRef = useRef<{ addCanvasAnalysis: (analysis: string) => void } | null>(null);

  const handleCanvasAnalysis = (analysis: string) => {
    setCanvasAnalysis(analysis);
    console.log("Canvas analysis received:", analysis);
    
    // Send analysis to chatbot as a system message
    if (chatRef.current) {
      chatRef.current.addCanvasAnalysis(analysis);
    }
  };

  const triggerCanvasAnalysis = () => {
    // Trigger analysis from the DrawingCanvas component
    if (canvasRef.current) {
      canvasRef.current.analyzeCanvas();
    }
  };

  return (
    <div className="h-full bg-background flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PenTool className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SenpAI - Notebook</h1>
                <p className="text-sm text-muted-foreground">AI-powered learning companion</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ImageUpload onImageUpload={setUploadedImage} />
              <PersonalitySelector
                selectedPersonality={selectedPersonality}
                onPersonalityChange={setSelectedPersonality}
              />
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => onSectionChange('chat')} className="border-2 border-success hover:bg-success-hover">
                    <Brain className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tutor Chat</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column - Drawing Canvas (expanded) */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">Work Area</h2>
                <p className="text-sm text-muted-foreground">- Draw, write, and solve your exercise here</p>
              </div>
              
              <div className="flex-1 min-h-[600px]">
                <DrawingCanvas 
                  ref={canvasRef}
                  className="bg-gradient-to-br from-canvas-bg to-notebook-paper shadow-notebook h-full"
                  selectedPersonality={selectedPersonality}
                  onCanvasAnalysis={handleCanvasAnalysis}
                />
              </div>
            </div>

            {/* Right Column - AI Chat */}
            <div className="lg:col-span-1 h-full">
              <AIChat
                ref={chatRef}
                selectedPersonality={selectedPersonality}
                onAnalyzeCanvas={triggerCanvasAnalysis}
                className="h-full shadow-chat bg-gradient-to-br from-card to-background"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle paper texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-5" 
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }}
      />
    </div>
  );
};