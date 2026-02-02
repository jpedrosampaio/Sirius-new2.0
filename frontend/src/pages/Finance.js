import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, TrendingUp, TrendingDown, AlertCircle, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#007AFF', '#39FF14', '#FF9500', '#FF3B30', '#00F0FF', '#FFD700', '#FF00FF'];

export default function Finance() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [stats, setStats] = useState(null);
  const [openTransaction, setOpenTransaction] = useState(false);
  const [openBudget, setOpenBudget] = useState(false);
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const categories = ["alimentação", "transporte", "moradia", "saúde", "educação", "lazer", "outros"];

  useEffect(() => {
    fetchUser();
    fetchTransactions();
    fetchBudgets();
    fetchStats();
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
      toast.error("Erro ao carregar transações");
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await axios.get(`${API}/budgets?month=${selectedMonth}`, { withCredentials: true });
      setBudgets(res.data);
    } catch (error) {
      toast.error("Erro ao carregar orçamentos");
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

  const expenseChartData = stats ? Object.entries(stats.expense_by_category).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value
  })) : [];

  const barChartData = stats ? Object.entries(stats.expense_by_category).map(([name, value]) => ({
    category: name.charAt(0).toUpperCase() + name.slice(1),
    gasto: value
  })) : [];

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar user={user} />
      <div className="flex-1 ml-0 md:ml-64 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl mb-2" data-testid="finance-title">FINANÇAS</h1>
              <p className="text-[#A1A1AA]">Controle total do seu dinheiro</p>
            </div>
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

          {expenseChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                <h3 className="font-heading text-xl mb-4 uppercase">Gastos por Categoria (Pizza)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: R$ ${entry.value.toFixed(0)}`}
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card className="bg-[#0A0A0A] border-[#27272A] p-6">
                <h3 className="font-heading text-xl mb-4 uppercase">Gastos por Categoria (Barras)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis dataKey="category" stroke="#A1A1AA" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#A1A1AA" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #27272A' }}
                      formatter={(value) => `R$ ${value.toFixed(2)}`}
                    />
                    <Bar dataKey="gasto" fill="#007AFF" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          <div className="mb-6 flex items-center space-x-4">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#0A0A0A] border-[#27272A] text-white font-mono max-w-xs"
            />
          </div>

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="bg-[#0A0A0A] border-[#27272A]">
              <TabsTrigger value="transactions" className="data-[state=active]:bg-[#007AFF]">Transações</TabsTrigger>
              <TabsTrigger value="budgets" className="data-[state=active]:bg-[#007AFF]">Orçamentos</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <div className="flex justify-end mb-4">
                <Dialog open={openTransaction} onOpenChange={setOpenTransaction}>
                  <DialogTrigger asChild>
                    <Button data-testid="transaction-create-btn" className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Transação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white">
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
                              className={`flex-1 py-2 px-4 rounded-sm uppercase text-xs tracking-wider transition-colors ${
                                newTransaction.type === type.value
                                  ? 'bg-[#007AFF] text-white'
                                  : 'bg-[#121212] text-[#A1A1AA] hover:bg-[#1C1C1E]'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Valor</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Categoria</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setNewTransaction({...newTransaction, category: cat})}
                              className={`py-2 px-3 rounded-sm text-xs uppercase tracking-wider transition-colors ${
                                newTransaction.category === cat
                                  ? 'bg-[#007AFF] text-white'
                                  : 'bg-[#121212] text-[#A1A1AA] hover:bg-[#1C1C1E]'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Descrição</Label>
                        <Input
                          value={newTransaction.description}
                          onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Data</Label>
                        <Input
                          type="date"
                          value={newTransaction.date}
                          onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white font-mono"
                        />
                      </div>
                      <Button onClick={handleCreateTransaction} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
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
                  transactions.map((transaction) => (
                    <Card key={transaction.transaction_id} className="bg-[#0A0A0A] border-[#27272A] p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                            transaction.type === 'income' ? 'bg-[#39FF14]/20' : 'bg-[#FF3B30]/20'
                          }`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="w-5 h-5 text-[#39FF14]" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-[#FF3B30]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{transaction.category}</span>
                              <span className="text-xs text-[#A1A1AA]">{transaction.date}</span>
                            </div>
                            {transaction.description && (
                              <p className="text-sm text-[#A1A1AA]">{transaction.description}</p>
                            )}
                          </div>
                          <div className={`font-data text-xl ${
                            transaction.type === 'income' ? 'text-[#39FF14]' : 'text-[#FF3B30]'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toFixed(2)}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTransaction(transaction.transaction_id)}
                            className="text-[#52525B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                          >
                            <Trash2 className="w-4 h-4" />
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
                    <Button data-testid="budget-create-btn" className="bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Orçamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white">
                    <DialogHeader>
                      <DialogTitle className="font-heading text-2xl">NOVO ORÇAMENTO</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Categoria</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setNewBudget({...newBudget, category: cat})}
                              className={`py-2 px-3 rounded-sm text-xs uppercase tracking-wider transition-colors ${
                                newBudget.category === cat
                                  ? 'bg-[#007AFF] text-white'
                                  : 'bg-[#121212] text-[#A1A1AA] hover:bg-[#1C1C1E]'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Tipo</Label>
                        <div className="flex gap-2">
                          {[{value: 'fixed', label: 'Valor Fixo'}, {value: 'percentage', label: 'Percentual'}].map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setNewBudget({...newBudget, budget_type: type.value})}
                              className={`flex-1 py-2 px-4 rounded-sm uppercase text-xs tracking-wider transition-colors ${
                                newBudget.budget_type === type.value
                                  ? 'bg-[#007AFF] text-white'
                                  : 'bg-[#121212] text-[#A1A1AA] hover:bg-[#1C1C1E]'
                              }`}
                            >
                              {type.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {newBudget.budget_type === 'fixed' ? (
                        <div>
                          <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Limite (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newBudget.limit}
                            onChange={(e) => setNewBudget({...newBudget, limit: e.target.value})}
                            className="bg-[#121212] border-[#27272A] text-white font-mono"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Percentual da Renda (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={newBudget.percentage}
                            onChange={(e) => setNewBudget({...newBudget, percentage: e.target.value})}
                            className="bg-[#121212] border-[#27272A] text-white font-mono"
                          />
                        </div>
                      )}
                      <div>
                        <Label className="text-[#A1A1AA] uppercase text-xs tracking-wider mb-2 block">Mês</Label>
                        <Input
                          type="month"
                          value={newBudget.month}
                          onChange={(e) => setNewBudget({...newBudget, month: e.target.value})}
                          className="bg-[#121212] border-[#27272A] text-white font-mono"
                        />
                      </div>
                      <Button onClick={handleCreateBudget} className="w-full bg-[#007AFF] hover:bg-[#0062CC] uppercase text-xs tracking-widest">
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
                    const isOverBudget = percentage > 100;
                    return (
                      <Card key={budget.budget_id} className={`bg-[#0A0A0A] border-[#27272A] p-6 ${isOverBudget ? 'border-[#FF3B30]' : ''}`}>
                        {isOverBudget && (
                          <div className="flex items-center space-x-2 mb-3 text-[#FF3B30]">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm uppercase tracking-wider">Orçamento Estourado</span>
                          </div>
                        )}
                        <h3 className="font-heading text-xl mb-4">{budget.category.toUpperCase()}</h3>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Gasto</span>
                            <span className="font-data">R$ {budget.spent.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-[#A1A1AA]">Limite</span>
                            <span className="font-data">R$ {budget.limit.toFixed(2)} {budget.budget_type === 'percentage' && `(${budget.percentage}%)`}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className={percentage > 100 ? 'text-[#FF3B30]' : 'text-[#A1A1AA]'}>
                              {percentage.toFixed(0)}%
                            </span>
                            <span className="font-data text-xs text-[#A1A1AA]">
                              {budget.limit - budget.spent > 0 ? `R$ ${(budget.limit - budget.spent).toFixed(2)} restante` : 'Estourado'}
                            </span>
                          </div>
                          <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${isOverBudget ? 'bg-[#FF3B30]' : 'bg-[#007AFF]'}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
