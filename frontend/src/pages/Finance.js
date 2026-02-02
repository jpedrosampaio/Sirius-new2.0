import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, TrendingUp, TrendingDown, AlertCircle, Trash2, CreditCard as CreditCardIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#007AFF', '#39FF14', '#FF9500', '#FF3B30', '#00F0FF', '#FFD700', '#FF00FF', '#A855F7', '#10B981'];

export default function Finance() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [stats, setStats] = useState(null);
  const [openTransaction, setOpenTransaction] = useState(false);
  const [openBudget, setOpenBudget] = useState(false);
  const [openCard, setOpenCard] = useState(false);
  const [openCharge, setOpenCharge] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  
  const [newTransaction, setNewTransaction] = useState({
    type: "expense",
    amount: "",
    category: "alimentação",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });
  
  const [newBudget, setNewBudget] = useState({
    category: "alimentação",
    limit: "",
    month: new Date().toISOString().slice(0, 7),
    budget_type: "fixed",
    percentage: ""
  });
  
  const [newCard, setNewCard] = useState({
    name: "",
    limit: "",
    closing_day: "",
    due_day: ""
  });
  
  const [newCharge, setNewCharge] = useState({
    amount: "",
    description: "",
    category: "alimentação"
  });
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const categories = ["alimentação", "transporte", "moradia", "saúde", "educação", "lazer", "outros"];

  useEffect(() => {
    fetchUser();
    fetchTransactions();
    fetchBudgets();
    fetchStats();
    fetchCreditCards();
  }, [selectedMonth]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      toast.error("Erro ao carregar usuário");
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API}/transactions?month=${selectedMonth}`, { withCredentials: true });
      setTransactions(res.data);
    } catch (error) {
      console.error("Erro ao carregar transações");
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await axios.get(`${API}/budgets?month=${selectedMonth}`, { withCredentials: true });
      setBudgets(res.data);
    } catch (error) {
      console.error("Erro ao carregar orçamentos");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/finance/stats?month=${selectedMonth}`, { withCredentials: true });
      setStats(res.data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas");
    }
  };

  const fetchCreditCards = async () => {
    try {
      const res = await axios.get(`${API}/credit-cards`, { withCredentials: true });
      setCreditCards(res.data);
    } catch (error) {
      console.error("Erro ao carregar cartões");
    }
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast.error("Valor inválido");
      return;
    }
    try {
      await axios.post(`${API}/transactions`, {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      }, { withCredentials: true });
      toast.success("Transação registrada!");
      setNewTransaction({
        type: "expense",
        amount: "",
        category: "alimentação",
        description: "",
        date: new Date().toISOString().split('T')[0]
      });
      setOpenTransaction(false);
      fetchTransactions();
      fetchBudgets();
      fetchStats();
    } catch (error) {
      toast.error("Erro ao registrar transação");
    }
  };

  const handleCreateBudget = async () => {
    if (newBudget.budget_type === "fixed" && (!newBudget.limit || parseFloat(newBudget.limit) <= 0)) {
      toast.error("Valor inválido");
      return;
    }
    if (newBudget.budget_type === "percentage" && (!newBudget.percentage || parseFloat(newBudget.percentage) <= 0)) {
      toast.error("Percentual inválido");
      return;
    }
    try {
      const budgetData = {
        category: newBudget.category,
        month: newBudget.month,
        budget_type: newBudget.budget_type,
        limit: newBudget.budget_type === "fixed" ? parseFloat(newBudget.limit) : 0,
        percentage: newBudget.budget_type === "percentage" ? parseFloat(newBudget.percentage) : null
      };
      await axios.post(`${API}/budgets`, budgetData, { withCredentials: true });
      toast.success("Orçamento criado!");
      setNewBudget({
        category: "alimentação",
        limit: "",
        month: new Date().toISOString().slice(0, 7),
        budget_type: "fixed",
        percentage: ""
      });
      setOpenBudget(false);
      fetchBudgets();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro ao criar orçamento");
    }
  };

  const handleCreateCard = async () => {
    if (!newCard.name || !newCard.limit || !newCard.closing_day || !newCard.due_day) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      await axios.post(`${API}/credit-cards`, {
        ...newCard,
        limit: parseFloat(newCard.limit),
        closing_day: parseInt(newCard.closing_day),
        due_day: parseInt(newCard.due_day)
      }, { withCredentials: true });
      toast.success("Cartão cadastrado!");
      setNewCard({ name: "", limit: "", closing_day: "", due_day: "" });
      setOpenCard(false);
      fetchCreditCards();
    } catch (error) {
      toast.error("Erro ao cadastrar cartão");
    }
  };

  const handleChargeCard = async () => {
    if (!newCharge.amount || parseFloat(newCharge.amount) <= 0) {
      toast.error("Valor inválido");
      return;
    }
    try {
      await axios.post(`${API}/credit-cards/${selectedCard}/charge?amount=${parseFloat(newCharge.amount)}&description=${encodeURIComponent(newCharge.description)}&category=${newCharge.category}`, {}, { withCredentials: true });
      toast.success("Compra lançada no cartão!");
      setNewCharge({ amount: "", description: "", category: "alimentação" });
      setOpenCharge(false);
      fetchTransactions();
      fetchStats();
    } catch (error) {
      toast.error("Erro ao lançar compra");
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await axios.delete(`${API}/transactions/${id}`, { withCredentials: true });
      toast.success("Transação deletada");
      fetchTransactions();
      fetchStats();
    } catch (error) {
      toast.error("Erro ao deletar transação");
    }
  };

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expenses;

  const chartData = stats && stats.expense_by_category ? Object.entries(stats.expense_by_category).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value
  })) : [];

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="font-heading text-3xl md:text-4xl mb-2">FINANÇAS</h1>
            <p className="text-[#A1A1AA]">Controle total do seu dinheiro</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#A1A1AA] uppercase text-xs tracking-wider">Receitas</span>
                <TrendingUp className="w-5 h-5 text-[#39FF14]" />
              </div>
              <p className="font-data text-2xl md:text-3xl text-[#39FF14]">R$ {income.toFixed(2)}</p>
            </Card>

            <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#A1A1AA] uppercase text-xs tracking-wider">Despesas</span>
                <TrendingDown className="w-5 h-5 text-[#FF3B30]" />
              </div>
              <p className="font-data text-2xl md:text-3xl text-[#FF3B30]">R$ {expenses.toFixed(2)}</p>
            </Card>

            <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#A1A1AA] uppercase text-xs tracking-wider">Saldo</span>
                <DollarSign className="w-5 h-5 text-[#007AFF]" />
              </div>
              <p className={`font-data text-2xl md:text-3xl ${balance >= 0 ? 'text-[#39FF14]' : 'text-[#FF3B30]'}`}>
                R$ {balance.toFixed(2)}
              </p>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card className="bg-[#0A0A0A] border-[#27272A] p-6 mb-8">
              <h3 className="font-heading text-xl mb-4 uppercase">Gastos por Categoria</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry) => `${entry.name}: R$ ${entry.value.toFixed(0)}`}
                    labelLine={true}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          <div className="mb-6">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#0A0A0A] border-[#27272A] text-white font-mono max-w-xs"
            />
          </div>

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="bg-[#0A0A0A] border-[#27272A]">
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="budgets">Orçamentos</TabsTrigger>
              <TabsTrigger value="cards">Cartões</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <div className="flex justify-end mb-4">
                <Dialog open={openTransaction} onOpenChange={setOpenTransaction}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Transação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-2xl">NOVA TRANSAÇÃO</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Tipo</Label>
                        <div className="flex gap-2">
                          {[{value: 'income', label: 'Receita'}, {value: 'expense', label: 'Despesa'}].map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setNewTransaction({...newTransaction, type: type.value})}
                              className={`flex-1 py-2 px-4 rounded-sm uppercase text-xs transition-colors ${
                                newTransaction.type === type.value ? 'bg-[#007AFF] text-white' : 'bg-[#121212] text-[#A1A1AA]'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white"
                        />
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setNewTransaction({...newTransaction, category: cat})}
                              className={`py-2 px-3 rounded-sm text-xs uppercase transition-colors ${
                                newTransaction.category === cat ? 'bg-[#007AFF] text-white' : 'bg-[#121212] text-[#A1A1AA]'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Input
                          value={newTransaction.description}
                          onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white"
                        />
                      </div>
                      <div>
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={newTransaction.date}
                          onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white"
                        />
                      </div>
                      <Button onClick={handleCreateTransaction} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs">
                        Criar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center">
                    <p className="text-[#A1A1AA]">Nenhuma transação neste período</p>
                  </Card>
                ) : (
                  transactions.slice(0, 20).map((t) => (
                    <Card key={t.transaction_id} className="bg-[#0A0A0A] border-[#27272A] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                            t.type === 'income' ? 'bg-[#39FF14]/20' : 'bg-[#FF3B30]/20'
                          }`}>
                            {t.type === 'income' ? <TrendingUp className="w-5 h-5 text-[#39FF14]" /> : <TrendingDown className="w-5 h-5 text-[#FF3B30]" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{t.category}</span>
                              <span className="text-xs text-[#A1A1AA]">{t.date}</span>
                            </div>
                            {t.description && <p className="text-sm text-[#A1A1AA]">{t.description}</p>}
                          </div>
                          <div className={`font-data text-xl ${t.type === 'income' ? 'text-[#39FF14]' : 'text-[#FF3B30]'}`}>
                            {t.type === 'income' ? '+' : '-'}R$ {t.amount.toFixed(2)}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(t.transaction_id)}>
                            <Trash2 className="w-4 h-4 text-[#52525B] hover:text-[#FF3B30]" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="budgets" className="mt-6">
              <div className="flex justify-end mb-4">
                <Dialog open={openBudget} onOpenChange={setOpenBudget}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Orçamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-2xl">NOVO ORÇAMENTO</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Categoria</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setNewBudget({...newBudget, category: cat})}
                              className={`py-2 px-3 rounded-sm text-xs uppercase transition-colors ${
                                newBudget.category === cat ? 'bg-[#007AFF] text-white' : 'bg-[#121212] text-[#A1A1AA]'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <div className="flex gap-2 mt-2">
                          {[{value: 'fixed', label: 'Valor Fixo'}, {value: 'percentage', label: '%'}].map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setNewBudget({...newBudget, budget_type: type.value})}
                              className={`flex-1 py-2 px-4 rounded-sm uppercase text-xs transition-colors ${
                                newBudget.budget_type === type.value ? 'bg-[#007AFF] text-white' : 'bg-[#121212] text-[#A1A1AA]'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {newBudget.budget_type === 'fixed' ? (
                        <div>
                          <Label>Limite (R$)</Label>
                          <Input
                            type="number"
                            value={newBudget.limit}
                            onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                            className="bg-[#121212] border-[#27272A] text-white"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label>% da Renda</Label>
                          <Input
                            type="number"
                            value={newBudget.percentage}
                            onChange={(e) => setNewBudget({...newBudget, percentage: e.target.value})}
                            className="bg-[#121212] border-[#27272A] text-white"
                          />
                        </div>
                      )}
                      <Button onClick={handleCreateBudget} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs">
                        Criar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgets.length === 0 ? (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center col-span-full">
                    <p className="text-[#A1A1AA]">Nenhum orçamento definido</p>
                  </Card>
                ) : (
                  budgets.map((budget) => {
                    const percentage = (budget.spent / budget.limit) * 100;
                    const isOver = percentage > 100;
                    return (
                      <Card key={budget.budget_id} className={`bg-[#0A0A0A] border-[#27272A] p-6 ${isOver ? 'border-[#FF3B30]' : ''}`}>
                        {isOver && (
                          <div className="flex items-center space-x-2 mb-3 text-[#FF3B30]">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm uppercase">Estourado</span>
                          </div>
                        )}
                        <h3 className="font-heading text-xl mb-4">{budget.category.toUpperCase()}</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Gasto</span>
                            <span>R$ {budget.spent.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Limite</span>
                            <span>R$ {budget.limit.toFixed(2)}</span>
                          </div>
                          <div className="h-2 bg-[#27272A] rounded-full overflow-hidden mt-3">
                            <div className={`h-full ${isOver ? 'bg-[#FF3B30]' : 'bg-[#007AFF]'}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="cards" className="mt-6">
              <div className="flex justify-end mb-4 space-x-2">
                <Dialog open={openCard} onOpenChange={setOpenCard}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Cartão
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-2xl">CADASTRAR CARTÃO</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Nome do Cartão</Label>
                        <Input
                          value={newCard.name}
                          onChange={(e) => setNewCard({...newCard, name: e.target.value})}
                          placeholder="Ex: Nubank, Itaú"
                          className="bg-[#121212] border-[#27272A] text-white"
                        />
                      </div>
                      <div>
                        <Label>Limite (R$)</Label>
                        <Input
                          type="number"
                          value={newCard.limit}
                          onChange={(e) => setNewCard({...newCard, limit: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Dia Fechamento</Label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={newCard.closing_day}
                            onChange={(e) => setNewCard({...newCard, closing_day: e.target.value})}
                            className="bg-[#121212] border-[#27272A] text-white"
                          />
                        </div>
                        <div>
                          <Label>Dia Vencimento</Label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={newCard.due_day}
                            onChange={(e) => setNewCard({...newCard, due_day: e.target.value})}
                            className="bg-[#121212] border-[#27272A] text-white"
                          />
                        </div>
                      </div>
                      <Button onClick={handleCreateCard} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs">
                        Cadastrar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {creditCards.length === 0 ? (
                  <Card className="bg-[#0A0A0A] border-[#27272A] p-8 text-center col-span-full">
                    <CreditCardIcon className="w-12 h-12 text-[#52525B] mx-auto mb-4" />
                    <p className="text-[#A1A1AA]">Nenhum cartão cadastrado</p>
                  </Card>
                ) : (
                  creditCards.map((card) => (
                    <Card key={card.card_id} className="bg-[#0A0A0A] border-[#27272A] p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-[#007AFF]/20 rounded-sm flex items-center justify-center">
                          <CreditCardIcon className="w-6 h-6 text-[#007AFF]" />
                        </div>
                        <div>
                          <h3 className="font-heading text-lg">{card.name}</h3>
                          <p className="text-xs text-[#A1A1AA]">Limite: R$ {card.limit.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-[#A1A1AA]">Fechamento</span>
                          <span>Dia {card.closing_day}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#A1A1AA]">Vencimento</span>
                          <span>Dia {card.due_day}</span>
                        </div>
                      </div>
                      <Dialog open={openCharge && selectedCard === card.card_id} onOpenChange={(open) => {
                        setOpenCharge(open);
                        if (!open) setSelectedCard(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            onClick={() => setSelectedCard(card.card_id)}
                            className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs"
                          >
                            Lançar Compra
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-heading text-xl">LANÇAR NO {card.name.toUpperCase()}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label>Valor</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={newCharge.amount}
                                onChange={(e) => setNewCharge({...newCharge, amount: e.target.value})}
                                className="bg-[#121212] border-[#27272A] text-white"
                              />
                            </div>
                            <div>
                              <Label>Descrição</Label>
                              <Input
                                value={newCharge.description}
                                onChange={(e) => setNewCharge({...newCharge, description: e.target.value})}
                                className="bg-[#121212] border-[#27272A] text-white"
                              />
                            </div>
                            <div>
                              <Label>Categoria</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {categories.map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => setNewCharge({...newCharge, category: cat})}
                                    className={`py-2 px-3 rounded-sm text-xs uppercase transition-colors ${
                                      newCharge.category === cat ? 'bg-[#007AFF] text-white' : 'bg-[#121212] text-[#A1A1AA]'
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <Button onClick={handleChargeCard} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs">
                              Lançar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
