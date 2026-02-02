import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Target, TrendingUp, Award, Brain, BarChart3 } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <nav className="border-b border-[#27272A] bg-[#0A0A0A]/80 backdrop-blur-xl fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-[#007AFF]" />
            <span className="font-heading text-2xl tracking-tight">SIRIUS</span>
          </div>
          <div className="flex space-x-3">
            <Button 
              data-testid="landing-login-btn"
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="uppercase text-xs tracking-wider"
            >
              Login
            </Button>
            <Button 
              data-testid="landing-register-btn"
              onClick={() => navigate('/register')}
              className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-wider shadow-[0_0_10px_rgba(0,122,255,0.3)]"
            >
              Registrar
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl mb-6 tracking-tight">
            DISCIPLINA É DESTINO
          </h1>
          <p className="text-xl text-[#A1A1AA] max-w-3xl mx-auto mb-12">
            Execute com Precisão Militar. Sistema completo de produtividade, finanças e gamificação.
          </p>
          <Button 
            data-testid="landing-start-btn"
            size="lg" 
            onClick={() => navigate('/register')}
            className="bg-[#007AFF] hover:bg-[#0062CC] h-12 px-8 uppercase text-sm tracking-widest shadow-[0_0_15px_rgba(0,122,255,0.4)] transition-all active:scale-95"
          >
            INICIAR MISSÃO
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#0A0A0A] border border-[#27272A] p-8 rounded-sm hover:border-[#3F3F46] transition-colors">
            <Target className="w-12 h-12 text-[#007AFF] mb-4" />
            <h3 className="font-heading text-2xl mb-3">TAREFAS DIÁRIAS</h3>
            <p className="text-[#A1A1AA]">Crie, organize, EXECUTE. Dashboard mostra progresso em tempo real.</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-[#27272A] p-8 rounded-sm hover:border-[#3F3F46] transition-colors">
            <TrendingUp className="w-12 h-12 text-[#39FF14] mb-4" />
            <h3 className="font-heading text-2xl mb-3">HÁBITOS INQUEBRÁVEIS</h3>
            <p className="text-[#A1A1AA]">Construa sequências impressionantes. Cada dia conta.</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-[#27272A] p-8 rounded-sm hover:border-[#3F3F46] transition-colors">
            <BarChart3 className="w-12 h-12 text-[#FF9500] mb-4" />
            <h3 className="font-heading text-2xl mb-3">CONTROLE FINANCEIRO</h3>
            <p className="text-[#A1A1AA]">Receitas, despesas, orçamento. Veja onde cada centavo vai.</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-[#27272A] p-8 rounded-sm hover:border-[#3F3F46] transition-colors">
            <Shield className="w-12 h-12 text-[#007AFF] mb-4" />
            <h3 className="font-heading text-2xl mb-3">METAS & SPRINTS</h3>
            <p className="text-[#A1A1AA]">Defina metas. Sistema divide em sprints personalizáveis.</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-[#27272A] p-8 rounded-sm hover:border-[#3F3F46] transition-colors">
            <Award className="w-12 h-12 text-[#FFD700] mb-4" />
            <h3 className="font-heading text-2xl mb-3">GAMIFICAÇÃO MILITAR</h3>
            <p className="text-[#A1A1AA]">Ganhe XP. Suba de rank. Desbloqueie conquistas.</p>
          </div>
          
          <div className="bg-[#0A0A0A] border border-[#27272A] p-8 rounded-sm hover:border-[#3F3F46] transition-colors">
            <Brain className="w-12 h-12 text-[#00F0FF] mb-4" />
            <h3 className="font-heading text-2xl mb-3">RELATÓRIOS INTELIGENTES</h3>
            <p className="text-[#A1A1AA]">IA identifica padrões e sugere otimizações.</p>
          </div>
        </div>
      </div>

      <footer className="border-t border-[#27272A] py-8 text-center text-[#A1A1AA]">
        <p>© 2025 Sirius. Discipline is Destiny.</p>
      </footer>
    </div>
  );
}