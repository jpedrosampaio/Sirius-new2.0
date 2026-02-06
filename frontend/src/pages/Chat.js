import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Image, User, Bot, X, Camera, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

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
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Erro ao carregar mensagens", error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 10MB.");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
    const userMsg = {
      message_id: `temp_${Date.now()}`,
      role: "user",
      content: content || "[Imagem enviada para análise]",
      has_image: true,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append("description", content);

      const res = await axios.post(
        `${API}/chat/analyze-image`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      const userMessage = res.data?.user_message;
      const aiMessage = res.data?.ai_message;
      
      if (userMessage && aiMessage) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.message_id !== userMsg.message_id);
          return [...filtered, userMessage, aiMessage];
        });
        
        if (res.data.transactions_created?.length > 0) {
          toast.success(`${res.data.transactions_created.length} gasto(s) registrado(s)!`);
        }
      }
      
      removeImage();
      setContent("");
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      toast.error(error.response?.data?.detail || "Erro ao analisar imagem");
      setMessages(prev => prev.filter(m => m.message_id !== userMsg.message_id));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    
    // If there's an image, send it
    if (selectedImage) {
      await handleSendImage();
      return;
    }
    
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

      const userMessage = res.data?.user_message;
      const aiMessage = res.data?.ai_message;
      
      if (userMessage && aiMessage) {
        setMessages(prev => {
          const filtered = prev.filter(m => m.message_id !== userMsg.message_id);
          return [...filtered, userMessage, aiMessage];
        });
        
        if (aiMessage.transaction_data) {
          toast.success("Transação registrada automaticamente!");
        }
      } else {
        setMessages(prev => [...prev, {
          message_id: `ai_err_${Date.now()}`,
          role: "assistant",
          content: "Desculpe, não consegui processar sua mensagem. Tente novamente.",
          created_at: new Date().toISOString()
        }]);
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
        <div className="p-4 md:p-6 border-b border-[#27272A] pt-14 md:pt-6">
          <h1 className="font-heading text-xl md:text-3xl mb-1" data-testid="chat-title">CHAT FINANCEIRO</h1>
          <p className="text-xs md:text-sm text-[#A1A1AA]">Registre transações via texto ou imagem</p>
        </div>

        <div ref={scrollRef} className="flex-1 p-4 md:p-6 overflow-y-auto pb-40 md:pb-28">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 ? (
              <Card className="bg-[#0A0A0A] border-[#27272A] p-6 md:p-8 text-center">
                <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-[#52525B] mx-auto mb-4" />
                <p className="text-[#A1A1AA] text-sm md:text-base">Inicie uma conversa sobre suas finanças</p>
                <p className="text-xs md:text-sm text-[#52525B] mt-2">Texto: "Gastei R$ 50 no almoço"</p>
                <p className="text-xs md:text-sm text-[#52525B] mt-1">Imagem: Envie foto de nota fiscal ou recibo</p>
              </Card>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.message_id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 md:space-x-3 max-w-[90%] md:max-w-2xl ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-[#007AFF]' : 'bg-[#2C2C2E]'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      ) : (
                        <Bot className="w-4 h-4 md:w-5 md:h-5" />
                      )}
                    </div>
                    <div className={`p-3 md:p-4 rounded-sm ${
                      msg.role === 'user'
                        ? 'bg-[#007AFF]/20 border border-[#007AFF]/30'
                        : 'bg-[#0A0A0A] border border-[#27272A]'
                    }`}>
                      {msg.has_image && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-[#A1A1AA]">
                          <Camera className="w-4 h-4" />
                          <span>Imagem enviada</span>
                        </div>
                      )}
                      <p className="text-xs md:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      {msg.transaction_data && (
                        <div className="mt-3 pt-3 border-t border-[#27272A] text-xs">
                          <p className="text-[#39FF14] uppercase tracking-wider mb-1">Transação Registrada</p>
                          <p>Tipo: {msg.transaction_data.type === 'income' ? 'Receita' : 'Despesa'}</p>
                          <p>Valor: R$ {msg.transaction_data.amount}</p>
                          <p>Categoria: {msg.transaction_data.category}</p>
                        </div>
                      )}
                      {msg.transactions_created && msg.transactions_created.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#27272A] text-xs">
                          <p className="text-[#39FF14] uppercase tracking-wider mb-1">
                            {msg.transactions_created.length} Transação(ões) Registrada(s)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="px-4 md:px-6 py-2 border-t border-[#27272A] bg-[#0A0A0A] fixed bottom-32 md:bottom-20 left-0 right-0 md:left-64">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="h-16 w-16 object-cover rounded-sm border border-[#27272A]"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-[#FF3B30] rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="text-xs text-[#A1A1AA]">
                <p>Imagem selecionada</p>
                <p className="text-[#52525B]">Será analisada para extrair gastos</p>
              </div>
            </div>
          </div>
        )}

        <div className={`p-4 md:p-6 border-t border-[#27272A] bg-[#0A0A0A] fixed ${imagePreview ? 'bottom-16 md:bottom-0' : 'bottom-16 md:bottom-0'} left-0 right-0 md:left-64`}>
          <form onSubmit={handleSend} className="max-w-4xl mx-auto">
            <div className="flex items-center space-x-2 md:space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="border-[#27272A] hover:bg-[#121212] px-3"
              >
                <Image className="w-4 h-4" />
              </Button>
              
              <Input
                data-testid="chat-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={selectedImage ? "Descrição (opcional)..." : "Ex: 'Gastei R$ 50 no almoço'"}
                className="flex-1 bg-[#121212] border-[#27272A] text-white font-mono text-sm"
                disabled={loading}
              />
              
              <Button
                data-testid="chat-send-btn"
                type="submit"
                disabled={loading || (!content.trim() && !selectedImage)}
                className="bg-[#007AFF] hover:bg-[#0062CC] px-3 md:px-4"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <MobileNav user={user} />
    </div>
  );
}
