import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import NotificationBell from "@/components/NotificationBell";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Calendar,
  Clock,
  Dumbbell,
  History,
  LogOut,
  User,
  Video,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type Tab = "upcoming" | "history" | "trainers";

function formatDate(ms: number) {
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function statusBadge(status: string) {
  if (status === "scheduled") return <Badge className="bg-primary/20 text-primary border-primary/30">Agendada</Badge>;
  if (status === "completed") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Concluída</Badge>;
  return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Cancelada</Badge>;
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("upcoming");

  const isStudent = user?.appRole === "student";
  const { data: upcoming, isLoading: loadingUpcoming } = trpc.sessions.upcoming.useQuery(undefined, { enabled: isStudent });
  const { data: history, isLoading: loadingHistory } = trpc.sessions.history.useQuery(undefined, { enabled: isStudent });
  const { data: trainers, isLoading: loadingTrainers } = trpc.profiles.listTrainers.useQuery(undefined, { enabled: isStudent });

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "upcoming", label: "Próximas Sessões", icon: Calendar },
    { id: "history", label: "Histórico", icon: History },
    { id: "trainers", label: "Personal Trainers", icon: Dumbbell },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-border/50 bg-sidebar flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-sidebar-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sidebar-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                FitConnect
              </span>
            </div>
            <NotificationBell />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Aluno</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === item.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 ml-64 p-8">
        {/* ── Upcoming Sessions ── */}
        {tab === "upcoming" && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Próximas Sessões
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Seus treinos agendados com personal trainers</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <Card className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{upcoming?.length ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Sessões Agendadas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <History className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {history?.filter((h) => h.status === "completed").length ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Treinos Concluídos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {history?.filter((h) => h.status === "completed").reduce((acc, h) => acc + h.durationMinutes, 0) ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Minutos Treinados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {loadingUpcoming ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-card animate-pulse" />)}
              </div>
            ) : upcoming?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhuma sessão agendada</p>
                <p className="text-sm mt-1">Aguarde seu personal trainer agendar uma sessão.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming?.map((s) => (
                  <Card key={s.id} className="bg-card border-border/50 hover:border-border transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Video className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{s.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Trainer: {s.trainer?.name ?? "—"}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(s.scheduledAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {s.durationMinutes} min
                              </span>
                            </div>
                            {s.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">"{s.notes}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {statusBadge(s.status)}
                          <Button
                            size="sm"
                            onClick={() => navigate(`/session/${s.roomName}`)}
                            className="bg-primary text-primary-foreground hover:opacity-90 gap-1.5 text-xs"
                          >
                            <Video className="h-3 w-3" />
                            Entrar na Sala
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── History ── */}
        {tab === "history" && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Histórico de Treinos
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Todos os seus treinos realizados</p>
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />)}
              </div>
            ) : history?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhum treino no histórico ainda</p>
                <p className="text-sm mt-1">Seus treinos realizados aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history?.map((s) => (
                  <Card key={s.id} className="bg-card border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <History className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{s.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Trainer: {s.trainer?.name ?? "—"} · {formatDate(s.scheduledAt)} · {s.durationMinutes} min
                            </p>
                          </div>
                        </div>
                        {statusBadge(s.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Trainers ── */}
        {tab === "trainers" && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Personal Trainers
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Conheça os trainers disponíveis na plataforma</p>
            </div>

            {loadingTrainers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-card animate-pulse" />)}
              </div>
            ) : trainers?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhum trainer disponível ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainers?.map(({ user: t, profile }) => (
                  <Card key={t.id} className="bg-card border-border/50 hover:border-border transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {getInitials(t.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{t.name ?? "Sem nome"}</p>
                          <p className="text-xs text-primary truncate">{profile?.specialty ?? "Personal Trainer"}</p>
                        </div>
                      </div>
                      {profile?.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{profile.bio}</p>
                      )}
                      {profile?.experience && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {profile.experience}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
