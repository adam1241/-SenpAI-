import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Trash2, X } from 'lucide-react';
import { saveManualQuiz } from '@/services/api';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface QuestionState {
  question_text: string;
  options: string[];
  correct_answer: string;
}

export const QuizBuilderForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionState[]>([]);

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', options: ['', ''], correct_answer: '' }]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const updateQuestionText = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].question_text = text;
    setQuestions(newQuestions);
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push('');
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.splice(oIndex, 1);
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = text;
    setQuestions(newQuestions);
  };

  const setCorrectAnswer = (qIndex: number, answer: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correct_answer = answer;
    setQuestions(newQuestions);
  };

  const handleSaveQuiz = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill out the title and description.");
      return;
    }
    if (questions.length === 0) {
      toast.error("Please add at least one question.");
      return;
    }
    if (questions.some(q => !q.question_text.trim() || q.options.some(o => !o.trim()) || !q.correct_answer.trim())) {
      toast.error("Please make sure all questions and options are filled out, and a correct answer is selected.");
      return;
    }

    const quizData = {
      title,
      description,
      questions,
      difficulty: "MEDIUM", // Default difficulty
      time: questions.length * 1, // 1 minute per question
      completed_times: 0,
      best_score: 0
    };

    try {
      await saveManualQuiz(quizData);
      toast.success("Quiz saved successfully!");
      // TODO: Redirect to the quiz view page
    } catch (error) {
      console.error("Failed to save quiz:", error);
      toast.error("Failed to save quiz.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Build Your Own Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Algebra"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of what this quiz covers."
            />
          </div>
        </CardContent>
      </Card>

      {questions.map((q, qIndex) => (
        <Card key={qIndex}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Question {qIndex + 1}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input
                value={q.question_text}
                onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                placeholder={`Question ${qIndex + 1}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              <RadioGroup onValueChange={(value) => setCorrectAnswer(qIndex, value)} value={q.correct_answer}>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`q${qIndex}-opt${oIndex}`} />
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeOption(qIndex, oIndex)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
              <Button variant="outline" size="sm" onClick={() => addOption(qIndex)} className="mt-2 gap-2">
                <PlusCircle className="w-4 h-4" />
                Add Option
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between">
        <Button variant="outline" onClick={addQuestion} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          Add Question
        </Button>
        <div className="flex gap-2">
          <Link to="/#quiz">
            <Button variant="outline">Back to Quizzes</Button>
          </Link>
          <Button onClick={handleSaveQuiz}>Save Quiz</Button>
        </div>
      </div>
    </div>
  );
};