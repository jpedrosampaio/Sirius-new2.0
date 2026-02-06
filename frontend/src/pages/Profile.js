import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, Trophy, Star, Shield, Target, TrendingUp, CheckSquare, Camera, Trash2, Upload } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchUser();
    fetchAchievements();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await axios.get(`${API}/achievements`, { withCredentials: true });
      setAchievements(res.data);
    } catch (error) {
      console.error("Erro ao carregar conquistas", error);
    }
  };

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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Apenas imagens JPEG, PNG, GIF ou WebP são permitidas");
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await axios.post(`${API}/auth/upload-picture`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setUser(prev => ({ ...prev, picture: res.data.picture }));
      toast.success("Foto de perfil atualizada!");
    } catch (error) {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await axios.delete(`${API}/auth/remove-picture`, { withCredentials: true });
      setUser(prev => ({ ...prev, picture: null }));
      toast.success("Foto de perfil removida");
    } catch (error) {
      toast.error("Erro ao remover foto");
    }
  };

  const ranks = [
    { name: "Recruta", xp: 0, icon: Shield, color: "#A1A1AA" },
    { name: "Soldado", xp: 100, icon: Shield, color: "#A1A1AA" },
    { name: "Cabo", xp: 300, icon: Star, color: "#CD7F32" },
    { name: "Sargento", xp: 600, icon: Star, color: "#C0C0C0" },
    { name: "Tenente", xp: 1000, icon: Star, color: "#FFD700" },
    { name: "Capitão", xp: 1500, icon: Trophy, color: "#FFD700" },
    { name: "Major", xp: 2200, icon: Trophy, color: "#FFD700" },
    { name: "Coronel", xp: 3000, icon: Award, color: "#FFD700" },
    { name: "General", xp: 4000, icon: Award, color: "#FFD700" }
  ];

  const getNextRank = () => {
    if (!user) return null;
    const currentIndex = ranks.findIndex(r => r.name === user.rank);
    if (currentIndex === -1 || currentIndex === ranks.length - 1) return null;
    return ranks[currentIndex + 1];
  };

  const getCurrentRankIndex = () => {
    if (!user) return 0;
    return ranks.findIndex(r => r.name === user.rank);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007AFF]"></div>
      </div>
    );
  }

  const nextRank = getNextRank();
  const currentRankIndex = getCurrentRankIndex();
  const currentRankData = ranks[currentRankIndex];
  const progress = nextRank ? ((user.xp - currentRankData.xp) / (nextRank.xp - currentRankData.xp)) * 100 : 100;

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-heading text-4xl mb-8" data-testid="profile-title">PERFIL DO OPERADOR</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-[#0A0A0A] border-[#27272A] p-6 lg:col-span-2">
              <div className="flex items-start space-x-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-2 border-[#007AFF]">
                    <AvatarImage src={user.picture} />
                    <AvatarFallback className="bg-[#007AFF] text-white font-heading text-2xl">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Overlay para upload */}
                  <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="p-2 bg-[#007AFF] rounded-full hover:bg-[#0056b3] transition-colors"
                    >
                      {uploadingPhoto ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                  {/* Botão de remover foto */}
                  {user.picture && (
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="font-heading text-3xl mb-2">{user.name || 'Usuário'}</h2>
                  <p className="text-[#A1A1AA] mb-4">{user.email || ''}</p>
                  <div className="flex items-center space-x-4">
                    <div className="rank-badge bg-[#007AFF] text-white px-3 py-1 rounded-sm">
                      {user.rank || 'Recruta'}
                    </div>
                    <div className="font-data text-2xl">{user.xp ?? 0} XP</div>
                  </div>
                </div>
              </div>

              {nextRank && (
                <div className="mt-6 pt-6 border-t border-[#27272A]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-[#A1A1AA]">Progresso para {nextRank.name}</span>
                    <span className="font-data text-sm text-[#A1A1AA]">{nextRank.xp} XP</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-[#A1A1AA] mt-2">
                    Faltam {nextRank.xp - (user.xp ?? 0)} XP para o próximo rank
                  </p>
                </div>
              )}
            </Card>

            <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
              <h3 className="font-heading text-xl mb-4 uppercase">Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-5 h-5 text-[#007AFF]" />
                    <span className="text-sm text-[#A1A1AA]">Tarefas</span>
                  </div>
                  <span className="font-data">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-[#39FF14]" />
                    <span className="text-sm text-[#A1A1AA]">Hábitos</span>
                  </div>
                  <span className="font-data">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Target className="w-5 h-5 text-[#00F0FF]" />
                    <span className="text-sm text-[#A1A1AA]">Metas</span>
                  </div>
                  <span className="font-data">-</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="bg-[#0A0A0A] border-[#27272A] p-6 mb-8">
            <h3 className="font-heading text-2xl mb-6 uppercase">Hierarquia Militar</h3>
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
              {ranks.map((rank, index) => {
                const Icon = rank.icon;
                const isUnlocked = index <= currentRankIndex;
                return (
                  <div
                    key={rank.name}
                    className={`text-center ${
                      isUnlocked ? 'opacity-100' : 'opacity-30'
                    }`}
                  >
                    <div
                      className={`w-16 h-16 mx-auto rounded-sm flex items-center justify-center mb-2 ${
                        rank.name === user.rank
                          ? 'bg-[#007AFF] shadow-[0_0_15px_rgba(0,122,255,0.5)]'
                          : isUnlocked
                          ? 'bg-[#2C2C2E]'
                          : 'bg-[#121212]'
                      }`}
                    >
                      <Icon
                        className="w-8 h-8"
                        style={{ color: isUnlocked ? rank.color : '#52525B' }}
                      />
                    </div>
                    <p className="text-xs font-heading">{rank.name}</p>
                    <p className="font-data text-xs text-[#A1A1AA]">{rank.xp} XP</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {achievements.length > 0 && (
            <Card className="bg-[#0A0A0A] border-[#27272A] p-6 mb-8">
              <h3 className="font-heading text-2xl mb-6 uppercase">Conquistas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.achievement_id}
                    className="bg-[#121212] border border-[#27272A] p-4 rounded-sm"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-[#FFD700]/20 rounded-sm flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-[#FFD700]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-heading text-sm mb-1">{achievement.title}</h4>
                        <p className="text-xs text-[#A1A1AA]">{achievement.description}</p>
                        <p className="text-xs text-[#A1A1AA] mt-2">
                          {new Date(achievement.unlocked_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex justify-center">
            <Button
              data-testid="profile-logout-btn"
              variant="outline"
              onClick={handleLogout}
              className="border-[#27272A] hover:bg-[#121212] uppercase text-xs tracking-wider"
            >
              Sair do Sistema
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}