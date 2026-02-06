import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Trash2, Circle, CheckCircle2, Calendar, Repeat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Tasks() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState("all");
  const [open, setOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", recurrence: "once" });

  useEffect(() => {
    fetchUser();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, activeTab]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchTasks = async () => {
    try {
      const url = activeTab === "all" 
        ? `${API}/tasks?date=${selectedDate}` 
        : `${API}/tasks?date=${selectedDate}&recurrence=${activeTab}`;
      const res = await axios.get(url, { withCredentials: true });
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error("Erro ao carregar tarefas");
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    try {
      await axios.post(`${API}/tasks`, { ...newTask, date: selectedDate }, { withCredentials: true });
      toast.success("Tarefa criada!");
      setNewTask({ title: "", description: "", priority: "medium", recurrence: "once" });
      setOpen(false);
      fetchTasks();
      fetchUser();
    } catch (error) {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const res = await axios.patch(`${API}/tasks/${task.task_id}?completed=${!task.completed}&date=${selectedDate}`, {}, { withCredentials: true });
      if (res.data.xp_earned) {
        toast.success(`+${res.data.xp_earned} XP! ${res.data.new_rank !== user?.rank ? `Novo rank: ${res.data.new_rank}!` : ''}`);
      }
      fetchTasks();
      fetchUser();
    } catch (error) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { withCredentials: true });
      toast.success("Tarefa deletada");
      fetchTasks();
    } catch (error) {
      toast.error("Erro ao deletar tarefa");
    }
  };

  const priorityColors = {
    low: "border-l-[#39FF14]",
    medium: "border-l-[#FF9500]",
    high: "border-l-[#FF3B30]"
  };

  const recurrenceLabels = {
    all: "Todas",
    once: "Única vez",
    daily: "Diárias",
    weekly: "Semanais",
    monthly: "Mensais"
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto pt-12 md:pt-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-4xl mb-1 md:mb-2" data-testid="tasks-title">TAREFAS</h1>
              <p className="text-[#A1A1AA] text-sm md:text-base">Execute com precisão</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="tasks-create-btn" className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest shadow-[0_0_10px_rgba(0,122,255,0.3)] w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">CRIAR TAREFA</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Título</Label>
                    <Input
                      data-testid="task-title-input"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      className="bg-[#121212] border-[#27272A] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Descrição</Label>
                    <Textarea
                      data-testid="task-description-input"
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      className="bg-[#121212] border-[#27272A] text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Recorrência</Label>
                    <Select value={newTask.recurrence} onValueChange={(v) => setNewTask({...newTask, recurrence: v})}>
                      <SelectTrigger className="bg-[#121212] border-[#27272A] text-white">
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
                  <div>
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Prioridade</Label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v})}>
                      <SelectTrigger className="bg-[#121212] border-[#27272A] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button data-testid="task-submit-btn" onClick={handleCreateTask} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                    Criar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Calendar className="w-5 h-5 text-[#007AFF]" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#0A0A0A] border-[#27272A] text-white font-mono flex-1 sm:flex-none"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#0A0A0A] border-[#27272A] mb-4 md:mb-6 w-full overflow-x-auto flex-nowrap">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#007AFF] text-xs md:text-sm">Todas</TabsTrigger>
              <TabsTrigger value="once" className="data-[state=active]:bg-[#007AFF] text-xs md:text-sm">Única</TabsTrigger>
              <TabsTrigger value="daily" className="data-[state=active]:bg-[#007AFF] text-xs md:text-sm">Diárias</TabsTrigger>
              <TabsTrigger value="weekly" className="data-[state=active]:bg-[#007AFF] text-xs md:text-sm">Semanais</TabsTrigger>
              <TabsTrigger value="monthly" className="data-[state=active]:bg-[#007AFF] text-xs md:text-sm">Mensais</TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                  <CheckSquare className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                  <p className="text-[#A1A1AA]">
                    {activeTab === "all" ? "Nenhuma tarefa para esta data" : `Nenhuma tarefa ${recurrenceLabels[activeTab].toLowerCase()}`}
                  </p>
                </Card>
              ) : (
                tasks.map((task) => (
                  <Card
                    key={task.task_id}
                    className={`task-item bg-[#0A0A0A] border-[#27272A] border-l-4 ${priorityColors[task.priority]} p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          data-testid={`task-toggle-${task.task_id}`}
                          onClick={() => handleToggleTask(task)}
                          className="mt-1"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-[#39FF14]" />
                          ) : (
                            <Circle className="w-6 h-6 text-[#52525B]" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h3 className={`font-medium mb-1 ${task.completed ? 'line-through text-[#52525B]' : ''}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-[#A1A1AA]">{task.description}</p>
                          )}
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-xs uppercase text-[#A1A1AA] tracking-wider">
                              {task.priority === 'low' ? 'Baixa' : task.priority === 'medium' ? 'Média' : 'Alta'}
                            </span>
                            {task.recurrence && (
                              <span className="text-xs flex items-center gap-1 text-[#A1A1AA]">
                                <Repeat className="w-3 h-3" />
                                {task.recurrence === 'once' ? 'Única' : task.recurrence === 'daily' ? 'Diária' : task.recurrence === 'weekly' ? 'Semanal' : 'Mensal'}
                              </span>
                            )}
                            <span className="font-data text-xs text-[#007AFF]">+{task.xp_reward} XP</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        data-testid={`task-delete-${task.task_id}`}
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="text-[#FF3B30] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Tabs>
        </div>
      </div>
      <MobileNav user={user} />
    </div>
  );
}
