import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image, Send, Lightbulb, Type, PenTool } from "lucide-react";
import { toast } from "sonner";
import { Canvas as FabricCanvas } from "fabric";

export const NotebookView = () => {
  const [userWork, setUserWork] = useState("");
  const [activeMode, setActiveMode] = useState("text");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [aiGuidance, setAiGuidance] = useState([
    {
      id: "1",
      content: "Welcome to your learning notebook! This is where you can work through problems step by step. I'll provide real-time guidance as you work.",
      timestamp: new Date(),
    }
  ]);

  useEffect(() => {
    if (!canvasRef.current || activeMode !== "drawing") return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasRef.current.offsetWidth,
      height: 600,
      backgroundColor: "#ffffff",
    });

    canvas.freeDrawingBrush.color = "#2563eb";
    canvas.freeDrawingBrush.width = 3;
    canvas.isDrawingMode = true;

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [activeMode]);

  const handleRequestGuidance = () => {
    const hasContent = userWork.trim() || (fabricCanvas && fabricCanvas.getObjects().length > 0);
    
    if (!hasContent) {
      toast.info("Start working on your exercise, and I'll help guide you!");
      return;
    }

    const guidanceResponses = [
      "Great start! Can you explain your reasoning for that step?",
      "I see you're on the right track. What would happen if we approached this differently?",
      "Excellent observation! How does this connect to what we learned earlier?",
      "That's a good insight. Can you think of any potential challenges with this approach?",
    ];

    const newGuidance = {
      id: Date.now().toString(),
      content: guidanceResponses[Math.floor(Math.random() * guidanceResponses.length)],
      timestamp: new Date(),
    };

    setAiGuidance(prev => [...prev, newGuidance]);
    toast.success("AI guidance provided! 🤖");
  };

  const handleImageUpload = () => {
    toast.info("Image upload feature coming soon! 📷");
  };

  const handleClearCanvas = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast.success("Canvas cleared!");
  };

  return (
    <div className="h-full flex gap-6 p-6 max-w-7xl mx-auto">
      {/* Main Work Area */}
      <div className="flex-1">
        <Card className="h-full p-6">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Your Learning Workspace</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleImageUpload} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Image
                </Button>
                <Button variant="outline" size="sm" onClick={handleImageUpload} className="gap-2">
                  <Image className="w-4 h-4" />
                  Generate Exercise
                </Button>
              </div>
            </div>
            
            <Tabs value={activeMode} onValueChange={setActiveMode} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="text" className="gap-2">
                  <Type className="w-4 h-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="drawing" className="gap-2">
                  <PenTool className="w-4 h-4" />
                  Drawing
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="flex-1">
                <Textarea
                  value={userWork}
                  onChange={(e) => setUserWork(e.target.value)}
                  placeholder="Start working through your problem here... Write down your thoughts, steps, calculations, or reasoning. I'll provide guidance as you work!"
                  className="h-full resize-none text-base leading-relaxed"
                />
              </TabsContent>
              
              <TabsContent value="drawing" className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Use your mouse to draw and write directly on the canvas</span>
                  <Button variant="outline" size="sm" onClick={handleClearCanvas}>
                    Clear Canvas
                  </Button>
                </div>
                <div className="flex-1 border rounded-md bg-white overflow-hidden">
                  <canvas 
                    ref={canvasRef} 
                    className="block cursor-crosshair"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end mt-4">
              <Button onClick={handleRequestGuidance} className="gap-2">
                <Lightbulb className="w-4 h-4" />
                Get AI Guidance
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Guidance Sidebar */}
      <div className="w-80">
        <Card className="h-full p-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">AI Guidance</h3>
          <ScrollArea className="h-[calc(100%-100px)]">
            <div className="space-y-4">
              {aiGuidance.map((guidance) => (
                <div key={guidance.id} className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-foreground">{guidance.content}</p>
                  <span className="text-xs text-muted-foreground mt-2 block">
                    {guidance.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Separator className="my-4" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRequestGuidance} className="flex-1 gap-1">
              <Send className="w-3 h-3" />
              Ask Question
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};