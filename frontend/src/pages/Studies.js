"import { useState, useEffect, useMemo } from \"react\";
import Sidebar from \"@/components/Sidebar\";
import MobileNav from \"@/components/MobileNav\";
import { Button } from \"@/components/ui/button\";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from \"@/components/ui/card\";
import { Input } from \"@/components/ui/input\";
import { Label } from \"@/components/ui/label\";
import { Badge } from \"@/components/ui/badge\";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from \"@/components/ui/dialog\";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from \"@/components/ui/select\";
import { Tabs, TabsContent, TabsList, TabsTrigger } from \"@/components/ui/tabs\";
import { Progress } from \"@/components/ui/progress\";
import { Textarea } from \"@/components/ui/textarea\";
import { RadioGroup, RadioGroupItem } from \"@/components/ui/radio-group\";
import { toast } from \"sonner\";
import axios from \"axios\";
import { 
  BookOpen, Plus, Trash2, Folder, FileText, Clock, Calendar,
  Brain, Layers, Target, Trophy, Flame, ChevronRight, Loader2,
  GraduationCap, Briefcase, FolderOpen, RotateCcw, CheckCircle2,
  XCircle, Sparkles, PenTool, Link, Upload, Play, Pause,
  Edit3, Tag, AlertCircle, Timer, BookMarked, Lightbulb, Repeat,
  Award, TrendingUp, PieChart as PieChartIcon, BarChart3, ListChecks, HelpCircle
} from \"lucide-react\";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, LineChart, Line, ResponsiveContainer 
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const areaIcons = {
  \"graduation-cap\": GraduationCap,
  \"file-text\": FileText,
  \"briefcase\": Briefcase,
  \"folder\": Folder,
  \"book\": BookOpen
};

const difficultyColors = {
  easy: \"bg-green-500\",
  medium: \"bg-yellow-500\",
  hard: \"bg-red-500\"
};

const difficultyLabels = {
  easy: \"Fácil\",
  medium: \"Média\",
  hard: \"Difícil\"
};

