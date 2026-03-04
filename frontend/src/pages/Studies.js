import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
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
  XCircle, Sparkles, PenTool, Link, Play, Pause,
  Edit3, Tag, AlertCircle, Timer, BookMarked, Lightbulb, Repeat,
  Send, ArrowLeft, BarChart3, HelpCircle, Zap, Coffee,
  MessageSquare, ChevronDown, ChevronUp, Hash, Award, TrendingUp
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
  reading: "Leitura", exercise: "Exercício", review: "Revisão", project: "Projeto", exam: "Prova"
};
const recurrenceLabels = {
  once: "Única vez", daily: "Diária", weekly: "Semanal", monthly: "Mensal"
};
const dayLabels = {
  monday: "Seg", tuesday: "Ter", wednesday: "Qua", thursday: "Qui",
  friday: "Sex", saturday: "Sáb", sunday: "Dom"
};

// ========== POMODORO TIMER COMPONENT ==========
function PomodoroTimer({ notebooks, onComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [selectedNb, setSelectedNb] = useState("");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef(null);

  const handleFocusComplete = useCallback(async () => {
    try {
      await axios.post(`${API}/study/focus/complete`, {
        notebook_id: selectedNb || null,
        focus_minutes: focusMinutes,
        break_minutes: breakMinutes,
        notes: null
      }, { withCredentials: true });
      setSessionsCompleted(prev => prev + 1);
      toast.success(`Sessão concluída! +XP 🎉`);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
    }
  }, [selectedNb, focusMinutes, breakMinutes, onComplete]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            if (!isBreak) {
              // Focus completed
              handleFocusComplete();
              setIsBreak(true);
              return breakMinutes * 60;
            } else {
              // Break completed
              setIsBreak(false);
              setIsRunning(false);
              toast.success("Pausa finalizada! Pronto para mais?");
              return focusMinutes * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isPaused, isBreak, breakMinutes, focusMinutes, handleFocusComplete]);

  const startTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
    setTimeLeft(focusMinutes * 60);
    setIsBreak(false);
  };

  const togglePause = () => setIsPaused(p => !p);
  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setIsBreak(false);
    setTimeLeft(focusMinutes * 60);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const totalSecs = isBreak ? breakMinutes * 60 : focusMinutes * 60;
  const progress = ((totalSecs - timeLeft) / totalSecs) * 100;

  return (
    <Card className={`border-2 transition-all ${isBreak ? 'bg-emerald-950/30 border-emerald-500/30' : isRunning ? 'bg-red-950/20 border-red-500/30' : 'bg-[#0A0A0A] border-[#27272A]'}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${isBreak ? 'text-emerald-400' : 'text-red-400'}`} />
            <span className="font-bold text-sm">{isBreak ? 'PAUSA' : 'FOCO'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Coffee className="w-3 h-3 mr-1" /> {sessionsCompleted} sessões
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(!showSettings)}>
              <Edit3 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {showSettings && !isRunning && (
          <div className="mb-4 p-3 bg-[#121212] rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Foco (min)</Label>
                <Input type="number" value={focusMinutes} onChange={e => { setFocusMinutes(Number(e.target.value)); setTimeLeft(Number(e.target.value) * 60); }} className="bg-[#0A0A0A] border-[#27272A] h-8 text-sm" min={1} max={120} />
              </div>
              <div>
                <Label className="text-xs">Pausa (min)</Label>
                <Input type="number" value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} className="bg-[#0A0A0A] border-[#27272A] h-8 text-sm" min={1} max={30} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Matéria (opcional)</Label>
              <Select value={selectedNb} onValueChange={setSelectedNb}>
                <SelectTrigger className="bg-[#0A0A0A] border-[#27272A] h-8 text-sm">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {notebooks.map(nb => (
                    <SelectItem key={nb.notebook_id} value={nb.notebook_id}>{nb.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="text-center mb-4">
          <div className={`text-5xl md:text-6xl font-mono font-bold tracking-wider ${isBreak ? 'text-emerald-400' : isRunning ? 'text-red-400' : 'text-white'}`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <Progress value={progress} className="mt-3 h-1.5" />
        </div>

        <div className="flex justify-center gap-2">
          {!isRunning ? (
            <Button onClick={startTimer} className="bg-red-600 hover:bg-red-700 px-8">
              <Play className="w-4 h-4 mr-2" /> Iniciar Foco
            </Button>
          ) : (
            <>
              <Button onClick={togglePause} variant="outline" className="border-yellow-500 text-yellow-500">
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button onClick={resetTimer} variant="outline" className="border-red-500 text-red-500">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========== AI CHAT COMPONENT ==========
function StudyAIChat({ notebooks, selectedNotebook }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextType, setContextType] = useState("general");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/study/ai-chat`, {
        message: input,
        notebook_id: selectedNotebook?.notebook_id || null,
        context_type: contextType
      }, { withCredentials: true });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const contextOptions = [
    { value: "general", label: "Geral", icon: MessageSquare },
    { value: "explain", label: "Explicar", icon: Lightbulb },
    { value: "quiz_help", label: "Questões", icon: HelpCircle },
    { value: "summarize", label: "Resumir", icon: FileText },
    { value: "motivate", label: "Motivar", icon: Zap }
  ];

  return (
    <Card className="bg-[#0A0A0A] border-[#27272A] flex flex-col h-[400px] md:h-[500px]">
      <CardHeader className="pb-2 border-b border-[#27272A]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00F0FF]" />
            Assistente de Estudos
          </CardTitle>
        </div>
        <div className="flex gap-1 flex-wrap mt-1">
          {contextOptions.map(opt => {
            const Icon = opt.icon;
            return (
              <Button key={opt.value} variant={contextType === opt.value ? "default" : "ghost"} size="sm" className={`h-6 text-xs px-2 ${contextType === opt.value ? 'bg-[#007AFF]' : ''}`} onClick={() => setContextType(opt.value)}>
                <Icon className="w-3 h-3 mr-1" /> {opt.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[#A1A1AA] py-8 text-sm">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Pergunte qualquer coisa sobre seus estudos!
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#007AFF] text-white' : 'bg-[#121212] text-[#E4E4E7]'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#121212] p-3 rounded-lg"><Loader2 className="w-4 h-4 animate-spin text-[#00F0FF]" /></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </CardContent>
      <div className="p-3 border-t border-[#27272A]">
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Pergunte algo..." className="bg-[#121212] border-[#27272A] text-sm" />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon" className="bg-[#007AFF] shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ========== QUESTION LOGGER COMPONENT ==========
function QuestionLogger({ notebooks, onLog }) {
  const [nbId, setNbId] = useState("");
  const [total, setTotal] = useState(10);
  const [correct, setCorrect] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    if (!nbId || total < 1) { toast.error("Selecione matéria e quantidade"); return; }
    if (correct > total) { toast.error("Acertos não pode ser maior que total"); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/study/questions/log`, {
        notebook_id: nbId, total, correct, source: "manual"
      }, { withCredentials: true });
      toast.success(`${total} questões registradas! +${correct * 2} XP`);
      setTotal(10); setCorrect(0);
      if (onLog) onLog();
    } catch (err) {
      toast.error("Erro ao registrar questões");
    } finally {
      setSaving(false);
    }
  };

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <Card className="bg-[#0A0A0A] border-[#27272A]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Hash className="w-4 h-4 text-purple-400" />
          Registrar Questões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={nbId} onValueChange={setNbId}>
          <SelectTrigger className="bg-[#121212] border-[#27272A] h-9 text-sm">
            <SelectValue placeholder="Selecione a matéria" />
          </SelectTrigger>
          <SelectContent>
            {notebooks.map(nb => (
              <SelectItem key={nb.notebook_id} value={nb.notebook_id}>{nb.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Total</Label>
            <Input type="number" value={total} onChange={e => setTotal(Number(e.target.value))} className="bg-[#121212] border-[#27272A] h-8 text-sm" min={1} />
          </div>
          <div>
            <Label className="text-xs">Acertos</Label>
            <Input type="number" value={correct} onChange={e => setCorrect(Number(e.target.value))} className="bg-[#121212] border-[#27272A] h-8 text-sm" min={0} max={total} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}% acerto</span>
          <Button onClick={handleLog} disabled={saving || !nbId} size="sm" className="bg-purple-600 hover:bg-purple-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Registrar</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== MAIN STUDIES PAGE ==========
export default function Studies() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data
  const [areas, setAreas] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0, best_streak: 0 });
  const [stats, setStats] = useState(null);
  const [questionStats, setQuestionStats] = useState(null);
  const [focusStats, setFocusStats] = useState(null);

  // Navigation
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedNotebook, setSelectedNotebook] = useState(null);

  // Dialogs
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [showNotebookDialog, setShowNotebookDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showFlashcardDialog, setShowFlashcardDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);

  // Loading states
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  // Forms
  const [areaForm, setAreaForm] = useState({ name: "", description: "", color: "#007AFF", icon: "book" });
  const [programForm, setProgramForm] = useState({ name: "", description: "", color: "#007AFF", icon: "book", target_date: "" });
  const [notebookForm, setNotebookForm] = useState({ name: "", description: "", color: "#007AFF", tags: [] });
  const [noteForm, setNoteForm] = useState({ title: "", content: "", tags: [], links: [] });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", task_type: "reading", recurrence: "once", deadline: "", priority: "medium", estimated_minutes: 30 });
  const [flashcardForm, setFlashcardForm] = useState({ front: "", back: "", deck_name: "Geral" });
  const [sessionForm, setSessionForm] = useState({ duration_minutes: 30, notes: "" });
  const [newTag, setNewTag] = useState("");
  const [newLink, setNewLink] = useState({ title: "", url: "" });

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => { if (user) fetchAllData(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (user && selectedNotebook) fetchNotebookData(); }, [user, selectedNotebook]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch { window.location.href = '/login'; }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [areasR, programsR, notebooksR, tasksR, streakR, statsR, qStatsR, fStatsR] = await Promise.all([
        axios.get(`${API}/study/areas`, { withCredentials: true }),
        axios.get(`${API}/study/programs`, { withCredentials: true }),
        axios.get(`${API}/study/notebooks`, { withCredentials: true }),
        axios.get(`${API}/study/tasks`, { withCredentials: true }),
        axios.get(`${API}/study/streak`, { withCredentials: true }),
        axios.get(`${API}/study/stats`, { withCredentials: true }),
        axios.get(`${API}/study/questions/stats`, { withCredentials: true }),
        axios.get(`${API}/study/focus/stats`, { withCredentials: true })
      ]);
      setAreas(Array.isArray(areasR.data) ? areasR.data : []);
      setPrograms(Array.isArray(programsR.data) ? programsR.data : []);
      setNotebooks(Array.isArray(notebooksR.data) ? notebooksR.data : []);
      setTasks(Array.isArray(tasksR.data) ? tasksR.data : []);
      setStreak(streakR.data || {});
      setStats(statsR.data || null);
      setQuestionStats(qStatsR.data || null);
      setFocusStats(fStatsR.data || null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotebookData = async () => {
    if (!selectedNotebook) return;
    try {
      const [notesR, flashR, quizR, schedR] = await Promise.all([
        axios.get(`${API}/study/notes?notebook_id=${selectedNotebook.notebook_id}`, { withCredentials: true }),
        axios.get(`${API}/study/flashcards?notebook_id=${selectedNotebook.notebook_id}`, { withCredentials: true }),
        axios.get(`${API}/study/quizzes?notebook_id=${selectedNotebook.notebook_id}`, { withCredentials: true }),
        axios.get(`${API}/study/schedule`, { withCredentials: true })
      ]);
      setNotes(Array.isArray(notesR.data) ? notesR.data : []);
      setFlashcards(Array.isArray(flashR.data) ? flashR.data : []);
      setQuizzes(Array.isArray(quizR.data) ? quizR.data : []);
      setSchedule((Array.isArray(schedR.data) ? schedR.data : []).filter(s => s.notebook_id === selectedNotebook.notebook_id));
    } catch (err) {
      console.error(err);
    }
  };

  // CRUD Handlers
  const handleCreateArea = async () => {
    if (!areaForm.name) { toast.error("Digite o nome da área"); return; }
    try {
      await axios.post(`${API}/study/areas`, areaForm, { withCredentials: true });
      toast.success("Área criada!"); setShowAreaDialog(false); setAreaForm({ name: "", description: "", color: "#007AFF", icon: "book" }); fetchAllData();
    } catch { toast.error("Erro ao criar área"); }
  };

  const handleDeleteArea = async (areaId) => {
    try { await axios.delete(`${API}/study/areas/${areaId}`, { withCredentials: true }); toast.success("Área removida"); setSelectedArea(null); fetchAllData(); } catch { toast.error("Erro ao remover área"); }
  };

  const handleCreateProgram = async () => {
    if (!programForm.name || !selectedArea) { toast.error("Selecione área e digite o nome"); return; }
    try {
      await axios.post(`${API}/study/programs`, { ...programForm, area_id: selectedArea.area_id }, { withCredentials: true });
      toast.success("Programa criado!"); setShowProgramDialog(false); setProgramForm({ name: "", description: "", color: "#007AFF", icon: "book", target_date: "" }); fetchAllData();
    } catch { toast.error("Erro ao criar programa"); }
  };

  const handleDeleteProgram = async (programId) => {
    try { await axios.delete(`${API}/study/programs/${programId}`, { withCredentials: true }); toast.success("Programa removido"); setSelectedProgram(null); fetchAllData(); } catch { toast.error("Erro ao remover programa"); }
  };

  const handleCreateNotebook = async () => {
    if (!notebookForm.name) { toast.error("Digite o nome"); return; }
    const areaId = selectedArea?.area_id || areas[0]?.area_id;
    if (!areaId) { toast.error("Crie uma área primeiro"); return; }
    try {
      await axios.post(`${API}/study/notebooks`, {
        ...notebookForm, area_id: areaId, program_id: selectedProgram?.program_id || null
      }, { withCredentials: true });
      toast.success("Matéria criada!"); setShowNotebookDialog(false); setNotebookForm({ name: "", description: "", color: "#007AFF", tags: [] }); fetchAllData();
    } catch { toast.error("Erro ao criar matéria"); }
  };

  const handleDeleteNotebook = async (notebookId) => {
    try { await axios.delete(`${API}/study/notebooks/${notebookId}`, { withCredentials: true }); toast.success("Matéria removida"); setSelectedNotebook(null); fetchAllData(); } catch { toast.error("Erro ao remover"); }
  };

  const handleCreateNote = async () => {
    if (!noteForm.title || !selectedNotebook) { toast.error("Preencha o título"); return; }
    try {
      await axios.post(`${API}/study/notes`, { ...noteForm, notebook_id: selectedNotebook.notebook_id }, { withCredentials: true });
      toast.success("Nota criada!"); setShowNoteDialog(false); setNoteForm({ title: "", content: "", tags: [], links: [] }); fetchNotebookData();
    } catch { toast.error("Erro ao criar nota"); }
  };

  const handleDeleteNote = async (noteId) => {
    try { await axios.delete(`${API}/study/notes/${noteId}`, { withCredentials: true }); toast.success("Nota removida"); fetchNotebookData(); } catch { toast.error("Erro ao remover"); }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title) { toast.error("Digite o título"); return; }
    try {
      await axios.post(`${API}/study/tasks`, { ...taskForm, notebook_id: selectedNotebook?.notebook_id || null }, { withCredentials: true });
      toast.success("Tarefa criada!"); setShowTaskDialog(false); setTaskForm({ title: "", description: "", task_type: "reading", recurrence: "once", deadline: "", priority: "medium", estimated_minutes: 30 }); fetchAllData();
    } catch { toast.error("Erro ao criar tarefa"); }
  };

  const handleToggleTask = async (taskId, completed) => {
    try { await axios.patch(`${API}/study/tasks/${taskId}`, { completed }, { withCredentials: true }); toast.success(completed ? "Tarefa concluída! +XP" : "Tarefa desmarcada"); fetchAllData(); } catch { toast.error("Erro"); }
  };

  const handleDeleteTask = async (taskId) => {
    try { await axios.delete(`${API}/study/tasks/${taskId}`, { withCredentials: true }); toast.success("Removida"); fetchAllData(); } catch { toast.error("Erro"); }
  };

  const handleCreateFlashcard = async () => {
    if (!flashcardForm.front || !flashcardForm.back || !selectedNotebook) { toast.error("Preencha frente e verso"); return; }
    try {
      await axios.post(`${API}/study/flashcards`, { ...flashcardForm, notebook_id: selectedNotebook.notebook_id }, { withCredentials: true });
      toast.success("Flashcard criado!"); setShowFlashcardDialog(false); setFlashcardForm({ front: "", back: "", deck_name: "Geral" }); fetchNotebookData();
    } catch { toast.error("Erro"); }
  };

  const handleGenerateFlashcards = async (noteId) => {
    setGeneratingFlashcards(true);
    try {
      const res = await axios.post(`${API}/study/flashcards/generate`, { note_id: noteId, count: 5 }, { withCredentials: true });
      toast.success(`${res.data.flashcards?.length || 0} flashcards gerados!`); fetchNotebookData();
    } catch { toast.error("Erro ao gerar flashcards"); } finally { setGeneratingFlashcards(false); }
  };

  const handleReviewFlashcard = async (quality) => {
    if (!currentFlashcard) return;
    try {
      await axios.post(`${API}/study/flashcards/${currentFlashcard.flashcard_id}/review`, { quality }, { withCredentials: true });
      const dueCards = flashcards.filter(f => f.next_review <= new Date().toISOString().split('T')[0]);
      const idx = dueCards.findIndex(f => f.flashcard_id === currentFlashcard.flashcard_id);
      if (idx < dueCards.length - 1) { setCurrentFlashcard(dueCards[idx + 1]); setShowAnswer(false); }
      else { setCurrentFlashcard(null); setShowReviewDialog(false); toast.success("Revisão concluída!"); }
      fetchNotebookData();
    } catch { toast.error("Erro"); }
  };

  const handleLogSession = async () => {
    if (!selectedNotebook) { toast.error("Selecione um caderno"); return; }
    try {
      await axios.post(`${API}/study/sessions`, { ...sessionForm, notebook_id: selectedNotebook.notebook_id, date: new Date().toISOString().split('T')[0] }, { withCredentials: true });
      toast.success("Sessão registrada! +XP"); setShowSessionDialog(false); setSessionForm({ duration_minutes: 30, notes: "" }); fetchAllData();
    } catch { toast.error("Erro"); }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedNotebook) { toast.error("Selecione um caderno"); return; }
    setGeneratingQuiz(true);
    try {
      await axios.post(`${API}/study/quizzes/generate`, { notebook_id: selectedNotebook.notebook_id, count: 5 }, { withCredentials: true });
      toast.success("Quiz gerado!"); fetchNotebookData();
    } catch { toast.error("Erro. Adicione notas primeiro."); } finally { setGeneratingQuiz(false); }
  };

  const startQuiz = (quiz) => { setCurrentQuiz(quiz); setQuizAnswers([]); setQuizResult(null); setShowQuizDialog(true); };

  const handleQuizAnswer = (qIdx, answer) => {
    setQuizAnswers(prev => {
      const existing = prev.find(a => a.question_idx === qIdx);
      if (existing) return prev.map(a => a.question_idx === qIdx ? { ...a, selected_answer: answer } : a);
      return [...prev, { question_idx: qIdx, selected_answer: answer }];
    });
  };

  const submitQuiz = async () => {
    if (!currentQuiz) return;
    try {
      const res = await axios.post(`${API}/study/quizzes/${currentQuiz.quiz_id}/attempt`, { answers: quizAnswers }, { withCredentials: true });
      setQuizResult(res.data); toast.success(`Quiz finalizado! ${(res.data.score ?? 0).toFixed(0)}%`); fetchAllData();
    } catch { toast.error("Erro"); }
  };

  const startReview = () => {
    const dueCards = flashcards.filter(f => f.next_review <= new Date().toISOString().split('T')[0]);
    if (dueCards.length === 0) { toast.info("Nenhum cartão para revisar hoje!"); return; }
    setCurrentFlashcard(dueCards[0]); setShowAnswer(false); setShowReviewDialog(true);
  };

  const addTag = (setter, tags) => { if (newTag && !tags.includes(newTag)) { setter(prev => ({ ...prev, tags: [...prev.tags, newTag] })); setNewTag(""); } };
  const removeTag = (setter, tag) => { setter(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) })); };
  const addLink = () => { if (newLink.title && newLink.url) { setNoteForm(prev => ({ ...prev, links: [...prev.links, { ...newLink }] })); setNewLink({ title: "", url: "" }); } };

  // Navigate into program
  const navigateToProgram = (program) => {
    setSelectedProgram(program);
    setSelectedNotebook(null);
    setActiveTab("materias");
  };

  // Navigate into notebook
  const navigateToNotebook = (notebook) => {
    setSelectedNotebook(notebook);
    setActiveTab("conteudo");
  };

  if (loading && !user) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>;
  }

  const dueFlashcardsCount = flashcards.filter(f => f.next_review <= new Date().toISOString().split('T')[0]).length;
  const pendingTasksCount = tasks.filter(t => !t.completed && !t.completed_today).length;
  const totalQuestions = questionStats?.total_questions || 0;
  const accuracy = questionStats?.accuracy || 0;
  const focusToday = focusStats?.today?.total_minutes || 0;

  // Filtered data
  const areaPrograms = selectedArea ? programs.filter(p => p.area_id === selectedArea.area_id) : [];
  const programNotebooks = selectedProgram ? notebooks.filter(n => n.program_id === selectedProgram.program_id) : [];
  const areaNotebooksNoProgram = selectedArea ? notebooks.filter(n => n.area_id === selectedArea.area_id && !n.program_id) : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <Sidebar user={user} />
      <main className="flex-1 md:ml-64 p-3 md:p-6 pb-24 md:pb-8 pt-14 md:pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading text-[#00F0FF]">Área de Estudos</h1>
            <p className="text-[#A1A1AA] text-sm">Organize, estude e evolua com inteligência</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-orange-500/20 text-orange-400"><Flame className="w-3 h-3 mr-1" />{streak.current_streak || 0} dias</Badge>
            <Badge className="bg-purple-500/20 text-purple-400"><Trophy className="w-3 h-3 mr-1" />Recorde: {streak.best_streak || 0}</Badge>
            <Badge className="bg-blue-500/20 text-blue-400"><Hash className="w-3 h-3 mr-1" />{totalQuestions} questões</Badge>
          </div>
        </div>

        {/* Breadcrumb */}
        {(selectedArea || selectedProgram || selectedNotebook) && (
          <div className="flex items-center gap-1 mb-4 text-sm flex-wrap">
            <Button variant="link" className="text-[#A1A1AA] p-0 h-auto" onClick={() => { setSelectedArea(null); setSelectedProgram(null); setSelectedNotebook(null); setActiveTab("dashboard"); }}>
              Início
            </Button>
            {selectedArea && (
              <>
                <ChevronRight className="w-3 h-3 text-[#A1A1AA]" />
                <Button variant="link" className="text-[#A1A1AA] p-0 h-auto" onClick={() => { setSelectedProgram(null); setSelectedNotebook(null); setActiveTab("programas"); }}>
                  {selectedArea.name}
                </Button>
              </>
            )}
            {selectedProgram && (
              <>
                <ChevronRight className="w-3 h-3 text-[#A1A1AA]" />
                <Button variant="link" className="text-[#A1A1AA] p-0 h-auto" onClick={() => { setSelectedNotebook(null); setActiveTab("materias"); }}>
                  {selectedProgram.name}
                </Button>
              </>
            )}
            {selectedNotebook && (
              <>
                <ChevronRight className="w-3 h-3 text-[#A1A1AA]" />
                <span className="text-white font-medium">{selectedNotebook.name}</span>
              </>
            )}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-[#121212] border border-[#27272A] overflow-x-auto flex-nowrap w-full justify-start gap-0">
            <TabsTrigger value="dashboard" className="text-xs md:text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="programas" className="text-xs md:text-sm">Programas</TabsTrigger>
            <TabsTrigger value="materias" className="text-xs md:text-sm">Matérias</TabsTrigger>
            <TabsTrigger value="conteudo" className="text-xs md:text-sm">Conteúdo</TabsTrigger>
            <TabsTrigger value="tarefas" className="text-xs md:text-sm">Tarefas</TabsTrigger>
            <TabsTrigger value="foco" className="text-xs md:text-sm">Foco</TabsTrigger>
          </TabsList>

          {/* ========== DASHBOARD TAB ========== */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-xs">Tempo Total</p>
                      <p className="text-xl font-bold text-[#00F0FF]">{stats?.total_study_time_hours || 0}h</p>
                    </div>
                    <Clock className="w-6 h-6 text-[#007AFF] opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-xs">Questões</p>
                      <p className="text-xl font-bold text-purple-400">{totalQuestions}</p>
                      <p className="text-xs text-[#A1A1AA]">{accuracy}% acerto</p>
                    </div>
                    <BarChart3 className="w-6 h-6 text-purple-500 opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-xs">Foco Hoje</p>
                      <p className="text-xl font-bold text-red-400">{focusToday}min</p>
                    </div>
                    <Timer className="w-6 h-6 text-red-500 opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#A1A1AA] text-xs">Flashcards</p>
                      <p className="text-xl font-bold text-yellow-400">{stats?.flashcards?.due_today || 0}</p>
                      <p className="text-xs text-[#A1A1AA]">p/ revisar</p>
                    </div>
                    <Brain className="w-6 h-6 text-yellow-500 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Areas Grid */}
            <Card className="bg-[#0A0A0A] border-[#27272A]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-[#007AFF]" />Áreas de Estudo</CardTitle>
                  <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
                    <DialogTrigger asChild><Button size="sm" className="bg-[#007AFF] h-8 text-xs"><Plus className="w-3 h-3 mr-1" />Nova Área</Button></DialogTrigger>
                    <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                      <DialogHeader><DialogTitle>Nova Área de Estudo</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div><Label>Nome</Label><Input value={areaForm.name} onChange={e => setAreaForm({...areaForm, name: e.target.value})} placeholder="Ex: Faculdade" className="bg-[#121212] border-[#27272A]" /></div>
                        <div><Label>Descrição</Label><Input value={areaForm.description} onChange={e => setAreaForm({...areaForm, description: e.target.value})} placeholder="Opcional" className="bg-[#121212] border-[#27272A]" /></div>
                        <div><Label>Cor</Label><Input type="color" value={areaForm.color} onChange={e => setAreaForm({...areaForm, color: e.target.value})} className="bg-[#121212] border-[#27272A] h-10" /></div>
                        <Button onClick={handleCreateArea} className="w-full bg-[#007AFF]">Criar Área</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {areas.map(area => {
                    const AreaIcon = areaIcons[area.icon] || Folder;
                    const areaProgs = programs.filter(p => p.area_id === area.area_id);
                    const areaNbs = notebooks.filter(n => n.area_id === area.area_id);
                    return (
                      <div key={area.area_id} onClick={() => { setSelectedArea(area); setSelectedProgram(null); setSelectedNotebook(null); setActiveTab("programas"); }}
                        className="p-4 rounded-lg cursor-pointer transition-all hover:scale-[1.02] hover:bg-[#121212] group"
                        style={{ backgroundColor: `${area.color}10`, borderLeft: `3px solid ${area.color}` }}>
                        <AreaIcon className="w-7 h-7 mb-2" style={{ color: area.color }} />
                        <h4 className="font-medium text-sm">{area.name}</h4>
                        <p className="text-xs text-[#A1A1AA]">{areaProgs.length} programas · {areaNbs.length} matérias</p>
                        <ChevronRight className="w-4 h-4 text-[#A1A1AA] mt-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions + AI Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <QuestionLogger notebooks={notebooks} onLog={fetchAllData} />
                <PomodoroTimer notebooks={notebooks} onComplete={fetchAllData} />
              </div>
              <StudyAIChat notebooks={notebooks} selectedNotebook={selectedNotebook} />
            </div>

            {/* Tasks Summary */}
            {pendingTasksCount > 0 && (
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-red-400" />Tarefas Pendentes ({pendingTasksCount})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.filter(t => !t.completed && !t.completed_today).slice(0, 5).map(task => (
                      <div key={task.task_id} className="flex items-center justify-between bg-[#121212] p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleToggleTask(task.task_id, true)} className="w-5 h-5 rounded border-2 border-[#27272A] hover:border-green-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{task.title}</p>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px] h-5">{taskTypeLabels[task.task_type]}</Badge>
                              {task.deadline && <Badge variant="outline" className="text-[10px] h-5 border-purple-500 text-purple-400">{task.deadline}</Badge>}
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' : task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{task.priority}</Badge>
                      </div>
                    ))}
                    {pendingTasksCount > 5 && (
                      <Button variant="link" onClick={() => setActiveTab("tarefas")} className="text-[#007AFF] text-xs">Ver todas ({pendingTasksCount})</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== PROGRAMAS TAB ========== */}
          <TabsContent value="programas" className="space-y-4">
            {/* Area selector */}
            <div className="flex flex-wrap gap-2 mb-2">
              {areas.map(area => (
                <Button key={area.area_id} variant={selectedArea?.area_id === area.area_id ? "default" : "outline"} size="sm"
                  onClick={() => { setSelectedArea(area); setSelectedProgram(null); setSelectedNotebook(null); }}
                  style={{ backgroundColor: selectedArea?.area_id === area.area_id ? area.color : 'transparent', borderColor: area.color }}
                  className="text-xs h-8">{area.name}</Button>
              ))}
            </div>

            {selectedArea ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-lg font-bold">{selectedArea.name}</h2>
                    <p className="text-xs text-[#A1A1AA]">{selectedArea.description || 'Programas e cursos desta área'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={showProgramDialog} onOpenChange={setShowProgramDialog}>
                      <DialogTrigger asChild><Button size="sm" className="bg-[#007AFF] h-8 text-xs"><Plus className="w-3 h-3 mr-1" />Novo Programa</Button></DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                        <DialogHeader><DialogTitle>Novo Programa em {selectedArea.name}</DialogTitle><DialogDescription>Ex: Curso de Direito, Concurso TRF5, Certificação AWS</DialogDescription></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div><Label>Nome</Label><Input value={programForm.name} onChange={e => setProgramForm({...programForm, name: e.target.value})} placeholder="Ex: Curso de Direito" className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Descrição</Label><Input value={programForm.description} onChange={e => setProgramForm({...programForm, description: e.target.value})} placeholder="Opcional" className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Data meta (opcional)</Label><Input type="date" value={programForm.target_date} onChange={e => setProgramForm({...programForm, target_date: e.target.value})} className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Cor</Label><Input type="color" value={programForm.color} onChange={e => setProgramForm({...programForm, color: e.target.value})} className="bg-[#121212] border-[#27272A] h-10" /></div>
                          <Button onClick={handleCreateProgram} className="w-full bg-[#007AFF]">Criar Programa</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" className="border-red-500 text-red-500 h-8 text-xs" onClick={() => handleDeleteArea(selectedArea.area_id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>

                {/* Programs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {areaPrograms.map(prog => {
                    const pctCorrect = prog.total_questions > 0 ? Math.round((prog.correct_questions / prog.total_questions) * 100) : 0;
                    return (
                      <Card key={prog.program_id} className="bg-[#0A0A0A] border-[#27272A] cursor-pointer hover:scale-[1.02] transition-all group" onClick={() => navigateToProgram(prog)}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prog.color }} />
                              <CardTitle className="text-base">{prog.name}</CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleDeleteProgram(prog.program_id); }}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                          </div>
                          {prog.description && <CardDescription className="text-xs">{prog.description}</CardDescription>}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                            <div><p className="text-[#A1A1AA]">Matérias</p><p className="font-bold text-white">{prog.notebooks_count || 0}</p></div>
                            <div><p className="text-[#A1A1AA]">Questões</p><p className="font-bold text-purple-400">{prog.total_questions || 0}</p></div>
                            <div><p className="text-[#A1A1AA]">Acerto</p><p className={`font-bold ${pctCorrect >= 70 ? 'text-green-400' : pctCorrect >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{pctCorrect}%</p></div>
                          </div>
                          {prog.target_date && (
                            <Badge variant="outline" className="text-[10px] border-purple-500 text-purple-400"><Calendar className="w-3 h-3 mr-1" />Meta: {prog.target_date}</Badge>
                          )}
                          <div className="flex items-center justify-end mt-2">
                            <span className="text-xs text-[#A1A1AA] group-hover:text-white transition-colors flex items-center gap-1">Ver matérias <ChevronRight className="w-3 h-3" /></span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {areaPrograms.length === 0 && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]">
                    <CardContent className="text-center py-10">
                      <FolderOpen className="w-10 h-10 mx-auto text-[#A1A1AA] mb-3" />
                      <h3 className="font-medium mb-1">Nenhum programa ainda</h3>
                      <p className="text-sm text-[#A1A1AA]">Crie um programa para organizar suas matérias</p>
                    </CardContent>
                  </Card>
                )}

                {/* Loose notebooks (without program) */}
                {areaNotebooksNoProgram.length > 0 && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-[#A1A1AA]">Matérias avulsas (sem programa)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {areaNotebooksNoProgram.map(nb => (
                          <div key={nb.notebook_id} className="p-3 bg-[#121212] rounded-lg cursor-pointer hover:bg-[#1A1A1A] transition-colors" onClick={() => navigateToNotebook(nb)}>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: nb.color }} /><span className="text-sm font-medium">{nb.name}</span></div>
                            <p className="text-xs text-[#A1A1AA] mt-1">{Math.round((nb.total_study_time_minutes || 0) / 60)}h · {nb.total_questions || 0}q</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-[#0A0A0A] border-[#27272A]"><CardContent className="text-center py-10"><Folder className="w-10 h-10 mx-auto text-[#A1A1AA] mb-3" /><h3 className="font-medium mb-1">Selecione uma Área</h3><p className="text-sm text-[#A1A1AA]">Escolha uma área acima para ver os programas</p></CardContent></Card>
            )}
          </TabsContent>

          {/* ========== MATERIAS TAB ========== */}
          <TabsContent value="materias" className="space-y-4">
            {selectedProgram ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: selectedProgram.color }}>{selectedProgram.name}</h2>
                    <p className="text-xs text-[#A1A1AA]">{selectedProgram.description || 'Matérias e disciplinas'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={showNotebookDialog} onOpenChange={setShowNotebookDialog}>
                      <DialogTrigger asChild><Button size="sm" className="bg-[#007AFF] h-8 text-xs"><Plus className="w-3 h-3 mr-1" />Nova Matéria</Button></DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                        <DialogHeader><DialogTitle>Nova Matéria em {selectedProgram.name}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div><Label>Nome</Label><Input value={notebookForm.name} onChange={e => setNotebookForm({...notebookForm, name: e.target.value})} placeholder="Ex: Direito Civil" className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Descrição</Label><Input value={notebookForm.description} onChange={e => setNotebookForm({...notebookForm, description: e.target.value})} placeholder="Opcional" className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Cor</Label><Input type="color" value={notebookForm.color} onChange={e => setNotebookForm({...notebookForm, color: e.target.value})} className="bg-[#121212] border-[#27272A] h-10" /></div>
                          <Button onClick={handleCreateNotebook} className="w-full bg-[#007AFF]">Criar Matéria</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {programNotebooks.map(nb => {
                    const pct = nb.total_questions > 0 ? Math.round((nb.correct_questions / nb.total_questions) * 100) : 0;
                    return (
                      <Card key={nb.notebook_id} className={`bg-[#0A0A0A] border-[#27272A] cursor-pointer hover:scale-[1.02] transition-all ${selectedNotebook?.notebook_id === nb.notebook_id ? 'ring-2 ring-[#007AFF]' : ''}`} onClick={() => navigateToNotebook(nb)}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: nb.color }} /><CardTitle className="text-base">{nb.name}</CardTitle></div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleDeleteNotebook(nb.notebook_id); }}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                          </div>
                          {nb.description && <CardDescription className="text-xs">{nb.description}</CardDescription>}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-3 text-xs text-[#A1A1AA]">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round((nb.total_study_time_minutes || 0) / 60)}h</span>
                            <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{nb.total_questions || 0}q</span>
                            {pct > 0 && <span className={`font-medium ${pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {programNotebooks.length === 0 && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]"><CardContent className="text-center py-10"><BookOpen className="w-10 h-10 mx-auto text-[#A1A1AA] mb-3" /><h3 className="font-medium mb-1">Nenhuma matéria ainda</h3><p className="text-sm text-[#A1A1AA]">Adicione matérias a este programa</p></CardContent></Card>
                )}
              </>
            ) : (
              <Card className="bg-[#0A0A0A] border-[#27272A]"><CardContent className="text-center py-10"><FolderOpen className="w-10 h-10 mx-auto text-[#A1A1AA] mb-3" /><h3 className="font-medium mb-1">Selecione um Programa</h3><p className="text-sm text-[#A1A1AA]">Vá até a aba "Programas" e selecione um</p></CardContent></Card>
            )}
          </TabsContent>

          {/* ========== CONTEUDO TAB ========== */}
          <TabsContent value="conteudo" className="space-y-4">
            {selectedNotebook ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: selectedNotebook.color }}>{selectedNotebook.name}</h2>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />{Math.round((selectedNotebook.total_study_time_minutes || 0) / 60)}h</Badge>
                      <Badge variant="outline" className="text-[10px]"><Hash className="w-3 h-3 mr-1" />{selectedNotebook.total_questions || 0} questões</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-8 text-xs"><PenTool className="w-3 h-3 mr-1" />Nota</Button></DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Nova Nota</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div><Label>Título</Label><Input value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} placeholder="Título" className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Conteúdo</Label><Textarea value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} placeholder="Escreva..." className="bg-[#121212] border-[#27272A] min-h-[150px]" /></div>
                          <div>
                            <Label>Tags</Label>
                            <div className="flex gap-2 mb-2"><Input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tag" className="bg-[#121212] border-[#27272A]" /><Button onClick={() => addTag(setNoteForm, noteForm.tags)} variant="outline"><Plus className="w-4 h-4" /></Button></div>
                            <div className="flex flex-wrap gap-1">{noteForm.tags.map((tag, i) => <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeTag(setNoteForm, tag)}>{tag} ×</Badge>)}</div>
                          </div>
                          <div>
                            <Label>Links</Label>
                            <div className="flex gap-2 mb-2"><Input value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} placeholder="Título" className="bg-[#121212] border-[#27272A] flex-1" /><Input value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} placeholder="URL" className="bg-[#121212] border-[#27272A] flex-1" /><Button onClick={addLink} variant="outline"><Plus className="w-4 h-4" /></Button></div>
                            {noteForm.links.map((lnk, i) => <div key={i} className="flex items-center gap-2 bg-[#121212] p-2 rounded text-sm"><Link className="w-3 h-3 text-[#007AFF]" />{lnk.title}<Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => setNoteForm(prev => ({ ...prev, links: prev.links.filter((_, j) => j !== i) }))}><Trash2 className="w-3 h-3 text-red-500" /></Button></div>)}
                          </div>
                          <Button onClick={handleCreateNote} className="w-full bg-[#007AFF]">Salvar Nota</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={showFlashcardDialog} onOpenChange={setShowFlashcardDialog}>
                      <DialogTrigger asChild><Button size="sm" variant="outline" className="h-8 text-xs"><Brain className="w-3 h-3 mr-1" />Flashcard</Button></DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                        <DialogHeader><DialogTitle>Novo Flashcard</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div><Label>Deck</Label><Input value={flashcardForm.deck_name} onChange={e => setFlashcardForm({...flashcardForm, deck_name: e.target.value})} placeholder="Nome do deck" className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Frente (Pergunta)</Label><Textarea value={flashcardForm.front} onChange={e => setFlashcardForm({...flashcardForm, front: e.target.value})} placeholder="Pergunta" className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Verso (Resposta)</Label><Textarea value={flashcardForm.back} onChange={e => setFlashcardForm({...flashcardForm, back: e.target.value})} placeholder="Resposta" className="bg-[#121212] border-[#27272A]" /></div>
                          <Button onClick={handleCreateFlashcard} className="w-full bg-[#007AFF]">Criar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" onClick={startReview} className="bg-yellow-600 h-8 text-xs" disabled={dueFlashcardsCount === 0}><Brain className="w-3 h-3 mr-1" />{dueFlashcardsCount} Revisar</Button>
                    <Button size="sm" onClick={handleGenerateQuiz} className="bg-purple-600 h-8 text-xs" disabled={generatingQuiz}>
                      {generatingQuiz ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" />Quiz IA</>}
                    </Button>
                    <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
                      <DialogTrigger asChild><Button size="sm" className="bg-green-600 h-8 text-xs"><Timer className="w-3 h-3 mr-1" />Sessão</Button></DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                        <DialogHeader><DialogTitle>Registrar Sessão</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div><Label>Duração (min)</Label><Input type="number" value={sessionForm.duration_minutes} onChange={e => setSessionForm({...sessionForm, duration_minutes: Number(e.target.value)})} className="bg-[#121212] border-[#27272A]" /></div>
                          <div><Label>Notas</Label><Textarea value={sessionForm.notes} onChange={e => setSessionForm({...sessionForm, notes: e.target.value})} placeholder="O que estudou?" className="bg-[#121212] border-[#27272A]" /></div>
                          <Button onClick={handleLogSession} className="w-full bg-green-600">Registrar (+XP)</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Notes */}
                <Card className="bg-[#0A0A0A] border-[#27272A]">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PenTool className="w-4 h-4 text-blue-400" />Notas ({notes.length})</CardTitle></CardHeader>
                  <CardContent>
                    {notes.length === 0 ? <p className="text-center text-[#A1A1AA] py-6 text-sm">Nenhuma nota. Crie a primeira!</p> : (
                      <div className="space-y-3">
                        {notes.map(note => (
                          <div key={note.note_id} className="bg-[#121212] p-3 rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium text-sm">{note.title}</h4>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGenerateFlashcards(note.note_id)} disabled={generatingFlashcards}>
                                  {generatingFlashcards ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-yellow-500" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteNote(note.note_id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                              </div>
                            </div>
                            <p className="text-xs text-[#A1A1AA] whitespace-pre-wrap line-clamp-3">{note.content}</p>
                            {note.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{note.tags.map((t, i) => <Badge key={i} variant="outline" className="text-[10px] h-5">{t}</Badge>)}</div>}
                            {note.links?.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{note.links.map((lnk, i) => <a key={i} href={lnk.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#007AFF] hover:underline flex items-center gap-1"><Link className="w-3 h-3" />{lnk.title}</a>)}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Flashcards */}
                {flashcards.length > 0 && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-yellow-400" />Flashcards ({flashcards.length})</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {flashcards.slice(0, 6).map(card => {
                          const isDue = card.next_review <= new Date().toISOString().split('T')[0];
                          return (
                            <div key={card.flashcard_id} className={`bg-[#121212] p-3 rounded-lg text-sm ${isDue ? 'ring-1 ring-yellow-500/50' : ''}`}>
                              <div className="flex items-center justify-between mb-1"><Badge variant="outline" className="text-[10px]">{card.deck_name}</Badge>{isDue && <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">Revisar</Badge>}</div>
                              <p className="font-medium line-clamp-1">{card.front}</p>
                              <p className="text-xs text-[#A1A1AA] line-clamp-1 mt-1">{card.back}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quizzes */}
                {quizzes.length > 0 && (
                  <Card className="bg-[#0A0A0A] border-[#27272A]">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" />Quizzes ({quizzes.length})</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {quizzes.map(quiz => (
                          <div key={quiz.quiz_id} className="bg-[#121212] p-3 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{quiz.title}</p>
                              <p className="text-xs text-[#A1A1AA]">{quiz.questions?.length || 0} questões{quiz.ai_generated ? ' · IA' : ''}</p>
                            </div>
                            <Button size="sm" onClick={() => startQuiz(quiz)} className="bg-purple-600 h-7 text-xs"><Play className="w-3 h-3 mr-1" />Iniciar</Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review Dialog */}
                <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-lg">
                    <DialogHeader><DialogTitle>Revisão Espaçada</DialogTitle><DialogDescription>Avalie sua lembrança</DialogDescription></DialogHeader>
                    {currentFlashcard && (
                      <div className="py-4">
                        <Card className="bg-[#121212] border-[#27272A] min-h-[180px] flex flex-col justify-center">
                          <CardContent className="p-6 text-center">
                            <p className="text-lg">{currentFlashcard.front}</p>
                            {showAnswer && <div className="mt-4 pt-4 border-t border-[#27272A]"><p className="text-[#00F0FF]">{currentFlashcard.back}</p></div>}
                          </CardContent>
                        </Card>
                        {!showAnswer ? (
                          <Button onClick={() => setShowAnswer(true)} className="w-full mt-4 bg-[#007AFF]">Mostrar Resposta</Button>
                        ) : (
                          <div className="mt-4 space-y-2">
                            <p className="text-center text-xs text-[#A1A1AA]">Como foi?</p>
                            <div className="grid grid-cols-4 gap-2">
                              <Button onClick={() => handleReviewFlashcard(0)} variant="outline" className="border-red-500 text-red-500 text-xs">Esqueci</Button>
                              <Button onClick={() => handleReviewFlashcard(2)} variant="outline" className="border-yellow-500 text-yellow-500 text-xs">Difícil</Button>
                              <Button onClick={() => handleReviewFlashcard(4)} variant="outline" className="border-green-500 text-green-500 text-xs">Bom</Button>
                              <Button onClick={() => handleReviewFlashcard(5)} variant="outline" className="border-[#00F0FF] text-[#00F0FF] text-xs">Fácil</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Quiz Dialog */}
                <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{currentQuiz?.title}</DialogTitle></DialogHeader>
                    {currentQuiz && !quizResult && (
                      <div className="py-4 space-y-4">
                        {currentQuiz.questions?.map((q, idx) => (
                          <div key={idx} className="bg-[#121212] p-4 rounded-lg">
                            <p className="font-medium mb-2 text-sm">{idx + 1}. {q.question}</p>
                            <div className="space-y-2">
                              {q.options?.map((option, oi) => {
                                const letter = option.charAt(0);
                                const isSel = quizAnswers.find(a => a.question_idx === idx)?.selected_answer === letter;
                                return <button key={oi} onClick={() => handleQuizAnswer(idx, letter)} className={`w-full text-left p-2 rounded-lg text-sm transition-all ${isSel ? 'bg-[#007AFF] text-white' : 'bg-[#0A0A0A] hover:bg-[#27272A]'}`}>{option}</button>;
                              })}
                            </div>
                          </div>
                        ))}
                        <Button onClick={submitQuiz} className="w-full bg-purple-600" disabled={quizAnswers.length < (currentQuiz.questions?.length || 0)}>Finalizar</Button>
                      </div>
                    )}
                    {quizResult && (
                      <div className="py-4 space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-[#00F0FF] mb-1">{(quizResult.score ?? 0).toFixed(0)}%</div>
                          <p className="text-[#A1A1AA] text-sm">{quizResult.correct_count ?? 0}/{quizResult.total_questions ?? 0} · +{quizResult.xp_earned ?? 0} XP</p>
                        </div>
                        <div className="space-y-3">
                          {quizResult.answers?.map((ans, idx) => (
                            <div key={idx} className={`p-3 rounded-lg text-sm ${ans.correct ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                              <div className="flex items-center gap-2 mb-1">{ans.correct ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}<span className="font-medium">Questão {idx + 1}</span></div>
                              {!ans.correct && <p className="text-xs text-[#A1A1AA]">Correta: {ans.correct_answer}</p>}
                              {ans.explanation && <p className="text-xs text-[#A1A1AA] mt-1">{ans.explanation}</p>}
                            </div>
                          ))}
                        </div>
                        <Button onClick={() => { setShowQuizDialog(false); setQuizResult(null); }} className="w-full">Fechar</Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Card className="bg-[#0A0A0A] border-[#27272A]"><CardContent className="text-center py-10"><BookMarked className="w-10 h-10 mx-auto text-[#A1A1AA] mb-3" /><h3 className="font-medium mb-1">Selecione uma Matéria</h3><p className="text-sm text-[#A1A1AA]">Navegue pelas áreas e programas para acessar uma matéria</p></CardContent></Card>
            )}
          </TabsContent>

          {/* ========== TAREFAS TAB ========== */}
          <TabsContent value="tarefas" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Tarefas de Estudo</h2>
              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild><Button size="sm" className="bg-[#007AFF] h-8 text-xs"><Plus className="w-3 h-3 mr-1" />Nova Tarefa</Button></DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                  <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div><Label>Título</Label><Input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} placeholder="Ex: Ler capítulo 5" className="bg-[#121212] border-[#27272A]" /></div>
                    <div><Label>Descrição</Label><Textarea value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} placeholder="Detalhes" className="bg-[#121212] border-[#27272A]" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Tipo</Label>
                        <Select value={taskForm.task_type} onValueChange={v => setTaskForm({...taskForm, task_type: v})}><SelectTrigger className="bg-[#121212] border-[#27272A]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(taskTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div><Label>Prioridade</Label>
                        <Select value={taskForm.priority} onValueChange={v => setTaskForm({...taskForm, priority: v})}><SelectTrigger className="bg-[#121212] border-[#27272A]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent></Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Recorrência</Label>
                        <Select value={taskForm.recurrence} onValueChange={v => setTaskForm({...taskForm, recurrence: v})}><SelectTrigger className="bg-[#121212] border-[#27272A]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(recurrenceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div><Label>Prazo</Label><Input type="date" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})} className="bg-[#121212] border-[#27272A]" /></div>
                    </div>
                    <Button onClick={handleCreateTask} className="w-full bg-[#007AFF]">Criar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 text-yellow-500" />Pendentes ({tasks.filter(t => !t.completed_today).length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.filter(t => !t.completed_today).map(task => (
                      <div key={task.task_id} className="bg-[#121212] p-3 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <button onClick={() => handleToggleTask(task.task_id, true)} className="mt-0.5 w-4 h-4 rounded border-2 border-[#27272A] hover:border-green-500 shrink-0" />
                            <div>
                              <h4 className="text-sm font-medium">{task.title}</h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge variant="outline" className="text-[10px] h-5">{taskTypeLabels[task.task_type]}</Badge>
                                <Badge className={`text-[10px] h-5 ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' : task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{task.priority}</Badge>
                                {task.recurrence !== "once" && <Badge variant="outline" className="text-[10px] h-5 border-blue-500 text-blue-400"><Repeat className="w-2 h-2 mr-1" />{recurrenceLabels[task.recurrence]}</Badge>}
                                {task.deadline && <Badge variant="outline" className="text-[10px] h-5 border-purple-500 text-purple-400">{task.deadline}</Badge>}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTask(task.task_id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => !t.completed_today).length === 0 && <p className="text-center text-[#A1A1AA] py-6 text-sm">Nenhuma tarefa pendente 🎉</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Concluídas ({tasks.filter(t => t.completed_today).length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.filter(t => t.completed_today).slice(0, 10).map(task => (
                      <div key={task.task_id} className="bg-[#121212] p-3 rounded-lg opacity-60">
                        <div className="flex items-center gap-2">
                          <button onClick={() => task.recurrence === 'once' ? handleToggleTask(task.task_id, false) : null} className={`w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center shrink-0 ${task.recurrence !== 'once' ? 'cursor-default' : ''}`}><CheckCircle2 className="w-2 h-2 text-white" /></button>
                          <span className={`text-sm ${task.recurrence === 'once' ? 'line-through' : ''}`}>{task.title}</span>
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => t.completed_today).length === 0 && <p className="text-center text-[#A1A1AA] py-6 text-sm">Nenhuma concluída hoje</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== FOCO TAB ========== */}
          <TabsContent value="foco" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <PomodoroTimer notebooks={notebooks} onComplete={fetchAllData} />
                <QuestionLogger notebooks={notebooks} onLog={fetchAllData} />
              </div>
              <div className="space-y-4">
                <StudyAIChat notebooks={notebooks} selectedNotebook={selectedNotebook} />
              </div>
            </div>

            {/* Focus Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-[#A1A1AA] mb-1">Hoje</p>
                  <p className="text-2xl font-bold text-red-400">{focusStats?.today?.total_minutes || 0}min</p>
                  <p className="text-xs text-[#A1A1AA]">{focusStats?.today?.sessions || 0} sessões</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-[#A1A1AA] mb-1">Esta Semana</p>
                  <p className="text-2xl font-bold text-[#00F0FF]">{focusStats?.week?.total_minutes || 0}min</p>
                  <p className="text-xs text-[#A1A1AA]">{focusStats?.week?.sessions || 0} sessões</p>
                </CardContent>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-[#A1A1AA] mb-1">Total</p>
                  <p className="text-2xl font-bold text-green-400">{focusStats?.all_time?.total_hours || 0}h</p>
                  <p className="text-xs text-[#A1A1AA]">{focusStats?.all_time?.sessions || 0} sessões</p>
                </CardContent>
              </Card>
            </div>

            {/* Question Stats */}
            {questionStats && totalQuestions > 0 && (
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-400" />Estatísticas de Questões</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div><p className="text-2xl font-bold text-white">{totalQuestions}</p><p className="text-xs text-[#A1A1AA]">Total</p></div>
                    <div><p className="text-2xl font-bold text-green-400">{questionStats.correct || 0}</p><p className="text-xs text-[#A1A1AA]">Acertos</p></div>
                    <div><p className="text-2xl font-bold text-red-400">{questionStats.incorrect || 0}</p><p className="text-xs text-[#A1A1AA]">Erros</p></div>
                    <div><p className={`text-2xl font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</p><p className="text-xs text-[#A1A1AA]">Acerto</p></div>
                  </div>
                  <Progress value={accuracy} className="mt-3 h-2" />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav user={user} />
    </div>
  );
}
