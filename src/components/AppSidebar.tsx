import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, History, PenTool, Brain, CreditCard, PlusCircle, MessageSquare, User, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { UserProfile } from "./UserProfile";
import { ApiService, HistoryItem } from "@/services/api";
import senpaiLogo from "./logo/SenpAI2.png";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  activeSection: "chat" | "notebook" | "quiz" | "flashcards" | "history";
  onSectionChange: (section: "chat" | "notebook" | "quiz" | "flashcards" | "history") => void;
  newFlashcardsCount?: number;
  onNewChat: () => void;
  userId: string;
  sessionId: string;
  onSelectSession: (sessionId: string) => void;
}

export const AppSidebar = ({
  activeSection,
  onSectionChange,
  newFlashcardsCount = 0,
  onNewChat,
  userId,
  sessionId,
  onSelectSession
}: AppSidebarProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) return;
      setIsLoadingHistory(true);
      try {
        const data = await ApiService.getHistory(userId);
        // Ensure we have an array before filtering
        const list = Array.isArray(data) ? data : [];
        const conversations = list.filter(item => item.type === 'conversation').slice(0, 10);
        setHistory(conversations);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [userId, sessionId]);

  const menuItems = [
    { id: "notebook", label: "Notebook", icon: PenTool, section: "notebook" as const },
    { id: "quiz", label: "Quiz", icon: BookOpen, section: "quiz" as const },
    { id: "flashcards", label: "Flashcards", icon: CreditCard, section: "flashcards" as const, badge: newFlashcardsCount > 0 ? newFlashcardsCount : undefined },
  ];

  const handleHistoryClick = (item: HistoryItem) => {
    onSelectSession(item.id);
    onSectionChange("chat");
  };

  const handleTutorChatClick = () => {
    // If there's history, load the most recent session.
    if (history.length > 0) {
      onSelectSession(history[0].id);
    } else {
      // Otherwise, just switch to the chat section (might be an empty state)
      onSectionChange("chat");
    }
  };

  return (
    <div className={`flex flex-col h-screen bg-sidebar border-r border-border transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Header with Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {isCollapsed ? (
            <div 
              className="h-8 w-8 flex items-center justify-center rounded cursor-pointer hover:bg-muted transition-colors group relative mx-auto"
              onClick={() => setIsCollapsed(false)}
              title="Expand menu"
            >
              <img 
                src={senpaiLogo} 
                alt="SenpAI" 
                className="h-6 w-6 object-contain group-hover:opacity-0 transition-opacity" 
              />
              <ChevronRight className="h-4 w-4 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <img src={senpaiLogo} alt="SenpAI" className="h-8 w-8 object-contain flex-shrink-0" />
                <div>
                  <h1 className="font-bold text-foreground">SenpAI</h1>
                  <p className="text-xs text-muted-foreground">AI Learning Companion</p>
                </div>
              </div>
              <Button
                onClick={() => setIsCollapsed(true)}
                variant="ghost"
                size="sm"
                className="p-2 h-8 w-8"
                title="Hide sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* New Chat Button */}
        {!isCollapsed && (
          <div className="p-4">
            <Button
              onClick={onNewChat}
              className="w-full gap-2 justify-start"
              variant="outline"
            >
              <PlusCircle className="w-4 h-4" />
              New Chat
            </Button>
          </div>
        )}

        {isCollapsed && (
          <div className="p-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  onClick={onNewChat}
                  className="w-full p-2 justify-center"
                  variant="outline"
                  size="sm"
                >
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Menu Items */}
        <div className={`${isCollapsed ? 'px-2' : 'px-4'} space-y-2`}>
          {!isCollapsed && (
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
              Tools
            </div>
          )}
          {menuItems.map((item) => {
            const buttonContent = (
              <Button
                key={item.id}
                variant={activeSection === item.section ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  if (item.id === 'chat') {
                    handleTutorChatClick();
                  } else {
                    onSectionChange(item.section);
                  }
                }}
                className={`w-full gap-3 relative ${isCollapsed ? 'justify-center p-2' : 'justify-start'}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && item.label}
                {item.badge && item.id === 'flashcards' && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px] border border-background">
                    {item.badge}
                  </span>
                )}
              </Button>
            );

            return isCollapsed ? (
              <Tooltip key={item.id} delayDuration={0}>
                <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              buttonContent
            );
          })}
        </div>

        {/* History Section */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col px-4 mt-6 min-h-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
              Recent Chats
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-2">
                {isLoadingHistory ? (
                  <div className="text-xs text-muted-foreground p-2">Loading...</div>
                ) : history.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">No conversations</div>
                ) : (
                  history.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleHistoryClick(item)}
                      className="w-full justify-start text-left h-auto p-2"
                    >
                      <div className="flex items-start gap-2 w-full">
                        <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Spacer for collapsed view */}
        {isCollapsed && <div className="flex-1"></div>}


        {/* User Profile at bottom - Fixed position */}
        <div className="p-2">
          <Separator />
          <div className="p-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeSection === "history" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onSectionChange("history")}
                  className={`w-full gap-3 relative ${isCollapsed ? 'justify-center p-2' : 'justify-start'}`}
                >
                  <History className="w-4 h-4 flex-shrink-0" />
                  {!isCollapsed && "Activity"}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
              <TooltipContent side="right">
                <p>Activity</p>
              </TooltipContent>
              )}
            </Tooltip>
          </div>
          <UserProfile isCollapsed={isCollapsed} />
        </div>
    </div>
  );
};