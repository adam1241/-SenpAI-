import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, MessageSquare, Star, BookOpen, Filter, Loader } from "lucide-react";
import { toast } from "sonner";

interface HistoryItem {
  id: string;
  title: string;
  preview: string;
  timestamp: string; // Keep as string from backend
  type: "conversation" | "flashcard" | "quiz" | "notebook";
  masteryMoments: number;
  topics: string[];
}

export const HistoryView = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const userId = "default_user"; // Assuming a default user

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`http://localhost:5001/api/history?user_id=${userId}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        toast.error("Could not load learning history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === "all" || item.type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "conversation": return <MessageSquare className="w-4 h-4" />;
      case "flashcard": return <BookOpen className="w-4 h-4" />;
      case "quiz": return <Star className="w-4 h-4" />;
      case "notebook": return <Calendar className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "conversation": return "bg-primary/10 text-primary";
      case "flashcard": return "bg-success/10 text-success";
      case "quiz": return "bg-accent/10 text-accent";
      case "notebook": return "bg-warning/10 text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleItemClick = (item: HistoryItem) => {
    toast.info(`Opening ${item.title}...`);
    // Here you would implement logic to switch to the chat view
    // and load the specific conversation, e.g., by setting a global state
    // with the session ID and switching the active view.
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[400px]">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (filteredHistory.length === 0) {
      return (
        <Card className="p-8 text-center">
          <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No results found</h3>
          <p className="text-muted-foreground">Try adjusting your search terms or filters, or start a new lesson!</p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredHistory.map((item) => (
          <Card 
            key={item.id} 
            className="p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handleItemClick(item)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(item.type)}`}>
                  {getTypeIcon(item.type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {item.masteryMoments > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="w-3 h-3" />
                    {item.masteryMoments} mastery
                  </Badge>
                )}
                <Badge className={getTypeColor(item.type)}>
                  {item.type}
                </Badge>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {item.preview}
            </p>
            
            <div className="flex flex-wrap gap-2">
              {item.topics.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Learning History</h2>
        
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your learning history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {["all", "conversation", "flashcard", "quiz", "notebook"].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className="gap-2"
              >
                {type !== "all" && getTypeIcon(type)}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        {renderContent()}
      </ScrollArea>
    </div>
  );
};