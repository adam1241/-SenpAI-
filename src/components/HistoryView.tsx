import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, MessageSquare, Star, BookOpen, Filter } from "lucide-react";
import { toast } from "sonner";

interface HistoryItem {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  type: "conversation" | "flashcard" | "quiz" | "notebook";
  masteryMoments: number;
  topics: string[];
}

const sampleHistory: HistoryItem[] = [
  {
    id: "1",
    title: "Understanding Photosynthesis",
    preview: "We explored how plants convert sunlight into energy, discussing the role of chlorophyll and the chemical equation...",
    timestamp: new Date(2024, 0, 15, 14, 30),
    type: "conversation",
    masteryMoments: 2,
    topics: ["Biology", "Plants", "Energy"]
  },
  {
    id: "2",
    title: "Quadratic Equations Mastery",
    preview: "Created flashcards for solving quadratic equations using the quadratic formula and factoring methods...",
    timestamp: new Date(2024, 0, 14, 10, 15),
    type: "flashcard",
    masteryMoments: 3,
    topics: ["Mathematics", "Algebra", "Equations"]
  },
  {
    id: "3",
    title: "World War II Timeline Quiz",
    preview: "Completed quiz on major events and dates of World War II with 8/10 correct answers...",
    timestamp: new Date(2024, 0, 13, 16, 45),
    type: "quiz",
    masteryMoments: 1,
    topics: ["History", "World War II", "Timeline"]
  },
  {
    id: "4",
    title: "Physics Problem Solving",
    preview: "Worked through momentum and collision problems in the notebook with step-by-step AI guidance...",
    timestamp: new Date(2024, 0, 12, 11, 20),
    type: "notebook",
    masteryMoments: 2,
    topics: ["Physics", "Momentum", "Collisions"]
  }
];

export const HistoryView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredHistory = sampleHistory.filter(item => {
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
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Learning History</h2>
        
        {/* Search and Filter Controls */}
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

      {/* History Items */}
      <ScrollArea className="h-[600px]">
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
                      {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString()}
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
          
          {filteredHistory.length === 0 && (
            <Card className="p-8 text-center">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters.</p>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};