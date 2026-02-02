import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Mail, Lock, User, Chrome } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, { name, email, password }, {
        withCredentials: true
      });
      toast.success("Conta criada com sucesso!");
      navigate('/dashboard', { state: { user: response.data.user } });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-[#007AFF] mx-auto mb-4" />
          <h1 className="font-heading text-4xl mb-2">SIRIUS</h1>
          <p className="text-[#A1A1AA]">Junte-se ao sistema de comando</p>
        </div>

        <div className="bg-[#0A0A0A] border border-[#27272A] p-8 rounded-sm">
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-[#FFFFFF] uppercase text-xs tracking-wider mb-2 block">
                Nome
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-[#52525B]" />
                <Input
                  id="name"
                  data-testid="register-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-[#121212] border-[#27272A] text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-[#FFFFFF] uppercase text-xs tracking-wider mb-2 block">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-[#52525B]" />
                <Input
                  id="email"
                  data-testid="register-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-[#121212] border-[#27272A] text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-[#FFFFFF] uppercase text-xs tracking-wider mb-2 block">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-[#52525B]" />
                <Input
                  id="password"
                  data-testid="register-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-[#121212] border-[#27272A] text-white font-mono"
                  required
                />
              </div>
            </div>

            <Button
              data-testid="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest shadow-[0_0_10px_rgba(0,122,255,0.3)]"
            >
              {loading ? "CRIANDO..." : "REGISTRAR"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#27272A]"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0A0A0A] px-2 text-[#A1A1AA]">Ou</span>
              </div>
            </div>

            <Button
              data-testid="register-google-btn"
              type="button"
              onClick={handleGoogleRegister}
              variant="outline"
              className="w-full mt-6 border-[#27272A] hover:bg-[#121212] uppercase text-xs tracking-widest"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Registrar com Google
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-[#A1A1AA]">
            Já tem conta?{" "}
            <Link to="/login" className="text-[#007AFF] hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}