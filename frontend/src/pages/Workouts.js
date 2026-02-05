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
import { Checkbox } from "@/components/ui/checkbox";
import { Dumbbell, Plus, Trash2, Play, Check, X, Timer, Flame, TrendingUp, Calendar, FileText, Activity, Edit2, ChevronDown, ChevronUp, Scale, Upload, Sparkles, Target, Ruler, BarChart3, RefreshCw } from "lucide-react";
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
  const [detailedStats, setDetailedStats] = useState(null);
  const [openLog, setOpenLog] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [openEditPlan, setOpenEditPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("log");
  const [expandedWorkouts, setExpandedWorkouts] = useState({});
  const [expandedPlans, setExpandedPlans] = useState({});
  const [dailyStatus, setDailyStatus] = useState({});
  const [motivationalQuote, setMotivationalQuote] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [latestMeasurement, setLatestMeasurement] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [openMeasurement, setOpenMeasurement] = useState(false);
  const [openCompleteWorkout, setOpenCompleteWorkout] = useState(false);
  const [completingPlan, setCompletingPlan] = useState(null);
  const [completeWorkoutData, setCompleteWorkoutData] = useState({ duration_minutes: 45, calories: null, notes: "" });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfAnalysis, setPdfAnalysis] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
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
  
  const [newMeasurement, setNewMeasurement] = useState({
    date: today,
    weight_kg: "",
    height_cm: "",
    body_fat_percentage: "",
    muscle_mass_kg: "",
    bone_mass_kg: "",
    water_percentage: "",
    visceral_fat: "",
    metabolic_age: "",
    bmr_kcal: "",
    neck_cm: "",
    shoulders_cm: "",
    chest_cm: "",
    waist_cm: "",
    abdomen_cm: "",
    hips_cm: "",
    left_arm_cm: "",
    right_arm_cm: "",
    left_forearm_cm: "",
    right_forearm_cm: "",
    left_thigh_cm: "",
    right_thigh_cm: "",
    left_calf_cm: "",
    right_calf_cm: "",
    notes: ""
  });

  const loadData = useCallback(async () => {
    try {
      const [userRes, workoutsRes, plansRes, statsRes, detailedStatsRes, measurementsRes, latestRes, quoteRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/workouts`, { withCredentials: true }),
        axios.get(`${API}/workout-plans`, { withCredentials: true }),
        axios.get(`${API}/workout-stats?period=week`, { withCredentials: true }),
        axios.get(`${API}/workout-stats/detailed`, { withCredentials: true }),
        axios.get(`${API}/body-measurements?limit=30`, { withCredentials: true }),
        axios.get(`${API}/body-measurements/latest`, { withCredentials: true }),
        axios.get(`${API}/motivational-quote`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setWorkouts(workoutsRes.data);
      setPlans(plansRes.data);
      setStats(statsRes.data);
      setDetailedStats(detailedStatsRes.data);
      setMeasurements(measurementsRes.data);
      setLatestMeasurement(latestRes.data);
      setMotivationalQuote(quoteRes.data);
      
      // Load daily status for each plan
      const statusPromises = plansRes.data.map(plan => 
        axios.get(`${API}/daily-workout-status/${plan.plan_id}`, { withCredentials: true })
          .then(res => ({ planId: plan.plan_id, status: res.data }))
          .catch(() => ({ planId: plan.plan_id, status: { exercises_status: {}, completed: false } }))
      );
      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(s => { statusMap[s.planId] = s.status; });
      setDailyStatus(statusMap);
      
    } catch (error) {
      console.error("Erro ao carregar dados");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshQuote = async () => {
    try {
      const res = await axios.get(`${API}/motivational-quote`, { withCredentials: true });
      setMotivationalQuote(res.data);
    } catch (error) {
      console.error("Erro ao atualizar frase");
    }
  };

  const getAiSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await axios.post(`${API}/workout-suggestions`, {}, { withCredentials: true });
      setAiSuggestions(res.data);
      toast.success("Sugestões geradas com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar sugestões. Tente novamente.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const toggleDailyExercise = async (planId, exerciseIdx) => {
    try {
      const res = await axios.post(`${API}/daily-workout-status/${planId}/toggle/${exerciseIdx}`, {}, { withCredentials: true });
      setDailyStatus(prev => ({ ...prev, [planId]: res.data }));
    } catch (error) {
      toast.error("Erro ao atualizar exercício");
    }
  };

  const resetDailyWorkout = async (planId) => {
    try {
      await axios.post(`${API}/daily-workout-status/${planId}/reset`, {}, { withCredentials: true });
      setDailyStatus(prev => ({ ...prev, [planId]: { exercises_status: {}, completed: false } }));
      toast.success("Treino do dia resetado");
    } catch (error) {
      toast.error("Erro ao resetar treino");
    }
  };

  const openCompleteDialog = (plan) => {
    const status = dailyStatus[plan.plan_id] || {};
    const completedCount = Object.values(status.exercises_status || {}).filter(Boolean).length;
    const estimatedDuration = Math.max(30, completedCount * 5 + 15);
    const estimatedCalories = Math.round(estimatedDuration * 6);
    
    setCompletingPlan(plan);
    setCompleteWorkoutData({
      duration_minutes: estimatedDuration,
      calories: estimatedCalories,
      notes: ""
    });
    setOpenCompleteWorkout(true);
  };

  const handleCompleteWorkout = async () => {
    if (!completingPlan) return;
    
    try {
      const res = await axios.post(
        `${API}/daily-workout-status/${completingPlan.plan_id}/complete`,
        completeWorkoutData,
        { withCredentials: true }
      );
      
      toast.success(`Treino concluído! +${res.data.xp_earned} XP (${res.data.exercises_completed_count}/${res.data.total_exercises} exercícios)`);
      setOpenCompleteWorkout(false);
      setCompletingPlan(null);
      
      // Reload data
      loadData();
    } catch (error) {
      toast.error("Erro ao concluir treino");
    }
  };

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
      loadData();
    } catch (error) {
      toast.error("Erro ao registrar treino");
    }
  };

  const handleToggleWorkout = async (logId) => {
    try {
      const res = await axios.patch(`${API}/workouts/${logId}/toggle`, {}, { withCredentials: true });
      toast.success(res.data.completed ? `+${res.data.xp_change} XP` : `${res.data.xp_change} XP`);
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar treino");
    }
  };

  const handleDeleteWorkout = async (logId) => {
    try {
      await axios.delete(`${API}/workouts/${logId}`, { withCredentials: true });
      toast.success("Treino deletado");
      loadData();
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
      loadData();
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
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar ficha");
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
      await axios.delete(`${API}/workout-plans/${planId}`, { withCredentials: true });
      toast.success("Ficha deletada");
      loadData();
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
  };

  const handleCreateMeasurement = async () => {
    try {
      const dataToSend = { ...newMeasurement };
      // Convert empty strings to null
      Object.keys(dataToSend).forEach(key => {
        if (dataToSend[key] === "") dataToSend[key] = null;
        else if (key !== "date" && key !== "notes" && key !== "source" && dataToSend[key]) {
          dataToSend[key] = parseFloat(dataToSend[key]);
        }
      });
      
      await axios.post(`${API}/body-measurements`, dataToSend, { withCredentials: true });
      toast.success("Medidas registradas!");
      setOpenMeasurement(false);
      setNewMeasurement({
        date: today, weight_kg: "", height_cm: "", body_fat_percentage: "", muscle_mass_kg: "",
        bone_mass_kg: "", water_percentage: "", visceral_fat: "", metabolic_age: "", bmr_kcal: "",
        neck_cm: "", shoulders_cm: "", chest_cm: "", waist_cm: "", abdomen_cm: "", hips_cm: "",
        left_arm_cm: "", right_arm_cm: "", left_forearm_cm: "", right_forearm_cm: "",
        left_thigh_cm: "", right_thigh_cm: "", left_calf_cm: "", right_calf_cm: "", notes: ""
      });
      loadData();
    } catch (error) {
      toast.error("Erro ao registrar medidas");
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingPdf(true);
    setPdfAnalysis(null);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await axios.post(`${API}/body-measurements/analyze-pdf`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setPdfAnalysis(res.data);
      
      if (res.data.extracted_data && !res.data.extracted_data.parse_error) {
        const data = res.data.extracted_data;
        setNewMeasurement(prev => ({
          ...prev,
          weight_kg: data.weight_kg || prev.weight_kg,
          height_cm: data.height_cm || prev.height_cm,
          body_fat_percentage: data.body_fat_percentage || prev.body_fat_percentage,
          muscle_mass_kg: data.muscle_mass_kg || prev.muscle_mass_kg,
          bone_mass_kg: data.bone_mass_kg || prev.bone_mass_kg,
          water_percentage: data.water_percentage || prev.water_percentage,
          visceral_fat: data.visceral_fat || prev.visceral_fat,
          metabolic_age: data.metabolic_age || prev.metabolic_age,
          bmr_kcal: data.bmr_kcal || prev.bmr_kcal,
          neck_cm: data.neck_cm || prev.neck_cm,
          shoulders_cm: data.shoulders_cm || prev.shoulders_cm,
          chest_cm: data.chest_cm || prev.chest_cm,
          waist_cm: data.waist_cm || prev.waist_cm,
          abdomen_cm: data.abdomen_cm || prev.abdomen_cm,
          hips_cm: data.hips_cm || prev.hips_cm,
          left_arm_cm: data.left_arm_cm || prev.left_arm_cm,
          right_arm_cm: data.right_arm_cm || prev.right_arm_cm,
          left_forearm_cm: data.left_forearm_cm || prev.left_forearm_cm,
          right_forearm_cm: data.right_forearm_cm || prev.right_forearm_cm,
          left_thigh_cm: data.left_thigh_cm || prev.left_thigh_cm,
          right_thigh_cm: data.right_thigh_cm || prev.right_thigh_cm,
          left_calf_cm: data.left_calf_cm || prev.left_calf_cm,
          right_calf_cm: data.right_calf_cm || prev.right_calf_cm,
          notes: data.notes || prev.notes,
          source: "pdf_import"
        }));
        toast.success("Dados extraídos do PDF com sucesso!");
      }
    } catch (error) {
      toast.error("Erro ao analisar PDF");
    } finally {
      setUploadingPdf(false);
    }
  };

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const res = await axios.get(`${API}/body-measurements/recommendations`, { withCredentials: true });
      setRecommendations(res.data);
    } catch (error) {
      toast.error("Erro ao carregar recomendações");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const getActivityIcon = (type) => ACTIVITY_TYPES.find(a => a.value === type)?.icon || "⚡";
  const getActivityLabel = (type) => ACTIVITY_TYPES.find(a => a.value === type)?.label || type;

  const getCompletedCount = (exercises) => {
    if (!exercises || exercises.length === 0) return { completed: 0, total: 0 };
    const completed = exercises.filter(ex => ex.completed).length;
    return { completed, total: exercises.length };
  };

  const getDailyCompletedCount = (planId, totalExercises) => {
    const status = dailyStatus[planId];
    if (!status) return { completed: 0, total: totalExercises };
    const completed = Object.values(status.exercises_status || {}).filter(Boolean).length;
    return { completed, total: totalExercises };
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
                {workout.calories && <span className="ml-2">🔥 {workout.calories} kcal</span>}
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
          {/* Motivational Quote */}
          {motivationalQuote && (
            <Card className="bg-gradient-to-r from-[#0A0A0A] to-[#1a1a2e] border-[#27272A] p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-[#00F0FF]" />
                  <p className="text-lg italic text-white">{motivationalQuote.quote}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={refreshQuote} className="text-[#A1A1AA]">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl mb-2" data-testid="workouts-title">ÁREA DE TREINOS</h1>
              <p className="text-[#A1A1AA]">Registre e acompanhe sua evolução física</p>
            </div>
            <div className="flex gap-2 flex-wrap">
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Duração (min)</Label>
                        <Input type="number" value={newWorkout.duration_minutes} onChange={(e) => setNewWorkout({...newWorkout, duration_minutes: parseInt(e.target.value) || 0})} className="bg-[#121212] border-[#27272A] text-white mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs uppercase tracking-wider">Data</Label>
                        <Input type="date" value={newWorkout.date} onChange={(e) => setNewWorkout({...newWorkout, date: e.target.value})} className="bg-[#121212] border-[#27272A] text-white mt-1" />
                      </div>
                    </div>
                    
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

          {/* Dialog de Conclusão de Treino */}
          <Dialog open={openCompleteWorkout} onOpenChange={setOpenCompleteWorkout}>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">CONCLUIR TREINO</DialogTitle>
              </DialogHeader>
              {completingPlan && (
                <div className="space-y-4 mt-4">
                  <p className="text-[#A1A1AA]">Confirme os dados do treino <span className="text-white font-semibold">{completingPlan.name}</span></p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Duração (min)</Label>
                      <Input 
                        type="number" 
                        value={completeWorkoutData.duration_minutes} 
                        onChange={(e) => setCompleteWorkoutData({...completeWorkoutData, duration_minutes: parseInt(e.target.value) || 0})}
                        className="bg-[#121212] border-[#27272A] text-white mt-1" 
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wider">Calorias (aprox)</Label>
                      <Input 
                        type="number" 
                        value={completeWorkoutData.calories || ""} 
                        onChange={(e) => setCompleteWorkoutData({...completeWorkoutData, calories: parseInt(e.target.value) || null})}
                        placeholder="Estimativa"
                        className="bg-[#121212] border-[#27272A] text-white mt-1" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Observações</Label>
                    <Textarea 
                      value={completeWorkoutData.notes} 
                      onChange={(e) => setCompleteWorkoutData({...completeWorkoutData, notes: e.target.value})}
                      placeholder="Como foi o treino?"
                      className="bg-[#121212] border-[#27272A] text-white mt-1" 
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={() => setOpenCompleteWorkout(false)} variant="outline" className="flex-1 border-[#27272A]">
                      Cancelar
                    </Button>
                    <Button onClick={handleCompleteWorkout} className="flex-1 bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                      <Check className="w-4 h-4 mr-2" /> Concluir Treino
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Stats Summary - Compact */}
          {stats && (
            <div className="flex items-center gap-6 p-4 bg-[#0A0A0A] border border-[#27272A] rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-[#00F0FF]" />
                <span className="text-xs text-[#A1A1AA] uppercase">Treinos</span>
                <span className="font-heading text-xl">{stats.total_workouts}</span>
              </div>
              <div className="h-6 w-px bg-[#27272A]" />
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-[#F59E0B]" />
                <span className="text-xs text-[#A1A1AA] uppercase">Min</span>
                <span className="font-heading text-xl">{stats.total_duration_minutes}</span>
              </div>
              <div className="h-6 w-px bg-[#27272A]" />
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#EF4444]" />
                <span className="text-xs text-[#A1A1AA] uppercase">Cal</span>
                <span className="font-heading text-xl">{stats.total_calories}</span>
              </div>
              <div className="h-6 w-px bg-[#27272A]" />
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#22C55E]" />
                <span className="text-xs text-[#A1A1AA] uppercase">XP</span>
                <span className="font-heading text-xl">{stats.total_xp_earned}</span>
              </div>
              {detailedStats && (
                <>
                  <div className="h-6 w-px bg-[#27272A]" />
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#F59E0B]" />
                    <span className="text-xs text-[#A1A1AA] uppercase">Streak</span>
                    <span className="font-heading text-xl text-[#F59E0B]">{detailedStats.current_streak}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-[#0A0A0A] border border-[#27272A] mb-6">
              <TabsTrigger value="log" className="data-[state=active]:bg-[#27272A]">
                <Activity className="w-4 h-4 mr-2" /> Hoje
              </TabsTrigger>
              <TabsTrigger value="plans" className="data-[state=active]:bg-[#27272A]">
                <FileText className="w-4 h-4 mr-2" /> Fichas
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-[#27272A]">
                <BarChart3 className="w-4 h-4 mr-2" /> Estatísticas
              </TabsTrigger>
              <TabsTrigger value="evolution" className="data-[state=active]:bg-[#27272A]">
                <Scale className="w-4 h-4 mr-2" /> Evolução
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
                    <p className="text-sm text-[#52525B] mt-2">Selecione uma ficha na aba "Fichas" ou clique em "Registrar Treino"</p>
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
                    const status = dailyStatus[plan.plan_id] || {};
                    const { completed, total } = getDailyCompletedCount(plan.plan_id, plan.exercises.length);
                    const isCompleted = status.completed;
                    
                    return (
                      <Card key={plan.plan_id} className={`bg-[#0A0A0A] border-[#27272A] p-4 ${isCompleted ? 'border-green-900 bg-[#0a1a0a]' : ''}`}>
                        <div 
                          className="cursor-pointer"
                          onClick={() => togglePlanExpanded(plan.plan_id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-heading text-lg">{plan.name}</h3>
                                {isCompleted && <Check className="w-5 h-5 text-green-500" />}
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
                                )}
                              </div>
                              {plan.description && <p className="text-sm text-[#A1A1AA]">{plan.description}</p>}
                              <p className="text-xs text-[#52525B] mt-1">
                                {plan.exercises.length} exercícios
                                {total > 0 && (
                                  <span className={`ml-2 ${isCompleted ? 'text-green-500' : 'text-[#00F0FF]'}`}>
                                    ({completed}/{total} hoje)
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
                        
                        {isExpanded && (
                          <div className="mt-4 border-t border-[#27272A] pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <Label className="text-xs uppercase tracking-wider text-[#A1A1AA]">Treino de Hoje</Label>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => resetDailyWorkout(plan.plan_id)}
                                className="text-xs text-[#A1A1AA] h-6 px-2"
                              >
                                Resetar
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {plan.exercises.map((ex, idx) => {
                                const isChecked = status.exercises_status?.[idx] || false;
                                return (
                                  <div 
                                    key={idx} 
                                    onClick={() => !isCompleted && toggleDailyExercise(plan.plan_id, idx)}
                                    className={`flex items-center gap-3 p-3 rounded cursor-pointer transition-all ${
                                      isChecked 
                                        ? 'bg-[#1a2f1a] border border-green-900' 
                                        : 'bg-[#121212] border border-[#27272A] hover:border-[#3f3f46]'
                                    } ${isCompleted ? 'cursor-default' : ''}`}
                                  >
                                    <Checkbox 
                                      checked={isChecked}
                                      disabled={isCompleted}
                                      onCheckedChange={() => !isCompleted && toggleDailyExercise(plan.plan_id, idx)}
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
                            
                            {!isCompleted && completed > 0 && (
                              <Button 
                                onClick={() => openCompleteDialog(plan)} 
                                className="w-full mt-4 bg-[#22C55E] hover:bg-[#16A34A] text-black"
                              >
                                <Check className="w-4 h-4 mr-2" /> Concluir Treino do Dia
                              </Button>
                            )}
                            
                            {isCompleted && (
                              <div className="mt-4 p-3 bg-[#1a2f1a] border border-green-900 rounded text-center">
                                <p className="text-green-400 font-semibold">✓ Treino concluído hoje!</p>
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

            {/* Stats Tab - Gráficos e IA */}
            <TabsContent value="stats">
              <div className="space-y-6">
                {/* Consistency - Better Design */}
                {detailedStats && (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-heading text-xl mb-1">CONSISTÊNCIA</h3>
                        <p className="text-sm text-[#A1A1AA]">Últimos 30 dias de treino</p>
                      </div>
                      <div className="text-right">
                        <span className="font-data text-4xl text-[#00F0FF]">{detailedStats.consistency_percentage}%</span>
                        <p className="text-xs text-[#A1A1AA]">{detailedStats.trained_days} de 30 dias</p>
                      </div>
                    </div>
                    
                    {/* Calendar-style grid - 6 weeks x 7 days */}
                    <div className="grid grid-cols-7 gap-2">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="text-center text-xs text-[#52525B] pb-2">{day}</div>
                      ))}
                      {detailedStats.daily_data?.map((day, idx) => {
                        const dayOfWeek = new Date(day.date).getDay();
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-lg flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${
                              day.count > 0 ? 'bg-[#00F0FF]' : 'bg-[#1a1a1a] border border-[#27272A]'
                            }`}
                            style={{
                              opacity: day.count > 0 ? Math.min(0.5 + (day.duration / 60) * 0.5, 1) : 1,
                              gridColumn: idx === 0 ? dayOfWeek + 1 : undefined
                            }}
                            title={`${day.date}: ${day.count > 0 ? `${day.duration}min, ${day.calories}cal` : 'Sem treino'}`}
                          >
                            {day.count > 0 && <Check className="w-4 h-4 text-black" />}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Stats Grid */}
                {detailedStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4 text-center">
                      <Flame className="w-8 h-8 text-[#F59E0B] mx-auto mb-2" />
                      <div className="font-data text-3xl text-[#F59E0B]">{detailedStats.current_streak}</div>
                      <div className="text-xs text-[#A1A1AA] uppercase">Streak Atual</div>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4 text-center">
                      <TrendingUp className="w-8 h-8 text-[#22C55E] mx-auto mb-2" />
                      <div className="font-data text-3xl text-[#22C55E]">{detailedStats.best_streak}</div>
                      <div className="text-xs text-[#A1A1AA] uppercase">Melhor Streak</div>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4 text-center">
                      <Timer className="w-8 h-8 text-[#A855F7] mx-auto mb-2" />
                      <div className="font-data text-3xl text-[#A855F7]">{detailedStats.avg_duration_minutes}</div>
                      <div className="text-xs text-[#A1A1AA] uppercase">Min/Treino</div>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4 text-center">
                      <Flame className="w-8 h-8 text-[#EF4444] mx-auto mb-2" />
                      <div className="font-data text-3xl text-[#EF4444]">{detailedStats.avg_calories || 0}</div>
                      <div className="text-xs text-[#A1A1AA] uppercase">Cal/Treino</div>
                    </Card>
                  </div>
                )}

                {/* AI Suggestions */}
                <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-heading text-xl mb-1 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#A855F7]" />
                        SUGESTÕES DE TREINO
                      </h3>
                      <p className="text-sm text-[#A1A1AA]">Recomendações personalizadas por IA</p>
                    </div>
                    <Button
                      onClick={getAiSuggestions}
                      disabled={loadingSuggestions}
                      className="bg-gradient-to-r from-[#A855F7] to-[#00F0FF] hover:opacity-90 text-white"
                    >
                      {loadingSuggestions ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {aiSuggestions ? (
                    <div className="mt-4">
                      <div className="bg-[#121212] rounded-lg p-4 border border-[#27272A]">
                        <p className="text-[#A1A1AA] whitespace-pre-wrap text-sm leading-relaxed">
                          {aiSuggestions.suggestions}
                        </p>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-xs text-[#52525B]">
                          Baseado em {aiSuggestions.based_on?.total_workouts || 0} treinos
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAiSuggestions(null)}
                          className="text-xs text-[#52525B] hover:text-white"
                        >
                          Limpar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#52525B] text-center py-4">
                      Clique em "Gerar" para receber sugestões personalizadas
                    </p>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="evolution">
              <div className="grid gap-6">
                {/* Header com botões */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="font-heading text-xl">EVOLUÇÃO CORPORAL</h2>
                    <p className="text-sm text-[#A1A1AA]">Acompanhe suas medidas e progresso</p>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={openMeasurement} onOpenChange={setOpenMeasurement}>
                      <DialogTrigger asChild>
                        <Button className="bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                          <Plus className="w-4 h-4 mr-2" /> Nova Medição
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-heading text-xl">REGISTRAR MEDIDAS</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                          {/* Upload PDF */}
                          <div className="border border-dashed border-[#27272A] rounded-lg p-4 text-center">
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={handlePdfUpload}
                              className="hidden"
                              id="pdf-upload"
                            />
                            <label htmlFor="pdf-upload" className="cursor-pointer">
                              <Upload className="w-8 h-8 text-[#00F0FF] mx-auto mb-2" />
                              <p className="text-sm text-[#A1A1AA]">
                                {uploadingPdf ? "Analisando PDF..." : "Clique para importar PDF de avaliação física"}
                              </p>
                            </label>
                            {pdfAnalysis?.extracted_data?.recommendations && (
                              <div className="mt-4 text-left bg-[#121212] p-3 rounded">
                                <p className="text-xs text-[#00F0FF] uppercase mb-2">Recomendações do PDF:</p>
                                <p className="text-sm text-[#A1A1AA]">{pdfAnalysis.extracted_data.recommendations.join(", ")}</p>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <Label className="text-xs uppercase tracking-wider">Data</Label>
                            <Input type="date" value={newMeasurement.date} onChange={(e) => setNewMeasurement({...newMeasurement, date: e.target.value})} className="bg-[#121212] border-[#27272A] text-white mt-1" />
                          </div>
                          
                          {/* Peso e Composição */}
                          <div>
                            <Label className="text-xs uppercase tracking-wider mb-3 block text-[#00F0FF]">Peso e Composição Corporal</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Peso (kg)</Label>
                                <Input type="number" step="0.1" value={newMeasurement.weight_kg} onChange={(e) => setNewMeasurement({...newMeasurement, weight_kg: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Altura (cm)</Label>
                                <Input type="number" step="0.1" value={newMeasurement.height_cm} onChange={(e) => setNewMeasurement({...newMeasurement, height_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Gordura (%)</Label>
                                <Input type="number" step="0.1" value={newMeasurement.body_fat_percentage} onChange={(e) => setNewMeasurement({...newMeasurement, body_fat_percentage: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Massa Musc. (kg)</Label>
                                <Input type="number" step="0.1" value={newMeasurement.muscle_mass_kg} onChange={(e) => setNewMeasurement({...newMeasurement, muscle_mass_kg: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Massa Óssea (kg)</Label>
                                <Input type="number" step="0.1" value={newMeasurement.bone_mass_kg} onChange={(e) => setNewMeasurement({...newMeasurement, bone_mass_kg: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Água (%)</Label>
                                <Input type="number" step="0.1" value={newMeasurement.water_percentage} onChange={(e) => setNewMeasurement({...newMeasurement, water_percentage: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Gord. Visceral</Label>
                                <Input type="number" value={newMeasurement.visceral_fat} onChange={(e) => setNewMeasurement({...newMeasurement, visceral_fat: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Idade Metab.</Label>
                                <Input type="number" value={newMeasurement.metabolic_age} onChange={(e) => setNewMeasurement({...newMeasurement, metabolic_age: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                            </div>
                          </div>
                          
                          {/* Medidas Corporais */}
                          <div>
                            <Label className="text-xs uppercase tracking-wider mb-3 block text-[#00F0FF]">Medidas Corporais (cm)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Pescoço</Label>
                                <Input type="number" step="0.1" value={newMeasurement.neck_cm} onChange={(e) => setNewMeasurement({...newMeasurement, neck_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Ombros</Label>
                                <Input type="number" step="0.1" value={newMeasurement.shoulders_cm} onChange={(e) => setNewMeasurement({...newMeasurement, shoulders_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Peito</Label>
                                <Input type="number" step="0.1" value={newMeasurement.chest_cm} onChange={(e) => setNewMeasurement({...newMeasurement, chest_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Cintura</Label>
                                <Input type="number" step="0.1" value={newMeasurement.waist_cm} onChange={(e) => setNewMeasurement({...newMeasurement, waist_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Abdômen</Label>
                                <Input type="number" step="0.1" value={newMeasurement.abdomen_cm} onChange={(e) => setNewMeasurement({...newMeasurement, abdomen_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Quadril</Label>
                                <Input type="number" step="0.1" value={newMeasurement.hips_cm} onChange={(e) => setNewMeasurement({...newMeasurement, hips_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Braço Esq.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.left_arm_cm} onChange={(e) => setNewMeasurement({...newMeasurement, left_arm_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Braço Dir.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.right_arm_cm} onChange={(e) => setNewMeasurement({...newMeasurement, right_arm_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Antebraço Esq.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.left_forearm_cm} onChange={(e) => setNewMeasurement({...newMeasurement, left_forearm_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Antebraço Dir.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.right_forearm_cm} onChange={(e) => setNewMeasurement({...newMeasurement, right_forearm_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Coxa Esq.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.left_thigh_cm} onChange={(e) => setNewMeasurement({...newMeasurement, left_thigh_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Coxa Dir.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.right_thigh_cm} onChange={(e) => setNewMeasurement({...newMeasurement, right_thigh_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Panturrilha Esq.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.left_calf_cm} onChange={(e) => setNewMeasurement({...newMeasurement, left_calf_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                              <div>
                                <Label className="text-xs text-[#A1A1AA]">Panturrilha Dir.</Label>
                                <Input type="number" step="0.1" value={newMeasurement.right_calf_cm} onChange={(e) => setNewMeasurement({...newMeasurement, right_calf_cm: e.target.value})} className="bg-[#121212] border-[#27272A] text-white" />
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs uppercase tracking-wider">Observações</Label>
                            <Textarea value={newMeasurement.notes} onChange={(e) => setNewMeasurement({...newMeasurement, notes: e.target.value})} placeholder="Notas adicionais..." className="bg-[#121212] border-[#27272A] text-white mt-1" />
                          </div>
                          
                          <Button onClick={handleCreateMeasurement} className="w-full bg-[#00F0FF] hover:bg-[#00D4E5] text-black">
                            Salvar Medidas
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Cards de Resumo */}
                {latestMeasurement && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                      <div className="flex items-center gap-3">
                        <Scale className="w-8 h-8 text-[#00F0FF]" />
                        <div>
                          <p className="text-xs text-[#A1A1AA] uppercase">Peso</p>
                          <p className="font-heading text-2xl">{latestMeasurement.weight_kg || "-"} kg</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                      <div className="flex items-center gap-3">
                        <Target className="w-8 h-8 text-[#F59E0B]" />
                        <div>
                          <p className="text-xs text-[#A1A1AA] uppercase">IMC</p>
                          <p className="font-heading text-2xl">{latestMeasurement.bmi || "-"}</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                      <div className="flex items-center gap-3">
                        <Flame className="w-8 h-8 text-[#EF4444]" />
                        <div>
                          <p className="text-xs text-[#A1A1AA] uppercase">Gordura</p>
                          <p className="font-heading text-2xl">{latestMeasurement.body_fat_percentage || "-"}%</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                      <div className="flex items-center gap-3">
                        <Ruler className="w-8 h-8 text-[#22C55E]" />
                        <div>
                          <p className="text-xs text-[#A1A1AA] uppercase">Cintura</p>
                          <p className="font-heading text-2xl">{latestMeasurement.waist_cm || "-"} cm</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Recomendações da IA */}
                <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#00F0FF]" />
                      <h3 className="font-heading text-lg">RECOMENDAÇÕES DA IA</h3>
                    </div>
                    <Button 
                      onClick={loadRecommendations} 
                      variant="outline" 
                      size="sm" 
                      className="border-[#27272A]"
                      disabled={loadingRecommendations}
                    >
                      {loadingRecommendations ? "Carregando..." : "Atualizar"}
                    </Button>
                  </div>
                  {recommendations ? (
                    <div className="prose prose-invert max-w-none">
                      <p className="text-[#A1A1AA] whitespace-pre-wrap">{recommendations.recommendations}</p>
                    </div>
                  ) : (
                    <p className="text-[#52525B]">Clique em "Atualizar" para receber recomendações personalizadas baseadas em suas medidas e treinos.</p>
                  )}
                </Card>

                {/* Histórico de Medidas */}
                <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                  <h3 className="font-heading text-lg mb-4">HISTÓRICO DE MEDIDAS</h3>
                  {measurements.length === 0 ? (
                    <p className="text-[#52525B] text-center py-4">Nenhuma medida registrada ainda</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#27272A]">
                            <th className="text-left p-2 text-[#A1A1AA]">Data</th>
                            <th className="text-right p-2 text-[#A1A1AA]">Peso</th>
                            <th className="text-right p-2 text-[#A1A1AA]">IMC</th>
                            <th className="text-right p-2 text-[#A1A1AA]">Gordura</th>
                            <th className="text-right p-2 text-[#A1A1AA]">Cintura</th>
                            <th className="text-right p-2 text-[#A1A1AA]">Fonte</th>
                          </tr>
                        </thead>
                        <tbody>
                          {measurements.slice(0, 10).map((m, idx) => (
                            <tr key={m.measurement_id || idx} className="border-b border-[#27272A]/50">
                              <td className="p-2">{m.date}</td>
                              <td className="text-right p-2">{m.weight_kg || "-"} kg</td>
                              <td className="text-right p-2">{m.bmi || "-"}</td>
                              <td className="text-right p-2">{m.body_fat_percentage || "-"}%</td>
                              <td className="text-right p-2">{m.waist_cm || "-"} cm</td>
                              <td className="text-right p-2 text-xs text-[#52525B]">{m.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
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
