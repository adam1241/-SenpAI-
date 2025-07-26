import { useState } from "react";
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

const sampleQuizzes: Quiz[] = [
  {
    id: "1",
    title: "Learning Methodologies",
    description: "Test your knowledge of different learning approaches and techniques",
    difficulty: "medium",
    category: "Education",
    estimatedTime: 10,
    completedCount: 3,
    bestScore: 85,
    questions: [
      {
        id: "1",
        question: "What is the primary goal of the Socratic method in learning?",
        options: [
          "To provide direct answers to all questions",
          "To guide learners to discover answers through questioning",
          "To test memorization of facts",
          "To speed up the learning process"
        ],
        correctAnswer: 1,
        explanation: "The Socratic method guides learners to discover answers through strategic questioning, promoting deeper understanding and critical thinking."
      },
      {
        id: "2",
        question: "When should a 'Moment of Mastery' be triggered in a learning system?",
        options: [
          "After every correct answer",
          "When the AI determines the user understands a concept",
          "At the end of each lesson",
          "When the user asks for it"
        ],
        correctAnswer: 1,
        explanation: "A 'Moment of Mastery' should be triggered when the AI recognizes that the user has demonstrated genuine understanding of a concept, not just memorization."
      }
    ]
  },
  {
    id: "2",
    title: "Critical Thinking Skills",
    description: "Evaluate your ability to analyze and synthesize information",
    difficulty: "hard",
    category: "Cognitive Skills",
    estimatedTime: 15,
    completedCount: 1,
    bestScore: 72,
    questions: [
      {
        id: "3",
        question: "What is the most important aspect of critical thinking?",
        options: [
          "Memorizing facts quickly",
          "Questioning assumptions and evidence",
          "Following established procedures",
          "Accepting expert opinions"
        ],
        correctAnswer: 1,
        explanation: "Critical thinking involves questioning assumptions, evaluating evidence, and forming independent judgments."
      }
    ]
  },
  {
    id: "3",
    title: "Study Techniques",
    description: "Learn about effective study methods and retention strategies",
    difficulty: "easy",
    category: "Study Skills",
    estimatedTime: 8,
    completedCount: 0,
    questions: [
      {
        id: "4",
        question: "Which study technique is most effective for long-term retention?",
        options: [
          "Cramming before exams",
          "Spaced repetition over time",
          "Reading notes once",
          "Highlighting everything"
        ],
        correctAnswer: 1,
        explanation: "Spaced repetition has been scientifically proven to be the most effective method for long-term retention."
      }
    ]
  }
];

export const QuizView = () => {
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
  };

  const handleBackToQuizzes = () => {
    setSelectedQuiz(null);
  };

  const getTotalQuizzes = () => sampleQuizzes.length;
  const getCompletedQuizzes = () => sampleQuizzes.filter(quiz => quiz.completedCount > 0).length;
  const getAverageScore = () => {
    const completedQuizzes = sampleQuizzes.filter(quiz => quiz.bestScore !== undefined);
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
                {Math.round((getCompletedQuizzes() / getTotalQuizzes()) * 100)}% completion rate
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
          {sampleQuizzes.map((quiz) => (
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