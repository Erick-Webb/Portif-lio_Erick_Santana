import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Activity, ChevronRight, Dumbbell, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Step = "role" | "profile";
type AppRole = "trainer" | "student";

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<AppRole | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [phone, setPhone] = useState("");

  const complete = trpc.profiles.completeOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Perfil criado com sucesso!");
      if (role === "trainer") navigate("/trainer/dashboard");
      else navigate("/student/dashboard");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleRoleSelect = (r: AppRole) => {
    setRole(r);
    setStep("profile");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !name.trim()) return;
    complete.mutate({ appRole: role, name, specialty, bio, experience, phone });
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <span className="font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
          FitConnect
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-2 flex-1 rounded-full ${step === "role" ? "bg-primary" : "bg-primary"}`} />
            <div className={`h-2 flex-1 rounded-full ${step === "profile" ? "bg-primary" : "bg-border"}`} />
          </div>

          {step === "role" && (
            <div>
              <h1
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Bem-vindo ao FitConnect
              </h1>
              <p className="text-muted-foreground mb-10">
                Como você vai usar a plataforma?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleRoleSelect("trainer")}
                  className="group p-6 rounded-2xl border-2 border-border hover:border-primary bg-card hover:bg-card/80 text-left transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Personal Trainer</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerencie alunos, agende sessões e conduza treinos ao vivo.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium">
                    Selecionar <ChevronRight className="h-4 w-4" />
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect("student")}
                  className="group p-6 rounded-2xl border-2 border-border hover:border-primary bg-card hover:bg-card/80 text-left transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Aluno</h3>
                  <p className="text-sm text-muted-foreground">
                    Acesse suas sessões agendadas e acompanhe seu histórico de treinos.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium">
                    Selecionar <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === "profile" && (
            <form onSubmit={handleSubmit}>
              <button
                type="button"
                onClick={() => setStep("role")}
                className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1 transition-colors"
              >
                ← Voltar
              </button>

              <h1
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {role === "trainer" ? "Seu Perfil de Trainer" : "Seu Perfil de Aluno"}
              </h1>
              <p className="text-muted-foreground mb-8">
                Preencha suas informações para personalizar sua experiência.
              </p>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="bg-input border-border"
                  />
                </div>

                {role === "trainer" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Especialidade</Label>
                      <Input
                        id="specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Ex: Musculação, Funcional, Pilates..."
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Experiência</Label>
                      <Input
                        id="experience"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="Ex: 5 anos de experiência"
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio / Apresentação</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Conte um pouco sobre você e sua metodologia..."
                        rows={3}
                        className="bg-input border-border resize-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <Button
                type="submit"
                disabled={complete.isPending || !name.trim()}
                className="w-full mt-8 bg-primary text-primary-foreground hover:opacity-90 font-semibold py-6"
              >
                {complete.isPending ? "Criando perfil..." : "Concluir Cadastro"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
