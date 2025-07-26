import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Clock, Trophy, Target, Play, Plus } from "lucide-react";
import { QuizTakingView } from "./QuizTakingView";

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

export const QuizView = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  // TODO: Fetch quizzes from the backend
  useEffect(() => {
    // setQuizzes(fetchedQuizzes);
  }, []);

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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            Learning Quizzes
          </h1>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Quiz
          </Button>
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
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{getAverageScore()}%</div>
              <p className="text-xs text-muted-foreground">
                Across completed quizzes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quiz Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
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
    </div>
  );
};