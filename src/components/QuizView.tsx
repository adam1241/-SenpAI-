import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy, Target, Play, Plus, Brain } from "lucide-react";
import { QuizTakingView } from "./QuizTakingView";
import { getQuizzes } from "@/services/api";
import { CreateQuizModal } from "./CreateQuizModal";
import ApiService from "@/services/api";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
  estimatedTime: number;
  completedCount: number;
  bestScore?: number;
}

interface QuizViewProps {
  onSectionChange: (section: "chat" | "notebook" | "quiz" | "history" | "flashcards") => void;
}

// Backend interfaces to avoid type errors during transformation
interface BackendQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface BackendQuiz {
  id: number;
  title: string;
  description: string;
  questions: BackendQuestion[];
  difficulty: string;
  time: number;
  completed_times: number;
  best_score: number;
}

const transformQuizData = (backendQuizzes: BackendQuiz[]): Quiz[] => {
  return backendQuizzes.map((bq) => ({
    id: bq.id.toString(),
    title: bq.title,
    description: bq.description,
    difficulty: bq.difficulty.toLowerCase() as "easy" | "medium" | "hard",
    category: "General", // Default category
    estimatedTime: bq.time,
    completedCount: bq.completed_times,
    bestScore: bq.best_score,
    questions: bq.questions.map((q, index) => ({
      id: `${bq.id}-${index}`,
      question: q.question_text,
      options: q.options,
      correctAnswer: q.options.indexOf(q.correct_answer),
      explanation: "", // No explanation from backend
    })),
  }));
};

export const QuizView = ({ onSectionChange }: QuizViewProps) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || "";
  const difficultyFilter = searchParams.get('difficulty') || "all";

  const fetchQuizzes = useCallback(async () => {
    try {
      const backendQuizzes = await getQuizzes();
      const transformedQuizzes = transformQuizData(backendQuizzes);
      setQuizzes(transformedQuizzes);
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
      toast.error("Failed to load quizzes.");
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(quiz => {
      const searchLower = searchQuery.toLowerCase();
      const titleMatch = quiz.title.toLowerCase().includes(searchLower);
      const descriptionMatch = quiz.description.toLowerCase().includes(searchLower);
      const difficultyMatch = difficultyFilter === 'all' || quiz.difficulty === difficultyFilter;
      return (titleMatch || descriptionMatch) && difficultyMatch;
    });
  }, [quizzes, searchQuery, difficultyFilter]);

  const handleCreateQuizSubmit = async (topic: string) => {
    toast.info(`Generating a quiz about "${topic}"...`);
    const initialQuizCount = quizzes.length;

    try {
      // Ask the AI to create the quiz via the Socratic Tutor
      const response = await ApiService.streamSocraticTutor(
        [{ role: 'user', content: `Please create a quiz about ${topic}` }],
        'user-id', // You might want to get this from props or context
        'session-id' // You might want to get this from props or context
      );

      // Start polling to check for the new quiz
      const poll = setInterval(async () => {
        try {
          const backendQuizzes = await getQuizzes();
          if (backendQuizzes.length > initialQuizCount) {
            clearInterval(poll);
            const transformedQuizzes = transformQuizData(backendQuizzes);
            setQuizzes(transformedQuizzes);
            toast.success(`Successfully created a quiz about "${topic}"!`);
          }
        } catch (error) {
          console.error("Polling error:", error);
          clearInterval(poll);
        }
      }, 3000); // Poll every 3 seconds

      // Stop polling after a timeout (e.g., 45 seconds)
      setTimeout(() => {
        clearInterval(poll);
      }, 45000);

    } catch (error) {
      console.error("Failed to create quiz:", error);
      toast.error("Something went wrong while creating the quiz.");
    }
  };

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
  };

  const handleBackToQuizzes = () => {
    setSelectedQuiz(null);
  };

  const getTotalQuizzes = () => quizzes.length;
  const getCompletedQuizzes = () => quizzes.filter(quiz => quiz.completedCount > 0).length;
  const getAverageScore = () => {
    const completedQuizzes = quizzes.filter(quiz => quiz.bestScore !== undefined);
    if (completedQuizzes.length === 0) return 0;
    const totalScore = completedQuizzes.reduce((sum, quiz) => sum + (quiz.bestScore || 0), 0);
    return Math.round(totalScore / completedQuizzes.length);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/10 text-green-700 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "hard": return "bg-red-500/10 text-red-700 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  if (selectedQuiz) {
    return <QuizTakingView quiz={selectedQuiz} onBack={handleBackToQuizzes} />;
  }

  return (
    <div className="h-full overflow-auto relative">
      <div className="absolute top-6 right-6 z-10">
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
      <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Learning Quizzes
          </h1>
          <div className="flex items-center gap-2">
            <Button className="gap-2" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Create with AI
            </Button>
            <Link to="/build-quiz">
              <Button variant="outline" className="gap-2">
                Build Manually
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quizzes
              </CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{getTotalQuizzes()}</div>
              <p className="text-xs text-muted-foreground">
                Available for practice
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
              <Trophy className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{getCompletedQuizzes()}</div>
              <p className="text-xs text-muted-foreground">
                {quizzes.length > 0 ? Math.round((getCompletedQuizzes() / getTotalQuizzes()) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Score
              </CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{getAverageScore()}%</div>
              <p className="text-xs text-muted-foreground">
                Across completed quizzes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-8">
          <Select value={difficultyFilter} onValueChange={value => setSearchParams(params => {
            if (value === 'all') params.delete('difficulty');
            else params.set('difficulty', value);
            return params;
          })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={e => setSearchParams(params => {
              params.set('q', e.target.value);
              return params;
            })}
            className="w-full"
          />
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {quiz.title}
                  </CardTitle>
                  <Badge className={getDifficultyColor(quiz.difficulty)}>
                    {quiz.difficulty}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {quiz.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{quiz.estimatedTime} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4" />
                    <span>{quiz.questions.length} questions</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {quiz.completedCount > 0 ? (
                      <>
                        Completed {quiz.completedCount} times
                        {quiz.bestScore && (
                          <span className="block text-success font-medium">
                            Best: {quiz.bestScore}%
                          </span>
                        )}
                      </>
                    ) : (
                      "Not attempted yet"
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleStartQuiz(quiz)}
                    variant="learning"
                    size="sm"
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {quiz.completedCount > 0 ? "Retake" : "Start"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <CreateQuizModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateQuizSubmit}
      />
      </div>
    </div>
  );
};