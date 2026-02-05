import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Plus, Trash2, Flame, CheckCircle2, BarChart3, Calendar, Bell, X } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Simple chart component for consistency
const ConsistencyChart = ({ completions, color }) => {
  const last30Days = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last30Days.push({
      date: dateStr,
      completed: completions.includes(dateStr),
      dayOfWeek: date.getDay()
    });
  }
  
  const completedCount = last30Days.filter(d => d.completed).length;
  const percentage = Math.round((completedCount / 30) * 100);
  
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#A1A1AA] uppercase tracking-wider">Últimos 30 dias</span>
        <span className="text-xs font-data" style={{ color }}>{percentage}% consistência</span>
      </div>
      <div className="grid grid-cols-15 gap-1">
        {last30Days.map((day, idx) => (
          <div
            key={idx}
            className="w-3 h-3 rounded-sm transition-all"
            style={{
              backgroundColor: day.completed ? color : '#27272A',
              opacity: day.completed ? 1 : 0.5
            }}
            title={`${day.date}: ${day.completed ? 'Completo' : 'Não feito'}`}
          />
        ))}
      </div>
    </div>
  );
};

// Streak visualization component
const StreakDisplay = ({ streak, bestStreak, color }) => {
  const streakBars = Math.min(streak, 30);
  
  return (
    <div className="flex items-center space-x-4 mb-4">
      <div className="flex items-center space-x-2">
        <Flame className="w-6 h-6" style={{ color: streak > 0 ? color : '#52525B' }} />
        <div>
          <span className="font-data text-2xl" style={{ color: streak > 0 ? color : '#A1A1AA' }}>{streak}</span>
          <span className="text-xs text-[#A1A1AA] ml-1">dias</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${(streakBars / 30) * 100}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs text-[#A1A1AA]">Recorde</span>
        <span className="font-data text-lg ml-2" style={{ color }}>{bestStreak}</span>
      </div>
    </div>
  );
};

export default function Habits() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [open, setOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderDays, setReminderDays] = useState(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
  const [newHabit, setNewHabit] = useState({ name: "", description: "", color: "#007AFF" });
  const [showStats, setShowStats] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const weekDays = [
    { key: "monday", label: "Seg" },
    { key: "tuesday", label: "Ter" },
    { key: "wednesday", label: "Qua" },
    { key: "thursday", label: "Qui" },
    { key: "friday", label: "Sex" },
    { key: "saturday", label: "Sáb" },
    { key: "sunday", label: "Dom" }
  ];

  useEffect(() => {
    fetchUser();
    fetchHabits();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchHabits = async () => {
    try {
      const res = await axios.get(`${API}/habits`, { withCredentials: true });
      setHabits(res.data);
    } catch (error) {
      toast.error("Erro ao carregar hábitos");
    }
  };

  const handleCreateHabit = async () => {
    if (!newHabit.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    try {
      await axios.post(`${API}/habits`, newHabit, { withCredentials: true });
      toast.success("Hábito criado!");
      setNewHabit({ name: "", description: "", color: "#007AFF" });
      setOpen(false);
      fetchHabits();
    } catch (error) {
      toast.error("Erro ao criar hábito");
    }
  };

  const handleCompleteHabit = async (habitId) => {
    try {
      const res = await axios.post(`${API}/habits/${habitId}/complete?date=${today}`, {}, { withCredentials: true });
      if (res.data.uncompleted) {
        toast.warning(`${res.data.xp_earned} XP! Hábito desmarcado`);
      } else if (res.data.xp_earned > 0) {
        toast.success(`+${res.data.xp_earned} XP! Sequência: ${res.data.streak} dias 🔥`);
      }
      fetchHabits();
      fetchUser();
    } catch (error) {
      toast.error("Erro ao atualizar hábito");
    }
  };

  const handleSetReminder = async () => {
    if (!selectedHabit) return;
    
    try {
      await axios.post(`${API}/notifications`, {
        title: `Lembrete: ${selectedHabit.name}`,
        message: `Não esqueça de completar seu hábito "${selectedHabit.name}"!`,
        type: "reminder",
        category: "habit",
        scheduled_time: reminderTime,
        repeat: "custom",
        repeat_days: reminderDays,
        channels: ["in_app", "browser"]
      }, { withCredentials: true });
      
      toast.success("Lembrete configurado!");
      setReminderOpen(false);
      setSelectedHabit(null);
    } catch (error) {
      toast.error("Erro ao configurar lembrete");
    }
  };

  const toggleReminderDay = (day) => {
    if (reminderDays.includes(day)) {
      setReminderDays(reminderDays.filter(d => d !== day));
    } else {
      setReminderDays([...reminderDays, day]);
    }
  };

  const openReminderDialog = (habit) => {
    setSelectedHabit(habit);
    setReminderOpen(true);
  };

  // Calculate overall stats
  const totalCompletions = habits.reduce((acc, h) => acc + h.completions.length, 0);
  const avgStreak = habits.length > 0 ? Math.round(habits.reduce((acc, h) => acc + h.streak, 0) / habits.length) : 0;
  const bestOverallStreak = habits.length > 0 ? Math.max(...habits.map(h => h.best_streak)) : 0;

  const handleDeleteHabit = async (habitId) => {
    try {
      await axios.delete(`${API}/habits/${habitId}`, { withCredentials: true });
      toast.success("Hábito deletado");
      fetchHabits();
    } catch (error) {
      toast.error("Erro ao deletar hábito");
    }
  };

  const colors = ["#007AFF", "#39FF14", "#FF9500", "#FF3B30", "#00F0FF", "#FFD700", "#FF00FF"];

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-4xl mb-2" data-testid="habits-title">HÁBITOS</h1>
              <p className="text-[#A1A1AA]">Construa sequências inquebráveis</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowStats(!showStats)}
                className="border-[#27272A] text-[#A1A1AA] hover:text-white uppercase text-xs tracking-widest"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showStats ? 'Ocultar Stats' : 'Mostrar Stats'}
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="habits-create-btn" className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest shadow-[0_0_10px_rgba(0,122,255,0.3)]">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Hábito
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-2xl">CRIAR HÁBITO</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Nome</Label>
                      <Input
                        data-testid="habit-name-input"
                        value={newHabit.name}
                        onChange={(e) => setNewHabit({...newHabit, name: e.target.value})}
                        className="bg-[#121212] border-[#27272A] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Descrição</Label>
                      <Textarea
                        data-testid="habit-description-input"
                        value={newHabit.description}
                        onChange={(e) => setNewHabit({...newHabit, description: e.target.value})}
                        className="bg-[#121212] border-[#27272A] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Cor</Label>
                      <div className="flex space-x-2">
                        {colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewHabit({...newHabit, color})}
                            className={`w-8 h-8 rounded-full border-2 ${newHabit.color === color ? 'border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <Button data-testid="habit-submit-btn" onClick={handleCreateHabit} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                      Criar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Overview */}
          {showStats && habits.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Total Hábitos</div>
                <div className="font-data text-3xl text-[#007AFF]">{habits.length}</div>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Completações</div>
                <div className="font-data text-3xl text-[#39FF14]">{totalCompletions}</div>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Média Streak</div>
                <div className="font-data text-3xl text-[#FF9500]">{avgStreak} dias</div>
              </Card>
              <Card className="bg-[#0A0A0A] border-[#27272A] p-4">
                <div className="text-xs text-[#A1A1AA] uppercase tracking-wider mb-1">Melhor Streak</div>
                <div className="font-data text-3xl text-[#FF3B30]">{bestOverallStreak} dias</div>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {habits.length === 0 ? (
              <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center col-span-full">
                <TrendingUp className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">Nenhum hábito criado</p>
              </Card>
            ) : (
              habits.map((habit) => {
                const completedToday = habit.completions.includes(today);
                return (
                  <Card
                    key={habit.habit_id}
                    className="habit-card bg-[#0A0A0A] border-[#27272A] p-6 relative overflow-hidden"
                    style={{ borderTopColor: habit.color, borderTopWidth: '3px' }}
                  >
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openReminderDialog(habit)}
                        className="text-[#52525B] hover:text-[#007AFF] hover:bg-[#007AFF]/10"
                        title="Configurar lembrete"
                      >
                        <Bell className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteHabit(habit.habit_id)}
                        className="text-[#52525B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <h3 className="font-heading text-xl mb-2">{habit.name}</h3>
                    {habit.description && (
                      <p className="text-sm text-[#A1A1AA] mb-4">{habit.description}</p>
                    )}
                    
                    {/* Streak Display */}
                    <StreakDisplay 
                      streak={habit.streak} 
                      bestStreak={habit.best_streak} 
                      color={habit.color} 
                    />
                    
                    {/* Consistency Chart */}
                    {showStats && (
                      <ConsistencyChart 
                        completions={habit.completions} 
                        color={habit.color} 
                      />
                    )}
                    
                    <Button
                      data-testid={`habit-complete-${habit.habit_id}`}
                      onClick={() => handleCompleteHabit(habit.habit_id)}
                      className={`w-full mt-4 uppercase text-xs tracking-widest transition-all ${
                        completedToday
                          ? 'bg-[#39FF14]/20 text-[#39FF14] hover:bg-[#FF3B30]/20 hover:text-[#FF3B30]'
                          : 'bg-[#007AFF] hover:bg-[#0062CC]'
                      }`}
                    >
                      {completedToday ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Concluído (clique para desmarcar)
                        </>
                      ) : (
                        'Marcar Hoje'
                      )}
                    </Button>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Reminder Dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl flex items-center">
              <Bell className="w-6 h-6 mr-2 text-[#007AFF]" />
              CONFIGURAR LEMBRETE
            </DialogTitle>
          </DialogHeader>
          {selectedHabit && (
            <div className="space-y-6 mt-4">
              <div>
                <p className="text-[#A1A1AA] mb-2">Hábito: <span className="text-white">{selectedHabit.name}</span></p>
              </div>
              
              <div>
                <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Horário</Label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="bg-[#121212] border-[#27272A] text-white"
                />
              </div>
              
              <div>
                <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.key}
                      onClick={() => toggleReminderDay(day.key)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        reminderDays.includes(day.key)
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#3F3F46]'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={handleSetReminder} 
                className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest"
              >
                Salvar Lembrete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
