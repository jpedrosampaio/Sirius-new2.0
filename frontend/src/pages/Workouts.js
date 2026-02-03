import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dumbbell, Plus, Trash2, Play, Check, X, Timer, Flame, TrendingUp, Calendar, FileText, Activity, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ACTIVITY_TYPES = [
  { value: "weightlifting", label: "Musculação", icon: "💪" },
  { value: "running", label: "Corrida", icon: "🏃" },
  { value: "cycling", label: "Ciclismo", icon: "🚴" },
  { value: "swimming", label: "Natação", icon: "🏊" },
  { value: "yoga", label: "Yoga", icon: "🧘" },
  { value: "hiit", label: "HIIT", icon: "🔥" },
  { value: "other", label: "Outro", icon: "⚡" },
];

export default function Workouts() {
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [openLog, setOpenLog] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [openEditPlan, setOpenEditPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("log");
  const [expandedWorkouts, setExpandedWorkouts] = useState({});
  const [expandedPlans, setExpandedPlans] = useState({});
  const [planExerciseStatus, setPlanExerciseStatus] = useState({});
  const today = new Date().toISOString().split('T')[0];
  
  const [newWorkout, setNewWorkout] = useState({
    activity_type: "weightlifting",
    name: "",
    duration_minutes: 30,
    notes: "",
    date: today,
    plan_id: null,
    exercises_completed: []
  });
  
  const [newPlan, setNewPlan] = useState({ name: "", description: "", exercises: [] });
  const [newExercise, setNewExercise] = useState({ name: "", sets: 3, reps: 12, weight: "" });
  const [editExercise, setEditExercise] = useState({ name: "", sets: 3, reps: 12, weight: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, workoutsRes, plansRes, statsRes] = await Promise.all([
          axios.get(`${API}/auth/me`, { withCredentials: true }),
          axios.get(`${API}/workouts`, { withCredentials: true }),
          axios.get(`${API}/workout-plans`, { withCredentials: true }),
          axios.get(`${API}/workout-stats?period=week`, { withCredentials: true })
        ]);
        setUser(userRes.data);
        setWorkouts(workoutsRes.data);
        setPlans(plansRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error("Erro ao carregar dados");
      }
    };
    load();
  }, []);

  // Ao selecionar uma ficha, preencher exercícios
  const handleSelectPlan = (planId) => {
    const plan = plans.find(p => p.plan_id === planId);
    if (plan) {
      setNewWorkout({
        ...newWorkout,
        plan_id: planId,
        name: plan.name,
        exercises_completed: plan.exercises.map(ex => ({
          ...ex,
          completed: false
        }))
      });
    } else {
      setNewWorkout({
        ...newWorkout,
        plan_id: null,
        exercises_completed: []
      });
    }
  };

  const toggleExerciseInNewWorkout = (index) => {
    const updated = [...newWorkout.exercises_completed];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setNewWorkout({ ...newWorkout, exercises_completed: updated });
  };

  const handleLogWorkout = async () => {
    if (!newWorkout.name.trim()) {
      toast.error("Nome do treino é obrigatório");
      return;
    }
    try {
      const res = await axios.post(`${API}/workouts`, newWorkout, { withCredentials: true });
      toast.success(`Treino registrado! +${res.data.xp_earned} XP`);
      setNewWorkout({ activity_type: "weightlifting", name: "", duration_minutes: 30, notes: "", date: today, plan_id: null, exercises_completed: [] });
      setOpenLog(false);
      const [workoutsRes, statsRes, userRes] = await Promise.all([
        axios.get(`${API}/workouts`, { withCredentials: true }),
        axios.get(`${API}/workout-stats?period=week`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true })
      ]);
      setWorkouts(workoutsRes.data);
      setStats(statsRes.data);
      setUser(userRes.data);
    } catch (error) {
      toast.error("Erro ao registrar treino");
    }
  };

  const handleToggleWorkout = async (logId) => {
    try {
      const res = await axios.patch(`${API}/workouts/${logId}/toggle`, {}, { withCredentials: true });
      toast.success(res.data.completed ? `+${res.data.xp_change} XP` : `${res.data.xp_change} XP`);
      const [workoutsRes, userRes] = await Promise.all([
        axios.get(`${API}/workouts`, { withCredentials: true }),
        axios.get(`${API}/auth/me`, { withCredentials: true })
      ]);
      setWorkouts(workoutsRes.data);
      setUser(userRes.data);
    } catch (error) {
      toast.error("Erro ao atualizar treino");
    }
  };

  const handleDeleteWorkout = async (logId) => {
    try {
      await axios.delete(`${API}/workouts/${logId}`, { withCredentials: true });
      toast.success("Treino deletado");
      const workoutsRes = await axios.get(`${API}/workouts`, { withCredentials: true });
      setWorkouts(workoutsRes.data);
    } catch (error) {
      toast.error("Erro ao deletar treino");
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name.trim()) {
      toast.error("Nome da ficha é obrigatório");
      return;
    }
    try {
      await axios.post(`${API}/workout-plans`, newPlan, { withCredentials: true });
      toast.success("Ficha de treino criada!");
      setNewPlan({ name: "", description: "", exercises: [] });
      setOpenPlan(false);
      const plansRes = await axios.get(`${API}/workout-plans`, { withCredentials: true });
      setPlans(plansRes.data);
    } catch (error) {
      toast.error("Erro ao criar ficha");
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan || !editingPlan.name.trim()) {
      toast.error("Nome da ficha é obrigatório");
      return;
    }
    try {
      await axios.patch(`${API}/workout-plans/${editingPlan.plan_id}`, {
        name: editingPlan.name,
        description: editingPlan.description,
        exercises: editingPlan.exercises
      }, { withCredentials: true });
      toast.success("Ficha atualizada!");
      setOpenEditPlan(false);
      setEditingPlan(null);
      const plansRes = await axios.get(`${API}/workout-plans`, { withCredentials: true });
      setPlans(plansRes.data);
    } catch (error) {
      toast.error("Erro ao atualizar ficha");
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await axios.delete(`${API}/workout-plans/${planId}`, { withCredentials: true });
      toast.success("Ficha deletada");
      const plansRes = await axios.get(`${API}/workout-plans`, { withCredentials: true });
      setPlans(plansRes.data);
    } catch (error) {
      toast.error("Erro ao deletar ficha");
    }
  };

  const openEditDialog = (plan) => {
    setEditingPlan({ ...plan });
    setEditExercise({ name: "", sets: 3, reps: 12, weight: "" });
    setOpenEditPlan(true);
  };

  const addExerciseToPlan = () => {
    if (!newExercise.name.trim()) return;
    setNewPlan({ ...newPlan, exercises: [...newPlan.exercises, { ...newExercise }] });
    setNewExercise({ name: "", sets: 3, reps: 12, weight: "" });
  };

  const removeExerciseFromPlan = (index) => {
    setNewPlan({ ...newPlan, exercises: newPlan.exercises.filter((_, i) => i !== index) });
  };

  const addExerciseToEditPlan = () => {
    if (!editExercise.name.trim()) return;
    setEditingPlan({ ...editingPlan, exercises: [...editingPlan.exercises, { ...editExercise }] });
    setEditExercise({ name: "", sets: 3, reps: 12, weight: "" });
  };

  const removeExerciseFromEditPlan = (index) => {
    setEditingPlan({ ...editingPlan, exercises: editingPlan.exercises.filter((_, i) => i !== index) });
  };

  const updateExerciseInEditPlan = (index, field, value) => {
    const updated = [...editingPlan.exercises];
    updated[index] = { ...updated[index], [field]: field === 'sets' || field === 'reps' ? parseInt(value) || 0 : value };
    setEditingPlan({ ...editingPlan, exercises: updated });
  };

  const toggleWorkoutExpanded = (logId) => {
    setExpandedWorkouts(prev => ({ ...prev, [logId]: !prev[logId] }));
  };

  const togglePlanExpanded = (planId) => {
    setExpandedPlans(prev => ({ ...prev, [planId]: !prev[planId] }));
    // Inicializa o status dos exercícios se ainda não existir
    if (!planExerciseStatus[planId]) {
      const plan = plans.find(p => p.plan_id === planId);
      if (plan) {
        const initialStatus = {};
        plan.exercises.forEach((_, idx) => {
          initialStatus[idx] = false;
        });
        setPlanExerciseStatus(prev => ({ ...prev, [planId]: initialStatus }));
      }
    }
  };

  const togglePlanExercise = (planId, exerciseIdx) => {
    setPlanExerciseStatus(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [exerciseIdx]: !prev[planId]?.[exerciseIdx]
      }
    }));
  };

  const resetPlanExercises = (planId) => {
    const plan = plans.find(p => p.plan_id === planId);
    if (plan) {
      const resetStatus = {};
      plan.exercises.forEach((_, idx) => {
        resetStatus[idx] = false;
      });
      setPlanExerciseStatus(prev => ({ ...prev, [planId]: resetStatus }));
    }
  };

  const markAllPlanExercises = (planId, value) => {
    const plan = plans.find(p => p.plan_id === planId);
    if (plan) {
      const newStatus = {};
      plan.exercises.forEach((_, idx) => {
        newStatus[idx] = value;
      });
      setPlanExerciseStatus(prev => ({ ...prev, [planId]: newStatus }));
    }
  };

  const getPlanCompletedCount = (planId) => {
    const status = planExerciseStatus[planId];
    if (!status) return { completed: 0, total: 0 };
    const plan = plans.find(p => p.plan_id === planId);
    if (!plan) return { completed: 0, total: 0 };
    const completed = Object.values(status).filter(v => v).length;
    return { completed, total: plan.exercises.length };
  };

  const getActivityIcon = (type) => ACTIVITY_TYPES.find(a => a.value === type)?.icon || "⚡";
  const getActivityLabel = (type) => ACTIVITY_TYPES.find(a => a.value === type)?.label || type;

  const getCompletedCount = (exercises) => {
    if (!exercises || exercises.length === 0) return { completed: 0, total: 0 };
    const completed = exercises.filter(ex => ex.completed).length;
    return { completed, total: exercises.length };
  };

  const WorkoutCard = ({ workout, showDate = false }) => {
    const isExpanded = expandedWorkouts[workout.log_id];
    const hasExercises = workout.exercises_completed && workout.exercises_completed.length > 0;
    const { completed: completedExercises, total: totalExercises } = getCompletedCount(workout.exercises_completed);

    return (
      <Card key={workout.log_id} className={`bg-[#0A0A0A] border-[#27272A] p-4 ${!workout.completed ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <span className="text-3xl">{getActivityIcon(workout.activity_type)}</span>
            <div className="flex-1">
              <h3 className="font-heading text-lg">{workout.name}</h3>
              <p className="text-sm text-[#A1A1AA]">
                {showDate ? `${workout.date} - ` : ''}{getActivityLabel(workout.activity_type)} - {workout.duration_minutes} min
                {hasExercises && (
                  <span className="ml-2 text-[#00F0FF]">
                    ({completedExercises}/{totalExercises} exercícios)
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#00F0FF] font-mono text-sm">{workout.completed ? '+' : ''}{workout.xp_earned} XP</span>
            {hasExercises && (
              <Button variant="ghost" size="sm" onClick={() => toggleWorkoutExpanded(workout.log_id)} className="text-[#A1A1AA]">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => handleToggleWorkout(workout.log_id)} className={workout.completed ? "text-green-500" : "text-gray-500"}>
              {workout.completed ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteWorkout(workout.log_id)} className="text-red-500">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {hasExercises && isExpanded && (
          <div className="mt-4 border-t border-[#27272A] pt-4 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-[#A1A1AA]">Exercícios do Treino</Label>
            {workout.exercises_completed.map((ex, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-2 rounded ${ex.completed ? 'bg-[#121212]' : 'bg-[#0A0A0A] border border-[#27272A]'}`}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${ex.completed ? 'bg-[#00F0FF] border-[#00F0FF]' : 'border-[#52525B]'}`}>
                  {ex.completed && <Check className="w-3 h-3 text-black" />}
                </div>
                <span className={`font-mono text-sm flex-1 ${ex.completed ? 'text-white' : 'text-[#A1A1AA]'}`}>
                  {ex.name} - {ex.sets}x{ex.reps} {ex.weight && `@ ${ex.weight}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl mb-2" data-testid="workouts-title">ÁREA DE TREINOS</h1>
              <p className="text-[#A1A1AA]">Registre e acompanhe sua evolução física</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={openLog} onOpenChange={setOpenLog}>
                <DialogTrigger asChild>
                  <Button data-testid="log-workout-btn" className="bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                    <Play className="w-4 h-4 mr-2" /> Registrar Treino
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl">REGISTRAR TREINO</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {/* Seletor de Ficha */}
                    {plans.length > 0 && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Usar Ficha de Treino</Label>
                        <Select value={newWorkout.plan_id || "none"} onValueChange={(v) => handleSelectPlan(v === "none" ? null : v)}>
                          <SelectTrigger className="bg-[#121212] border-[#27272A] text-white mt-1">
                            <SelectValue placeholder="Selecione uma ficha (opcional)" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#121212] border-[#27272A] text-white">
                            <SelectItem value="none">Treino Livre</SelectItem>
                            {plans.map(plan => (
                              <SelectItem key={plan.plan_id} value={plan.plan_id}>{plan.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Tipo de Atividade</Label>
                      <Select value={newWorkout.activity_type} onValueChange={(v) => setNewWorkout({...newWorkout, activity_type: v})}>
                        <SelectTrigger className="bg-[#121212] border-[#27272A] text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121212] border-[#27272A] text-white">
                          {ACTIVITY_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.icon} {type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Nome do Treino</Label>
                      <Input value={newWorkout.name} onChange={(e) => setNewWorkout({...newWorkout, name: e.target.value})} placeholder="Ex: Treino de Peito" className="bg-[#121212] border-[#27272A] text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Duração (min)</Label>
                      <Input type="number" value={newWorkout.duration_minutes} onChange={(e) => setNewWorkout({...newWorkout, duration_minutes: parseInt(e.target.value) || 0})} className="bg-[#121212] border-[#27272A] text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Data</Label>
                      <Input type="date" value={newWorkout.date} onChange={(e) => setNewWorkout({...newWorkout, date: e.target.value})} className="bg-[#121212] border-[#27272A] text-white mt-1" />
                    </div>
                    
                    {/* Lista de Exercícios com Checkboxes */}
                    {newWorkout.exercises_completed.length > 0 && (
                      <div className="border-t border-[#27272A] pt-4">
                        <Label className="text-xs uppercase tracking-wider mb-3 block">Marque os exercícios realizados</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {newWorkout.exercises_completed.map((ex, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => toggleExerciseInNewWorkout(idx)}
                              className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-colors ${ex.completed ? 'bg-[#1a2f1a] border border-green-900' : 'bg-[#121212] border border-[#27272A] hover:border-[#3f3f46]'}`}
                            >
                              <Checkbox 
                                checked={ex.completed} 
                                onCheckedChange={() => toggleExerciseInNewWorkout(idx)}
                                className="border-[#52525B] data-[state=checked]:bg-[#00F0FF] data-[state=checked]:border-[#00F0FF]"
                              />
                              <span className={`font-mono text-sm ${ex.completed ? 'text-green-400' : 'text-white'}`}>
                                {ex.name} - {ex.sets}x{ex.reps} {ex.weight && `@ ${ex.weight}`}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-2">
                          {newWorkout.exercises_completed.filter(e => e.completed).length} de {newWorkout.exercises_completed.length} exercícios marcados
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Observações</Label>
                      <Textarea value={newWorkout.notes} onChange={(e) => setNewWorkout({...newWorkout, notes: e.target.value})} placeholder="Como foi o treino?" className="bg-[#121212] border-[#27272A] text-white mt-1" />
                    </div>
                    <Button onClick={handleLogWorkout} className="w-full bg-[#00F0FF] hover:bg-[#00D4E5] text-black">Registrar Treino</Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={openPlan} onOpenChange={setOpenPlan}>
                <DialogTrigger asChild>
                  <Button data-testid="create-plan-btn" variant="outline" className="border-[#27272A]">
                    <FileText className="w-4 h-4 mr-2" /> Nova Ficha
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl">CRIAR FICHA DE TREINO</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Nome da Ficha</Label>
                      <Input value={newPlan.name} onChange={(e) => setNewPlan({...newPlan, name: e.target.value})} placeholder="Ex: Treino A - Peito e Tríceps" className="bg-[#121212] border-[#27272A] text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Descrição</Label>
                      <Textarea value={newPlan.description} onChange={(e) => setNewPlan({...newPlan, description: e.target.value})} className="bg-[#121212] border-[#27272A] text-white mt-1" />
                    </div>
                    <div className="border-t border-[#27272A] pt-4">
                      <Label className="text-xs uppercase tracking-wider mb-2 block">Adicionar Exercício</Label>
                      <div className="space-y-2">
                        <Input value={newExercise.name} onChange={(e) => setNewExercise({...newExercise, name: e.target.value})} placeholder="Nome do exercício" className="bg-[#121212] border-[#27272A] text-white" />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs text-[#A1A1AA]">Séries</Label>
                            <Input type="number" value={newExercise.sets} onChange={(e) => setNewExercise({...newExercise, sets: parseInt(e.target.value) || 0})} className="bg-[#121212] border-[#27272A] text-white" />
                          </div>
                          <div>
                            <Label className="text-xs text-[#A1A1AA]">Reps</Label>
                            <Input type="number" value={newExercise.reps} onChange={(e) => setNewExercise({...newExercise, reps: parseInt(e.target.value) || 0})} className="bg-[#121212] border-[#27272A] text-white" />
                          </div>
                          <div>
                            <Label className="text-xs text-[#A1A1AA]">Carga</Label>
                            <Input value={newExercise.weight} onChange={(e) => setNewExercise({...newExercise, weight: e.target.value})} placeholder="Ex: 20kg" className="bg-[#121212] border-[#27272A] text-white" />
                          </div>
                        </div>
                        <Button onClick={addExerciseToPlan} variant="outline" className="w-full border-[#27272A]">
                          <Plus className="w-4 h-4 mr-2" /> Adicionar Exercício
                        </Button>
                      </div>
                    </div>
                    {newPlan.exercises.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider">Exercícios na Ficha</Label>
                        {newPlan.exercises.map((ex, idx) => (
                          <div key={idx} className="bg-[#121212] p-3 rounded flex items-center justify-between">
                            <span className="text-sm font-mono">
                              {ex.name} - {ex.sets}x{ex.reps} {ex.weight && `@ ${ex.weight}`}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => removeExerciseFromPlan(idx)} className="text-red-500 h-8 w-8 p-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button onClick={handleCreatePlan} className="w-full bg-[#00F0FF] hover:bg-[#00D4E5] text-black">Criar Ficha</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Dialog de Edição de Ficha */}
          <Dialog open={openEditPlan} onOpenChange={setOpenEditPlan}>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">EDITAR FICHA DE TREINO</DialogTitle>
              </DialogHeader>
              {editingPlan && (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Nome da Ficha</Label>
                    <Input 
                      value={editingPlan.name} 
                      onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})} 
                      className="bg-[#121212] border-[#27272A] text-white mt-1" 
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Descrição</Label>
                    <Textarea 
                      value={editingPlan.description || ""} 
                      onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})} 
                      className="bg-[#121212] border-[#27272A] text-white mt-1" 
                    />
                  </div>
                  
                  {/* Exercícios Existentes - Editáveis */}
                  {editingPlan.exercises.length > 0 && (
                    <div className="border-t border-[#27272A] pt-4">
                      <Label className="text-xs uppercase tracking-wider mb-3 block">Exercícios da Ficha</Label>
                      <div className="space-y-3">
                        {editingPlan.exercises.map((ex, idx) => (
                          <div key={idx} className="bg-[#121212] p-3 rounded border border-[#27272A]">
                            <div className="flex items-center justify-between mb-2">
                              <Input 
                                value={ex.name} 
                                onChange={(e) => updateExerciseInEditPlan(idx, 'name', e.target.value)}
                                className="bg-[#0A0A0A] border-[#27272A] text-white flex-1 mr-2"
                                placeholder="Nome do exercício"
                              />
                              <Button variant="ghost" size="sm" onClick={() => removeExerciseFromEditPlan(idx)} className="text-red-500 h-8 w-8 p-0">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Séries</Label>
                                <Input 
                                  type="number" 
                                  value={ex.sets} 
                                  onChange={(e) => updateExerciseInEditPlan(idx, 'sets', e.target.value)}
                                  className="bg-[#0A0A0A] border-[#27272A] text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Reps</Label>
                                <Input 
                                  type="number" 
                                  value={ex.reps} 
                                  onChange={(e) => updateExerciseInEditPlan(idx, 'reps', e.target.value)}
                                  className="bg-[#0A0A0A] border-[#27272A] text-white"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Carga</Label>
                                <Input 
                                  value={ex.weight || ""} 
                                  onChange={(e) => updateExerciseInEditPlan(idx, 'weight', e.target.value)}
                                  placeholder="Ex: 20kg"
                                  className="bg-[#0A0A0A] border-[#27272A] text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Adicionar Novo Exercício */}
                  <div className="border-t border-[#27272A] pt-4">
                    <Label className="text-xs uppercase tracking-wider mb-2 block">Adicionar Novo Exercício</Label>
                    <div className="space-y-2">
                      <Input 
                        value={editExercise.name} 
                        onChange={(e) => setEditExercise({...editExercise, name: e.target.value})} 
                        placeholder="Nome do exercício" 
                        className="bg-[#121212] border-[#27272A] text-white" 
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-[#A1A1AA]">Séries</Label>
                          <Input 
                            type="number" 
                            value={editExercise.sets} 
                            onChange={(e) => setEditExercise({...editExercise, sets: parseInt(e.target.value) || 0})} 
                            className="bg-[#121212] border-[#27272A] text-white" 
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#A1A1AA]">Reps</Label>
                          <Input 
                            type="number" 
                            value={editExercise.reps} 
                            onChange={(e) => setEditExercise({...editExercise, reps: parseInt(e.target.value) || 0})} 
                            className="bg-[#121212] border-[#27272A] text-white" 
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[#A1A1AA]">Carga</Label>
                          <Input 
                            value={editExercise.weight} 
                            onChange={(e) => setEditExercise({...editExercise, weight: e.target.value})} 
                            placeholder="Ex: 20kg"
                            className="bg-[#121212] border-[#27272A] text-white" 
                          />
                        </div>
                      </div>
                      <Button onClick={addExerciseToEditPlan} variant="outline" className="w-full border-[#27272A]">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Exercício
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={() => setOpenEditPlan(false)} variant="outline" className="flex-1 border-[#27272A]">
                      Cancelar
                    </Button>
                    <Button onClick={handleUpdatePlan} className="flex-1 bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-8 h-8 text-[#00F0FF]" />
                  <div>
                    <p className="text-xs text-[#A1A1AA] uppercase">Treinos</p>
                    <p className="font-heading text-2xl">{stats.total_workouts}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="flex items-center gap-3">
                  <Timer className="w-8 h-8 text-[#F59E0B]" />
                  <div>
                    <p className="text-xs text-[#A1A1AA] uppercase">Minutos</p>
                    <p className="font-heading text-2xl">{stats.total_duration_minutes}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="flex items-center gap-3">
                  <Flame className="w-8 h-8 text-[#EF4444]" />
                  <div>
                    <p className="text-xs text-[#A1A1AA] uppercase">Calorias</p>
                    <p className="font-heading text-2xl">{stats.total_calories}</p>
                  </div>
                </div>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-[#22C55E]" />
                  <div>
                    <p className="text-xs text-[#A1A1AA] uppercase">XP Ganho</p>
                    <p className="font-heading text-2xl">{stats.total_xp_earned}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#0A0A0A] border border-[#27272A] mb-6">
              <TabsTrigger value="log" className="data-[state=active]:bg-[#27272A]">
                <Activity className="w-4 h-4 mr-2" /> Registro
              </TabsTrigger>
              <TabsTrigger value="plans" className="data-[state=active]:bg-[#27272A]">
                <FileText className="w-4 h-4 mr-2" /> Fichas
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#27272A]">
                <Calendar className="w-4 h-4 mr-2" /> Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="log">
              <div className="grid gap-4">
                {workouts.filter(w => w.date === today).length === 0 ? (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                    <Dumbbell className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                    <p className="text-[#A1A1AA]">Nenhum treino registrado hoje</p>
                    <p className="text-sm text-[#52525B] mt-2">Clique em "Registrar Treino" para começar</p>
                  </Card>
                ) : (
                  workouts.filter(w => w.date === today).map(workout => (
                    <WorkoutCard key={workout.log_id} workout={workout} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="plans">
              <div className="grid md:grid-cols-2 gap-4">
                {plans.length === 0 ? (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center md:col-span-2">
                    <FileText className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                    <p className="text-[#A1A1AA]">Nenhuma ficha de treino criada</p>
                    <p className="text-sm text-[#52525B] mt-2">Clique em "Nova Ficha" para criar uma</p>
                  </Card>
                ) : (
                  plans.map(plan => {
                    const isExpanded = expandedPlans[plan.plan_id];
                    const { completed, total } = getPlanCompletedCount(plan.plan_id);
                    const exerciseStatus = planExerciseStatus[plan.plan_id] || {};
                    
                    return (
                      <Card key={plan.plan_id} className="bg-[#0A0A0A] border-[#27272A] p-4">
                        {/* Cabeçalho clicável */}
                        <div 
                          className="cursor-pointer"
                          onClick={() => togglePlanExpanded(plan.plan_id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-heading text-lg">{plan.name}</h3>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
                                )}
                              </div>
                              {plan.description && <p className="text-sm text-[#A1A1AA]">{plan.description}</p>}
                              <p className="text-xs text-[#52525B] mt-1">
                                {plan.exercises.length} exercícios
                                {isExpanded && total > 0 && (
                                  <span className="ml-2 text-[#00F0FF]">
                                    ({completed}/{total} marcados)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(plan)} className="text-[#00F0FF] h-8 w-8 p-0">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.plan_id)} className="text-red-500 h-8 w-8 p-0">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Lista de exercícios com checkboxes - só aparece quando expandido */}
                        {isExpanded && (
                          <div className="mt-4 border-t border-[#27272A] pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <Label className="text-xs uppercase tracking-wider text-[#A1A1AA]">Exercícios</Label>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => markAllPlanExercises(plan.plan_id, true)}
                                  className="text-xs text-[#00F0FF] h-6 px-2"
                                >
                                  Marcar Todos
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => resetPlanExercises(plan.plan_id)}
                                  className="text-xs text-[#A1A1AA] h-6 px-2"
                                >
                                  Limpar
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {plan.exercises.map((ex, idx) => {
                                const isChecked = exerciseStatus[idx] || false;
                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => togglePlanExercise(plan.plan_id, idx)}
                                    className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all ${
                                      isChecked 
                                        ? 'bg-[#1a2f1a] border border-green-900' 
                                        : 'bg-[#121212] border border-[#27272A] hover:border-[#3f3f46]'
                                    }`}
                                  >
                                    <Checkbox 
                                      checked={isChecked}
                                      onCheckedChange={() => togglePlanExercise(plan.plan_id, idx)}
                                      className="border-[#52525B] data-[state=checked]:bg-[#00F0FF] data-[state=checked]:border-[#00F0FF]"
                                    />
                                    <span className="text-[#52525B] font-mono text-sm">{idx + 1}.</span>
                                    <span className={`font-mono text-sm flex-1 ${isChecked ? 'text-green-400 line-through' : 'text-white'}`}>
                                      {ex.name} - {ex.sets}x{ex.reps} {ex.weight && `@ ${ex.weight}`}
                                    </span>
                                    {isChecked && <Check className="w-4 h-4 text-green-500" />}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Barra de progresso */}
                            {total > 0 && (
                              <div className="mt-4">
                                <div className="flex justify-between text-xs text-[#A1A1AA] mb-1">
                                  <span>Progresso</span>
                                  <span>{Math.round((completed / total) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-[#121212] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#00F0FF] to-[#22C55E] transition-all duration-300"
                                    style={{ width: `${(completed / total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                {workouts.length === 0 ? (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                    <Calendar className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                    <p className="text-[#A1A1AA]">Nenhum treino no histórico</p>
                  </Card>
                ) : (
                  workouts.map(workout => (
                    <WorkoutCard key={workout.log_id} workout={workout} showDate={true} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
