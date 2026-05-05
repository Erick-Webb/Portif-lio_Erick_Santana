import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import TrainerDashboard from "./pages/TrainerDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import SessionRoom from "./pages/SessionRoom";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

function AuthGuard({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "trainer" | "student" }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    if (!user?.onboardingDone) {
      navigate("/onboarding");
      return;
    }
    if (requiredRole && user?.appRole !== requiredRole) {
      if (user?.appRole === "trainer") navigate("/trainer/dashboard");
      else navigate("/student/dashboard");
    }
  }, [loading, isAuthenticated, user, requiredRole, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/trainer/dashboard">
        <AuthGuard requiredRole="trainer">
          <TrainerDashboard />
        </AuthGuard>
      </Route>
      <Route path="/student/dashboard">
        <AuthGuard requiredRole="student">
          <StudentDashboard />
        </AuthGuard>
      </Route>
      <Route path="/session/:roomName">
        {(params) => (
          <AuthGuard>
            <SessionRoom />
          </AuthGuard>
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
