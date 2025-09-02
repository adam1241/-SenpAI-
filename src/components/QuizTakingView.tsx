import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Brain, RotateCcw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
  questions: Question[];
}

interface QuizTakingViewProps {
  quiz: Quiz;
  onBack: () => void;
}

export const QuizTakingView = ({ quiz, onBack }: QuizTakingViewProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleAnswerSelect = (value: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [quiz.questions[currentQuestion].id]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setShowResults(false); // Reset showResults state
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setQuizCompleted(true);
      setShowResults(true);
      toast.success("Quiz completed! 🎯");
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleShowAnswer = () => {
    setShowResults(true);
    toast.info("Answer revealed! 💡");
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setQuizCompleted(false);
    toast.info("Quiz restarted! 🔄");
  };

  const getScore = () => {
    let correct = 0;
    quiz.questions.forEach(question => {
      const userAnswer = selectedAnswers[question.id];
      if (userAnswer && parseInt(userAnswer) === question.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: quiz.questions.length };
  };

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const currentQ = quiz.questions[currentQuestion];
  const userAnswer = selectedAnswers[currentQ.id];
  const isCorrect = userAnswer && parseInt(userAnswer) === currentQ.correctAnswer;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Quizzes
            </Button>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              {quiz.title}
            </h2>
          </div>
          {!quizCompleted && (
            <Button variant="outline" onClick={handleRestart} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Restart
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </div>

      {quizCompleted ? (
        <Card className="p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Quiz Complete!</h3>
            <div className="text-lg text-muted-foreground">
              Your Score: {getScore().correct} out of {getScore().total}
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {quiz.questions.map((q, index) => {
              const userAnswer = selectedAnswers[q.id];
              const correctAnswerIndex = q.correctAnswer;
              const isCorrect = userAnswer !== undefined && parseInt(userAnswer) === correctAnswerIndex;

              return (
                <div key={q.id} className="p-4 border rounded-lg">
                  <p className="font-semibold mb-2">{index + 1}. {q.question}</p>
                  <div className={`flex items-center p-2 rounded ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isCorrect ? <CheckCircle className="w-5 h-5 text-green-600 mr-2" /> : <XCircle className="w-5 h-5 text-red-600 mr-2" />}
                    Your answer: {userAnswer !== undefined ? q.options[parseInt(userAnswer)] : "Not answered"}
                  </div>
                  {!isCorrect && (
                    <div className="flex items-center p-2 mt-2 rounded bg-gray-100">
                      <span className="text-gray-600 mr-2">Correct answer:</span>
                      {q.options[correctAnswerIndex]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-4">
            <Button onClick={handleRestart} variant="learning" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Take Again
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back to Quizzes
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              {currentQ.question}
            </h3>
            
            <RadioGroup value={userAnswer} onValueChange={handleAnswerSelect}>
              <div className="space-y-3">
                {currentQ.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                    {showResults && (
                      <div className="ml-auto">
                        {index === currentQ.correctAnswer ? (
                          <CheckCircle className="w-5 h-5 text-success" />
                        ) : userAnswer === index.toString() ? (
                          <XCircle className="w-5 h-5 text-destructive" />
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {showResults && (
            <Card className={`p-4 mb-6 ${isCorrect ? 'bg-success-light border-success' : 'bg-destructive/5 border-destructive/20'}`}>
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                )}
                <div>
                  <h4 className="font-semibold mb-2">
                    {isCorrect ? "Correct!" : "Not quite right"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {currentQ.explanation}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {!showResults && userAnswer && (
                <Button variant="secondary" onClick={handleShowAnswer}>
                  Show Answer
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!userAnswer}
                variant={showResults ? "default" : "learning"}
              >
                {currentQuestion === quiz.questions.length - 1 ? "Finish Quiz" : "Next"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};