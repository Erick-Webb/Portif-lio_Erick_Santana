import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  cancelSession,
  createNotification,
  createSession,
  getAllStudents,
  getAllTrainers,
  getNotificationsForUser,
  getPastSessionsForUser,
  getSessionById,
  getSessionByRoomName,
  getSessionsForUser,
  getTrainerProfile,
  getUpcomingSessionsForUser,
  getUserById,
  markAllNotificationsRead,
  markNotificationRead,
  updateSessionStatus,
  updateUserProfile,
  upsertTrainerProfile,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Gera um roomName único para a sala Jitsi Meet.
 *
 * Formato: FitConnect-<adjetivo>-<substantivo>-<4 hex chars>
 * Exemplo: FitConnect-Forte-Treino-a3f9
 *
 * Requisitos do Jitsi Meet:
 * - Sem espaços (usamos hífens)
 * - Sem caracteres especiais além de hífens
 * - Comprimento recomendado: 20–40 chars (evita colisão em salas públicas)
 * - Prefixo único da aplicação para evitar conflito com outras salas públicas
 */
const ROOM_ADJECTIVES = [
  "Forte", "Veloz", "Agil", "Firme", "Ativo",
  "Vital", "Pleno", "Leve", "Vivo", "Bravo",
];
const ROOM_NOUNS = [
  "Treino", "Forca", "Ritmo", "Foco", "Energia",
  "Saude", "Corpo", "Meta", "Pulso", "Vigor",
];

function generateRoomName(): string {
  const adj = ROOM_ADJECTIVES[Math.floor(Math.random() * ROOM_ADJECTIVES.length)];
  const noun = ROOM_NOUNS[Math.floor(Math.random() * ROOM_NOUNS.length)];
  // 4 hex chars = 65536 combinações por par adj+noun → colisão extremamente improvável
  const hex = nanoid(8).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toLowerCase();
  return `FitConnect-${adj}-${noun}-${hex}`;
}

// ─── Routers ──────────────────────────────────────────────────────────────────

const profilesRouter = router({
  // Complete onboarding: set appRole and basic profile
  completeOnboarding: protectedProcedure
    .input(
      z.object({
        appRole: z.enum(["trainer", "student"]),
        name: z.string().min(2),
        specialty: z.string().optional(),
        bio: z.string().optional(),
        experience: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, {
        appRole: input.appRole,
        name: input.name,
        phone: input.phone,
        onboardingDone: 1,
      });
      if (input.appRole === "trainer") {
        await upsertTrainerProfile(ctx.user.id, {
          specialty: input.specialty,
          bio: input.bio,
          experience: input.experience,
        });
      }
      return { success: true };
    }),

  // Update trainer profile
  updateTrainerProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).optional(),
        specialty: z.string().optional(),
        bio: z.string().optional(),
        experience: z.string().optional(),
        phone: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.appRole !== "trainer") throw new TRPCError({ code: "FORBIDDEN" });
      await updateUserProfile(ctx.user.id, {
        name: input.name,
        phone: input.phone,
        avatarUrl: input.avatarUrl,
      });
      await upsertTrainerProfile(ctx.user.id, {
        specialty: input.specialty,
        bio: input.bio,
        experience: input.experience,
      });
      return { success: true };
    }),

  // Get current user's trainer profile
  getMyTrainerProfile: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.appRole !== "trainer") throw new TRPCError({ code: "FORBIDDEN" });
    return getTrainerProfile(ctx.user.id);
  }),

  // Get a specific trainer's public profile
  getTrainerById: protectedProcedure
    .input(z.object({ trainerId: z.number() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.trainerId);
      if (!user || user.appRole !== "trainer") throw new TRPCError({ code: "NOT_FOUND" });
      const profile = await getTrainerProfile(input.trainerId);
      return { user, profile };
    }),

  // List all trainers (for students to browse)
  listTrainers: protectedProcedure.query(async () => {
    const trainers = await getAllTrainers();
    const results = await Promise.all(
      trainers.map(async (t) => {
        const profile = await getTrainerProfile(t.id);
        return { user: t, profile };
      })
    );
    return results;
  }),

  // List all students (for trainers)
  listStudents: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.appRole !== "trainer") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllStudents();
  }),
});

const sessionsRouter = router({
  // Create a new session (trainer only)
  create: protectedProcedure
    .input(
      z.object({
        studentId: z.number(),
        title: z.string().min(2),
        scheduledAt: z.number(), // UTC ms
        durationMinutes: z.number().min(15).max(240).default(60),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.appRole !== "trainer") throw new TRPCError({ code: "FORBIDDEN" });
      const student = await getUserById(input.studentId);
      if (!student || student.appRole !== "student") throw new TRPCError({ code: "NOT_FOUND", message: "Aluno não encontrado" });
      const roomName = generateRoomName();
      const session = await createSession({
        trainerId: ctx.user.id,
        studentId: input.studentId,
        title: input.title,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        roomName,
        notes: input.notes,
      });

      // Notificar o aluno com o link da sala
      const sessionDate = new Date(input.scheduledAt).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const trainerName = ctx.user.name ?? "Seu personal trainer";
      await createNotification({
        userId: input.studentId,
        type: "session_scheduled",
        title: "Nova sessao agendada: " + input.title,
        message: trainerName + " agendou uma sessao de " + input.durationMinutes + " min para " + sessionDate + ". Clique para acessar a sala.",
        link: "/session/" + roomName,
      });

      return session;
    }),

  // Get all sessions for the current user (trainer or student)
  list: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await getSessionsForUser(ctx.user.id);
    // Enrich with participant info
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const trainer = await getUserById(s.trainerId);
        const student = await getUserById(s.studentId);
        return { ...s, trainer, student };
      })
    );
    return enriched;
  }),

  // Get upcoming sessions
  upcoming: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await getUpcomingSessionsForUser(ctx.user.id);
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const trainer = await getUserById(s.trainerId);
        const student = await getUserById(s.studentId);
        return { ...s, trainer, student };
      })
    );
    return enriched;
  }),

  // Get past sessions (history)
  history: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await getPastSessionsForUser(ctx.user.id);
    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const trainer = await getUserById(s.trainerId);
        const student = await getUserById(s.studentId);
        return { ...s, trainer, student };
      })
    );
    return enriched;
  }),

  // Get session by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const session = await getSessionById(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.trainerId !== ctx.user.id && session.studentId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      const trainer = await getUserById(session.trainerId);
      const student = await getUserById(session.studentId);
      return { ...session, trainer, student };
    }),

  // Get session by roomName (for joining the video call)
  getByRoomName: protectedProcedure
    .input(z.object({ roomName: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await getSessionByRoomName(input.roomName);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.trainerId !== ctx.user.id && session.studentId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN" });
      const trainer = await getUserById(session.trainerId);
      const student = await getUserById(session.studentId);
      return { ...session, trainer, student };
    }),

  // Cancel a session (trainer only)
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getSessionById(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.trainerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await cancelSession(input.id);
      return { success: true };
    }),

  // Mark session as completed (trainer only)
  complete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const session = await getSessionById(input.id);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.trainerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      await updateSessionStatus(input.id, "completed");
      return { success: true };
    }),
});

const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getNotificationsForUser(ctx.user.id);
  }),
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profiles: profilesRouter,
  sessions: sessionsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
