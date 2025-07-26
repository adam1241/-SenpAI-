import { Button } from "@/components/ui/button";
import { BookOpen, History, PenTool, Brain, CreditCard } from "lucide-react";
import senpaiLogo from "./logo/SenpAI2.png";

interface LearningHeaderProps {
  activeSection: "chat" | "notebook" | "quiz" | "history" | "flashcards";
  onSectionChange: (section: "chat" | "notebook" | "quiz" | "history" | "flashcards") => void;
  newFlashcardsCount?: number;
}

export const LearningHeader = ({ activeSection, onSectionChange, newFlashcardsCount = 0 }: LearningHeaderProps) => {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <img src={senpaiLogo} alt="SenpAI" className="h-10 object-contain" />
              <div className="ml-3">
                <p className="text-xs text-muted-foreground">Your AI Learning Companion</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <Button
              variant={activeSection === "chat" ? "learning" : "ghost"}
              size="sm"
              onClick={() => onSectionChange("chat")}
              className="gap-2"
            >
              <Brain className="w-4 h-4" />
              Tutor Chat
            </Button>

            <Button
              variant={activeSection === "notebook" ? "learning" : "ghost"}
              size="sm"
              onClick={() => onSectionChange("notebook")}
              className="gap-2"
            >
              <PenTool className="w-4 h-4" />
              Notebook
            </Button>

            <Button
              variant={activeSection === "quiz" ? "learning" : "ghost"}
              size="sm"
              onClick={() => onSectionChange("quiz")}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Quiz
            </Button>

            <Button
              variant={activeSection === "flashcards" ? "learning" : "ghost"}
              size="sm"
              onClick={() => onSectionChange("flashcards")}
              className="gap-2 relative"
            >
              <CreditCard className="w-4 h-4 text-warning" />
              Flashcards
              {newFlashcardsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-warning text-warning-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {newFlashcardsCount}
                </span>
              )}
            </Button>

            <Button
              variant={activeSection === "history" ? "learning" : "ghost"}
              size="sm"
              onClick={() => onSectionChange("history")}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              History
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};