import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Plus, Trash2, Flame, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Habits() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [open, setOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", description: "", color: "#007AFF" });
  const today = new Date().toISOString().split('T')[0];

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
      if (res.data.xp_earned) {
        toast.success(`+${res.data.xp_earned} XP! Sequência: ${res.data.streak} dias`);
      } else {
        toast.info(res.data.message);
      }
      fetchHabits();
      fetchUser();
    } catch (error) {
      toast.error("Erro ao completar hábito");
    }
  };

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
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-4xl mb-2" data-testid="habits-title">HÁBITOS</h1>
              <p className="text-[#A1A1AA]">Construa sequências inquebráveis</p>
            </div>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteHabit(habit.habit_id)}
                      className="absolute top-2 right-2 text-[#52525B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    <h3 className="font-heading text-xl mb-2">{habit.name}</h3>
                    {habit.description && (
                      <p className="text-sm text-[#A1A1AA] mb-4">{habit.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="flex items-center space-x-1">
                        <Flame className="w-5 h-5" style={{ color: habit.color }} />
                        <span className="font-data text-lg">{habit.streak}</span>
                      </div>
                      <span className="text-xs text-[#A1A1AA]">dias</span>
                      <div className="flex-1 text-right text-xs text-[#A1A1AA]">
                        Melhor: {habit.best_streak} dias
                      </div>
                    </div>
                    
                    <Button
                      data-testid={`habit-complete-${habit.habit_id}`}
                      onClick={() => handleCompleteHabit(habit.habit_id)}
                      disabled={completedToday}
                      className={`w-full uppercase text-xs tracking-widest ${
                        completedToday
                          ? 'bg-[#39FF14]/20 text-[#39FF14] cursor-not-allowed'
                          : 'bg-[#007AFF] hover:bg-[#0062CC]'
                      }`}
                    >
                      {completedToday ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Concluído Hoje
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
    </div>
  );
}
