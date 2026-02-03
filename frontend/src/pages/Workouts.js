import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dumbbell, Plus, Trash2, Play, Check, X, Timer, Flame, 
  TrendingUp, Calendar, FileText, Activity, Heart
} from "lucide-react";
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
  { value: "stretching", label: "Alongamento", icon: "🤸" },
  { value: "cardio", label: "Cardio", icon: "❤️" },
  { value: "crossfit", label: "CrossFit", icon: "🏋️" },
  { value: "martial_arts", label: "Artes Marciais", icon: "🥋" },
  { value: "other", label: "Outro", icon: "⚡" },
];

export default function Workouts() {
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [openLog, setOpenLog] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [activeTab, setActiveTab] = useState("log");
  const [statsPeriod, setStatsPeriod] = useState("week");
  
  const today = new Date().toISOString().split('T')[0];
  
  const [newWorkout, setNewWorkout] = useState({
    activity_type: "weightlifting",
    name: "",
    duration_minutes: 30,
    distance_km: null,
    calories: null,
    exercises_completed: [],
    notes: "",
    date: today,
    plan_id: null
  });
  
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    exercises: []
  });
  
  const [newExercise, setNewExercise] = useState({
    name: "",
    sets: 3,
    reps: 12,
    weight: "",
    notes: ""
  });

  useEffect(() => {
    fetchUser();
    fetchWorkouts();
    fetchPlans();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [statsPeriod]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchWorkouts = async () => {
    try {
      const res = await axios.get(`${API}/workouts`, { withCredentials: true });
      setWorkouts(res.data);
    } catch (error) {
      toast.error("Erro ao carregar treinos");
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API}/workout-plans`, { withCredentials: true });
      setPlans(res.data);
    } catch (error) {
      toast.error("Erro ao carregar fichas de treino");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/workout-stats?period=${statsPeriod}`, { withCredentials: true });
      setStats(res.data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas");
    }
  };

  const handleLogWorkout = async () => {
    if (!newWorkout.name.trim()) {
      toast.error("Nome do treino é obrigatório");
      return;
    }
    try {
      const res = await axios.post(`${API}/workouts`, newWorkout, { withCredentials: true });
      toast.success(`Treino registrado! +${res.data.xp_earned} XP`);
      setNewWorkout({
        activity_type: "weightlifting",
        name: "",
        duration_minutes: 30,
        distance_km: null,
        calories: null,
        exercises_completed: [],
        notes: "",
        date: today,
        plan_id: null
      });
      setOpenLog(false);
      fetchWorkouts();
      fetchStats();
      fetchUser();
    } catch (error) {
      toast.error("Erro ao registrar treino");
    }
  };

  const handleToggleWorkout = async (logId) => {
    try {
      const res = await axios.patch(`${API}/workouts/${logId}/toggle`, {}, { withCredentials: true });
      if (res.data.completed) {
        toast.success(`Treino remarcado! +${res.data.xp_change} XP`);
      } else {
        toast.info(`Treino desmarcado. ${res.data.xp_change} XP`);
      }
      fetchWorkouts();
      fetchStats();
      fetchUser();
    } catch (error) {
      toast.error("Erro ao atualizar treino");
    }
  };

  const handleDeleteWorkout = async (logId) => {
    try {
      await axios.delete(`${API}/workouts/${logId}`, { withCredentials: true });
      toast.success("Treino deletado");
      fetchWorkouts();
      fetchStats();
      fetchUser();
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
      fetchPlans();
    } catch (error) {
      toast.error("Erro ao criar ficha");
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await axios.delete(`${API}/workout-plans/${planId}`, { withCredentials: true });
      toast.success("Ficha deletada");
      fetchPlans();
    } catch (error) {
      toast.error("Erro ao deletar ficha");
    }
  };

  const addExerciseToPlan = () => {
    if (!newExercise.name.trim()) {
      toast.error("Nome do exercício é obrigatório");
      return;
    }
    setNewPlan({
      ...newPlan,
      exercises: [...newPlan.exercises, { ...newExercise }]
    });
    setNewExercise({ name: "", sets: 3, reps: 12, weight: "", notes: "" });
  };

  const removeExerciseFromPlan = (index) => {
    setNewPlan({
      ...newPlan,
      exercises: newPlan.exercises.filter((_, i) => i !== index)
    });
  };

  const startPlanWorkout = (plan) => {
    setNewWorkout({
      ...newWorkout,
      plan_id: plan.plan_id,
      name: plan.name,
      exercises_completed: plan.exercises.map(e => ({ ...e, completed: false }))
    });
    setOpenLog(true);
  };

  const getActivityIcon = (type) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity ? activity.icon : "⚡";
  };

  const getActivityLabel = (type) => {
    const activity = ACTIVITY_TYPES.find(a => a.value === type);
    return activity ? activity.label : type;
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl mb-2" data-testid="workouts-title">
                ÁREA DE TREINOS
              </h1>
              <p className="text-[#A1A1AA]">Registre e acompanhe sua evolução física</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={openLog} onOpenChange={setOpenLog}>
                <DialogTrigger asChild>
                  <Button data-testid="log-workout-btn" className="bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                    <Play className="w-4 h-4 mr-2" />
                    Registrar Treino
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl">REGISTRAR TREINO</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Tipo de Atividade</Label>
                      <Select 
                        value={newWorkout.activity_type} 
                        onValueChange={(v) => setNewWorkout({...newWorkout, activity_type: v})}
                      >
                        <SelectTrigger className="bg-[#121212] border-[#27272A] text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121212] border-[#27272A] text-white">
                          {ACTIVITY_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Nome do Treino</Label>
                      <Input
                        value={newWorkout.name}
                        onChange={(e) => setNewWorkout({...newWorkout, name: e.target.value})}
                        placeholder="Ex: Treino de Peito e Tríceps"
                        className="bg-[#121212] border-[#27272A] text-white mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Duração (min)</Label>
                        <Input
                          type="number"
                          value={newWorkout.duration_minutes}
                          onChange={(e) => setNewWorkout({...newWorkout, duration_minutes: parseInt(e.target.value) || 0})}
                          className="bg-[#121212] border-[#27272A] text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Calorias</Label>
                        <Input
                          type="number"
                          value={newWorkout.calories || ""}
                          onChange={(e) => setNewWorkout({...newWorkout, calories: parseInt(e.target.value) || null})}
                          placeholder="Opcional"
                          className="bg-[#121212] border-[#27272A] text-white mt-1"
                        />
                      </div>
                    </div>
                    
                    {(newWorkout.activity_type === "running" || newWorkout.activity_type === "cycling") && (
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Distância (km)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={newWorkout.distance_km || ""}
                          onChange={(e) => setNewWorkout({...newWorkout, distance_km: parseFloat(e.target.value) || null})}
                          className="bg-[#121212] border-[#27272A] text-white mt-1"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Data</Label>
                      <Input
                        type="date"
                        value={newWorkout.date}
                        onChange={(e) => setNewWorkout({...newWorkout, date: e.target.value})}
                        className="bg-[#121212] border-[#27272A] text-white mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Observações</Label>
                      <Textarea
                        value={newWorkout.notes}
                        onChange={(e) => setNewWorkout({...newWorkout, notes: e.target.value})}
                        placeholder="Como foi o treino?"
                        className="bg-[#121212] border-[#27272A] text-white mt-1"
                      />
                    </div>
                    
                    <Button onClick={handleLogWorkout} className="w-full bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                      Registrar Treino
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={openPlan} onOpenChange={setOpenPlan}>
                <DialogTrigger asChild>
                  <Button data-testid="create-plan-btn" variant="outline" className="border-[#27272A]">
                    <FileText className="w-4 h-4 mr-2" />
                    Nova Ficha
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl">CRIAR FICHA DE TREINO</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Nome da Ficha</Label>
                      <Input
                        value={newPlan.name}
                        onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                        placeholder="Ex: Treino A - Peito e Tríceps"
                        className="bg-[#121212] border-[#27272A] text-white mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Descrição</Label>
                      <Textarea
                        value={newPlan.description}
                        onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                        placeholder="Detalhes sobre o treino"
                        className="bg-[#121212] border-[#27272A] text-white mt-1"
                      />
                    </div>
                    
                    <div className="border-t border-[#27272A] pt-4">
                      <Label className="text-xs uppercase tracking-wider mb-2 block">Adicionar Exercício</Label>
                      <div className="space-y-2">
                        <Input
                          value={newExercise.name}
                          onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                          placeholder="Nome do exercício"
                          className="bg-[#121212] border-[#27272A] text-white"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            value={newExercise.sets}
                            onChange={(e) => setNewExercise({...newExercise, sets: parseInt(e.target.value) || 0})}
                            placeholder="Séries"
                            className="bg-[#121212] border-[#27272A] text-white"
                          />
                          <Input
                            type="number"
                            value={newExercise.reps}
                            onChange={(e) => setNewExercise({...newExercise, reps: parseInt(e.target.value) || 0})}
                            placeholder="Reps"
                            className="bg-[#121212] border-[#27272A] text-white"
                          />
                          <Input
                            value={newExercise.weight}
                            onChange={(e) => setNewExercise({...newExercise, weight: e.target.value})}
                            placeholder="Carga"
                            className="bg-[#121212] border-[#27272A] text-white"
                          />
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
                          <div key={idx} className="flex items-center justify-between bg-[#121212] p-3 rounded">
                            <span className="font-mono text-sm">
                              {ex.name} - {ex.sets}x{ex.reps} {ex.weight && `@ ${ex.weight}`}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeExerciseFromPlan(idx)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Button onClick={handleCreatePlan} className="w-full bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                      Criar Ficha
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
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
                    <p className="text-sm text-[#52525B] mt-1">Clique em "Registrar Treino" para começar</p>
                  </Card>
                ) : (
                  workouts.filter(w => w.date === today).map(workout => (
                    <Card key={workout.log_id} className={`bg-[#0A0A0A] border-[#27272A] p-4 ${!workout.completed && 'opacity-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{getActivityIcon(workout.activity_type)}</span>
                          <div>
                            <h3 className="font-heading text-lg">{workout.name}</h3>
                            <p className="text-sm text-[#A1A1AA]">
                              {getActivityLabel(workout.activity_type)} • {workout.duration_minutes} min
                              {workout.distance_km && ` • ${workout.distance_km} km`}
                              {workout.calories && ` • ${workout.calories} cal`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#00F0FF] font-mono text-sm">+{workout.xp_earned} XP</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleToggleWorkout(workout.log_id)}
                            className={workout.completed ? "text-green-500" : "text-gray-500"}
                          >
                            {workout.completed ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteWorkout(workout.log_id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
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
                    <p className="text-sm text-[#52525B] mt-1">Crie fichas para organizar seus treinos</p>
                  </Card>
                ) : (
                  plans.map(plan => (
                    <Card key={plan.plan_id} className="bg-[#0A0A0A] border-[#27272A] p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-heading text-lg">{plan.name}</h3>
                          {plan.description && (
                            <p className="text-sm text-[#A1A1AA]">{plan.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => startPlanWorkout(plan)}
                            className="text-[#00F0FF]"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeletePlan(plan.plan_id)}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {plan.exercises.map((ex, idx) => (
                          <div key={idx} className="bg-[#121212] p-2 rounded text-sm font-mono">
                            {ex.name} - {ex.sets}x{ex.reps} {ex.weight && `@ ${ex.weight}`}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#52525B] mt-3">{plan.exercises.length} exercícios</p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="mb-4">
                <Select value={statsPeriod} onValueChange={setStatsPeriod}>
                  <SelectTrigger className="w-40 bg-[#0A0A0A] border-[#27272A] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121212] border-[#27272A] text-white">
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="month">Último Mês</SelectItem>
                    <SelectItem value="year">Último Ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                {workouts.length === 0 ? (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                    <Calendar className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                    <p className="text-[#A1A1AA]">Nenhum treino no histórico</p>
                  </Card>
                ) : (
                  workouts.map(workout => (
                    <Card key={workout.log_id} className={`bg-[#0A0A0A] border-[#27272A] p-4 ${!workout.completed && 'opacity-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{getActivityIcon(workout.activity_type)}</span>
                          <div>
                            <h3 className="font-heading">{workout.name}</h3>
                            <p className="text-sm text-[#A1A1AA]">
                              {workout.date} • {workout.duration_minutes} min
                              {workout.distance_km && ` • ${workout.distance_km} km`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#00F0FF] font-mono text-sm">
                            {workout.completed ? '+' : ''}{workout.xp_earned} XP
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleToggleWorkout(workout.log_id)}
                          >
                            {workout.completed ? 
                              <Check className="w-4 h-4 text-green-500" /> : 
                              <X className="w-4 h-4 text-gray-500" />
                            }
                          </Button>
                        </div>
                      </div>
                    </Card>
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
