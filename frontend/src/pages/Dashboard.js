import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckSquare, TrendingUp, DollarSign, Target, Award, Zap, Dumbbell, Utensils, BookOpen, Droplets, Flame, Clock, Brain } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, statsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/stats/dashboard`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const getNextRank = () => {
    const ranks = [
      { name: "Recruta", xp: 0 },
      { name: "Soldado", xp: 100 },
      { name: "Cabo", xp: 300 },
      { name: "Sargento", xp: 600 },
      { name: "Tenente", xp: 1000 },
      { name: "Capitão", xp: 1500 },
      { name: "Major", xp: 2200 },
      { name: "Coronel", xp: 3000 },
      { name: "General", xp: 4000 }
    ];
    
    if (!user) return { name: "Soldado", xp: 100, progress: 0 };
    
    for (let i = 0; i < ranks.length; i++) {
      if ((user.rank || 'Recruta') === ranks[i].name) {
        if (i === ranks.length - 1) return { name: "Máximo", xp: ranks[i].xp, progress: 100 };
        const next = ranks[i + 1];
        const current = ranks[i];
        const progress = (((user.xp ?? 0) - current.xp) / (next.xp - current.xp)) * 100;
        return { name: next.name, xp: next.xp, progress };
      }
    }
    return { name: "Soldado", xp: 100, progress: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007AFF]"></div>
      </div>
    );
  }

  const nextRank = getNextRank();

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8 pt-12 md:pt-0">
            <h1 className="font-heading text-2xl md:text-4xl mb-2" data-testid="dashboard-title">CENTRO DE COMANDO</h1>
            <p className="text-[#A1A1AA] text-sm md:text-base">Visão geral das operações</p>
          </div>

          {stats && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                <Card className="bg-[#0A0A0A] border-[#27272A] p-4 md:p-6">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <CheckSquare className="w-6 h-6 md:w-8 md:h-8 text-[#007AFF]" />
                    <span className="font-data text-lg md:text-2xl">{stats.tasks_completed_today ?? 0}/{stats.tasks_today ?? 0}</span>
                  </div>
                  <p className="text-[#A1A1AA] uppercase text-[10px] md:text-xs tracking-wider">Tarefas</p>
                </Card>

                <Card className="bg-[#0A0A0A] border-[#27272A] p-4 md:p-6">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-[#39FF14]" />
                    <span className="font-data text-lg md:text-2xl">{stats.habits_completed_today ?? 0}/{stats.habits_total ?? 0}</span>
                  </div>
                  <p className="text-[#A1A1AA] uppercase text-[10px] md:text-xs tracking-wider">Hábitos</p>
                </Card>

                <Card className="bg-[#0A0A0A] border-[#27272A] p-4 md:p-6">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-[#FF9500]" />
                    <span className="font-data text-lg md:text-2xl">R$ {(stats.balance ?? 0).toFixed(0)}</span>
                  </div>
                  <p className="text-[#A1A1AA] uppercase text-[10px] md:text-xs tracking-wider">Saldo</p>
                </Card>

                <Card className="bg-[#0A0A0A] border-[#27272A] p-4 md:p-6">
                  <div className="flex items-center justify-between mb-2 md:mb-4">
                    <Target className="w-6 h-6 md:w-8 md:h-8 text-[#00F0FF]" />
                    <span className="font-data text-lg md:text-2xl">{(stats.goals_avg_progress ?? 0).toFixed(0)}%</span>
                  </div>
                  <p className="text-[#A1A1AA] uppercase text-[10px] md:text-xs tracking-wider">Metas</p>
                </Card>
              </div>

              {/* Treino, Nutrição e Estudos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                {/* Card de Treino */}
                <Card className="bg-[#0A0A0A] border-[#27272A] p-4 md:p-6">
                  <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                    <Dumbbell className="w-8 h-8 md:w-10 md:h-10 text-[#FF6B6B]" />
                    <div>
                      <p className="text-sm text-[#A1A1AA] uppercase tracking-wider mb-1">Treinos</p>
                      <p className="font-heading text-2xl">Esta Semana</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Flame className="w-4 h-4" /> Sessões
                      </span>
                      <span className="font-data text-[#FF6B6B]">{stats.workout_stats?.workouts_this_week || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Duração
                      </span>
                      <span className="font-data">{stats.workout_stats?.total_duration_minutes || 0} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Flame className="w-4 h-4" /> Calorias
                      </span>
                      <span className="font-data text-[#FF9500]">{stats.workout_stats?.total_calories_burned || 0} kcal</span>
                    </div>
                  </div>
                </Card>

                {/* Card de Nutrição */}
                <Card className="bg-[#0A0A0A] border-[#27272A] p-4 md:p-6">
                  <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                    <Utensils className="w-8 h-8 md:w-10 md:h-10 text-[#4ECDC4]" />
                    <div>
                      <p className="text-sm text-[#A1A1AA] uppercase tracking-wider mb-1">Nutrição</p>
                      <p className="font-heading text-2xl">Hoje</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#A1A1AA] text-sm">Calorias</span>
                        <span className="font-data text-sm">
                          {stats.nutrition_stats?.calories_consumed || 0} / {stats.nutrition_stats?.calories_goal || 2000}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(((stats.nutrition_stats?.calories_consumed || 0) / (stats.nutrition_stats?.calories_goal || 2000)) * 100, 100)} 
                        className="h-2" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#A1A1AA] text-sm flex items-center gap-1">
                          <Droplets className="w-3 h-3" /> Água
                        </span>
                        <span className="font-data text-sm text-[#00B4D8]">
                          {((stats.nutrition_stats?.water_consumed_ml || 0) / 1000).toFixed(1)}L / {((stats.nutrition_stats?.water_goal_ml || 2000) / 1000).toFixed(1)}L
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(((stats.nutrition_stats?.water_consumed_ml || 0) / (stats.nutrition_stats?.water_goal_ml || 2000)) * 100, 100)} 
                        className="h-2 [&>div]:bg-[#00B4D8]" 
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[#A1A1AA]">Refeições</span>
                      <span className="font-data">{stats.nutrition_stats?.meals_count || 0}</span>
                    </div>
                  </div>
                </Card>

                {/* Card de Estudos */}
                <Card className="bg-[#0A0A0A] border-[#27272A] p-4 md:p-6">
                  <div className="flex items-center space-x-3 md:space-x-4 mb-3 md:mb-4">
                    <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-[#A78BFA]" />
                    <div>
                      <p className="text-sm text-[#A1A1AA] uppercase tracking-wider mb-1">Estudos</p>
                      <p className="font-heading text-2xl">Progresso</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Hoje
                      </span>
                      <span className="font-data">{stats.study_stats?.study_time_today_minutes || 0} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Flame className="w-4 h-4" /> Streak
                      </span>
                      <span className="font-data text-[#FFD700]">{stats.study_stats?.current_streak || 0} dias</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA] flex items-center gap-2">
                        <Brain className="w-4 h-4" /> Flashcards
                      </span>
                      <span className={`font-data ${(stats.study_stats?.flashcards_due || 0) > 0 ? 'text-[#FF9500]' : 'text-[#39FF14]'}`}>
                        {stats.study_stats?.flashcards_due || 0} pendentes
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Award className="w-10 h-10 text-[#FFD700]" />
                    <div className="flex-1">
                      <p className="text-sm text-[#A1A1AA] uppercase tracking-wider mb-1">Rank Atual</p>
                      <p className="font-heading text-3xl">{user?.rank || 'Recruta'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-data text-2xl">{user?.xp ?? 0}</p>
                      <p className="text-xs text-[#A1A1AA]">XP</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#A1A1AA]">Próximo: {nextRank.name}</span>
                      <span className="font-data text-[#A1A1AA]">{nextRank.xp} XP</span>
                    </div>
                    <Progress value={nextRank.progress} className="h-2" />
                  </div>
                </Card>

                <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Zap className="w-10 h-10 text-[#007AFF]" />
                    <div>
                      <p className="text-sm text-[#A1A1AA] uppercase tracking-wider mb-1">Resumo Financeiro</p>
                      <p className="font-heading text-2xl">Mês Atual</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA]">Receitas</span>
                      <span className="font-data text-[#39FF14]">+R$ {(stats.income ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#A1A1AA]">Despesas</span>
                      <span className="font-data text-[#FF3B30]">-R$ {(stats.expenses ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-[#27272A] pt-3 flex justify-between items-center">
                      <span className="font-medium">Saldo</span>
                      <span className={`font-data text-lg ${(stats.balance ?? 0) >= 0 ? 'text-[#39FF14]' : 'text-[#FF3B30]'}`}>
                        R$ {(stats.balance ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
      <MobileNav user={user} />
    </div>
  );
}