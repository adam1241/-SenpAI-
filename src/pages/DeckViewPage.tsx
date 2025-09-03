import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { getDeck, getFlashcardsForDeck, deleteFlashcard } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import rehypeRaw from 'rehype-raw';
import { ArrowLeft, Plus, Pencil, Trash2, Smile, Meh, Frown, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AddFlashcardModal } from '@/components/AddFlashcardModal';
import { EditFlashcardModal } from '@/components/EditFlashcardModal';
import { StudyModal } from '@/components/StudyModal';
import { toast } from 'sonner';


interface Flashcard {
  id: number;
  question: string;
  answer: string;
  deck_id: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  question_image_url?: string;
  answer_image_url?: string;
}

interface Deck {
  id: number;
  name: string;
  description: string;
}

const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    
    let IconComponent;
    let colorClass = "";
    let description = "";

    switch (payload.value) {
        case 'Easy': 
            IconComponent = Smile; 
            colorClass = "text-green-500";
            description = "Well-known cards";
            break;
        case 'Medium': 
            IconComponent = Meh; 
            colorClass = "text-yellow-500";
            description = "Needs some review";
            break;
        case 'Hard': 
            IconComponent = Frown; 
            colorClass = "text-red-500";
            description = "Requires focused study";
            break;
        default:
            IconComponent = () => null;
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <foreignObject x={-50} y={10} width={100} height={50}>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        <span className="text-xs text-muted-foreground">{payload.value}</span>
                        <IconComponent className={`h-4 w-4 ${colorClass}`} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">{description}</div>
                </div>
            </foreignObject>
        </g>
    );
};

const CustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value > 0) {
        return (
            <text x={x + width / 2} y={y} dy={-4} fill="hsl(var(--muted-foreground))" fontSize={12} textAnchor="middle" fontWeight="bold">
                {value}
            </text>
        );
    }
    return null;
};

