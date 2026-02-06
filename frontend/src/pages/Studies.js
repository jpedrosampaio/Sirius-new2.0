import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";
import { 
  BookOpen, Plus, Trash2, Folder, FileText, Clock, Calendar,
  Brain, Layers, Target, Trophy, Flame, ChevronRight, Loader2,
  GraduationCap, Briefcase, FolderOpen, RotateCcw, CheckCircle2,
  XCircle, Sparkles, PenTool, Link, Upload, Play, Pause,
  Edit3, Tag, AlertCircle, Timer, BookMarked, Lightbulb, Repeat
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const areaIcons = {
  "graduation-cap": GraduationCap,
  "file-text": FileText,
  "briefcase": Briefcase,
  "folder": Folder,
  "book": BookOpen
};

const taskTypeLabels = {
  reading: "Leitura",
  exercise: "Exercício",
  review: "Revisão",
  project: "Projeto",
  exam: "Prova"
};

const recurrenceLabels = {
  once: "Única vez",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal"
};

const dayLabels = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo"
};

export default function Studies() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [areas, setAreas] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0, best_streak: 0 });
  const [stats, setStats] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  // Selected states
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedNotebook, setSelectedNotebook] = useState(null);

  // Dialog states
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [showNotebookDialog, setShowNotebookDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showFlashcardDialog, setShowFlashcardDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);

  // Loading states
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Form states
  const [areaForm, setAreaForm] = useState({ name: "", description: "", color: "#007AFF", icon: "book" });
  const [notebookForm, setNotebookForm] = useState({ name: "", description: "", color: "#007AFF", tags: [] });
  const [noteForm, setNoteForm] = useState({ title: "", content: "", tags: [], links: [] });
  const [taskForm, setTaskForm] = useState({ 
    title: "", description: "", task_type: "reading", recurrence: "once", deadline: "", 
    priority: "medium", estimated_minutes: 30 
  });
  const [flashcardForm, setFlashcardForm] = useState({ front: "", back: "", deck_name: "Geral" });
  const [sessionForm, setSessionForm] = useState({ duration_minutes: 30, notes: "" });
  const [scheduleForm, setScheduleForm] = useState({ day_of_week: "monday", start_time: "09:00", end_time: "10:00" });
  const [newTag, setNewTag] = useState("");
  const [newLink, setNewLink] = useState({ title: "", url: "" });

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedNotebook) {
      fetchNotebookData();
    }
  }, [selectedNotebook]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      window.location.href = '/login';
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [areasRes, notebooksRes, tasksRes, streakRes, statsRes] = await Promise.all([
        axios.get(`${API}/study/areas`, { withCredentials: true }),
        axios.get(`${API}/study/notebooks`, { withCredentials: true }),
        axios.get(`${API}/study/tasks`, { withCredentials: true }),
        axios.get(`${API}/study/streak`, { withCredentials: true }),
        axios.get(`${API}/study/stats`, { withCredentials: true })
      ]);
      setAreas(areasRes.data);
      setNotebooks(notebooksRes.data);
      setTasks(tasksRes.data);
      setStreak(streakRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotebookData = async () => {
    if (!selectedNotebook) return;
    try {
      const [notesRes, flashcardsRes, quizzesRes, scheduleRes] = await Promise.all([
        axios.get(`${API}/study/notes?notebook_id=${selectedNotebook.notebook_id}`, { withCredentials: true }),
        axios.get(`${API}/study/flashcards?notebook_id=${selectedNotebook.notebook_id}`, { withCredentials: true }),
        axios.get(`${API}/study/quizzes?notebook_id=${selectedNotebook.notebook_id}`, { withCredentials: true }),
        axios.get(`${API}/study/schedule`, { withCredentials: true })
      ]);
      setNotes(notesRes.data);
      setFlashcards(flashcardsRes.data);
      setQuizzes(quizzesRes.data);
      setSchedule(scheduleRes.data.filter(s => s.notebook_id === selectedNotebook.notebook_id));
    } catch (error) {
      console.error("Error fetching notebook data:", error);
    }
  };

  // Area CRUD
  const handleCreateArea = async () => {
    if (!areaForm.name) {
      toast.error("Digite o nome da área");
      return;
    }
    try {
      await axios.post(`${API}/study/areas`, areaForm, { withCredentials: true });
      toast.success("Área criada!");
      setShowAreaDialog(false);
      setAreaForm({ name: "", description: "", color: "#007AFF", icon: "book" });
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao criar área");
    }
  };

  const handleDeleteArea = async (areaId) => {
    try {
      await axios.delete(`${API}/study/areas/${areaId}`, { withCredentials: true });
      toast.success("Área removida");
      setSelectedArea(null);
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao remover área");
    }
  };

  // Notebook CRUD
  const handleCreateNotebook = async () => {
    if (!notebookForm.name || !selectedArea) {
      toast.error("Selecione uma área e digite o nome");
      return;
    }
    try {
      await axios.post(`${API}/study/notebooks`, {
        ...notebookForm,
        area_id: selectedArea.area_id
      }, { withCredentials: true });
      toast.success("Caderno criado!");
      setShowNotebookDialog(false);
      setNotebookForm({ name: "", description: "", color: "#007AFF", tags: [] });
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao criar caderno");
    }
  };

  const handleDeleteNotebook = async (notebookId) => {
    try {
      await axios.delete(`${API}/study/notebooks/${notebookId}`, { withCredentials: true });
      toast.success("Caderno removido");
      setSelectedNotebook(null);
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao remover caderno");
    }
  };

  // Note CRUD
  const handleCreateNote = async () => {
    if (!noteForm.title || !selectedNotebook) {
      toast.error("Selecione um caderno e digite o título");
      return;
    }
    try {
      await axios.post(`${API}/study/notes`, {
        ...noteForm,
        notebook_id: selectedNotebook.notebook_id
      }, { withCredentials: true });
      toast.success("Nota criada!");
      setShowNoteDialog(false);
      setNoteForm({ title: "", content: "", tags: [], links: [] });
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao criar nota");
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/study/notes/${noteId}`, { withCredentials: true });
      toast.success("Nota removida");
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao remover nota");
    }
  };

  // Task CRUD
  const handleCreateTask = async () => {
    if (!taskForm.title) {
      toast.error("Digite o título da tarefa");
      return;
    }
    try {
      await axios.post(`${API}/study/tasks`, {
        ...taskForm,
        notebook_id: selectedNotebook?.notebook_id || null
      }, { withCredentials: true });
      toast.success("Tarefa criada!");
      setShowTaskDialog(false);
      setTaskForm({ title: "", description: "", task_type: "reading", recurrence: "once", deadline: "", priority: "medium", estimated_minutes: 30 });
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleToggleTask = async (taskId, completed) => {
    try {
      await axios.patch(`${API}/study/tasks/${taskId}`, { completed }, { withCredentials: true });
      toast.success(completed ? "Tarefa concluída! +XP" : "Tarefa desmarcada");
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/study/tasks/${taskId}`, { withCredentials: true });
      toast.success("Tarefa removida");
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao remover tarefa");
    }
  };

  // Flashcard CRUD
  const handleCreateFlashcard = async () => {
    if (!flashcardForm.front || !flashcardForm.back || !selectedNotebook) {
      toast.error("Preencha frente e verso do cartão");
      return;
    }
    try {
      await axios.post(`${API}/study/flashcards`, {
        ...flashcardForm,
        notebook_id: selectedNotebook.notebook_id
      }, { withCredentials: true });
      toast.success("Flashcard criado!");
      setShowFlashcardDialog(false);
      setFlashcardForm({ front: "", back: "", deck_name: "Geral" });
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao criar flashcard");
    }
  };

  const handleGenerateFlashcards = async (noteId) => {
    setGeneratingFlashcards(true);
    try {
      const res = await axios.post(`${API}/study/flashcards/generate`, { 
        note_id: noteId, 
        count: 5 
      }, { withCredentials: true });
      toast.success(`${res.data.flashcards?.length || 0} flashcards gerados!`);
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao gerar flashcards");
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleReviewFlashcard = async (quality) => {
    if (!currentFlashcard) return;
    try {
      await axios.post(`${API}/study/flashcards/${currentFlashcard.flashcard_id}/review`, { quality }, { withCredentials: true });
      toast.success(`+XP! Próxima revisão calculada`);
      
      // Move to next card
      const dueCards = flashcards.filter(f => f.next_review <= new Date().toISOString().split('T')[0]);
      const currentIndex = dueCards.findIndex(f => f.flashcard_id === currentFlashcard.flashcard_id);
      if (currentIndex < dueCards.length - 1) {
        setCurrentFlashcard(dueCards[currentIndex + 1]);
        setShowAnswer(false);
      } else {
        setCurrentFlashcard(null);
        setShowReviewDialog(false);
        toast.success("Revisão concluída!");
      }
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao registrar revisão");
    }
  };

  // Session
  const handleLogSession = async () => {
    if (!selectedNotebook) {
      toast.error("Selecione um caderno");
      return;
    }
    try {
      await axios.post(`${API}/study/sessions`, {
        ...sessionForm,
        notebook_id: selectedNotebook.notebook_id,
        date: new Date().toISOString().split('T')[0]
      }, { withCredentials: true });
      toast.success("Sessão registrada! +XP");
      setShowSessionDialog(false);
      setSessionForm({ duration_minutes: 30, notes: "" });
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao registrar sessão");
    }
  };

  // Schedule
  const handleCreateSchedule = async () => {
    if (!selectedNotebook) {
      toast.error("Selecione um caderno");
      return;
    }
    try {
      await axios.post(`${API}/study/schedule`, {
        ...scheduleForm,
        notebook_id: selectedNotebook.notebook_id
      }, { withCredentials: true });
      toast.success("Horário agendado!");
      setShowScheduleDialog(false);
      setScheduleForm({ day_of_week: "monday", start_time: "09:00", end_time: "10:00" });
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao criar agendamento");
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await axios.delete(`${API}/study/schedule/${scheduleId}`, { withCredentials: true });
      toast.success("Agendamento removido");
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao remover agendamento");
    }
  };

  // Quiz
  const handleGenerateQuiz = async () => {
    if (!selectedNotebook) {
      toast.error("Selecione um caderno");
      return;
    }
    setGeneratingQuiz(true);
    try {
      const res = await axios.post(`${API}/study/quizzes/generate`, {
        notebook_id: selectedNotebook.notebook_id,
        count: 5
      }, { withCredentials: true });
      toast.success("Quiz gerado!");
      fetchNotebookData();
    } catch (error) {
      toast.error("Erro ao gerar quiz. Adicione notas primeiro.");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const startQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setQuizAnswers([]);
    setQuizResult(null);
    setShowQuizDialog(true);
  };

  const handleQuizAnswer = (questionIdx, answer) => {
    setQuizAnswers(prev => {
      const existing = prev.find(a => a.question_idx === questionIdx);
      if (existing) {
        return prev.map(a => a.question_idx === questionIdx ? { ...a, selected_answer: answer } : a);
      }
      return [...prev, { question_idx: questionIdx, selected_answer: answer }];
    });
  };

  const submitQuiz = async () => {
    if (!currentQuiz) return;
    try {
      const res = await axios.post(`${API}/study/quizzes/${currentQuiz.quiz_id}/attempt`, {
        answers: quizAnswers
      }, { withCredentials: true });
      setQuizResult(res.data);
      toast.success(`Quiz finalizado! Nota: ${res.data.score.toFixed(0)}% +${res.data.xp_earned} XP`);
      fetchAllData();
    } catch (error) {
      toast.error("Erro ao submeter quiz");
    }
  };

  // AI Suggestions
  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await axios.post(`${API}/study/ai-suggestions`, {}, { withCredentials: true });
      setAiSuggestions(res.data);
      toast.success("Sugestões geradas!");
    } catch (error) {
      toast.error("Erro ao gerar sugestões");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Tag helpers
  const addTag = (formSetter, currentTags) => {
    if (newTag && !currentTags.includes(newTag)) {
      formSetter(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      setNewTag("");
    }
  };

  const removeTag = (formSetter, tag) => {
    formSetter(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // Link helpers
  const addLink = () => {
    if (newLink.title && newLink.url) {
      setNoteForm(prev => ({ ...prev, links: [...prev.links, { ...newLink }] }));
      setNewLink({ title: "", url: "" });
    }
  };

  const removeLink = (idx) => {
    setNoteForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== idx) }));
  };

  // Start review session
  const startReview = () => {
    const dueCards = flashcards.filter(f => f.next_review <= new Date().toISOString().split('T')[0]);
    if (dueCards.length === 0) {
      toast.info("Nenhum cartão para revisar hoje!");
      return;
    }
    setCurrentFlashcard(dueCards[0]);
    setShowAnswer(false);
    setShowReviewDialog(true);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  const dueFlashcardsCount = flashcards.filter(f => f.next_review <= new Date().toISOString().split('T')[0]).length;
  const pendingTasksCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <Sidebar user={user} />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-heading text-[#00F0FF]">Área de Estudos</h1>
            <p className="text-[#A1A1AA]">Organize, estude e evolua com inteligência</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500/20 text-orange-400">
              <Flame className="w-3 h-3 mr-1" />
              {streak.current_streak} dias
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400">
              <Trophy className="w-3 h-3 mr-1" />
              Recorde: {streak.best_streak}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#121212] border border-[#27272A] flex-wrap">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="notebooks">Cadernos</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="schedule">Agenda</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-sm">Tempo Total</p>
                      <p className="text-2xl font-bold text-[#00F0FF]">{stats?.total_study_time_hours || 0}h</p>
                    </div>
                    <Clock className="w-8 h-8 text-[#007AFF]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-sm">Cadernos</p>
                      <p className="text-2xl font-bold text-green-400">{notebooks.length}</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-sm">Flashcards p/ Revisar</p>
                      <p className="text-2xl font-bold text-yellow-400">{stats?.flashcards?.due_today || 0}</p>
                    </div>
                    <Brain className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-sm">Tarefas Pendentes</p>
                      <p className="text-2xl font-bold text-red-400">{pendingTasksCount}</p>
                    </div>
                    <Target className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Study Areas */}
            <Card className="bg-[#0A0A0A] border-[#27272A]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#007AFF]" />
                    Áreas de Estudo
                  </CardTitle>
                  <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#007AFF]">
                        <Plus className="w-4 h-4 mr-1" />
                        Nova Área
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                      <DialogHeader>
                        <DialogTitle>Nova Área de Estudo</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Nome</Label>
                          <Input
                            value={areaForm.name}
                            onChange={(e) => setAreaForm({...areaForm, name: e.target.value})}
                            placeholder="Ex: Faculdade"
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Input
                            value={areaForm.description}
                            onChange={(e) => setAreaForm({...areaForm, description: e.target.value})}
                            placeholder="Opcional"
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <div>
                          <Label>Cor</Label>
                          <Input
                            type="color"
                            value={areaForm.color}
                            onChange={(e) => setAreaForm({...areaForm, color: e.target.value})}
                            className="bg-[#121212] border-[#27272A] h-10"
                          />
                        </div>
                        <Button onClick={handleCreateArea} className="w-full bg-[#007AFF]">
                          Criar Área
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {areas.map(area => {
                    const AreaIcon = areaIcons[area.icon] || Folder;
                    const areaNotebooks = notebooks.filter(n => n.area_id === area.area_id);
                    
                    return (
                      <div
                        key={area.area_id}
                        onClick={() => {
                          setSelectedArea(area);
                          setActiveTab("notebooks");
                        }}
                        className={`p-4 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                          selectedArea?.area_id === area.area_id 
                            ? 'ring-2 ring-[#007AFF]' 
                            : 'hover:bg-[#121212]'
                        }`}
                        style={{ backgroundColor: `${area.color}15`, borderLeft: `3px solid ${area.color}` }}
                      >
                        <AreaIcon className="w-8 h-8 mb-2" style={{ color: area.color }} />
                        <h4 className="font-medium">{area.name}</h4>
                        <p className="text-sm text-[#A1A1AA]">{areaNotebooks.length} cadernos</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI Suggestions */}
            <Card className="bg-[#0A0A0A] border-[#27272A]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-green-500" />
                    Sugestões de IA
                  </CardTitle>
                  <Button 
                    onClick={handleGetSuggestions} 
                    variant="outline"
                    disabled={loadingSuggestions}
                    className="border-green-500/50"
                  >
                    {loadingSuggestions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lightbulb className="w-4 h-4 mr-2" />
                    )}
                    Obter Sugestões
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiSuggestions ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="bg-[#121212] p-4 rounded-lg whitespace-pre-wrap">
                      {aiSuggestions.suggestions}
                    </div>
                    {aiSuggestions.least_studied_notebooks?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-sm text-[#A1A1AA]">Foco recomendado:</span>
                        {aiSuggestions.least_studied_notebooks.map((nb, idx) => (
                          <Badge key={idx} variant="outline" className="border-yellow-500 text-yellow-400">
                            {nb}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-[#A1A1AA] py-8">
                    Clique no botão para receber sugestões personalizadas de estudo com base no seu progresso
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6 text-center">
                  <Brain className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                  <h3 className="font-bold mb-2">Revisar Flashcards</h3>
                  <p className="text-sm text-[#A1A1AA] mb-4">{stats?.flashcards?.due_today || 0} cartões pendentes</p>
                  <Button 
                    onClick={() => setActiveTab("flashcards")} 
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    Iniciar Revisão
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-purple-500 mb-4" />
                  <h3 className="font-bold mb-2">Fazer Quiz</h3>
                  <p className="text-sm text-[#A1A1AA] mb-4">Média: {stats?.quizzes?.average_score?.toFixed(0) || 0}%</p>
                  <Button 
                    onClick={() => setActiveTab("quizzes")} 
                    variant="outline"
                    className="w-full border-purple-500"
                  >
                    Ver Quizzes
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto text-red-500 mb-4" />
                  <h3 className="font-bold mb-2">Tarefas Pendentes</h3>
                  <p className="text-sm text-[#A1A1AA] mb-4">{pendingTasksCount} tarefas</p>
                  <Button 
                    onClick={() => setActiveTab("tasks")} 
                    variant="outline"
                    className="w-full border-red-500"
                  >
                    Ver Tarefas
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notebooks Tab */}
          <TabsContent value="notebooks" className="space-y-6">
            {/* Area Selection */}
            <div className="flex flex-wrap gap-2 mb-4">
              {areas.map(area => (
                <Button
                  key={area.area_id}
                  variant={selectedArea?.area_id === area.area_id ? "default" : "outline"}
                  onClick={() => setSelectedArea(area)}
                  style={{ 
                    backgroundColor: selectedArea?.area_id === area.area_id ? area.color : 'transparent',
                    borderColor: area.color 
                  }}
                >
                  {area.name}
                </Button>
              ))}
            </div>

            {selectedArea ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">{selectedArea.name}</h2>
                  <div className="flex gap-2">
                    <Dialog open={showNotebookDialog} onOpenChange={setShowNotebookDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-[#007AFF]">
                          <Plus className="w-4 h-4 mr-2" />
                          Novo Caderno
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                        <DialogHeader>
                          <DialogTitle>Novo Caderno em {selectedArea.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Nome da Matéria/Assunto</Label>
                            <Input
                              value={notebookForm.name}
                              onChange={(e) => setNotebookForm({...notebookForm, name: e.target.value})}
                              placeholder="Ex: Cálculo I"
                              className="bg-[#121212] border-[#27272A]"
                            />
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Input
                              value={notebookForm.description}
                              onChange={(e) => setNotebookForm({...notebookForm, description: e.target.value})}
                              placeholder="Opcional"
                              className="bg-[#121212] border-[#27272A]"
                            />
                          </div>
                          <div>
                            <Label>Cor</Label>
                            <Input
                              type="color"
                              value={notebookForm.color}
                              onChange={(e) => setNotebookForm({...notebookForm, color: e.target.value})}
                              className="bg-[#121212] border-[#27272A] h-10"
                            />
                          </div>
                          <Button onClick={handleCreateNotebook} className="w-full bg-[#007AFF]">
                            Criar Caderno
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      className="border-red-500 text-red-500"
                      onClick={() => handleDeleteArea(selectedArea.area_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notebooks.filter(n => n.area_id === selectedArea.area_id).map(notebook => (
                    <Card 
                      key={notebook.notebook_id} 
                      className={`bg-[#0A0A0A] border-[#27272A] cursor-pointer transition-all hover:scale-105 ${
                        selectedNotebook?.notebook_id === notebook.notebook_id ? 'ring-2 ring-[#007AFF]' : ''
                      }`}
                      onClick={() => setSelectedNotebook(notebook)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: notebook.color }} />
                            <CardTitle className="text-lg">{notebook.name}</CardTitle>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(notebook.notebook_id); }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        {notebook.description && (
                          <CardDescription>{notebook.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-[#A1A1AA]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.round((notebook.total_study_time_minutes || 0) / 60)}h
                          </span>
                        </div>
                        {notebook.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {notebook.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Selected Notebook Content */}
                {selectedNotebook && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <FolderOpen className="w-5 h-5" style={{ color: selectedNotebook.color }} />
                          {selectedNotebook.name}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <PenTool className="w-4 h-4 mr-1" />
                                Nova Nota
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Nova Nota</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Título</Label>
                                  <Input
                                    value={noteForm.title}
                                    onChange={(e) => setNoteForm({...noteForm, title: e.target.value})}
                                    placeholder="Título da nota"
                                    className="bg-[#121212] border-[#27272A]"
                                  />
                                </div>
                                <div>
                                  <Label>Conteúdo</Label>
                                  <Textarea
                                    value={noteForm.content}
                                    onChange={(e) => setNoteForm({...noteForm, content: e.target.value})}
                                    placeholder="Escreva sua nota aqui..."
                                    className="bg-[#121212] border-[#27272A] min-h-[200px]"
                                  />
                                </div>
                                <div>
                                  <Label>Tags</Label>
                                  <div className="flex gap-2 mb-2">
                                    <Input
                                      value={newTag}
                                      onChange={(e) => setNewTag(e.target.value)}
                                      placeholder="Nova tag"
                                      className="bg-[#121212] border-[#27272A]"
                                    />
                                    <Button onClick={() => addTag(setNoteForm, noteForm.tags)} variant="outline">
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {noteForm.tags.map((tag, idx) => (
                                      <Badge key={idx} variant="secondary" className="cursor-pointer" onClick={() => removeTag(setNoteForm, tag)}>
                                        {tag} ×
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label>Links Rápidos</Label>
                                  <div className="flex gap-2 mb-2">
                                    <Input
                                      value={newLink.title}
                                      onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                                      placeholder="Título"
                                      className="bg-[#121212] border-[#27272A] flex-1"
                                    />
                                    <Input
                                      value={newLink.url}
                                      onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                                      placeholder="URL"
                                      className="bg-[#121212] border-[#27272A] flex-1"
                                    />
                                    <Button onClick={addLink} variant="outline">
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <div className="space-y-1">
                                    {noteForm.links.map((link, idx) => (
                                      <div key={idx} className="flex items-center gap-2 bg-[#121212] p-2 rounded">
                                        <Link className="w-4 h-4 text-[#007AFF]" />
                                        <span className="flex-1">{link.title}</span>
                                        <Button variant="ghost" size="icon" onClick={() => removeLink(idx)}>
                                          <Trash2 className="w-3 h-3 text-red-500" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <Button onClick={handleCreateNote} className="w-full bg-[#007AFF]">
                                  Salvar Nota
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-green-600">
                                <Timer className="w-4 h-4 mr-1" />
                                Registrar Sessão
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                              <DialogHeader>
                                <DialogTitle>Registrar Sessão de Estudo</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Duração (minutos)</Label>
                                  <Input
                                    type="number"
                                    value={sessionForm.duration_minutes}
                                    onChange={(e) => setSessionForm({...sessionForm, duration_minutes: Number(e.target.value)})}
                                    className="bg-[#121212] border-[#27272A]"
                                  />
                                </div>
                                <div>
                                  <Label>Notas (opcional)</Label>
                                  <Textarea
                                    value={sessionForm.notes}
                                    onChange={(e) => setSessionForm({...sessionForm, notes: e.target.value})}
                                    placeholder="O que você estudou?"
                                    className="bg-[#121212] border-[#27272A]"
                                  />
                                </div>
                                <Button onClick={handleLogSession} className="w-full bg-green-600">
                                  Registrar (+XP)
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {notes.length === 0 ? (
                        <p className="text-center text-[#A1A1AA] py-8">Nenhuma nota neste caderno</p>
                      ) : (
                        <div className="space-y-4">
                          {notes.map(note => (
                            <div key={note.note_id} className="bg-[#121212] p-4 rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium">{note.title}</h4>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleGenerateFlashcards(note.note_id)}
                                    disabled={generatingFlashcards}
                                  >
                                    {generatingFlashcards ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4 text-yellow-500" />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteNote(note.note_id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-[#A1A1AA] whitespace-pre-wrap line-clamp-3">{note.content}</p>
                              {note.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {note.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                              {note.links?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {note.links.map((link, idx) => (
                                    <a 
                                      key={idx} 
                                      href={link.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#007AFF] hover:underline flex items-center gap-1"
                                    >
                                      <Link className="w-3 h-3" />
                                      {link.title}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="text-center py-12">
                  <Folder className="w-12 h-12 mx-auto text-[#A1A1AA] mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione uma Área</h3>
                  <p className="text-[#A1A1AA]">Escolha uma área de estudo acima para ver os cadernos</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Tarefas de Estudo</h2>
              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[#007AFF]">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                  <DialogHeader>
                    <DialogTitle>Nova Tarefa de Estudo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                        placeholder="Ex: Ler capítulo 5"
                        className="bg-[#121212] border-[#27272A]"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                        placeholder="Detalhes da tarefa"
                        className="bg-[#121212] border-[#27272A]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={taskForm.task_type} onValueChange={(v) => setTaskForm({...taskForm, task_type: v})}>
                          <SelectTrigger className="bg-[#121212] border-[#27272A]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reading">Leitura</SelectItem>
                            <SelectItem value="exercise">Exercício</SelectItem>
                            <SelectItem value="review">Revisão</SelectItem>
                            <SelectItem value="project">Projeto</SelectItem>
                            <SelectItem value="exam">Prova</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Recorrência</Label>
                        <Select value={taskForm.recurrence} onValueChange={(v) => setTaskForm({...taskForm, recurrence: v})}>
                          <SelectTrigger className="bg-[#121212] border-[#27272A]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Única vez</SelectItem>
                            <SelectItem value="daily">Diária</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prioridade</Label>
                        <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({...taskForm, priority: v})}>
                          <SelectTrigger className="bg-[#121212] border-[#27272A]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tempo Estimado (min)</Label>
                        <Input
                          type="number"
                          value={taskForm.estimated_minutes}
                          onChange={(e) => setTaskForm({...taskForm, estimated_minutes: Number(e.target.value)})}
                          className="bg-[#121212] border-[#27272A]"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Prazo (opcional)</Label>
                      <Input
                        type="date"
                        value={taskForm.deadline}
                        onChange={(e) => setTaskForm({...taskForm, deadline: e.target.value})}
                        className="bg-[#121212] border-[#27272A]"
                      />
                    </div>
                    <Button onClick={handleCreateTask} className="w-full bg-[#007AFF]">
                      Criar Tarefa
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Tasks */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    Pendentes ({tasks.filter(t => !t.completed_today).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.filter(t => !t.completed_today).map(task => (
                      <div key={task.task_id} className="bg-[#121212] p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleTask(task.task_id, true)}
                              className="mt-1 w-5 h-5 rounded border-2 border-[#27272A] hover:border-green-500"
                            />
                            <div>
                              <h4 className="font-medium">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-[#A1A1AA] mt-1">{task.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline">{taskTypeLabels[task.task_type]}</Badge>
                                <Badge className={
                                  task.priority === "high" ? "bg-red-500/20 text-red-400" :
                                  task.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-green-500/20 text-green-400"
                                }>
                                  {task.priority}
                                </Badge>
                                {task.recurrence && task.recurrence !== "once" && (
                                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                                    <Repeat className="w-3 h-3 mr-1" />
                                    {recurrenceLabels[task.recurrence]}
                                  </Badge>
                                )}
                                {task.deadline && (
                                  <Badge variant="outline" className="border-purple-500 text-purple-400">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {task.deadline}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.task_id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => !t.completed_today).length === 0 && (
                      <p className="text-center text-[#A1A1AA] py-8">Nenhuma tarefa pendente 🎉</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Completed Tasks */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Concluídas Hoje ({tasks.filter(t => t.completed_today).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.filter(t => t.completed_today).slice(0, 10).map(task => (
                      <div key={task.task_id} className="bg-[#121212] p-4 rounded-lg opacity-60">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => task.recurrence === "once" ? handleToggleTask(task.task_id, false) : null}
                              className={`mt-1 w-5 h-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center ${task.recurrence !== "once" ? 'cursor-default' : ''}`}
                            >
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </button>
                            <div>
                              <h4 className={`font-medium ${task.recurrence === "once" ? 'line-through' : ''}`}>{task.title}</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="outline">{taskTypeLabels[task.task_type]}</Badge>
                                {task.recurrence && task.recurrence !== "once" && (
                                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                                    <Repeat className="w-3 h-3 mr-1" />
                                    {recurrenceLabels[task.recurrence]}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => t.completed_today).length === 0 && (
                      <p className="text-center text-[#A1A1AA] py-8">Nenhuma tarefa concluída hoje</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards" className="space-y-6">
            {selectedNotebook ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Flashcards - {selectedNotebook.name}</h2>
                    <p className="text-[#A1A1AA]">{dueFlashcardsCount} cartões para revisar hoje</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={startReview} className="bg-yellow-600 hover:bg-yellow-700" disabled={dueFlashcardsCount === 0}>
                      <Brain className="w-4 h-4 mr-2" />
                      Iniciar Revisão
                    </Button>
                    <Dialog open={showFlashcardDialog} onOpenChange={setShowFlashcardDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar Flashcard
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                        <DialogHeader>
                          <DialogTitle>Novo Flashcard</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Deck</Label>
                            <Input
                              value={flashcardForm.deck_name}
                              onChange={(e) => setFlashcardForm({...flashcardForm, deck_name: e.target.value})}
                              placeholder="Nome do deck"
                              className="bg-[#121212] border-[#27272A]"
                            />
                          </div>
                          <div>
                            <Label>Frente (Pergunta)</Label>
                            <Textarea
                              value={flashcardForm.front}
                              onChange={(e) => setFlashcardForm({...flashcardForm, front: e.target.value})}
                              placeholder="Escreva a pergunta ou conceito"
                              className="bg-[#121212] border-[#27272A]"
                            />
                          </div>
                          <div>
                            <Label>Verso (Resposta)</Label>
                            <Textarea
                              value={flashcardForm.back}
                              onChange={(e) => setFlashcardForm({...flashcardForm, back: e.target.value})}
                              placeholder="Escreva a resposta"
                              className="bg-[#121212] border-[#27272A]"
                            />
                          </div>
                          <Button onClick={handleCreateFlashcard} className="w-full bg-[#007AFF]">
                            Criar Flashcard
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Flashcard Review Dialog */}
                <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Revisão Espaçada</DialogTitle>
                      <DialogDescription>
                        Avalie sua lembrança do cartão
                      </DialogDescription>
                    </DialogHeader>
                    {currentFlashcard && (
                      <div className="py-6">
                        <Card className="bg-[#121212] border-[#27272A] min-h-[200px] flex flex-col justify-center">
                          <CardContent className="p-6 text-center">
                            <p className="text-lg">{currentFlashcard.front}</p>
                            {showAnswer && (
                              <div className="mt-6 pt-6 border-t border-[#27272A]">
                                <p className="text-[#00F0FF]">{currentFlashcard.back}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        
                        {!showAnswer ? (
                          <Button onClick={() => setShowAnswer(true)} className="w-full mt-4 bg-[#007AFF]">
                            Mostrar Resposta
                          </Button>
                        ) : (
                          <div className="mt-4 space-y-2">
                            <p className="text-center text-sm text-[#A1A1AA]">Como foi sua lembrança?</p>
                            <div className="grid grid-cols-4 gap-2">
                              <Button onClick={() => handleReviewFlashcard(0)} variant="outline" className="border-red-500 text-red-500">
                                Esqueci
                              </Button>
                              <Button onClick={() => handleReviewFlashcard(2)} variant="outline" className="border-yellow-500 text-yellow-500">
                                Difícil
                              </Button>
                              <Button onClick={() => handleReviewFlashcard(4)} variant="outline" className="border-green-500 text-green-500">
                                Bom
                              </Button>
                              <Button onClick={() => handleReviewFlashcard(5)} variant="outline" className="border-[#00F0FF] text-[#00F0FF]">
                                Fácil
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Flashcards List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {flashcards.map(card => {
                    const isDue = card.next_review <= new Date().toISOString().split('T')[0];
                    return (
                      <Card key={card.flashcard_id} className={`bg-[#0A0A0A] border-[#27272A] ${isDue ? 'ring-1 ring-yellow-500' : ''}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <Badge variant="outline">{card.deck_name}</Badge>
                            {isDue && <Badge className="bg-yellow-500/20 text-yellow-400">Revisar</Badge>}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="font-medium mb-2 line-clamp-2">{card.front}</p>
                          <p className="text-sm text-[#A1A1AA] line-clamp-2">{card.back}</p>
                          <div className="mt-4 flex items-center justify-between text-xs text-[#A1A1AA]">
                            <span>Intervalo: {card.interval_days}d</span>
                            <span>Próx: {card.next_review}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {flashcards.length === 0 && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]">
                    <CardContent className="text-center py-12">
                      <Brain className="w-12 h-12 mx-auto text-[#A1A1AA] mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhum flashcard ainda</h3>
                      <p className="text-[#A1A1AA] mb-4">Crie flashcards manualmente ou gere a partir das notas</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="text-center py-12">
                  <BookMarked className="w-12 h-12 mx-auto text-[#A1A1AA] mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione um Caderno</h3>
                  <p className="text-[#A1A1AA]">Vá até a aba "Cadernos" e selecione um para ver os flashcards</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            {selectedNotebook ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Quizzes - {selectedNotebook.name}</h2>
                    <p className="text-[#A1A1AA]">Teste seus conhecimentos</p>
                  </div>
                  <Button 
                    onClick={handleGenerateQuiz} 
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={generatingQuiz}
                  >
                    {generatingQuiz ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Gerar Quiz com IA
                  </Button>
                </div>

                {/* Quiz Dialog */}
                <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{currentQuiz?.title}</DialogTitle>
                    </DialogHeader>
                    {currentQuiz && !quizResult && (
                      <div className="py-4 space-y-6">
                        {currentQuiz.questions?.map((q, idx) => (
                          <div key={idx} className="bg-[#121212] p-4 rounded-lg">
                            <p className="font-medium mb-3">{idx + 1}. {q.question}</p>
                            <div className="space-y-2">
                              {q.options?.map((option, optIdx) => {
                                const letter = option.charAt(0);
                                const isSelected = quizAnswers.find(a => a.question_idx === idx)?.selected_answer === letter;
                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => handleQuizAnswer(idx, letter)}
                                    className={`w-full text-left p-3 rounded-lg transition-all ${
                                      isSelected 
                                        ? 'bg-[#007AFF] text-white' 
                                        : 'bg-[#0A0A0A] hover:bg-[#27272A]'
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        <Button 
                          onClick={submitQuiz} 
                          className="w-full bg-purple-600"
                          disabled={quizAnswers.length < currentQuiz.questions?.length}
                        >
                          Finalizar Quiz
                        </Button>
                      </div>
                    )}
                    {quizResult && (
                      <div className="py-4 space-y-6">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-[#00F0FF] mb-2">
                            {quizResult.score.toFixed(0)}%
                          </div>
                          <p className="text-[#A1A1AA]">
                            {quizResult.correct_count} de {quizResult.total_questions} corretas
                          </p>
                          <Badge className="bg-green-500/20 text-green-400 mt-2">
                            +{quizResult.xp_earned} XP
                          </Badge>
                        </div>
                        
                        <div className="space-y-4">
                          {quizResult.answers?.map((ans, idx) => (
                            <div key={idx} className={`p-4 rounded-lg ${
                              ans.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                {ans.correct ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                )}
                                <span className="font-medium">Questão {idx + 1}</span>
                              </div>
                              {!ans.correct && (
                                <p className="text-sm text-[#A1A1AA]">
                                  Resposta correta: {ans.correct_answer}
                                </p>
                              )}
                              {ans.explanation && (
                                <p className="text-sm text-[#A1A1AA] mt-2">{ans.explanation}</p>
                              )}
                            </div>
                          ))}
                        </div>

                        <Button onClick={() => { setShowQuizDialog(false); setQuizResult(null); }} className="w-full">
                          Fechar
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Quizzes List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quizzes.map(quiz => (
                    <Card key={quiz.quiz_id} className="bg-[#0A0A0A] border-[#27272A]">
                      <CardHeader>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>
                          {quiz.questions?.length || 0} questões
                          {quiz.ai_generated && (
                            <Badge className="ml-2 bg-purple-500/20 text-purple-400">
                              <Sparkles className="w-3 h-3 mr-1" />
                              IA
                            </Badge>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button onClick={() => startQuiz(quiz)} className="w-full bg-purple-600">
                          <Play className="w-4 h-4 mr-2" />
                          Iniciar Quiz
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {quizzes.length === 0 && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]">
                    <CardContent className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-[#A1A1AA] mb-4" />
                      <h3 className="text-lg font-medium mb-2">Nenhum quiz ainda</h3>
                      <p className="text-[#A1A1AA] mb-4">Adicione notas e gere quizzes automaticamente com IA</p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-[#A1A1AA] mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione um Caderno</h3>
                  <p className="text-[#A1A1AA]">Vá até a aba "Cadernos" e selecione um para ver os quizzes</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Agenda de Estudos</h2>
              {selectedNotebook && (
                <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#007AFF]">
                      <Plus className="w-4 h-4 mr-2" />
                      Agendar Horário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                    <DialogHeader>
                      <DialogTitle>Novo Horário para {selectedNotebook.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Dia da Semana</Label>
                        <Select value={scheduleForm.day_of_week} onValueChange={(v) => setScheduleForm({...scheduleForm, day_of_week: v})}>
                          <SelectTrigger className="bg-[#121212] border-[#27272A]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(dayLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Início</Label>
                          <Input
                            type="time"
                            value={scheduleForm.start_time}
                            onChange={(e) => setScheduleForm({...scheduleForm, start_time: e.target.value})}
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <div>
                          <Label>Fim</Label>
                          <Input
                            type="time"
                            value={scheduleForm.end_time}
                            onChange={(e) => setScheduleForm({...scheduleForm, end_time: e.target.value})}
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                      </div>
                      <Button onClick={handleCreateSchedule} className="w-full bg-[#007AFF]">
                        Agendar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {!selectedNotebook && (
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <span>Selecione um caderno na aba "Cadernos" para agendar horários</span>
                </CardContent>
              </Card>
            )}

            {/* Weekly Schedule View */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {Object.entries(dayLabels).map(([day, label]) => {
                const daySchedules = schedule.filter(s => s.day_of_week === day);
                
                return (
                  <Card key={day} className="bg-[#0A0A0A] border-[#27272A]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {daySchedules.map(s => {
                        const nb = notebooks.find(n => n.notebook_id === s.notebook_id);
                        return (
                          <div 
                            key={s.schedule_id} 
                            className="p-2 rounded text-xs"
                            style={{ backgroundColor: `${nb?.color || '#007AFF'}30` }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{nb?.name || 'Matéria'}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5"
                                onClick={() => handleDeleteSchedule(s.schedule_id)}
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                            <span className="text-[#A1A1AA]">
                              {s.start_time} - {s.end_time}
                            </span>
                          </div>
                        );
                      })}
                      {daySchedules.length === 0 && (
                        <p className="text-xs text-[#A1A1AA] text-center py-4">-</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
