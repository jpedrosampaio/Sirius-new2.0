import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Target, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Goals() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [open, setOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    target_date: "",
    sprint_duration: 60
  });

  useEffect(() => {
    fetchUser();
    fetchGoals();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await axios.get(`${API}/goals`, { withCredentials: true });
      setGoals(res.data);
    } catch (error) {
      toast.error("Erro ao carregar metas");
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim() || !newGoal.target_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    try {
      await axios.post(`${API}/goals`, newGoal, { withCredentials: true });
      toast.success("Meta criada!");
      setNewGoal({
        title: "",
        description: "",
        target_date: "",
        sprint_duration: 60
      });
      setOpen(false);
      fetchGoals();
    } catch (error) {
      toast.error("Erro ao criar meta");
    }
  };

  const handleUpdateProgress = async (goalId, progress) => {
    try {
      await axios.patch(`${API}/goals/${goalId}?progress=${progress}`, {}, { withCredentials: true });
      toast.success("Progresso atualizado!");
      fetchGoals();
    } catch (error) {
      toast.error("Erro ao atualizar progresso");
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await axios.delete(`${API}/goals/${goalId}`, { withCredentials: true });
      toast.success("Meta deletada");
      fetchGoals();
    } catch (error) {
      toast.error("Erro ao deletar meta");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-4xl mb-2" data-testid="goals-title">METAS & SPRINTS</h1>
              <p className="text-[#A1A1AA]">Defina objetivos, divida em sprints, conquiste resultados</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="goals-create-btn" className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest shadow-[0_0_10px_rgba(0,122,255,0.3)]">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">CRIAR META</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Título</Label>
                    <Input
                      data-testid="goal-title-input"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                      className="bg-[#121212] border-[#27272A] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Descrição</Label>
                    <Textarea
                      data-testid="goal-description-input"
                      value={newGoal.description}
                      onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                      className="bg-[#121212] border-[#27272A] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Data Alvo</Label>
                    <Input
                      data-testid="goal-target-date-input"
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                      className="bg-[#121212] border-[#27272A] text-white font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">
                      Duração do Sprint (dias): {newGoal.sprint_duration}
                    </Label>
                    <Slider
                      value={[newGoal.sprint_duration]}
                      onValueChange={(value) => setNewGoal({...newGoal, sprint_duration: value[0]})}
                      min={7}
                      max={90}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  <Button data-testid="goal-submit-btn" onClick={handleCreateGoal} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                    Criar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.length === 0 ? (
              <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center col-span-full">
                <Target className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">Nenhuma meta criada</p>
              </Card>
            ) : (
              goals.map((goal) => (
                <Card key={goal.goal_id} className="bg-[#0A0A0A] border-[#27272A] p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-heading text-2xl mb-2">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-sm text-[#A1A1AA] mb-3">{goal.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-[#A1A1AA]">
                        <span>Alvo: {goal.target_date}</span>
                        <span>Sprint: {goal.sprint_duration} dias</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGoal(goal.goal_id)}
                      className="text-[#52525B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#A1A1AA]">Progresso</span>
                      <span className="font-data text-lg text-[#007AFF]">{goal.progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#007AFF] transition-all"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <div className="pt-2">
                      <Label className="text-[#A1A1AA] text-xs mb-2 block">Atualizar Progresso</Label>
                      <div className="flex items-center space-x-3">
                        <Slider
                          value={[goal.progress]}
                          onValueChange={(value) => handleUpdateProgress(goal.goal_id, value[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}