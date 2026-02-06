import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Tasks from "@/pages/Tasks";
import Habits from "@/pages/Habits";
import Finance from "@/pages/Finance";
import Goals from "@/pages/Goals";
import Chat from "@/pages/Chat";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import Workouts from "@/pages/Workouts";
import Notifications from "@/pages/Notifications";
import Nutrition from "@/pages/Nutrition";
import Studies from "@/pages/Studies";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><ErrorBoundary><Tasks /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/habits" element={<ProtectedRoute><ErrorBoundary><Habits /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><ErrorBoundary><Finance /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><ErrorBoundary><Goals /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ErrorBoundary><Chat /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ErrorBoundary><Reports /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ErrorBoundary><Profile /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/workouts" element={<ProtectedRoute><ErrorBoundary><Workouts /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><ErrorBoundary><Notifications /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/nutrition" element={<ProtectedRoute><ErrorBoundary><Nutrition /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/studies" element={<ProtectedRoute><ErrorBoundary><Studies /></ErrorBoundary></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;