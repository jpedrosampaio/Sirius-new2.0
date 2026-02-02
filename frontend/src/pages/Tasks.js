import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckSquare, Plus, Trash2, Circle, CheckCircle2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Tasks() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [open, setOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });

  useEffect(() => {
    fetchUser();
    fetchTasks();
  }, [selectedDate]);

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
      const res = await axios.get(`${API}/tasks?date=${selectedDate}`, { withCredentials: true });
      setTasks(res.data);
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
      setNewTask({ title: "", description: "", priority: "medium" });
      setOpen(false);
      fetchTasks();
      fetchUser();
    } catch (error) {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const res = await axios.patch(`${API}/tasks/${task.task_id}?completed=${!task.completed}`, {}, { withCredentials: true });
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

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl mb-2" data-testid="tasks-title">TAREFAS DIÁRIAS</h1>
              <p className="text-[#A1A1AA]">Execute com precisão</p>
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
                    <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Prioridade</Label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setNewTask({...newTask, priority: p})}
                          className={`flex-1 py-2 px-4 rounded-sm uppercase text-xs tracking-wider transition-colors ${
                            newTask.priority === p
                              ? 'bg-[#007AFF] text-white'
                              : 'bg-[#121212] text-[#A1A1AA] hover:bg-[#1C1C1E]'
                          }`}
                        >
                          {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button data-testid="task-submit-btn" onClick={handleCreateTask} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                    Criar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-6">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#0A0A0A] border-[#27272A] text-white font-mono max-w-full md:max-w-xs"
            />
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                <CheckSquare className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">Nenhuma tarefa para este dia</p>
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
        </div>
      </div>
    </div>
  );
}