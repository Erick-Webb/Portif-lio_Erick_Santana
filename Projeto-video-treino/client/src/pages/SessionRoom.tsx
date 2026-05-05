/**
 * SessionRoom — Sala de Videoconferência FitConnect
 *
 * Estratégia de integração Jitsi Meet (otimizada para Android):
 *
 * 1. SALA REAL: usa o servidor público meet.jit.si com roomName único gerado
 *    pelo backend. A URL da sala é: https://meet.jit.si/<roomName>
 *
 * 2. ANDROID — duas opções:
 *    a) Deep link nativo: org.jitsi.meet://<roomName>  →  abre o app Jitsi Meet
 *       instalado. Detecta se o app abriu via visibilitychange (página fica hidden).
 *       Só abre o fallback web se o usuário clicar explicitamente.
 *    b) Fallback web: abre https://meet.jit.si/<roomName> em nova aba.
 *
 * 3. DESKTOP/iOS: usa o Jitsi Meet External API (IFrame API) carregada via
 *    script tag. O container do iframe é SEMPRE montado no DOM (display:none
 *    quando inativo) para que a ref esteja disponível ao inicializar a API.
 *
 * 4. DETECÇÃO DE PLATAFORMA: via navigator.userAgent.
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Smartphone,
  User,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";

// ─── Jitsi External API type declaration ────────────────────────────────────
declare global {
  interface Window {
    JitsiMeetExternalAPI: new (
      domain: string,
      options: JitsiOptions
    ) => JitsiAPI;
  }
}

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  userInfo?: { displayName?: string; email?: string };
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
  width?: string | number;
  height?: string | number;
  lang?: string;
}

interface JitsiAPI {
  dispose: () => void;
  addEventListener: (event: string, listener: () => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
}

// ─── Platform helpers ────────────────────────────────────────────────────────

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function jitsiRoomUrl(roomName: string): string {
  return `https://meet.jit.si/${encodeURIComponent(roomName)}`;
}

function jitsiDeepLink(roomName: string): string {
  // Pass config params via URL hash so the native app starts with camera+mic on
  return `org.jitsi.meet://${encodeURIComponent(roomName)}#config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
}

function jitsiWebUrl(roomName: string, displayName?: string): string {
  // URL with config hash params for web fallback — camera+mic on, no prejoin page
  const params = [
    "config.startWithAudioMuted=false",
    "config.startWithVideoMuted=false",
    "config.prejoinPageEnabled=false",
    "config.disableDeepLinking=true",
    displayName ? `userInfo.displayName=${encodeURIComponent(displayName)}` : "",
  ].filter(Boolean).join("&");
  return `https://meet.jit.si/${encodeURIComponent(roomName)}#${params}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SessionRoom() {
  const { roomName } = useParams<{ roomName: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Jitsi iframe — container is ALWAYS in the DOM so ref is always available
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<JitsiAPI | null>(null);

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [inCall, setInCall] = useState(false);

  // Android deep link state
  const [deepLinkSent, setDeepLinkSent] = useState(false);
  const [appOpened, setAppOpened] = useState(false);

  // Copy link state
  const [copied, setCopied] = useState(false);

  const android = isAndroid();
  const mobile = isMobile();

  // ── Fetch session data ──
  const {
    data: session,
    isLoading,
    error,
  } = trpc.sessions.getByRoomName.useQuery(
    { roomName: roomName ?? "" },
    { enabled: !!roomName }
  );

  // ── Load Jitsi External API script (desktop/iOS only) ──
  useEffect(() => {
    if (mobile) return;
    if (document.getElementById("jitsi-ext-api")) {
      if (window.JitsiMeetExternalAPI) setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "jitsi-ext-api";
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error("[Jitsi] Failed to load external_api.js");
      setScriptError(true);
    };
    document.head.appendChild(script);
  }, [mobile]);

  // ── Cleanup Jitsi on unmount ──
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, []);

  // ── Android: detect if native app opened via visibilitychange ──
  useEffect(() => {
    if (!deepLinkSent) return;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Page went to background → app opened successfully
        setAppOpened(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [deepLinkSent]);

  // ── Auto-start call when script is loaded and session is available ──
  useEffect(() => {
    if (!mobile && scriptLoaded && session && !inCall && !jitsiApiRef.current) {
      startEmbeddedCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, session, mobile]);

  // ── Auto-start Android deep link when session is available ──
  useEffect(() => {
    if (android && session && !deepLinkSent) {
      openAndroidDeepLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [android, session]);

  // ── Auto-start iOS / other mobile: open web tab automatically ──
  useEffect(() => {
    if (mobile && !android && session) {
      openWebFallback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, android, session]);

  // ── Start embedded call (desktop/iOS) ──
  function startEmbeddedCall() {
    if (!session) return;

    // Ensure the container ref is available (it's always mounted, just hidden)
    const container = jitsiContainerRef.current;
    if (!container) {
      console.error("[Jitsi] Container ref not available");
      return;
    }

    if (!window.JitsiMeetExternalAPI) {
      console.error("[Jitsi] JitsiMeetExternalAPI not available");
      setScriptError(true);
      return;
    }

    // Dispose previous instance if any
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }

    // Show the container before initializing
    setInCall(true);

    // Use setTimeout to ensure the DOM has updated before Jitsi accesses the container
    setTimeout(() => {
      if (!jitsiContainerRef.current) return;

      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: session.roomName,
        parentNode: jitsiContainerRef.current,
        lang: "pt",
        userInfo: {
          displayName: user?.name ?? "Participante",
          email: user?.email ?? undefined,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
          defaultLanguage: "ptBR",
          resolution: 720,
          constraints: {
            video: { height: { ideal: 720, max: 1080, min: 240 } },
          },
          toolbarButtons: [
            "microphone",
            "camera",
            "desktop",
            "fullscreen",
            "hangup",
            "chat",
            "raisehand",
            "tileview",
            "settings",
            "videoquality",
          ],
        },
        interfaceConfigOverwrite: {
          APP_NAME: "FitConnect",
          NATIVE_APP_NAME: "FitConnect",
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DISPLAY_WELCOME_FOOTER: false,
          MOBILE_APP_PROMO: false,
          DEFAULT_BACKGROUND: "#09090b",
          TOOLBAR_ALWAYS_VISIBLE: false,
        },
        width: "100%",
        height: "100%",
      });

      api.addEventListener("readyToClose", () => {
        api.dispose();
        jitsiApiRef.current = null;
        setInCall(false);
      });

      jitsiApiRef.current = api;
    }, 50);
  }

  // ── Android: try deep link (no automatic fallback) ──
  function openAndroidDeepLink() {
    if (!session) return;
    setDeepLinkSent(true);
    window.location.href = jitsiDeepLink(session.roomName);
  }

  // ── Open web fallback (explicit user action or iOS auto-start) ──
  function openWebFallback() {
    if (!session) return;
    window.open(jitsiWebUrl(session.roomName, user?.name ?? undefined), "_blank");
  }

  // ── Copy room link to clipboard ──
  async function copyRoomLink() {
    if (!session) return;
    const url = jitsiRoomUrl(session.roomName);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers / Android WebView
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("[CopyLink] Failed:", err);
    }
  }

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Video className="h-8 w-8 text-destructive/60" />
          </div>
          <h2 className="text-xl font-semibold">Sessão não encontrada</h2>
          <p className="text-muted-foreground text-sm">
            Esta sala não existe ou você não tem permissão de acesso.
          </p>
          <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const participantLabel = user?.appRole === "trainer" ? "Aluno" : "Personal Trainer";
  const participantName =
    user?.appRole === "trainer" ? session.student?.name : session.trainer?.name;

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Top Bar ── */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur-xl px-4 md:px-6 py-3 flex items-center justify-between z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
              }
              navigate("/");
            }}
            className="gap-2 text-muted-foreground hover:text-foreground px-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span
              className="font-semibold text-sm hidden sm:inline"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              FitConnect
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm overflow-hidden">
          <span className="font-medium text-foreground truncate max-w-32 md:max-w-64">
            {session.title}
          </span>
          {android && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              <Smartphone className="h-3 w-3" />
              Android
            </span>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col">

        {/* ─── PRE-CALL LOBBY (always rendered, hidden when in call on desktop) ─── */}
        <div
          className={`flex-1 flex items-center justify-center p-4 md:p-8 transition-all ${
            inCall && !mobile ? "hidden" : ""
          }`}
        >
          <div className="w-full max-w-lg space-y-6">

            {/* Session info card */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Video className="h-7 w-7 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1
                    className="text-xl md:text-2xl font-bold leading-tight"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {session.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Sala real · meet.jit.si
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {participantLabel}
                  </span>
                  <span className="font-medium text-foreground">{participantName ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data e Horário
                  </span>
                  <span className="font-medium text-foreground text-right capitalize text-xs md:text-sm">
                    {formatDate(session.scheduledAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-border/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duração
                  </span>
                  <span className="font-medium text-foreground">
                    {session.durationMinutes} minutos
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-muted-foreground">Sala ID</span>
                  <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded font-mono">
                    {session.roomName}
                  </code>
                </div>
              </div>

              {/* ─── Copiar link da sala ─── */}
              <div className="mt-5 pt-5 border-t border-border/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Link da videochamada</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {jitsiRoomUrl(session.roomName)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyRoomLink}
                    className={`flex-shrink-0 gap-2 text-xs transition-all ${
                      copied
                        ? "border-green-500/50 text-green-400 bg-green-500/10"
                        : "border-border/60 hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar link
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {session.notes && (
                <div className="mt-4 p-3 rounded-xl bg-muted/40 text-sm text-muted-foreground italic">
                  "{session.notes}"
                </div>
              )}
            </div>

            {/* ─── ANDROID: Deep link + explicit web fallback ─── */}
            {android ? (
              <div className="space-y-3">
                {!deepLinkSent ? (
                  <>
                    <Button
                      size="lg"
                      onClick={openAndroidDeepLink}
                      className="w-full bg-primary text-primary-foreground hover:opacity-90 font-semibold py-6 text-base gap-3 shadow-lg shadow-primary/20"
                    >
                      <Smartphone className="h-5 w-5" />
                      Abrir no App Jitsi Meet
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={openWebFallback}
                      className="w-full border-border/60 hover:bg-muted/40 font-medium py-6 text-base gap-3"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Abrir no Navegador
                    </Button>
                  </>
                ) : appOpened ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center space-y-3">
                    <p className="text-green-400 font-medium text-sm">
                      App Jitsi Meet aberto com sucesso!
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openWebFallback}
                      className="gap-2 text-xs border-border/50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir também no navegador
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted/30 border border-border/40 rounded-xl p-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Aguardando abertura do app Jitsi Meet...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Se o app não abriu, ele pode não estar instalado.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        size="sm"
                        onClick={openWebFallback}
                        className="bg-primary text-primary-foreground gap-2 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir no Navegador
                      </Button>
                      <a
                        href="https://play.google.com/store/apps/details?id=org.jitsi.meet"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="gap-2 text-xs border-border/50">
                          <Smartphone className="h-3.5 w-3.5" />
                          Instalar App
                        </Button>
                      </a>
                    </div>
                  </div>
                )}

                <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-sm">Como funciona no Android</p>
                  <p>• <strong>App instalado:</strong> a sala abre diretamente no Jitsi Meet nativo.</p>
                  <p>• <strong>Sem app:</strong> toque em "Abrir no Navegador" para entrar via Chrome.</p>
                  <p>
                    • Instale gratuitamente na{" "}
                    <a
                      href="https://play.google.com/store/apps/details?id=org.jitsi.meet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Play Store
                    </a>{" "}
                    para melhor experiência.
                  </p>
                </div>
              </div>
            ) : mobile ? (
              /* ─── OTHER MOBILE (iOS, etc): direct web ─── */
              <div className="space-y-3">
                <Button
                  size="lg"
                  onClick={openWebFallback}
                  className="w-full bg-primary text-primary-foreground hover:opacity-90 font-semibold py-6 text-base gap-3 shadow-lg shadow-primary/20"
                >
                  <Video className="h-5 w-5" />
                  Entrar na Videochamada
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  A videochamada abrirá em uma nova aba via meet.jit.si.
                </p>
              </div>
            ) : (
              /* ─── DESKTOP: embedded iframe ─── */
              <div className="space-y-3">
                {scriptError ? (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-destructive">
                        Não foi possível carregar o Jitsi Meet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Verifique sua conexão ou use a opção abaixo para abrir em nova aba.
                      </p>
                      <Button
                        size="sm"
                        onClick={openWebFallback}
                        className="bg-primary text-primary-foreground gap-2 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir em nova aba
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Auto-starting: show spinner while script loads, then Jitsi opens automatically */}
                    <div className="w-full bg-primary/10 border border-primary/20 rounded-xl py-5 flex items-center justify-center gap-3">
                      {scriptLoaded ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <span className="text-sm font-medium text-primary">Abrindo câmera e microfone...</span>
                        </>
                      ) : (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
                          <span className="text-sm text-muted-foreground">Carregando Jitsi Meet...</span>
                        </>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={openWebFallback}
                      className="w-full text-muted-foreground hover:text-foreground gap-2 text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir em nova aba (meet.jit.si)
                    </Button>
                  </>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  A videochamada é realizada via{" "}
                  <a
                    href={jitsiRoomUrl(session.roomName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    meet.jit.si
                  </a>
                  . Nenhuma instalação necessária.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── JITSI IFRAME CONTAINER (always in DOM, visible only when inCall) ─── */}
        {/* This ensures jitsiContainerRef is always available when startEmbeddedCall() is called */}
        <div
          ref={jitsiContainerRef}
          className={`flex-1 w-full ${inCall && !mobile ? "block" : "hidden"}`}
          style={{ minHeight: inCall && !mobile ? "calc(100vh - 57px)" : 0 }}
        />
      </div>
    </div>
  );
}
