import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Sparkles } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Reports() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("diário");
  const [period, setPeriod] = useState("hoje");

  useEffect(() => {
    fetchUser();
    fetchReports();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API}/reports`, { withCredentials: true });
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      toast.error("Erro ao carregar relatórios");
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/reports/generate?report_type=${reportType}&period=${period}`, {}, {
        withCredentials: true
      });
      toast.success("Relatório gerado com sucesso!");
      fetchReports();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="font-heading text-4xl mb-2" data-testid="reports-title">RELATÓRIOS INTELIGENTES</h1>
            <p className="text-[#A1A1AA]">Análises e insights com IA</p>
          </div>

          <Card className="bg-[#0A0A0A] border-[#27272A] p-6 mb-8">
            <div className="flex items-center space-x-4">
              <Sparkles className="w-8 h-8 text-[#00F0FF]" />
              <div className="flex-1">
                <h3 className="font-heading text-xl mb-2">GERAR NOVO RELATÓRIO</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger data-testid="report-type-select" className="bg-[#121212] border-[#27272A] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-[#27272A] text-white">
                        <SelectItem value="diário">Diário</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="sprint">Fim de Sprint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger data-testid="report-period-select" className="bg-[#121212] border-[#27272A] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#121212] border-[#27272A] text-white">
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="esta semana">Esta Semana</SelectItem>
                        <SelectItem value="este mês">Este Mês</SelectItem>
                        <SelectItem value="último mês">Último Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    data-testid="generate-report-btn"
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest"
                  >
                    {loading ? "Gerando..." : "Gerar"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            {reports.length === 0 ? (
              <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                <FileText className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">Nenhum relatório gerado ainda</p>
              </Card>
            ) : (
              reports.map((report) => (
                <Card key={report.report_id} className="bg-[#0A0A0A] border-[#27272A] p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#00F0FF]/20 rounded-sm flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#00F0FF]" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl mb-1">
                          RELATÓRIO {(report.type || '').toUpperCase()}
                        </h3>
                        <p className="text-sm text-[#A1A1AA]">
                          Período: {report.period || ''} | Gerado em: {report.created_at ? new Date(report.created_at).toLocaleString('pt-BR') : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-[#27272A] hover:bg-[#121212]"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="bg-[#121212] border border-[#27272A] rounded-sm p-4 mb-4">
                    <h4 className="font-heading text-sm text-[#A1A1AA] uppercase tracking-wider mb-3">Dados do Período</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-[#A1A1AA] mb-1">Tarefas</p>
                        <p className="font-data text-lg">{report.data?.tasks_completed ?? 0}/{report.data?.tasks ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#A1A1AA] mb-1">Hábitos</p>
                        <p className="font-data text-lg">{report.data?.total_habits_completions ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#A1A1AA] mb-1">Receitas</p>
                        <p className="font-data text-lg text-[#39FF14]">R$ {(report.data.income ?? 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#A1A1AA] mb-1">Despesas</p>
                        <p className="font-data text-lg text-[#FF3B30]">R$ {(report.data.expenses ?? 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-heading text-sm text-[#A1A1AA] uppercase tracking-wider mb-3 flex items-center">
                      <Sparkles className="w-4 h-4 mr-2 text-[#00F0FF]" />
                      Insights & Sugestões
                    </h4>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-sm text-white whitespace-pre-wrap">{report.insights}</p>
                    </div>
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