const DeckViewPage = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || "";
  const [deck, setDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addFlashcardModalOpen, setAddFlashcardModalOpen] = useState(false);
  const [editFlashcardModalOpen, setEditFlashcardModalOpen] = useState(false);
  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [flashcardToEdit, setFlashcardToEdit] = useState<Flashcard | null>(null);


  const numericDeckId = deckId ? parseInt(deckId, 10) : NaN;

  const fetchData = async () => {
    if (isNaN(numericDeckId)) {
      setError("Invalid Deck ID.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [deckData, flashcardsData] = await Promise.all([
        getDeck(numericDeckId),
        getFlashcardsForDeck(numericDeckId),
      ]);
      setDeck(deckData);
      setFlashcards(flashcardsData);
      setError(null);
    } catch (err) {
      setError("Failed to fetch deck data. The deck may not exist.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deckId]);

  const filteredFlashcards = useMemo(() => {
    if (!searchQuery) {
      return flashcards;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return flashcards.filter(
      card =>
        card.question.toLowerCase().includes(lowercasedQuery) ||
        card.answer.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery, flashcards]);

  const handleExport = () => {
    if (!deck) return;
    const exportData = {
      name: deck.name,
      description: deck.description,
      flashcards: flashcards.map(({ question, answer, difficulty, question_image_url, answer_image_url }) => ({
        question,
        answer,
        difficulty,
        question_image_url,
        answer_image_url,
      })),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${deck.name.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Deck exported successfully!");
  };

  const difficultyStats = useMemo(() => {
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    flashcards.forEach(card => {
        if (card.difficulty) {
            counts[card.difficulty] = (counts[card.difficulty] || 0) + 1;
        }
    });
    return [
      { name: 'Easy', count: counts.EASY, fill: 'hsl(var(--color-easy))' },
      { name: 'Medium', count: counts.MEDIUM, fill: 'hsl(var(--color-medium))' },
      { name: 'Hard', count: counts.HARD, fill: 'hsl(var(--color-hard))' },
    ];
  }, [flashcards]);

  const handleDeleteFlashcard = async (cardId: number) => {
    if (window.confirm("Are you sure you want to delete this flashcard?")) {
      try {
        await deleteFlashcard(cardId);
        toast.success("Flashcard deleted successfully!");
        fetchData(); // Refetch data to update the UI
      } catch (error) {
        console.error("Failed to delete flashcard:", error);
        toast.error("Failed to delete flashcard. Please try again.");
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to={`/?q=${searchQuery}#flashcards`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Decks
          </Link>
        </Button>
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">{deck?.name}</h1>
                <p className="text-muted-foreground mt-1">{deck?.description}</p>
            </div>
            <div className="flex gap-2">
                 <Button variant="outline" onClick={handleExport} disabled={flashcards.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </Button>
                <Button variant="outline" onClick={() => setStudyModalOpen(true)} disabled={flashcards.length === 0}>
                    Study All
                </Button>
                <Button className="gap-2" onClick={() => setAddFlashcardModalOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Add Flashcard
                </Button>
            </div>
        </div>
      </div>

    {/* Stats Section */}
    <div className="mb-4">
        <Card>
            <CardHeader>
                <CardTitle>Mastery Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyStats} margin={{ top: 5, right: 20, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={<CustomXAxisTick />} axisLine={false} tickLine={false} interval={0}/>
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                        <Tooltip
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                            }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="count" content={<CustomBarLabel />} />
                            {difficultyStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </div>
    <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Easy</CardTitle>
                <Smile className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{difficultyStats[0].count}</div>
                <p className="text-xs text-muted-foreground">Well-known cards</p>
            </CardContent>
        </Card>
        <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medium</CardTitle>
                <Meh className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{difficultyStats[1].count}</div>
                <p className="text-xs text-muted-foreground">Needs some review</p>
            </CardContent>
        </Card>
        <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hard</CardTitle>
                <Frown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{difficultyStats[2].count}</div>
                <p className="text-xs text-muted-foreground">Requires focused study</p>
            </CardContent>
        </Card>
    </div>

    <h2 className="text-2xl font-bold mb-4">Flashcards in this Deck ({filteredFlashcards.length})</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFlashcards.length > 0 ? (
            filteredFlashcards.map(card => (
                <Card key={card.id} className="flex flex-col">
                    <CardContent className="p-6 space-y-4 flex-grow">
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase">Question</p>
                            <div className="prose dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                  }}
                                >
                                  {card.question}
                                </ReactMarkdown>
                            </div>
                            {card.question_image_url && (
                                <img src={card.question_image_url} alt="Question" className="mt-2 rounded-md object-cover w-full h-auto" />
                            )}
                        </div>
                        <Separator />
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase">Answer</p>
                            <div className="prose dark:prose-invert max-w-none mt-2">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                  }}
                                >
                                  {card.answer}
                                </ReactMarkdown>
                            </div>
                            {card.answer_image_url && (
                                <img src={card.answer_image_url} alt="Answer" className="mt-2 rounded-md object-cover w-full h-auto" />
                            )}
                        </div>
                    </CardContent>
                    <div className="p-3 bg-muted/50 border-t flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                setFlashcardToEdit(card);
                                setEditFlashcardModalOpen(true);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteFlashcard(card.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            ))
        ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg md:col-span-2 lg:col-span-3">
                <h3 className="text-lg font-semibold">No flashcards found!</h3>
                <p className="text-muted-foreground mt-2">
                    There are no cards in this deck that match your search.
                </p>
            </div>
        )}
      </div>
      
      <AddFlashcardModal
        isOpen={addFlashcardModalOpen}
        onClose={() => setAddFlashcardModalOpen(false)}
        decks={deck ? [deck] : []}
        onFlashcardAdded={fetchData}
        defaultDeckId={numericDeckId}
      />

      <EditFlashcardModal
        isOpen={editFlashcardModalOpen}
        onClose={() => {
            setEditFlashcardModalOpen(false);
            setFlashcardToEdit(null);
        }}
        flashcard={flashcardToEdit}
        onFlashcardUpdated={fetchData}
      />

        <StudyModal
            isOpen={studyModalOpen}
            onClose={() => setStudyModalOpen(false)}
            deckName={deck?.name || ""}
            cards={flashcards.map(card => ({
                id: card.id.toString(),
                question: card.question,
                answer: card.answer,
                concept: deck?.name || "Concept",
                question_image_url: card.question_image_url,
                answer_image_url: card.answer_image_url,
            }))}
        />
    </div>
  );
};

export default DeckViewPage;
