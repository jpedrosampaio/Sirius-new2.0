import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Image, Mic, User, Bot } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchUser();
    fetchMessages();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/chat/messages`, { withCredentials: true });
      setMessages(res.data);
    } catch (error) {
      console.error("Erro ao carregar mensagens", error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setLoading(true);
    const userMsg = {
      message_id: `temp_${Date.now()}`,
      role: "user",
      content: content,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    const messageText = content;
    setContent("");

    try {
      const res = await axios.post(
        `${API}/chat/send`,
        { content: messageText },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      setMessages(prev => {
        const filtered = prev.filter(m => m.message_id !== userMsg.message_id);
        return [...filtered, res.data.user_message, res.data.ai_message];
      });
      
      if (res.data.ai_message.transaction_data) {
        toast.success("Transação registrada automaticamente!");
      }
    } catch (error) {
      console.error("Erro ao enviar:", error);
      toast.error("Erro ao enviar mensagem");
      setMessages(prev => prev.filter(m => m.message_id !== userMsg.message_id));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 flex flex-col h-screen">
        <div className="p-4 md:p-6 border-b border-[#27272A]">
          <h1 className="font-heading text-2xl md:text-3xl mb-1" data-testid="chat-title">CHAT FINANCEIRO</h1>
          <p className="text-sm text-[#A1A1AA]">Registre transações via texto</p>
        </div>

        <div ref={scrollRef} className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                <MessageSquare className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">Inicie uma conversa sobre suas finanças</p>
                <p className="text-sm text-[#52525B] mt-2">Exemplo: "Gastei R$ 50 no almoço"</p>
              </Card>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.message_id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-3 max-w-[85%] md:max-w-2xl ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-[#007AFF]' : 'bg-[#2C2C2E]'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Bot className="w-5 h-5" />
                      )}
                    </div>
                    <div className={`p-4 rounded-sm ${
                      msg.role === 'user'
                        ? 'bg-[#007AFF]/20 border border-[#007AFF]/30'
                        : 'bg-[#0A0A0A] border border-[#27272A]'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      {msg.transaction_data && (
                        <div className="mt-3 pt-3 border-t border-[#27272A] text-xs">
                          <p className="text-[#39FF14] uppercase tracking-wider mb-1">Transação Registrada</p>
                          <p>Tipo: {msg.transaction_data.type === 'income' ? 'Receita' : 'Despesa'}</p>
                          <p>Valor: R$ {msg.transaction_data.amount}</p>
                          <p>Categoria: {msg.transaction_data.category}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-[#27272A] bg-[#0A0A0A]">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-3">
              <Input
                data-testid="chat-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite uma mensagem... Ex: 'Gastei R$ 50 no almoço'"
                className="flex-1 bg-[#121212] border-[#27272A] text-white font-mono"
                disabled={loading}
              />
              
              <Button
                data-testid="chat-send-btn"
                type="submit"
                disabled={loading}
                className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}