export default function Studies() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(\"overview\");
  
  // Data states
  const [areas, setAreas] = useState([]);
  const [contests, setContests] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionStats, setQuestionStats] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0, best_streak: 0 });

  // Selected states
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedContest, setSelectedContest] = useState(null);
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState(\"\");
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);

  // Dialog states
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [showContestDialog, setShowContestDialog] = useState(false);
  const [showNotebookDialog, setShowNotebookDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showAnswerDialog, setShowAnswerDialog] = useState(false);
  const [answerResult, setAnswerResult] = useState(null);

  // Loading states
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Form states
  const [areaForm, setAreaForm] = useState({ 
    name: \"\", description: \"\", color: \"#007AFF\", icon: \"book\" 
  });
  const [contestForm, setContestForm] = useState({ 
    name: \"\", description: \"\", institution: \"\", exam_date: \"\", color: \"#10B981\", status: \"active\" 
  });
  const [notebookForm, setNotebookForm] = useState({ 
    name: \"\", description: \"\", color: \"#007AFF\", tags: [], contest_id: null 
  });
  const [questionForm, setQuestionForm] = useState({
    subject: \"\", question_text: \"\", question_type: \"multiple_choice\", 
    options: [\"\", \"\", \"\", \"\"], correct_answer: \"0\", difficulty: \"medium\",
    tags: [], source: \"\", explanation: \"\", points: 1, contest_id: null, notebook_id: null
  });

  // Filters
  const [filterSubject, setFilterSubject] = useState(\"\");
  const [filterDifficulty, setFilterDifficulty] = useState(\"\");
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedContest) {
      fetchContestNotebooks();
    }
  }, [selectedContest, user]);

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
      const [areasRes, contestsRes, notebooksRes, streakRes] = await Promise.all([
        axios.get(`${API}/study/areas`, { withCredentials: true }),
        axios.get(`${API}/study/contests`, { withCredentials: true }),
        axios.get(`${API}/study/notebooks`, { withCredentials: true }),
        axios.get(`${API}/study/streak`, { withCredentials: true })
      ]);
      setAreas(Array.isArray(areasRes.data) ? areasRes.data : []);
      setContests(Array.isArray(contestsRes.data) ? contestsRes.data : []);
      setNotebooks(Array.isArray(notebooksRes.data) ? notebooksRes.data : []);
      setStreak(streakRes.data || {});
    } catch (error) {
      console.error(\"Error fetching data:\", error);
      toast.error(\"Erro ao carregar dados\");
    } finally {
      setLoading(false);
    }
  };

  const fetchContestNotebooks = async () => {
    if (!selectedContest) return;
    try {
      const res = await axios.get(`${API}/study/notebooks?contest_id=${selectedContest.contest_id}`, { 
        withCredentials: true 
      });
      setNotebooks(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(\"Error fetching notebooks:\", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      let url = `${API}/study/questions?`;
      if (selectedContest) url += `contest_id=${selectedContest.contest_id}&`;
      if (selectedNotebook) url += `notebook_id=${selectedNotebook.notebook_id}&`;
      if (filterSubject) url += `subject=${encodeURIComponent(filterSubject)}&`;
      if (filterDifficulty) url += `difficulty=${filterDifficulty}&`;
      if (showUnansweredOnly) url += `unanswered_only=true&`;
      
      const res = await axios.get(url, { withCredentials: true });
      setQuestions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error(\"Error fetching questions:\", error);
      toast.error(\"Erro ao carregar questões\");
    }
  };

  const fetchQuestionStats = async () => {
    try {
      const res = await axios.get(`${API}/study/questions/stats/overview`, { withCredentials: true });
      setQuestionStats(res.data);
    } catch (error) {
      console.error(\"Error fetching question stats:\", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${API}/study/dashboard/analytics`, { withCredentials: true });
      setDashboardData(res.data);
    } catch (error) {
      console.error(\"Error fetching dashboard data:\", error);
    }
  };

  // Area CRUD
  const handleCreateArea = async () => {
    if (!areaForm.name) {
      toast.error(\"Digite o nome da área\");
      return;
    }
    try {
      await axios.post(`${API}/study/areas`, areaForm, { withCredentials: true });
      toast.success(\"Área criada!\");
      setShowAreaDialog(false);
      setAreaForm({ name: \"\", description: \"\", color: \"#007AFF\", icon: \"book\" });
      fetchAllData();
    } catch (error) {
      toast.error(\"Erro ao criar área\");
    }
  };

  const handleDeleteArea = async (areaId) => {
    if (!window.confirm(\"Deseja realmente excluir esta área?\")) return;
    try {
      await axios.delete(`${API}/study/areas/${areaId}`, { withCredentials: true });
      toast.success(\"Área removida\");
      setSelectedArea(null);
      fetchAllData();
    } catch (error) {
      toast.error(\"Erro ao remover área\");
    }
  };

  // Contest CRUD
  const handleCreateContest = async () => {
    if (!contestForm.name || !selectedArea) {
      toast.error(\"Selecione uma área e digite o nome do concurso\");
      return;
    }
    try {
      await axios.post(`${API}/study/contests`, {
        ...contestForm,
        area_id: selectedArea.area_id
      }, { withCredentials: true });
      toast.success(\"Concurso criado!\");
      setShowContestDialog(false);
      setContestForm({ name: \"\", description: \"\", institution: \"\", exam_date: \"\", color: \"#10B981\", status: \"active\" });
      fetchAllData();
    } catch (error) {
      toast.error(\"Erro ao criar concurso\");
    }
  };

  const handleDeleteContest = async (contestId) => {
    if (!window.confirm(\"Deseja realmente excluir este concurso?\")) return;
    try {
      await axios.delete(`${API}/study/contests/${contestId}`, { withCredentials: true });
      toast.success(\"Concurso removido\");
      setSelectedContest(null);
      fetchAllData();
    } catch (error) {
      toast.error(\"Erro ao remover concurso\");
    }
  };

  // Notebook CRUD
  const handleCreateNotebook = async () => {
    if (!notebookForm.name) {
      toast.error(\"Digite o nome do caderno\");
      return;
    }
    if (!selectedArea && !selectedContest) {
      toast.error(\"Selecione uma área ou concurso\");
      return;
    }
    try {
      await axios.post(`${API}/study/notebooks`, {
        ...notebookForm,
        area_id: selectedArea?.area_id || selectedContest?.area_id,
        contest_id: selectedContest?.contest_id || null
      }, { withCredentials: true });
      toast.success(\"Caderno criado!\");
      setShowNotebookDialog(false);
      setNotebookForm({ name: \"\", description: \"\", color: \"#007AFF\", tags: [], contest_id: null });
      if (selectedContest) {
        fetchContestNotebooks();
      } else {
        fetchAllData();
      }
    } catch (error) {
      toast.error(\"Erro ao criar caderno\");
    }
  };

  const handleDeleteNotebook = async (notebookId) => {
    if (!window.confirm(\"Deseja realmente excluir este caderno?\")) return;
    try {
      await axios.delete(`${API}/study/notebooks/${notebookId}`, { withCredentials: true });
      toast.success(\"Caderno removido\");
      setSelectedNotebook(null);
      if (selectedContest) {
        fetchContestNotebooks();
      } else {
        fetchAllData();
      }
    } catch (error) {
      toast.error(\"Erro ao remover caderno\");
    }
  };

  // Question CRUD
  const handleCreateQuestion = async () => {
    if (!questionForm.subject || !questionForm.question_text) {
      toast.error(\"Preencha matéria e enunciado\");
      return;
    }
    if (questionForm.question_type === \"multiple_choice\" && questionForm.options.some(opt => !opt)) {
      toast.error(\"Preencha todas as alternativas\");
      return;
    }
    try {
      await axios.post(`${API}/study/questions`, {
        ...questionForm,
        contest_id: selectedContest?.contest_id || null,
        notebook_id: selectedNotebook?.notebook_id || null
      }, { withCredentials: true });
      toast.success(\"Questão criada!\");
      setShowQuestionDialog(false);
      setQuestionForm({
        subject: \"\", question_text: \"\", question_type: \"multiple_choice\", 
        options: [\"\", \"\", \"\", \"\"], correct_answer: \"0\", difficulty: \"medium\",
        tags: [], source: \"\", explanation: \"\", points: 1, contest_id: null, notebook_id: null
      });
      fetchQuestions();
    } catch (error) {
      toast.error(\"Erro ao criar questão\");
    }
  };

  const handleAnswerQuestion = async () => {
    if (!userAnswer && userAnswer !== \"0\") {
      toast.error(\"Selecione uma resposta\");
      return;
    }
    setSubmittingAnswer(true);
    try {
      const timeSpentSeconds = questionStartTime ? Math.floor((Date.now() - questionStartTime) / 1000) : 0;
      const res = await axios.post(`${API}/study/questions/${currentQuestion.question_id}/answer`, {
        user_answer: userAnswer,
        time_spent_seconds: timeSpentSeconds
      }, { withCredentials: true });
      
      setAnswerResult(res.data);
      setShowAnswerDialog(false);
      
      // Show result dialog
      const isCorrect = res.data.is_correct;
      if (isCorrect) {
        toast.success(`✅ Correto! +${res.data.xp_earned} XP`);
      } else {
        toast.error(\"❌ Incorreto. Veja a explicação.\");
      }
      
      // Reload questions to update status
      fetchQuestions();
      fetchQuestionStats();
    } catch (error) {
      toast.error(\"Erro ao enviar resposta\");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const startQuestion = (question) => {
    setCurrentQuestion(question);
    setUserAnswer(\"\");
    setQuestionStartTime(Date.now());
    setAnswerResult(null);
    setShowAnswerDialog(true);
  };

  // Get unique subjects from questions
  const subjects = useMemo(() => {
    const uniqueSubjects = [...new Set(questions.map(q => q.subject))];
    return uniqueSubjects.sort();
  }, [questions]);

  // Prepare chart data
  const pieChartData = useMemo(() => {
    if (!questionStats || !questionStats.overview) return [];
    return [
      { name: 'Corretas', value: questionStats.overview.correct_answers, color: '#10B981' },
      { name: 'Incorretas', value: questionStats.overview.incorrect_answers, color: '#EF4444' },
      { name: 'Não Respondidas', value: questionStats.overview.unanswered_questions, color: '#6B7280' }
    ];
  }, [questionStats]);

  const subjectChartData = useMemo(() => {
    if (!questionStats || !questionStats.by_subject) return [];
    return Object.entries(questionStats.by_subject).map(([subject, data]) => ({
      name: subject,
      total: data.total_questions,
      respondidas: data.answered,
      corretas: data.correct,
      acurácia: data.accuracy
    }));
  }, [questionStats]);

  const dailyProgressData = useMemo(() => {
    if (!questionStats || !questionStats.recent_progress || !questionStats.recent_progress.daily_progress) return [];
    return Object.entries(questionStats.recent_progress.daily_progress).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total: data.total,
      corretas: data.correct
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [questionStats]);

  if (loading) {
    return (
      <div className=\"flex h-screen bg-zinc-950\">
        <Sidebar />
        <div className=\"flex-1 flex items-center justify-center\">
          <Loader2 className=\"w-8 h-8 animate-spin text-blue-500\" />
        </div>
      </div>
    );
  }

  return (
    <div className=\"flex h-screen bg-zinc-950 text-white overflow-hidden\">
      <Sidebar />
      <MobileNav />
      
      <div className=\"flex-1 flex flex-col overflow-hidden pt-16 lg:pt-0 lg:ml-64\">
        <div className=\"flex-1 overflow-y-auto p-4 lg:p-8\">
          <div className=\"max-w-7xl mx-auto space-y-6\">
            {/* Header */}
            <div className=\"flex items-center justify-between\">
              <div>
                <h1 className=\"text-3xl font-bold flex items-center gap-3\">
                  <BookOpen className=\"w-8 h-8 text-blue-500\" />
                  Área de Estudos
                </h1>
                <p className=\"text-zinc-400 mt-1\">
                  Organize seus concursos, cadernos e questões
                </p>
              </div>
              <div className=\"flex items-center gap-2\">
                <div className=\"bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2\">
                  <div className=\"flex items-center gap-2\">
                    <Flame className=\"w-5 h-5 text-orange-500\" />
                    <span className=\"text-sm\">Sequência: <strong>{streak.current_streak || 0}</strong> dias</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className=\"space-y-6\">
              <TabsList className=\"bg-zinc-900 border border-zinc-800\">
                <TabsTrigger value=\"overview\">Visão Geral</TabsTrigger>
                <TabsTrigger value=\"contests\">Concursos</TabsTrigger>
                <TabsTrigger value=\"questions\" onClick={fetchQuestions}>Questões</TabsTrigger>
                <TabsTrigger value=\"dashboard\" onClick={() => { fetchQuestionStats(); fetchDashboardData(); }}>
                  Dashboard
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value=\"overview\" className=\"space-y-6\">
                <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                  <Card className=\"bg-zinc-900 border-zinc-800\">
                    <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                      <CardTitle className=\"text-sm font-medium text-zinc-400\">Áreas de Estudo</CardTitle>
                      <Folder className=\"w-4 h-4 text-blue-500\" />
                    </CardHeader>
                    <CardContent>
                      <div className=\"text-2xl font-bold\">{areas.length}</div>
                    </CardContent>
                  </Card>

                  <Card className=\"bg-zinc-900 border-zinc-800\">
                    <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                      <CardTitle className=\"text-sm font-medium text-zinc-400\">Concursos</CardTitle>
                      <Award className=\"w-4 h-4 text-green-500\" />
                    </CardHeader>
                    <CardContent>
                      <div className=\"text-2xl font-bold\">{contests.length}</div>
                    </CardContent>
                  </Card>

                  <Card className=\"bg-zinc-900 border-zinc-800\">
                    <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                      <CardTitle className=\"text-sm font-medium text-zinc-400\">Cadernos</CardTitle>
                      <BookOpen className=\"w-4 h-4 text-purple-500\" />
                    </CardHeader>
                    <CardContent>
                      <div className=\"text-2xl font-bold\">{notebooks.length}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Areas List */}
                <Card className=\"bg-zinc-900 border-zinc-800\">
                  <CardHeader className=\"flex flex-row items-center justify-between\">
                    <CardTitle>Áreas de Estudo</CardTitle>
                    <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
                      <DialogTrigger asChild>
                        <Button size=\"sm\" className=\"bg-blue-600 hover:bg-blue-700\">
                          <Plus className=\"w-4 h-4 mr-2\" />
                          Nova Área
                        </Button>
                      </DialogTrigger>
                      <DialogContent className=\"bg-zinc-900 border-zinc-800 text-white\">
                        <DialogHeader>
                          <DialogTitle>Nova Área de Estudo</DialogTitle>
                        </DialogHeader>
                        <div className=\"space-y-4\">
                          <div>
                            <Label>Nome</Label>
                            <Input
                              value={areaForm.name}
                              onChange={(e) => setAreaForm({...areaForm, name: e.target.value})}
                              className=\"bg-zinc-800 border-zinc-700\"
                              placeholder=\"Ex: Concursos\"
                            />
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Textarea
                              value={areaForm.description}
                              onChange={(e) => setAreaForm({...areaForm, description: e.target.value})}
                              className=\"bg-zinc-800 border-zinc-700\"
                              placeholder=\"Descrição opcional\"
                            />
                          </div>
                          <div>
                            <Label>Cor</Label>
                            <Input
                              type=\"color\"
                              value={areaForm.color}
                              onChange={(e) => setAreaForm({...areaForm, color: e.target.value})}
                              className=\"bg-zinc-800 border-zinc-700 h-10\"
                            />
                          </div>
                          <Button onClick={handleCreateArea} className=\"w-full bg-blue-600 hover:bg-blue-700\">
                            Criar Área
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                      {areas.map((area) => {
                        const Icon = areaIcons[area.icon] || BookOpen;
                        const areaContests = contests.filter(c => c.area_id === area.area_id);
                        const areaNotebooks = notebooks.filter(n => n.area_id === area.area_id);
                        
                        return (
                          <Card 
                            key={area.area_id} 
                            className=\"bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors\"
                            style={{ borderLeftColor: area.color, borderLeftWidth: '4px' }}
                            onClick={() => {
                              setSelectedArea(area);
                              setActiveTab(\"contests\");
                            }}
                          >
                            <CardContent className=\"pt-6\">
                              <div className=\"flex items-start justify-between\">
                                <div className=\"flex items-center gap-3\">
                                  <div 
                                    className=\"w-12 h-12 rounded-lg flex items-center justify-center\"
                                    style={{ backgroundColor: area.color + '20' }}
                                  >
                                    <Icon className=\"w-6 h-6\" style={{ color: area.color }} />
                                  </div>
                                  <div>
                                    <h3 className=\"font-semibold text-lg\">{area.name}</h3>
                                    <p className=\"text-sm text-zinc-400\">
                                      {areaContests.length} concursos · {areaNotebooks.length} cadernos
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant=\"ghost\"
                                  size=\"sm\"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteArea(area.area_id);
                                  }}
                                  className=\"text-red-400 hover:text-red-300 hover:bg-red-950\"
                                >
                                  <Trash2 className=\"w-4 h-4\" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contests Tab */}
              <TabsContent value=\"contests\" className=\"space-y-6\">
                {!selectedArea ? (
                  <Card className=\"bg-zinc-900 border-zinc-800\">
                    <CardContent className=\"py-12 text-center\">
                      <Award className=\"w-12 h-12 text-zinc-600 mx-auto mb-4\" />
                      <p className=\"text-zinc-400\">Selecione uma área para ver os concursos</p>
                      <Button 
                        onClick={() => setActiveTab(\"overview\")} 
                        className=\"mt-4 bg-blue-600 hover:bg-blue-700\"
                      >
                        Ver Áreas
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className=\"flex items-center justify-between\">
                      <div>
                        <Button
                          variant=\"ghost\"
                          size=\"sm\"
                          onClick={() => setSelectedArea(null)}
                          className=\"mb-2\"
                        >
                          ← Voltar para áreas
                        </Button>
                        <h2 className=\"text-2xl font-bold\">{selectedArea.name}</h2>
                        <p className=\"text-zinc-400\">Gerenciar concursos</p>
                      </div>
                      <Dialog open={showContestDialog} onOpenChange={setShowContestDialog}>
                        <DialogTrigger asChild>
                          <Button className=\"bg-green-600 hover:bg-green-700\">
                            <Plus className=\"w-4 h-4 mr-2\" />
                            Novo Concurso
                          </Button>
                        </DialogTrigger>
                        <DialogContent className=\"bg-zinc-900 border-zinc-800 text-white\">
                          <DialogHeader>
                            <DialogTitle>Novo Concurso</DialogTitle>
                          </DialogHeader>
                          <div className=\"space-y-4\">
                            <div>
                              <Label>Nome do Concurso</Label>
                              <Input
                                value={contestForm.name}
                                onChange={(e) => setContestForm({...contestForm, name: e.target.value})}
                                className=\"bg-zinc-800 border-zinc-700\"
                                placeholder=\"Ex: TRF 3ª Região\"
                              />
                            </div>
                            <div>
                              <Label>Instituição</Label>
                              <Input
                                value={contestForm.institution}
                                onChange={(e) => setContestForm({...contestForm, institution: e.target.value})}
                                className=\"bg-zinc-800 border-zinc-700\"
                                placeholder=\"Ex: FGV\"
                              />
                            </div>
                            <div>
                              <Label>Data da Prova</Label>
                              <Input
                                type=\"date\"
                                value={contestForm.exam_date}
                                onChange={(e) => setContestForm({...contestForm, exam_date: e.target.value})}
                                className=\"bg-zinc-800 border-zinc-700\"
                              />
                            </div>
                            <div>
                              <Label>Descrição</Label>
                              <Textarea
                                value={contestForm.description}
                                onChange={(e) => setContestForm({...contestForm, description: e.target.value})}
                                className=\"bg-zinc-800 border-zinc-700\"
                                placeholder=\"Descrição opcional\"
                              />
                            </div>
                            <div>
                              <Label>Cor</Label>
                              <Input
                                type=\"color\"
                                value={contestForm.color}
                                onChange={(e) => setContestForm({...contestForm, color: e.target.value})}
                                className=\"bg-zinc-800 border-zinc-700 h-10\"
                              />
                            </div>
                            <Button onClick={handleCreateContest} className=\"w-full bg-green-600 hover:bg-green-700\">
                              Criar Concurso
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Contests List */}
                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                      {contests.filter(c => c.area_id === selectedArea.area_id).map((contest) => {
                        const contestNotebooks = notebooks.filter(n => n.contest_id === contest.contest_id);
                        
                        return (
                          <Card 
                            key={contest.contest_id}
                            className=\"bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors\"
                            style={{ borderLeftColor: contest.color, borderLeftWidth: '4px' }}
                            onClick={() => {
                              setSelectedContest(contest);
                              fetchContestNotebooks();
                            }}
                          >
                            <CardContent className=\"pt-6\">
                              <div className=\"flex items-start justify-between mb-3\">
                                <div>
                                  <h3 className=\"font-semibold text-lg\">{contest.name}</h3>
                                  {contest.institution && (
                                    <Badge variant=\"outline\" className=\"mt-1\">
                                      {contest.institution}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant=\"ghost\"
                                  size=\"sm\"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteContest(contest.contest_id);
                                  }}
                                  className=\"text-red-400 hover:text-red-300 hover:bg-red-950\"
                                >
                                  <Trash2 className=\"w-4 h-4\" />
                                </Button>
                              </div>
                              {contest.exam_date && (
                                <div className=\"flex items-center gap-2 text-sm text-zinc-400 mb-2\">
                                  <Calendar className=\"w-4 h-4\" />
                                  Prova: {new Date(contest.exam_date).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                              <p className=\"text-sm text-zinc-400\">
                                {contestNotebooks.length} cadernos de estudo
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Selected Contest Notebooks */}
                    {selectedContest && (
                      <Card className=\"bg-zinc-900 border-zinc-800 mt-6\">
                        <CardHeader className=\"flex flex-row items-center justify-between\">
                          <div>
                            <Button
                              variant=\"ghost\"
                              size=\"sm\"
                              onClick={() => setSelectedContest(null)}
                              className=\"mb-2\"
                            >
                              ← Voltar
                            </Button>
                            <CardTitle>{selectedContest.name}</CardTitle>
                            <CardDescription>Cadernos de estudo</CardDescription>
                          </div>
                          <Dialog open={showNotebookDialog} onOpenChange={setShowNotebookDialog}>
                            <DialogTrigger asChild>
                              <Button className=\"bg-purple-600 hover:bg-purple-700\">
                                <Plus className=\"w-4 h-4 mr-2\" />
                                Novo Caderno
                              </Button>
                            </DialogTrigger>
                            <DialogContent className=\"bg-zinc-900 border-zinc-800 text-white\">
                              <DialogHeader>
                                <DialogTitle>Novo Caderno de Estudo</DialogTitle>
                                <DialogDescription>
                                  Para o concurso: {selectedContest.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className=\"space-y-4\">
                                <div>
                                  <Label>Nome do Caderno</Label>
                                  <Input
                                    value={notebookForm.name}
                                    onChange={(e) => setNotebookForm({...notebookForm, name: e.target.value})}
                                    className=\"bg-zinc-800 border-zinc-700\"
                                    placeholder=\"Ex: Direito Civil\"
                                  />
                                </div>
                                <div>
                                  <Label>Descrição</Label>
                                  <Textarea
                                    value={notebookForm.description}
                                    onChange={(e) => setNotebookForm({...notebookForm, description: e.target.value})}
                                    className=\"bg-zinc-800 border-zinc-700\"
                                    placeholder=\"Descrição opcional\"
                                  />
                                </div>
                                <div>
                                  <Label>Cor</Label>
                                  <Input
                                    type=\"color\"
                                    value={notebookForm.color}
                                    onChange={(e) => setNotebookForm({...notebookForm, color: e.target.value})}
                                    className=\"bg-zinc-800 border-zinc-700 h-10\"
                                  />
                                </div>
                                <Button onClick={handleCreateNotebook} className=\"w-full bg-purple-600 hover:bg-purple-700\">
                                  Criar Caderno
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </CardHeader>
                        <CardContent>
                          {notebooks.length === 0 ? (
                            <div className=\"text-center py-12\">
                              <BookOpen className=\"w-12 h-12 text-zinc-600 mx-auto mb-4\" />
                              <p className=\"text-zinc-400\">Nenhum caderno criado ainda</p>
                            </div>
                          ) : (
                            <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                              {notebooks.map((notebook) => (
                                <Card 
                                  key={notebook.notebook_id}
                                  className=\"bg-zinc-800 border-zinc-700\"
                                  style={{ borderTopColor: notebook.color, borderTopWidth: '3px' }}
                                >
                                  <CardContent className=\"pt-6\">
                                    <div className=\"flex items-start justify-between\">
                                      <div className=\"flex-1\">
                                        <h4 className=\"font-semibold\">{notebook.name}</h4>
                                        {notebook.description && (
                                          <p className=\"text-sm text-zinc-400 mt-1\">{notebook.description}</p>
                                        )}
                                      </div>
                                      <Button
                                        variant=\"ghost\"
                                        size=\"sm\"
                                        onClick={() => handleDeleteNotebook(notebook.notebook_id)}
                                        className=\"text-red-400 hover:text-red-300 hover:bg-red-950\"
                                      >
                                        <Trash2 className=\"w-4 h-4\" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Questions Tab */}
              <TabsContent value=\"questions\" className=\"space-y-6\">
                <div className=\"flex items-center justify-between\">
                  <div>
                    <h2 className=\"text-2xl font-bold\">Questões</h2>
                    <p className=\"text-zinc-400\">Pratique com questões de provas</p>
                  </div>
                  <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
                    <DialogTrigger asChild>
                      <Button className=\"bg-blue-600 hover:bg-blue-700\">
                        <Plus className=\"w-4 h-4 mr-2\" />
                        Nova Questão
                      </Button>
                    </DialogTrigger>
                    <DialogContent className=\"bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto\">
                      <DialogHeader>
                        <DialogTitle>Nova Questão</DialogTitle>
                      </DialogHeader>
                      <div className=\"space-y-4\">
                        <div className=\"grid grid-cols-2 gap-4\">
                          <div>
                            <Label>Matéria/Assunto</Label>
                            <Input
                              value={questionForm.subject}
                              onChange={(e) => setQuestionForm({...questionForm, subject: e.target.value})}
                              className=\"bg-zinc-800 border-zinc-700\"
                              placeholder=\"Ex: Direito Civil\"
                            />
                          </div>
                          <div>
                            <Label>Dificuldade</Label>
                            <Select 
                              value={questionForm.difficulty} 
                              onValueChange={(value) => setQuestionForm({...questionForm, difficulty: value})}
                            >
                              <SelectTrigger className=\"bg-zinc-800 border-zinc-700\">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className=\"bg-zinc-800 border-zinc-700\">
                                <SelectItem value=\"easy\">Fácil</SelectItem>
                                <SelectItem value=\"medium\">Média</SelectItem>
                                <SelectItem value=\"hard\">Difícil</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label>Enunciado da Questão</Label>
                          <Textarea
                            value={questionForm.question_text}
                            onChange={(e) => setQuestionForm({...questionForm, question_text: e.target.value})}
                            className=\"bg-zinc-800 border-zinc-700 min-h-[100px]\"
                            placeholder=\"Digite o enunciado da questão...\"
                          />
                        </div>

                        <div>
                          <Label>Tipo de Questão</Label>
                          <Select 
                            value={questionForm.question_type} 
                            onValueChange={(value) => setQuestionForm({...questionForm, question_type: value})}
                          >
                            <SelectTrigger className=\"bg-zinc-800 border-zinc-700\">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className=\"bg-zinc-800 border-zinc-700\">
                              <SelectItem value=\"multiple_choice\">Múltipla Escolha</SelectItem>
                              <SelectItem value=\"true_false\">Verdadeiro/Falso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {questionForm.question_type === \"multiple_choice\" && (
                          <div className=\"space-y-3\">
                            <Label>Alternativas</Label>
                            {questionForm.options.map((option, idx) => (
                              <div key={idx} className=\"flex items-center gap-2\">
                                <span className=\"text-sm font-semibold w-6\">{String.fromCharCode(65 + idx)})</span>
                                <Input
                                  value={option}
                                  onChange={(e) => {
                                    const newOptions = [...questionForm.options];
                                    newOptions[idx] = e.target.value;
                                    setQuestionForm({...questionForm, options: newOptions});
                                  }}
                                  className=\"bg-zinc-800 border-zinc-700 flex-1\"
                                  placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`}
                                />
                              </div>
                            ))}
                            <div>
                              <Label>Resposta Correta</Label>
                              <Select 
                                value={questionForm.correct_answer} 
                                onValueChange={(value) => setQuestionForm({...questionForm, correct_answer: value})}
                              >
                                <SelectTrigger className=\"bg-zinc-800 border-zinc-700\">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className=\"bg-zinc-800 border-zinc-700\">
                                  {questionForm.options.map((_, idx) => (
                                    <SelectItem key={idx} value={String(idx)}>
                                      Alternativa {String.fromCharCode(65 + idx)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Explicação (opcional)</Label>
                          <Textarea
                            value={questionForm.explanation}
                            onChange={(e) => setQuestionForm({...questionForm, explanation: e.target.value})}
                            className=\"bg-zinc-800 border-zinc-700\"
                            placeholder=\"Explique a resposta correta...\"
                          />
                        </div>

                        <div>
                          <Label>Fonte (opcional)</Label>
                          <Input
                            value={questionForm.source}
                            onChange={(e) => setQuestionForm({...questionForm, source: e.target.value})}
                            className=\"bg-zinc-800 border-zinc-700\"
                            placeholder=\"Ex: FGV 2023\"
                          />
                        </div>

                        <Button onClick={handleCreateQuestion} className=\"w-full bg-blue-600 hover:bg-blue-700\">
                          Criar Questão
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Filters */}
                <Card className=\"bg-zinc-900 border-zinc-800\">
                  <CardHeader>
                    <CardTitle className=\"text-lg\">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
                      <div>
                        <Label>Concurso</Label>
                        <Select 
                          value={selectedContest?.contest_id || \"all\"} 
                          onValueChange={(value) => {
                            if (value === \"all\") {
                              setSelectedContest(null);
                            } else {
                              const contest = contests.find(c => c.contest_id === value);
                              setSelectedContest(contest);
                            }
                          }}
                        >
                          <SelectTrigger className=\"bg-zinc-800 border-zinc-700\">
                            <SelectValue placeholder=\"Todos\" />
                          </SelectTrigger>
                          <SelectContent className=\"bg-zinc-800 border-zinc-700\">
                            <SelectItem value=\"all\">Todos</SelectItem>
                            {contests.map((contest) => (
                              <SelectItem key={contest.contest_id} value={contest.contest_id}>
                                {contest.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Matéria</Label>
                        <Select value={filterSubject} onValueChange={setFilterSubject}>
                          <SelectTrigger className=\"bg-zinc-800 border-zinc-700\">
                            <SelectValue placeholder=\"Todas\" />
                          </SelectTrigger>
                          <SelectContent className=\"bg-zinc-800 border-zinc-700\">
                            <SelectItem value=\"\">Todas</SelectItem>
                            {subjects.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Dificuldade</Label>
                        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                          <SelectTrigger className=\"bg-zinc-800 border-zinc-700\">
                            <SelectValue placeholder=\"Todas\" />
                          </SelectTrigger>
                          <SelectContent className=\"bg-zinc-800 border-zinc-700\">
                            <SelectItem value=\"\">Todas</SelectItem>
                            <SelectItem value=\"easy\">Fácil</SelectItem>
                            <SelectItem value=\"medium\">Média</SelectItem>
                            <SelectItem value=\"hard\">Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className=\"flex items-end\">
                        <Button onClick={fetchQuestions} className=\"w-full bg-blue-600 hover:bg-blue-700\">
                          Aplicar Filtros
                        </Button>
                      </div>
                    </div>

                    <div className=\"mt-4 flex items-center gap-2\">
                      <input
                        type=\"checkbox\"
                        id=\"unanswered\"
                        checked={showUnansweredOnly}
                        onChange={(e) => setShowUnansweredOnly(e.target.checked)}
                        className=\"rounded border-zinc-700\"
                      />
                      <label htmlFor=\"unanswered\" className=\"text-sm\">
                        Mostrar apenas não respondidas
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions List */}
                <Card className=\"bg-zinc-900 border-zinc-800\">
                  <CardHeader>
                    <CardTitle>
                      Questões ({questions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {questions.length === 0 ? (
                      <div className=\"text-center py-12\">
                        <ListChecks className=\"w-12 h-12 text-zinc-600 mx-auto mb-4\" />
                        <p className=\"text-zinc-400\">Nenhuma questão encontrada</p>
                        <p className=\"text-sm text-zinc-500 mt-2\">Crie questões ou ajuste os filtros</p>
                      </div>
                    ) : (
                      <div className=\"space-y-4\">
                        {questions.map((question, idx) => (
                          <Card 
                            key={question.question_id}
                            className={`bg-zinc-800 border-zinc-700 ${
                              question.is_answered 
                                ? question.is_correct 
                                  ? 'border-l-4 border-l-green-500' 
                                  : 'border-l-4 border-l-red-500'
                                : 'border-l-4 border-l-zinc-600'
                            }`}
                          >
                            <CardContent className=\"pt-6\">
                              <div className=\"flex items-start justify-between mb-3\">
                                <div className=\"flex-1\">
                                  <div className=\"flex items-center gap-2 mb-2\">
                                    <Badge variant=\"outline\">{question.subject}</Badge>
                                    <Badge className={difficultyColors[question.difficulty]}>
                                      {difficultyLabels[question.difficulty]}
                                    </Badge>
                                    {question.source && (
                                      <Badge variant=\"secondary\">{question.source}</Badge>
                                    )}
                                    {question.is_answered && (
                                      <Badge className={question.is_correct ? \"bg-green-600\" : \"bg-red-600\"}>
                                        {question.is_correct ? \"✓ Acertou\" : \"✗ Errou\"}
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className=\"font-medium text-sm text-zinc-200\">
                                    Questão {idx + 1}
                                  </h4>
                                  <p className=\"text-sm text-zinc-300 mt-2 whitespace-pre-wrap\">
                                    {question.question_text}
                                  </p>
                                </div>
                              </div>

                              <div className=\"flex items-center justify-between mt-4\">
                                <div className=\"text-xs text-zinc-500\">
                                  {question.attempts_count} tentativa{question.attempts_count !== 1 ? 's' : ''}
                                </div>
                                <Button
                                  size=\"sm\"
                                  onClick={() => startQuestion(question)}
                                  className=\"bg-blue-600 hover:bg-blue-700\"
                                >
                                  {question.is_answered ? \"Responder Novamente\" : \"Responder\"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Answer Dialog */}
                <Dialog open={showAnswerDialog} onOpenChange={setShowAnswerDialog}>
                  <DialogContent className=\"bg-zinc-900 border-zinc-800 text-white max-w-2xl\">
                    <DialogHeader>
                      <DialogTitle>Responder Questão</DialogTitle>
                      {currentQuestion && (
                        <div className=\"flex items-center gap-2 mt-2\">
                          <Badge variant=\"outline\">{currentQuestion.subject}</Badge>
                          <Badge className={difficultyColors[currentQuestion.difficulty]}>
                            {difficultyLabels[currentQuestion.difficulty]}
                          </Badge>
                        </div>
                      )}
                    </DialogHeader>

                    {currentQuestion && (
                      <div className=\"space-y-4\">
                        <div className=\"bg-zinc-800 p-4 rounded-lg\">
                          <p className=\"text-sm whitespace-pre-wrap\">{currentQuestion.question_text}</p>
                        </div>

                        {currentQuestion.question_type === \"multiple_choice\" && (
                          <RadioGroup value={userAnswer} onValueChange={setUserAnswer}>
                            <div className=\"space-y-2\">
                              {currentQuestion.options.map((option, idx) => (
                                <div 
                                  key={idx}
                                  className=\"flex items-center space-x-2 bg-zinc-800 p-3 rounded-lg cursor-pointer hover:bg-zinc-750\"
                                  onClick={() => setUserAnswer(String(idx))}
                                >
                                  <RadioGroupItem value={String(idx)} id={`option-${idx}`} />
                                  <Label htmlFor={`option-${idx}`} className=\"flex-1 cursor-pointer\">
                                    <span className=\"font-semibold mr-2\">{String.fromCharCode(65 + idx)})</span>
                                    {option}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        )}

                        <div className=\"flex gap-2\">
                          <Button
                            onClick={handleAnswerQuestion}
                            disabled={submittingAnswer || !userAnswer}
                            className=\"flex-1 bg-blue-600 hover:bg-blue-700\"
                          >
                            {submittingAnswer ? (
                              <>
                                <Loader2 className=\"w-4 h-4 mr-2 animate-spin\" />
                                Enviando...
                              </>
                            ) : (
                              \"Confirmar Resposta\"
                            )}
                          </Button>
                          <Button
                            variant=\"outline\"
                            onClick={() => setShowAnswerDialog(false)}
                            className=\"border-zinc-700\"
                          >
                            Cancelar
                          </Button>
                        </div>

                        {answerResult && (
                          <Card className={`${answerResult.is_correct ? 'bg-green-950 border-green-800' : 'bg-red-950 border-red-800'}`}>
                            <CardContent className=\"pt-6\">
                              <div className=\"flex items-start gap-3\">
                                {answerResult.is_correct ? (
                                  <CheckCircle2 className=\"w-6 h-6 text-green-400 flex-shrink-0\" />
                                ) : (
                                  <XCircle className=\"w-6 h-6 text-red-400 flex-shrink-0\" />
                                )}
                                <div className=\"flex-1\">
                                  <h4 className=\"font-semibold mb-2\">
                                    {answerResult.is_correct ? \"Correto!\" : \"Incorreto\"}
                                  </h4>
                                  {!answerResult.is_correct && answerResult.correct_answer && (
                                    <p className=\"text-sm mb-2\">
                                      Resposta correta: <strong>{String.fromCharCode(65 + parseInt(answerResult.correct_answer))}</strong>
                                    </p>
                                  )}
                                  {answerResult.explanation && (
                                    <p className=\"text-sm text-zinc-300\">{answerResult.explanation}</p>
                                  )}
                                  {answerResult.is_correct && (
                                    <p className=\"text-sm mt-2 text-green-400\">
                                      +{answerResult.xp_earned} XP
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Dashboard Tab */}
              <TabsContent value=\"dashboard\" className=\"space-y-6\">
                <div className=\"flex items-center justify-between\">
                  <div>
                    <h2 className=\"text-2xl font-bold\">Dashboard de Estudos</h2>
                    <p className=\"text-zinc-400\">Visualize seu progresso e desempenho</p>
                  </div>
                  <Button 
                    onClick={() => { fetchQuestionStats(); fetchDashboardData(); }}
                    variant=\"outline\"
                    className=\"border-zinc-700\"
                  >
                    <RotateCcw className=\"w-4 h-4 mr-2\" />
                    Atualizar
                  </Button>
                </div>

                {questionStats && (
                  <>
                    {/* Overview Stats */}
                    <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
                      <Card className=\"bg-zinc-900 border-zinc-800\">
                        <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                          <CardTitle className=\"text-sm font-medium text-zinc-400\">Total de Questões</CardTitle>
                          <ListChecks className=\"w-4 h-4 text-blue-500\" />
                        </CardHeader>
                        <CardContent>
                          <div className=\"text-2xl font-bold\">{questionStats.overview?.total_questions || 0}</div>
                          <p className=\"text-xs text-zinc-500 mt-1\">
                            {questionStats.overview?.answered_questions || 0} respondidas
                          </p>
                        </CardContent>
                      </Card>

                      <Card className=\"bg-zinc-900 border-zinc-800\">
                        <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                          <CardTitle className=\"text-sm font-medium text-zinc-400\">Acertos</CardTitle>
                          <CheckCircle2 className=\"w-4 h-4 text-green-500\" />
                        </CardHeader>
                        <CardContent>
                          <div className=\"text-2xl font-bold text-green-400\">
                            {questionStats.overview?.correct_answers || 0}
                          </div>
                          <p className=\"text-xs text-zinc-500 mt-1\">
                            {questionStats.overview?.accuracy_percentage || 0}% de acurácia
                          </p>
                        </CardContent>
                      </Card>

                      <Card className=\"bg-zinc-900 border-zinc-800\">
                        <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                          <CardTitle className=\"text-sm font-medium text-zinc-400\">Erros</CardTitle>
                          <XCircle className=\"w-4 h-4 text-red-500\" />
                        </CardHeader>
                        <CardContent>
                          <div className=\"text-2xl font-bold text-red-400\">
                            {questionStats.overview?.incorrect_answers || 0}
                          </div>
                          <p className=\"text-xs text-zinc-500 mt-1\">
                            Para revisar
                          </p>
                        </CardContent>
                      </Card>

                      <Card className=\"bg-zinc-900 border-zinc-800\">
                        <CardHeader className=\"flex flex-row items-center justify-between pb-2\">
                          <CardTitle className=\"text-sm font-medium text-zinc-400\">Progresso</CardTitle>
                          <TrendingUp className=\"w-4 h-4 text-purple-500\" />
                        </CardHeader>
                        <CardContent>
                          <div className=\"text-2xl font-bold\">
                            {questionStats.overview?.total_questions > 0 
                              ? Math.round((questionStats.overview?.answered_questions / questionStats.overview?.total_questions) * 100)
                              : 0}%
                          </div>
                          <Progress 
                            value={questionStats.overview?.total_questions > 0 
                              ? (questionStats.overview?.answered_questions / questionStats.overview?.total_questions) * 100
                              : 0
                            } 
                            className=\"mt-2\" 
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Charts */}
                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
                      {/* Pie Chart - Acertos vs Erros */}
                      <Card className=\"bg-zinc-900 border-zinc-800\">
                        <CardHeader>
                          <CardTitle>Desempenho Geral</CardTitle>
                          <CardDescription>Distribuição de acertos e erros</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {pieChartData.length > 0 ? (
                            <ResponsiveContainer width=\"100%\" height={300}>
                              <PieChart>
                                <Pie
                                  data={pieChartData}
                                  cx=\"50%\"
                                  cy=\"50%\"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill=\"#8884d8\"
                                  dataKey=\"value\"
                                >
                                  {pieChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                                  labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className=\"h-[300px] flex items-center justify-center text-zinc-400\">
                              Sem dados para exibir
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Bar Chart - Por Matéria */}
                      <Card className=\"bg-zinc-900 border-zinc-800\">
                        <CardHeader>
                          <CardTitle>Desempenho por Matéria</CardTitle>
                          <CardDescription>Acurácia em cada matéria</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {subjectChartData.length > 0 ? (
                            <ResponsiveContainer width=\"100%\" height={300}>
                              <BarChart data={subjectChartData}>
                                <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#27272a\" />
                                <XAxis 
                                  dataKey=\"name\" 
                                  stroke=\"#71717a\"
                                  angle={-45}
                                  textAnchor=\"end\"
                                  height={80}
                                />
                                <YAxis stroke=\"#71717a\" />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                                  labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey=\"acurácia\" fill=\"#10B981\" name=\"Acurácia %\" />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className=\"h-[300px] flex items-center justify-center text-zinc-400\">
                              Sem dados para exibir
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Line Chart - Progresso ao longo do tempo */}
                    <Card className=\"bg-zinc-900 border-zinc-800\">
                      <CardHeader>
                        <CardTitle>Progresso nos Últimos 7 Dias</CardTitle>
                        <CardDescription>Questões respondidas por dia</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {dailyProgressData.length > 0 ? (
                          <ResponsiveContainer width=\"100%\" height={300}>
                            <LineChart data={dailyProgressData}>
                              <CartesianGrid strokeDasharray=\"3 3\" stroke=\"#27272a\" />
                              <XAxis dataKey=\"date\" stroke=\"#71717a\" />
                              <YAxis stroke=\"#71717a\" />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                                labelStyle={{ color: '#fff' }}
                              />
                              <Legend />
                              <Line type=\"monotone\" dataKey=\"total\" stroke=\"#3B82F6\" name=\"Total\" />
                              <Line type=\"monotone\" dataKey=\"corretas\" stroke=\"#10B981\" name=\"Corretas\" />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className=\"h-[300px] flex items-center justify-center text-zinc-400\">
                            Sem dados para exibir
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Subject Details */}
                    <Card className=\"bg-zinc-900 border-zinc-800\">
                      <CardHeader>
                        <CardTitle>Detalhes por Matéria</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className=\"space-y-4\">
                          {Object.entries(questionStats.by_subject || {}).map(([subject, data]) => (
                            <div key={subject} className=\"bg-zinc-800 p-4 rounded-lg\">
                              <div className=\"flex items-center justify-between mb-2\">
                                <h4 className=\"font-semibold\">{subject}</h4>
                                <Badge className=\"bg-blue-600\">
                                  {data.accuracy}% acurácia
                                </Badge>
                              </div>
                              <div className=\"grid grid-cols-4 gap-4 text-sm text-zinc-400\">
                                <div>
                                  <p className=\"text-xs mb-1\">Total</p>
                                  <p className=\"text-white font-semibold\">{data.total_questions}</p>
                                </div>
                                <div>
                                  <p className=\"text-xs mb-1\">Respondidas</p>
                                  <p className=\"text-white font-semibold\">{data.answered}</p>
                                </div>
                                <div>
                                  <p className=\"text-xs mb-1\">Corretas</p>
                                  <p className=\"text-green-400 font-semibold\">{data.correct}</p>
                                </div>
                                <div>
                                  <p className=\"text-xs mb-1\">Tentativas</p>
                                  <p className=\"text-white font-semibold\">{data.attempts}</p>
                                </div>
                              </div>
                              <Progress 
                                value={(data.answered / data.total_questions) * 100} 
                                className=\"mt-3\" 
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {!questionStats && (
                  <Card className=\"bg-zinc-900 border-zinc-800\">
                    <CardContent className=\"py-12 text-center\">
                      <PieChartIcon className=\"w-12 h-12 text-zinc-600 mx-auto mb-4\" />
                      <p className=\"text-zinc-400\">Carregando estatísticas...</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
"
