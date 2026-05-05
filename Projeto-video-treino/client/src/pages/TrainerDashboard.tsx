import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Calendar,
  CalendarPlus,
  CheckCircle,
  Clock,
  History,
  LogOut,
  User,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Tab = "upcoming" | "history" | "students" | "profile";

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

export default function TrainerDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Schedule form state
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const isTrainer = user?.appRole === "trainer";
  const { data: upcoming, isLoading: loadingUpcoming } = trpc.sessions.upcoming.useQuery(undefined, { enabled: isTrainer });
  const { data: history, isLoading: loadingHistory } = trpc.sessions.history.useQuery(undefined, { enabled: isTrainer });
  const { data: students, isLoading: loadingStudents } = trpc.profiles.listStudents.useQuery(undefined, { enabled: isTrainer });
  const { data: trainerProfile } = trpc.profiles.getMyTrainerProfile.useQuery(undefined, { enabled: isTrainer });

  const createSession = trpc.sessions.create.useMutation({
    onSuccess: () => {
      toast.success("Sessão agendada com sucesso!");
      setScheduleOpen(false);
      setTitle(""); setStudentId(""); setDateStr(""); setTimeStr(""); setNotes("");
      utils.sessions.upcoming.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelSession = trpc.sessions.cancel.useMutation({
    onSuccess: () => {
      toast.success("Sessão cancelada.");
      utils.sessions.upcoming.invalidate();
      utils.sessions.history.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeSession = trpc.sessions.complete.useMutation({
    onSuccess: () => {
      toast.success("Sessão marcada como concluída.");
      utils.sessions.upcoming.invalidate();
      utils.sessions.history.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title || !dateStr || !timeStr) return;
    const scheduledAt = new Date(`${dateStr}T${timeStr}`).getTime();
    createSession.mutate({
      studentId: Number(studentId),
      title,
      scheduledAt,
      durationMinutes: Number(duration),
      notes,
    });
  };

  const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "upcoming", label: "Próximas Sessões", icon: Calendar },
    { id: "history", label: "Histórico", icon: History },
    { id: "students", label: "Alunos", icon: Users },
    { id: "profile", label: "Meu Perfil", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-border/50 bg-sidebar flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sidebar-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              FitConnect
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Personal Trainer</p>
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Próximas Sessões
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Gerencie seus treinos agendados</p>
              </div>
              <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:opacity-90 gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Agendar Sessão
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-md">
                  <DialogHeader>
                    <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
                      Nova Sessão de Treino
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSchedule} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Aluno *</Label>
                      <Select value={studentId} onValueChange={setStudentId}>
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue placeholder="Selecione o aluno" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {students?.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name ?? s.email ?? `Aluno #${s.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Título da Sessão *</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Treino de Força — Membros Superiores"
                        className="bg-input border-border"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Data *</Label>
                        <Input
                          type="date"
                          value={dateStr}
                          onChange={(e) => setDateStr(e.target.value)}
                          className="bg-input border-border"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horário *</Label>
                        <Input
                          type="time"
                          value={timeStr}
                          onChange={(e) => setTimeStr(e.target.value)}
                          className="bg-input border-border"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Duração</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {["30", "45", "60", "90", "120"].map((d) => (
                            <SelectItem key={d} value={d}>{d} minutos</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notas sobre o treino..."
                        rows={2}
                        className="bg-input border-border resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={createSession.isPending}
                      className="w-full bg-primary text-primary-foreground hover:opacity-90"
                    >
                      {createSession.isPending ? "Agendando..." : "Confirmar Agendamento"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingUpcoming ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-card animate-pulse" />
                ))}
              </div>
            ) : upcoming?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhuma sessão agendada</p>
                <p className="text-sm mt-1">Agende uma nova sessão para começar.</p>
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
                              Aluno: {s.student?.name ?? "—"}
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
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                          {statusBadge(s.status)}

                          {/* Entrar na sala — sempre disponível para sessões scheduled */}
                          {s.status === "scheduled" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/session/${s.roomName}`)}
                                  className="bg-primary text-primary-foreground hover:opacity-90 gap-1.5 text-xs"
                                >
                                  <Video className="h-3 w-3" />
                                  Entrar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Entrar na videochamada</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Marcar como Concluída — só para sessões scheduled */}
                          {s.status === "scheduled" && (
                            <Dialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={completeSession.isPending}
                                      className="border-green-500/40 text-green-400 hover:bg-green-500/10 hover:border-green-500/60 gap-1.5 text-xs"
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                      Concluir
                                    </Button>
                                  </DialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Marcar sessão como concluída</TooltipContent>
                              </Tooltip>
                              <DialogContent className="bg-card border-border/60 max-w-sm">
                                <DialogHeader>
                                  <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>
                                    Concluir Sessão
                                  </DialogTitle>
                                  <DialogDescription className="text-muted-foreground text-sm">
                                    Deseja marcar <span className="font-medium text-foreground">"{s.title}"</span> como concluída?
                                    Esta ação ficará registrada no histórico do aluno.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="gap-2 mt-2">
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">Cancelar</Button>
                                  </DialogTrigger>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      onClick={() => completeSession.mutate({ id: s.id })}
                                      disabled={completeSession.isPending}
                                      className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      {completeSession.isPending ? "Salvando..." : "Confirmar"}
                                    </Button>
                                  </DialogTrigger>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* Cancelar — só para sessões scheduled */}
                          {s.status === "scheduled" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelSession.mutate({ id: s.id })}
                                  disabled={cancelSession.isPending}
                                  className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Cancelar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancelar sessão</TooltipContent>
                            </Tooltip>
                          )}
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
              <p className="text-muted-foreground text-sm mt-1">Todas as sessões realizadas e canceladas</p>
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />)}
              </div>
            ) : history?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhum treino no histórico ainda</p>
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
                              Aluno: {s.student?.name ?? "—"} · {formatDate(s.scheduledAt)} · {s.durationMinutes} min
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

        {/* ── Students ── */}
        {tab === "students" && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Alunos
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Todos os alunos cadastrados na plataforma</p>
            </div>

            {loadingStudents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />)}
              </div>
            ) : students?.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Nenhum aluno cadastrado ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students?.map((s) => (
                  <Card key={s.id} className="bg-card border-border/50 hover:border-border transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {getInitials(s.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{s.name ?? "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.email ?? "—"}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setStudentId(String(s.id)); setTab("upcoming"); setScheduleOpen(true); }}
                        className="w-full border-border/60 text-foreground hover:bg-accent gap-2 text-xs"
                      >
                        <CalendarPlus className="h-3 w-3" />
                        Agendar Sessão
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Profile ── */}
        {tab === "profile" && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Meu Perfil
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Suas informações de personal trainer</p>
            </div>

            <div className="max-w-lg">
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {user?.name ?? "—"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {trainerProfile?.specialty ?? "Personal Trainer"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Email</p>
                      <p className="text-foreground">{user?.email ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Experiência</p>
                      <p className="text-foreground">{trainerProfile?.experience ?? "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Bio</p>
                      <p className="text-foreground">{trainerProfile?.bio ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
