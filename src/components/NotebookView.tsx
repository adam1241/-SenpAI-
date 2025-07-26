import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, Image, Send, Lightbulb } from "lucide-react";
import { toast } from "sonner";

export const NotebookView = () => {
  const [userWork, setUserWork] = useState("");
  const [aiGuidance, setAiGuidance] = useState([
    {
      id: "1",
      content: "Welcome to your learning notebook! This is where you can work through problems step by step. I'll provide real-time guidance as you work.",
      timestamp: new Date(),
    }
  ]);

  const handleRequestGuidance = () => {
    if (!userWork.trim()) {
      toast.info("Start writing your thoughts, and I'll help guide you!");
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
            
            <Textarea
              value={userWork}
              onChange={(e) => setUserWork(e.target.value)}
              placeholder="Start working through your problem here... Write down your thoughts, steps, calculations, or reasoning. I'll provide guidance as you work!"
              className="flex-1 resize-none text-base leading-relaxed"
            />
            
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