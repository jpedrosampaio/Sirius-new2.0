import { useNavigate, useLocation } from "react-router-dom";
import { Home, CheckSquare, TrendingUp, DollarSign, Target, MessageSquare, FileText, User, LogOut, Menu, X, Dumbbell, Bell, Apple, BookOpen, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { clearToken } from "@/lib/api";
import { Clock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SVG Logo Component - Aggressive Wolf/Sirius Star
const SiriusLogo = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00F0FF" />
        <stop offset="50%" stopColor="#007AFF" />
        <stop offset="100%" stopColor="#00F0FF" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Outer ring */}
    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logoGradient)" strokeWidth="2" opacity="0.5"/>
    {/* Inner aggressive star/sirius symbol */}
    <path 
      d="M50 5 L58 35 L90 35 L64 55 L73 88 L50 68 L27 88 L36 55 L10 35 L42 35 Z" 
      fill="url(#logoGradient)" 
      filter="url(#glow)"
    />
    {/* Center circle */}
    <circle cx="50" cy="50" r="12" fill="#050505"/>
    <circle cx="50" cy="50" r="8" fill="url(#logoGradient)" opacity="0.8"/>
    {/* Cross lines for aggressive look */}
    <line x1="50" y1="20" x2="50" y2="42" stroke="#050505" strokeWidth="3"/>
    <line x1="50" y1="58" x2="50" y2="80" stroke="#050505" strokeWidth="3"/>
    <line x1="20" y1="50" x2="42" y2="50" stroke="#050505" strokeWidth="3"/>
    <line x1="58" y1="50" x2="80" y2="50" stroke="#050505" strokeWidth="3"/>
  </svg>
);

// Brasilia Clock Hook
function useBrasiliaTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const dateStr = now.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return { timeStr, dateStr };
}

export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { timeStr, dateStr } = useBrasiliaTime();

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

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
    { icon: TrendingUp, label: "Hábitos", path: "/habits" },
    { icon: Dumbbell, label: "Treinos", path: "/workouts" },
    { icon: Apple, label: "Alimentação", path: "/nutrition" },
    { icon: BookOpen, label: "Estudos", path: "/studies" },
    { icon: DollarSign, label: "Finanças", path: "/finance" },
    { icon: Target, label: "Metas", path: "/goals" },
    { icon: MessageSquare, label: "Assistente", path: "/chat" },
    { icon: Bell, label: "Notificações", path: "/notifications" },
    { icon: Trophy, label: "Conquistas", path: "/achievements" },
    { icon: FileText, label: "Relatórios", path: "/reports" },
    { icon: User, label: "Perfil", path: "/profile" }
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-[#0A0A0A] p-2 rounded-sm border border-[#27272A]"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <div className={`w-64 bg-[#0A0A0A] border-r border-[#27272A] flex flex-col h-screen fixed left-0 top-0 z-40 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 border-b border-[#27272A]">
          <div className="flex items-center space-x-3 mb-4">
            <SiriusLogo />
            <div>
              <span className="font-heading text-2xl bg-gradient-to-r from-[#00F0FF] to-[#007AFF] bg-clip-text text-transparent">SIRIUS</span>
              <p className="text-[8px] text-[#52525B] uppercase tracking-widest">Discipline System</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10 border-2 border-[#007AFF]">
                <AvatarImage src={user.picture} />
                <AvatarFallback className="bg-[#007AFF] text-white font-heading text-sm">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{user.name || 'Usuário'}</p>
                <div className="flex items-center space-x-2">
                  <span className="rank-badge bg-[#007AFF] text-white px-1.5 py-0.5 rounded-sm text-[10px]">
                    {user.rank || 'Recruta'}
                  </span>
                  <span className="font-data text-xs text-[#A1A1AA]">{user.xp ?? 0} XP</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                data-testid={`sidebar-${item.label.toLowerCase()}-link`}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center space-x-3 px-6 py-3 transition-colors ${
                  isActive
                    ? "bg-[#007AFF]/10 border-l-2 border-[#007AFF] text-[#007AFF]"
                    : "text-[#A1A1AA] hover:bg-[#121212] hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="uppercase text-xs tracking-wider font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#27272A]">
          {/* Brasilia Clock */}
          <div className="mb-3 flex items-center space-x-2 px-2 py-2 rounded-md bg-[#121212] border border-[#27272A]">
            <Clock className="w-4 h-4 text-[#00F0FF] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-data text-sm text-[#00F0FF] tracking-wider tabular-nums leading-none">{timeStr}</p>
              <p className="text-[10px] text-[#52525B] mt-0.5 capitalize">{dateStr} — Brasília</p>
            </div>
          </div>
          <Button
            data-testid="sidebar-logout-btn"
            variant="outline"
            onClick={handleLogout}
            className="w-full border-[#27272A] hover:bg-[#121212] uppercase text-xs tracking-wider"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
