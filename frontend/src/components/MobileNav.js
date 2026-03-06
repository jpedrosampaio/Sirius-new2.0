import { useNavigate, useLocation } from "react-router-dom";
import { Home, CheckSquare, TrendingUp, DollarSign, MessageSquare, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Target, Dumbbell, Apple, BookOpen, Bell, FileText, User, LogOut } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { clearToken } from "@/lib/api";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MobileNav({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      clearToken();
      toast.success("Logout realizado");
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      clearToken();
      navigate('/login');
    }
  };

  const mainItems = [
    { icon: Home, label: "Início", path: "/dashboard" },
    { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
    { icon: TrendingUp, label: "Hábitos", path: "/habits" },
    { icon: DollarSign, label: "Finanças", path: "/finance" },
    { icon: MessageSquare, label: "Assistente", path: "/chat" },
  ];

  const moreItems = [
    { icon: Dumbbell, label: "Treinos", path: "/workouts" },
    { icon: Apple, label: "Alimentação", path: "/nutrition" },
    { icon: BookOpen, label: "Estudos", path: "/studies" },
    { icon: Target, label: "Metas", path: "/goals" },
    { icon: Bell, label: "Notificações", path: "/notifications" },
    { icon: FileText, label: "Relatórios", path: "/reports" },
    { icon: User, label: "Perfil", path: "/profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#27272A] z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-[#007AFF]"
                  : "text-[#A1A1AA]"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#007AFF]' : ''}`} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
        
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center py-2 px-3 rounded-lg text-[#A1A1AA]">
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-[#0A0A0A] border-t border-[#27272A] rounded-t-2xl">
            <div className="py-4">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMoreOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-[#007AFF]/20 text-[#007AFF]"
                          : "text-[#A1A1AA] hover:bg-[#121212]"
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-1" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {user && (
                <div className="border-t border-[#27272A] pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center">
                        <span className="font-bold text-white">
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name || 'Usuário'}</p>
                        <div className="flex items-center space-x-2">
                          <span className="bg-[#007AFF] text-white px-1.5 py-0.5 rounded-sm text-[10px]">
                            {user.rank || 'Recruta'}
                          </span>
                          <span className="text-xs text-[#A1A1AA]">{user.xp ?? 0} XP</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-[#A1A1AA] hover:text-white"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
