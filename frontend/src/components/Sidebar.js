import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Home, CheckSquare, TrendingUp, DollarSign, Target, MessageSquare, FileText, User, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.success("Logout realizado");
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: CheckSquare, label: "Tarefas", path: "/tasks" },
    { icon: TrendingUp, label: "Hábitos", path: "/habits" },
    { icon: DollarSign, label: "Finanças", path: "/finance" },
    { icon: Target, label: "Metas", path: "/goals" },
    { icon: MessageSquare, label: "Chat", path: "/chat" },
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
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-8 h-8 text-[#007AFF]" />
            <span className="font-heading text-2xl">SIRIUS</span>
          </div>
          {user && (
            <div>
              <p className="text-sm text-[#A1A1AA] uppercase tracking-wider mb-1">Operador</p>
              <p className="font-medium truncate">{user.name}</p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="rank-badge bg-[#007AFF] text-white px-2 py-0.5 rounded-sm text-xs">
                  {user.rank}
                </span>
                <span className="font-data text-sm text-[#A1A1AA]">{user.xp} XP</span>
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