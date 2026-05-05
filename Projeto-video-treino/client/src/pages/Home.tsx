import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { Activity, Calendar, Clock, Shield, Star, Users, Video, Zap } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6 },
  }),
};

const features = [
  {
    icon: Video,
    title: "Videoconferência em Tempo Real",
    desc: "Sessões ao vivo com Jitsi Meet integrado — sem instalação, direto no navegador.",
  },
  {
    icon: Calendar,
    title: "Agendamento Inteligente",
    desc: "Agende sessões com data, hora e duração personalizadas de forma simples.",
  },
  {
    icon: Users,
    title: "Conexão Trainer & Aluno",
    desc: "Perfis distintos para personal trainers e alunos com dashboards exclusivos.",
  },
  {
    icon: Clock,
    title: "Histórico Completo",
    desc: "Acompanhe todos os treinos realizados com data, participantes e duração.",
  },
  {
    icon: Shield,
    title: "Sala Privada por Sessão",
    desc: "Cada sessão gera um link único e exclusivo para máxima privacidade.",
  },
  {
    icon: Zap,
    title: "Experiência Premium",
    desc: "Interface elegante e fluida, projetada para uma experiência de uso refinada.",
  },
];

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (!user.onboardingDone) {
        navigate("/onboarding");
      } else if (user.appRole === "trainer") {
        navigate("/trainer/dashboard");
      } else if (user.appRole === "student") {
        navigate("/student/dashboard");
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              FitConnect
            </span>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-primary text-primary-foreground hover:opacity-90 font-medium px-6"
          >
            Entrar
          </Button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/8 blur-[120px]" />
        </div>

        <div className="container relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <Star className="h-3.5 w-3.5" />
            Plataforma Premium de Treinos Online
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-5xl md:text-7xl font-bold leading-tight mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Treinos Personalizados
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, oklch(0.85 0.16 80), oklch(0.65 0.12 60))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ao Vivo, em Qualquer Lugar
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Conecte-se com seu personal trainer em sessões de videoconferência em tempo real.
            Agende, treine e evolua — com a sofisticação que você merece.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              onClick={() => (window.location.href = getLoginUrl())}
              className="bg-primary text-primary-foreground hover:opacity-90 font-semibold px-10 py-6 text-base shadow-lg shadow-primary/20"
            >
              Começar Agora
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => (window.location.href = getLoginUrl())}
              className="border-border/60 text-foreground hover:bg-accent px-10 py-6 text-base"
            >
              Sou Personal Trainer
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 border-y border-border/40">
        <div className="container">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: "100%", label: "Ao Vivo" },
              { value: "HD", label: "Qualidade de Vídeo" },
              { value: "24/7", label: "Disponibilidade" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div
                  className="text-3xl md:text-4xl font-bold text-primary mb-1"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <h2
              className="text-3xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Tudo que você precisa
              <br />
              <span className="text-primary">em uma só plataforma</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Funcionalidades pensadas para trainers e alunos que valorizam qualidade e eficiência.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.5}
                className="group p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative rounded-3xl border border-primary/20 bg-card overflow-hidden p-12 text-center"
          >
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            <div className="relative z-10">
              <h2
                className="text-3xl md:text-5xl font-bold mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Pronto para transformar
                <br />
                <span className="text-primary">seus treinos?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Crie sua conta gratuitamente e comece a treinar com seu personal trainer hoje mesmo.
              </p>
              <Button
                size="lg"
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-primary text-primary-foreground hover:opacity-90 font-semibold px-12 py-6 text-base shadow-lg shadow-primary/25"
              >
                Criar Conta Gratuita
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── QR Code ── */}
      <section className="py-20 border-t border-border/40">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20"
          >
            {/* Texto */}
            <div className="flex-1 text-center lg:text-left">
              <span className="inline-block text-xs font-semibold tracking-widest text-primary uppercase mb-4">
                Acesso Móvel
              </span>
              <h2
                className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Treine de qualquer lugar,
                <br />
                <span className="text-primary">direto pelo celular</span>
              </h2>
              <p className="text-muted-foreground text-base md:text-lg mb-6 max-w-md mx-auto lg:mx-0">
                Aponte a câmera do seu smartphone para o QR Code e acesse a plataforma
                instantaneamente — sem instalação, sem complicacão.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  Funciona em Android e iOS
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  Videoconferência nativa
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  Câmera já ativa ao entrar
                </div>
              </div>
            </div>

            {/* QR Code Card */}
            <div className="flex-shrink-0">
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl pointer-events-none" />
                {/* Card */}
                <div className="relative bg-card border border-primary/30 rounded-2xl p-6 shadow-2xl shadow-primary/10">
                  <img
                    src="/manus-storage/fitconnect_qrcode_735c74e8.png"
                    alt="QR Code FitConnect"
                    className="w-52 h-52 md:w-64 md:h-64 rounded-xl object-contain"
                    loading="lazy"
                  />
                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">Aponte a câmera para acessar</p>
                    <p className="text-xs text-primary/70 mt-1 font-mono truncate max-w-[13rem] mx-auto">
                      meet.jit.si · FitConnect
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 border-t border-border/40">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            <span style={{ fontFamily: "'Playfair Display', serif" }}>FitConnect</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FitConnect. Plataforma de Treinos Personalizados.
          </p>
        </div>
      </footer>
    </div>
  );
}
