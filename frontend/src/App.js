import React, { Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

// Lazy-loaded pages — keeps initial bundle small
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Tasks = React.lazy(() => import("@/pages/Tasks"));
const Habits = React.lazy(() => import("@/pages/Habits"));
const Finance = React.lazy(() => import("@/pages/Finance"));
const Goals = React.lazy(() => import("@/pages/Goals"));
const Chat = React.lazy(() => import("@/pages/Chat"));
const Reports = React.lazy(() => import("@/pages/Reports"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Workouts = React.lazy(() => import("@/pages/Workouts"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const Nutrition = React.lazy(() => import("@/pages/Nutrition"));
const Studies = React.lazy(() => import("@/pages/Studies"));
const Achievements = React.lazy(() => import("@/pages/Achievements"));

// Loading fallback for lazy pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050505]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[#27272A]" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#007AFF] animate-spin" />
        </div>
        <p className="text-sm text-[#52525B] uppercase tracking-widest font-medium">Carregando...</p>
      </div>
    </div>
  );
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/achievements" element={<ProtectedRoute><ErrorBoundary><Achievements /></ErrorBoundary></ProtectedRoute>} />
      </Routes>
    </Suspense>
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
