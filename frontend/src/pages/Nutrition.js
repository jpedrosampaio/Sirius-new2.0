import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import axios from "axios";
import { 
  Apple, Plus, Trash2, Droplets, Target, ChefHat, 
  Flame, Drumstick, Wheat, Droplet, Settings, Sparkles,
  UtensilsCrossed, Clock, ChevronLeft, ChevronRight, Loader2,
  Coffee, Sun, Moon, Cookie
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const mealTypeIcons = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie
};

const mealTypeLabels = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche"
};

export default function Nutrition() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [goals, setGoals] = useState(null);
  const [waterData, setWaterData] = useState({ total_ml: 0 });
  const [recipes, setRecipes] = useState([]);
  const [diets, setDiets] = useState([]);
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [showGoalsDialog, setShowGoalsDialog] = useState(false);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [suggestedRecipe, setSuggestedRecipe] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Meal form state
  const [mealForm, setMealForm] = useState({
    name: "",
    meal_type: "lunch",
    foods: [],
    notes: ""
  });

  // Food being added
  const [newFood, setNewFood] = useState({
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    quantity: 1
  });

  // Goals form
  const [goalsForm, setGoalsForm] = useState({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 250,
    daily_fat: 65,
    water_goal_ml: 2000
  });

  // Recipe preferences
  const [recipePreferences, setRecipePreferences] = useState({
    meal_type: "",
    diet_type: "",
    max_prep_time_minutes: 60,
    cuisine: "",
    restrictions: [],
    available_ingredients: []
  });

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch (error) {
      window.location.href = '/login';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mealsRes, statsRes, goalsRes, waterRes, recipesRes, dietsRes] = await Promise.all([
        axios.get(`${API}/nutrition/meals?date=${selectedDate}`, { withCredentials: true }),
        axios.get(`${API}/nutrition/stats?date=${selectedDate}`, { withCredentials: true }),
        axios.get(`${API}/nutrition/goals`, { withCredentials: true }),
        axios.get(`${API}/nutrition/water?date=${selectedDate}`, { withCredentials: true }),
        axios.get(`${API}/nutrition/recipes`, { withCredentials: true }),
        axios.get(`${API}/nutrition/diets`, { withCredentials: true })
      ]);
      setMeals(Array.isArray(mealsRes.data) ? mealsRes.data : []);
      setStats(statsRes.data || null);
      setGoals(goalsRes.data || null);
      setGoalsForm(goalsRes.data || {});
      setWaterData(waterRes.data || { total_ml: 0, logs: [] });
      setRecipes(Array.isArray(recipesRes.data) ? recipesRes.data : []);
      setDiets(Array.isArray(dietsRes.data) ? dietsRes.data : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFood = () => {
    if (!newFood.name) {
      toast.error("Digite o nome do alimento");
      return;
    }
    setMealForm(prev => ({
      ...prev,
      foods: [...prev.foods, { ...newFood }]
    }));
    setNewFood({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, quantity: 1 });
  };

  const handleRemoveFood = (index) => {
    setMealForm(prev => ({
      ...prev,
      foods: prev.foods.filter((_, i) => i !== index)
    }));
  };

  const handleCreateMeal = async () => {
    if (!mealForm.name || mealForm.foods.length === 0) {
      toast.error("Preencha o nome e adicione alimentos");
      return;
    }
    try {
      await axios.post(`${API}/nutrition/meals`, {
        ...mealForm,
        date: selectedDate
      }, { withCredentials: true });
      toast.success("Refeição registrada!");
      setShowMealDialog(false);
      setMealForm({ name: "", meal_type: "lunch", foods: [], notes: "" });
      fetchData();
    } catch (error) {
      toast.error("Erro ao criar refeição");
    }
  };

  const handleDeleteMeal = async (mealId) => {
    try {
      await axios.delete(`${API}/nutrition/meals/${mealId}`, { withCredentials: true });
      toast.success("Refeição removida");
      fetchData();
    } catch (error) {
      toast.error("Erro ao remover refeição");
    }
  };

  const handleUpdateGoals = async () => {
    try {
      await axios.put(`${API}/nutrition/goals`, goalsForm, { withCredentials: true });
      toast.success("Metas atualizadas!");
      setShowGoalsDialog(false);
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar metas");
    }
  };

  const handleLogWater = async (amount) => {
    try {
      await axios.post(`${API}/nutrition/water?amount_ml=${amount}&date=${selectedDate}`, {}, { withCredentials: true });
      toast.success(`+${amount}ml de água`);
      fetchData();
    } catch (error) {
      toast.error("Erro ao registrar água");
    }
  };

  const handleSuggestRecipe = async () => {
    setGeneratingRecipe(true);
    setSuggestedRecipe(null);
    try {
      const res = await axios.post(`${API}/nutrition/recipes/suggest`, recipePreferences, { withCredentials: true });
      setSuggestedRecipe(res.data);
      toast.success("Receita sugerida!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao gerar receita. Tente novamente.");
    } finally {
      setGeneratingRecipe(false);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    try {
      await axios.delete(`${API}/nutrition/recipes/${recipeId}`, { withCredentials: true });
      toast.success("Receita removida");
      fetchData();
    } catch (error) {
      toast.error("Erro ao remover receita");
    }
  };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const getProgressColor = (consumed, goal) => {
    const percentage = (consumed / goal) * 100;
    if (percentage < 50) return "bg-blue-500";
    if (percentage < 80) return "bg-green-500";
    if (percentage < 100) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <Sidebar user={user} />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-heading text-[#00F0FF]">Alimentação</h1>
            <p className="text-[#A1A1AA]">Controle sua nutrição e alcance seus objetivos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 bg-[#121212] border-[#27272A]"
            />
            <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#121212] border border-[#27272A]">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="meals">Refeições</TabsTrigger>
            <TabsTrigger value="recipes">Receitas</TabsTrigger>
            <TabsTrigger value="diets">Dietas</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Macros Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Calories */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">Calorias</span>
                    </div>
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      {stats?.consumed?.calories || 0} / {goals?.daily_calories || 2000}
                    </Badge>
                  </div>
                  <Progress 
                    value={((stats?.consumed?.calories || 0) / (goals?.daily_calories || 2000)) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-[#A1A1AA] mt-2">
                    Restam: {stats?.remaining?.calories || 0} kcal
                  </p>
                </CardContent>
              </Card>

              {/* Protein */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Drumstick className="w-5 h-5 text-red-500" />
                      <span className="font-medium">Proteína</span>
                    </div>
                    <Badge variant="outline" className="border-red-500 text-red-500">
                      {stats?.consumed?.protein || 0}g / {goals?.daily_protein || 150}g
                    </Badge>
                  </div>
                  <Progress 
                    value={((stats?.consumed?.protein || 0) / (goals?.daily_protein || 150)) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-[#A1A1AA] mt-2">
                    Restam: {stats?.remaining?.protein || 0}g
                  </p>
                </CardContent>
              </Card>

              {/* Carbs */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Wheat className="w-5 h-5 text-yellow-500" />
                      <span className="font-medium">Carboidratos</span>
                    </div>
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      {stats?.consumed?.carbs || 0}g / {goals?.daily_carbs || 250}g
                    </Badge>
                  </div>
                  <Progress 
                    value={((stats?.consumed?.carbs || 0) / (goals?.daily_carbs || 250)) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-[#A1A1AA] mt-2">
                    Restam: {stats?.remaining?.carbs || 0}g
                  </p>
                </CardContent>
              </Card>

              {/* Fat */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Droplet className="w-5 h-5 text-purple-500" />
                      <span className="font-medium">Gordura</span>
                    </div>
                    <Badge variant="outline" className="border-purple-500 text-purple-500">
                      {stats?.consumed?.fat || 0}g / {goals?.daily_fat || 65}g
                    </Badge>
                  </div>
                  <Progress 
                    value={((stats?.consumed?.fat || 0) / (goals?.daily_fat || 65)) * 100} 
                    className="h-2"
                  />
                  <p className="text-sm text-[#A1A1AA] mt-2">
                    Restam: {stats?.remaining?.fat || 0}g
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Water and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Water Tracker */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-500" />
                    Hidratação
                  </CardTitle>
                  <CardDescription>
                    {waterData.total_ml}ml de {goals?.water_goal_ml || 2000}ml
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={(waterData.total_ml / (goals?.water_goal_ml || 2000)) * 100} 
                    className="h-4 mb-4"
                  />
                  <div className="flex flex-wrap gap-2">
                    {[200, 300, 500].map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => handleLogWater(amount)}
                        className="border-blue-500/50 hover:bg-blue-500/20"
                      >
                        <Droplets className="w-4 h-4 mr-2" />
                        +{amount}ml
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Dialog open={showMealDialog} onOpenChange={setShowMealDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-[#007AFF] hover:bg-[#0066CC]">
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar Refeição
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Nova Refeição</DialogTitle>
                        <DialogDescription>Registre sua refeição com os alimentos consumidos</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Nome da Refeição</Label>
                            <Input
                              value={mealForm.name}
                              onChange={(e) => setMealForm({...mealForm, name: e.target.value})}
                              placeholder="Ex: Almoço completo"
                              className="bg-[#121212] border-[#27272A]"
                            />
                          </div>
                          <div>
                            <Label>Tipo</Label>
                            <Select value={mealForm.meal_type} onValueChange={(v) => setMealForm({...mealForm, meal_type: v})}>
                              <SelectTrigger className="bg-[#121212] border-[#27272A]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="breakfast">Café da Manhã</SelectItem>
                                <SelectItem value="lunch">Almoço</SelectItem>
                                <SelectItem value="dinner">Jantar</SelectItem>
                                <SelectItem value="snack">Lanche</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Add Food Section */}
                        <div className="border border-[#27272A] rounded-lg p-4">
                          <h4 className="font-medium mb-3">Adicionar Alimento</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                            <Input
                              placeholder="Nome do alimento"
                              value={newFood.name}
                              onChange={(e) => setNewFood({...newFood, name: e.target.value})}
                              className="bg-[#121212] border-[#27272A]"
                            />
                            <Input
                              type="number"
                              placeholder="Calorias"
                              value={newFood.calories || ""}
                              onChange={(e) => setNewFood({...newFood, calories: Number(e.target.value)})}
                              className="bg-[#121212] border-[#27272A]"
                            />
                            <Input
                              type="number"
                              placeholder="Proteína (g)"
                              value={newFood.protein || ""}
                              onChange={(e) => setNewFood({...newFood, protein: Number(e.target.value)})}
                              className="bg-[#121212] border-[#27272A]"
                            />
                            <Input
                              type="number"
                              placeholder="Carboidratos (g)"
                              value={newFood.carbs || ""}
                              onChange={(e) => setNewFood({...newFood, carbs: Number(e.target.value)})}
                              className="bg-[#121212] border-[#27272A]"
                            />
                            <Input
                              type="number"
                              placeholder="Gordura (g)"
                              value={newFood.fat || ""}
                              onChange={(e) => setNewFood({...newFood, fat: Number(e.target.value)})}
                              className="bg-[#121212] border-[#27272A]"
                            />
                            <Input
                              type="number"
                              placeholder="Quantidade"
                              value={newFood.quantity}
                              onChange={(e) => setNewFood({...newFood, quantity: Number(e.target.value)})}
                              className="bg-[#121212] border-[#27272A]"
                            />
                          </div>
                          <Button onClick={handleAddFood} variant="outline" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Alimento
                          </Button>
                        </div>

                        {/* Foods List */}
                        {mealForm.foods.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium">Alimentos Adicionados</h4>
                            {mealForm.foods.map((food, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-[#121212] p-3 rounded-lg">
                                <div>
                                  <span className="font-medium">{food.name}</span>
                                  <span className="text-sm text-[#A1A1AA] ml-2">
                                    x{food.quantity} | {food.calories * food.quantity}kcal
                                  </span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveFood(idx)}>
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <Button onClick={handleCreateMeal} className="w-full bg-[#007AFF]" disabled={mealForm.foods.length === 0}>
                          Salvar Refeição
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showGoalsDialog} onOpenChange={setShowGoalsDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Target className="w-4 h-4 mr-2" />
                        Definir Metas
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0A0A0A] border-[#27272A]">
                      <DialogHeader>
                        <DialogTitle>Metas Nutricionais</DialogTitle>
                        <DialogDescription>Configure suas metas diárias</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Calorias Diárias</Label>
                          <Input
                            type="number"
                            value={goalsForm.daily_calories}
                            onChange={(e) => setGoalsForm({...goalsForm, daily_calories: Number(e.target.value)})}
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <div>
                          <Label>Proteína (g)</Label>
                          <Input
                            type="number"
                            value={goalsForm.daily_protein}
                            onChange={(e) => setGoalsForm({...goalsForm, daily_protein: Number(e.target.value)})}
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <div>
                          <Label>Carboidratos (g)</Label>
                          <Input
                            type="number"
                            value={goalsForm.daily_carbs}
                            onChange={(e) => setGoalsForm({...goalsForm, daily_carbs: Number(e.target.value)})}
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <div>
                          <Label>Gordura (g)</Label>
                          <Input
                            type="number"
                            value={goalsForm.daily_fat}
                            onChange={(e) => setGoalsForm({...goalsForm, daily_fat: Number(e.target.value)})}
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <div>
                          <Label>Água (ml)</Label>
                          <Input
                            type="number"
                            value={goalsForm.water_goal_ml}
                            onChange={(e) => setGoalsForm({...goalsForm, water_goal_ml: Number(e.target.value)})}
                            className="bg-[#121212] border-[#27272A]"
                          />
                        </div>
                        <Button onClick={handleUpdateGoals} className="w-full bg-[#007AFF]">
                          Salvar Metas
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full border-green-500/50 hover:bg-green-500/20">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Sugerir Receita com IA
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0A0A0A] border-[#27272A] max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <ChefHat className="w-5 h-5 text-green-500" />
                          Sugestão de Receita com IA
                        </DialogTitle>
                        <DialogDescription>Diga suas preferências e receba uma receita personalizada</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {!suggestedRecipe ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Tipo de Refeição</Label>
                                <Select 
                                  value={recipePreferences.meal_type || "any"} 
                                  onValueChange={(v) => setRecipePreferences({...recipePreferences, meal_type: v === "any" ? "" : v})}
                                >
                                  <SelectTrigger className="bg-[#121212] border-[#27272A]">
                                    <SelectValue placeholder="Qualquer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Qualquer</SelectItem>
                                    <SelectItem value="breakfast">Café da Manhã</SelectItem>
                                    <SelectItem value="lunch">Almoço</SelectItem>
                                    <SelectItem value="dinner">Jantar</SelectItem>
                                    <SelectItem value="snack">Lanche</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Tipo de Dieta</Label>
                                <Select 
                                  value={recipePreferences.diet_type || "any"} 
                                  onValueChange={(v) => setRecipePreferences({...recipePreferences, diet_type: v === "any" ? "" : v})}
                                >
                                  <SelectTrigger className="bg-[#121212] border-[#27272A]">
                                    <SelectValue placeholder="Balanceada" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Balanceada</SelectItem>
                                    <SelectItem value="high-protein">Alta Proteína</SelectItem>
                                    <SelectItem value="low-carb">Low Carb</SelectItem>
                                    <SelectItem value="keto">Cetogênica</SelectItem>
                                    <SelectItem value="vegetarian">Vegetariana</SelectItem>
                                    <SelectItem value="vegan">Vegana</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Culinária</Label>
                                <Select 
                                  value={recipePreferences.cuisine || "any"} 
                                  onValueChange={(v) => setRecipePreferences({...recipePreferences, cuisine: v === "any" ? "" : v})}
                                >
                                  <SelectTrigger className="bg-[#121212] border-[#27272A]">
                                    <SelectValue placeholder="Qualquer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Qualquer</SelectItem>
                                    <SelectItem value="brasileira">Brasileira</SelectItem>
                                    <SelectItem value="italiana">Italiana</SelectItem>
                                    <SelectItem value="japonesa">Japonesa</SelectItem>
                                    <SelectItem value="mexicana">Mexicana</SelectItem>
                                    <SelectItem value="fitness">Fitness</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Tempo Máximo (min)</Label>
                                <Input
                                  type="number"
                                  value={recipePreferences.max_prep_time_minutes}
                                  onChange={(e) => setRecipePreferences({...recipePreferences, max_prep_time_minutes: Number(e.target.value)})}
                                  className="bg-[#121212] border-[#27272A]"
                                />
                              </div>
                            </div>
                            <Button 
                              onClick={handleSuggestRecipe} 
                              className="w-full bg-green-600 hover:bg-green-700"
                              disabled={generatingRecipe}
                            >
                              {generatingRecipe ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Gerando Receita...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  Gerar Receita
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-[#121212] p-4 rounded-lg">
                              <h3 className="text-xl font-bold text-[#00F0FF] mb-2">{suggestedRecipe.name}</h3>
                              <p className="text-[#A1A1AA] mb-4">{suggestedRecipe.description}</p>
                              
                              <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="text-center p-2 bg-[#0A0A0A] rounded">
                                  <Flame className="w-4 h-4 mx-auto text-orange-500" />
                                  <span className="text-sm">{suggestedRecipe.calories_per_serving} kcal</span>
                                </div>
                                <div className="text-center p-2 bg-[#0A0A0A] rounded">
                                  <Drumstick className="w-4 h-4 mx-auto text-red-500" />
                                  <span className="text-sm">{suggestedRecipe.protein_per_serving}g P</span>
                                </div>
                                <div className="text-center p-2 bg-[#0A0A0A] rounded">
                                  <Wheat className="w-4 h-4 mx-auto text-yellow-500" />
                                  <span className="text-sm">{suggestedRecipe.carbs_per_serving}g C</span>
                                </div>
                                <div className="text-center p-2 bg-[#0A0A0A] rounded">
                                  <Droplet className="w-4 h-4 mx-auto text-purple-500" />
                                  <span className="text-sm">{suggestedRecipe.fat_per_serving}g G</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-[#A1A1AA] mb-4">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  Preparo: {suggestedRecipe.prep_time_minutes}min
                                </span>
                                <span className="flex items-center gap-1">
                                  <UtensilsCrossed className="w-4 h-4" />
                                  Cozimento: {suggestedRecipe.cook_time_minutes}min
                                </span>
                                <span>Porções: {suggestedRecipe.servings}</span>
                              </div>

                              <div className="mb-4">
                                <h4 className="font-medium mb-2">Ingredientes</h4>
                                <ul className="list-disc list-inside space-y-1 text-[#A1A1AA]">
                                  {suggestedRecipe.ingredients?.map((ing, idx) => (
                                    <li key={idx}>{ing.quantity} {ing.unit} de {ing.name}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="mb-4">
                                <h4 className="font-medium mb-2">Modo de Preparo</h4>
                                <ol className="list-decimal list-inside space-y-2 text-[#A1A1AA]">
                                  {suggestedRecipe.instructions?.map((step, idx) => (
                                    <li key={idx}>{step}</li>
                                  ))}
                                </ol>
                              </div>

                              {suggestedRecipe.tips && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                  <h4 className="font-medium text-green-400 mb-1">💡 Dica</h4>
                                  <p className="text-sm text-[#A1A1AA]">{suggestedRecipe.tips}</p>
                                </div>
                              )}
                            </div>

                            <Button 
                              onClick={() => setSuggestedRecipe(null)} 
                              variant="outline" 
                              className="w-full"
                            >
                              Gerar Nova Receita
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            {/* Today's Meals Summary */}
            <Card className="bg-[#0A0A0A] border-[#27272A]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-[#007AFF]" />
                  Refeições de Hoje ({meals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {meals.length === 0 ? (
                  <p className="text-center text-[#A1A1AA] py-8">
                    Nenhuma refeição registrada hoje
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {meals.map(meal => {
                      const MealIcon = mealTypeIcons[meal.meal_type] || UtensilsCrossed;
                      return (
                        <div key={meal.meal_id} className="bg-[#121212] p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <MealIcon className="w-4 h-4 text-[#007AFF]" />
                              <span className="font-medium">{meal.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.meal_id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="mb-2">{mealTypeLabels[meal.meal_type]}</Badge>
                          <div className="grid grid-cols-4 gap-2 text-xs text-[#A1A1AA]">
                            <span>{meal.total_calories} kcal</span>
                            <span>{meal.total_protein}g P</span>
                            <span>{meal.total_carbs}g C</span>
                            <span>{meal.total_fat}g G</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meals Tab */}
          <TabsContent value="meals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Refeições</h2>
              <Button onClick={() => setShowMealDialog(true)} className="bg-[#007AFF]">
                <Plus className="w-4 h-4 mr-2" />
                Nova Refeição
              </Button>
            </div>

            {["breakfast", "lunch", "dinner", "snack"].map(mealType => {
              const typeMeals = meals.filter(m => m.meal_type === mealType);
              const MealIcon = mealTypeIcons[mealType];
              
              return (
                <Card key={mealType} className="bg-[#0A0A0A] border-[#27272A]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MealIcon className="w-5 h-5" />
                      {mealTypeLabels[mealType]}
                      <Badge variant="outline">{typeMeals.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {typeMeals.length === 0 ? (
                      <p className="text-[#A1A1AA] text-center py-4">Nenhuma refeição registrada</p>
                    ) : (
                      <div className="space-y-3">
                        {typeMeals.map(meal => (
                          <div key={meal.meal_id} className="bg-[#121212] p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">{meal.name}</h4>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteMeal(meal.meal_id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mb-3">
                              <div className="text-center">
                                <Flame className="w-4 h-4 mx-auto text-orange-500" />
                                <span className="text-sm">{meal.total_calories} kcal</span>
                              </div>
                              <div className="text-center">
                                <Drumstick className="w-4 h-4 mx-auto text-red-500" />
                                <span className="text-sm">{meal.total_protein}g</span>
                              </div>
                              <div className="text-center">
                                <Wheat className="w-4 h-4 mx-auto text-yellow-500" />
                                <span className="text-sm">{meal.total_carbs}g</span>
                              </div>
                              <div className="text-center">
                                <Droplet className="w-4 h-4 mx-auto text-purple-500" />
                                <span className="text-sm">{meal.total_fat}g</span>
                              </div>
                            </div>
                            {meal.foods?.length > 0 && (
                              <div className="border-t border-[#27272A] pt-3 mt-3">
                                <span className="text-xs text-[#A1A1AA]">Alimentos:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {meal.foods.map((food, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {food.name} x{food.quantity}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Recipes Tab */}
          <TabsContent value="recipes" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Minhas Receitas</h2>
              <Button onClick={() => setShowRecipeDialog(true)} className="bg-green-600 hover:bg-green-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Nova Receita com IA
              </Button>
            </div>

            {recipes.length === 0 ? (
              <Card className="bg-[#0A0A0A] border-[#27272A]">
                <CardContent className="text-center py-12">
                  <ChefHat className="w-12 h-12 mx-auto text-[#A1A1AA] mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma receita salva</h3>
                  <p className="text-[#A1A1AA] mb-4">Use a IA para gerar receitas personalizadas!</p>
                  <Button onClick={() => setShowRecipeDialog(true)} className="bg-green-600">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Receita
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map(recipe => (
                  <Card key={recipe.recipe_id} className="bg-[#0A0A0A] border-[#27272A]">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{recipe.name}</CardTitle>
                          <CardDescription>{recipe.description}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRecipe(recipe.recipe_id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="flex items-center gap-1 text-sm text-[#A1A1AA]">
                          <Clock className="w-4 h-4" />
                          {recipe.prep_time_minutes + recipe.cook_time_minutes}min
                        </div>
                        <div className="flex items-center gap-1 text-sm text-[#A1A1AA]">
                          <UtensilsCrossed className="w-4 h-4" />
                          {recipe.servings} porções
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <span className="text-orange-500">{recipe.calories_per_serving}</span>
                          <span className="block text-[#A1A1AA]">kcal</span>
                        </div>
                        <div>
                          <span className="text-red-500">{recipe.protein_per_serving}g</span>
                          <span className="block text-[#A1A1AA]">P</span>
                        </div>
                        <div>
                          <span className="text-yellow-500">{recipe.carbs_per_serving}g</span>
                          <span className="block text-[#A1A1AA]">C</span>
                        </div>
                        <div>
                          <span className="text-purple-500">{recipe.fat_per_serving}g</span>
                          <span className="block text-[#A1A1AA]">G</span>
                        </div>
                      </div>
                      {recipe.ai_generated && (
                        <Badge className="mt-3 bg-green-500/20 text-green-400">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Gerada por IA
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Diets Tab */}
          <TabsContent value="diets" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Planos de Dieta</h2>
            </div>

            <Card className="bg-[#0A0A0A] border-[#27272A]">
              <CardContent className="text-center py-12">
                <Apple className="w-12 h-12 mx-auto text-[#A1A1AA] mb-4" />
                <h3 className="text-lg font-medium mb-2">Planos de Dieta</h3>
                <p className="text-[#A1A1AA]">Em breve: Crie e gerencie planos alimentares personalizados</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav user={user} />
    </div>
  );
}
