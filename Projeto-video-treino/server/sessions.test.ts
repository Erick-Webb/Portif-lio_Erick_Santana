import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  createSession: vi.fn().mockResolvedValue({
    id: 1,
    trainerId: 1,
    studentId: 2,
    title: "Treino de Força",
    scheduledAt: Date.now() + 3600000,
    durationMinutes: 60,
    roomName: "fit-abc1234567",
    status: "scheduled",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getSessionById: vi.fn().mockResolvedValue({
    id: 1,
    trainerId: 1,
    studentId: 2,
    title: "Treino de Força",
    scheduledAt: Date.now() + 3600000,
    durationMinutes: 60,
    roomName: "fit-abc1234567",
    status: "scheduled",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getSessionByRoomName: vi.fn().mockResolvedValue(null),
  getSessionsForUser: vi.fn().mockResolvedValue([]),
  getUpcomingSessionsForUser: vi.fn().mockResolvedValue([]),
  getPastSessionsForUser: vi.fn().mockResolvedValue([]),
  cancelSession: vi.fn().mockResolvedValue(undefined),
  updateSessionStatus: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) return Promise.resolve({ id: 1, name: "Trainer Test", appRole: "trainer", email: "trainer@test.com" });
    if (id === 2) return Promise.resolve({ id: 2, name: "Student Test", appRole: "student", email: "student@test.com" });
    return Promise.resolve(undefined);
  }),
  getAllStudents: vi.fn().mockResolvedValue([]),
  getAllTrainers: vi.fn().mockResolvedValue([]),
  getTrainerProfile: vi.fn().mockResolvedValue(null),
  upsertTrainerProfile: vi.fn().mockResolvedValue(undefined),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  createNotification: vi.fn().mockResolvedValue(undefined),
  getNotificationsForUser: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "trainer-open-id",
      name: "Trainer Test",
      email: "trainer@test.com",
      loginMethod: "manus",
      role: "user",
      appRole: "trainer",
      avatarUrl: null,
      phone: null,
      onboardingDone: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("sessions.create", () => {
  it("creates a session when called by a trainer", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sessions.create({
      studentId: 2,
      title: "Treino de Força",
      scheduledAt: Date.now() + 3600000,
      durationMinutes: 60,
    });
    expect(result).toBeDefined();
    expect(result?.title).toBe("Treino de Força");
    expect(result?.status).toBe("scheduled");
  });

  it("throws FORBIDDEN when called by a student", async () => {
    const ctx = makeCtx({ id: 2, appRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sessions.create({
        studentId: 1,
        title: "Treino",
        scheduledAt: Date.now() + 3600000,
        durationMinutes: 60,
      })
    ).rejects.toThrow("FORBIDDEN");
  });
});

describe("sessions.cancel", () => {
  it("allows trainer to cancel their own session", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sessions.cancel({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN when student tries to cancel", async () => {
    const ctx = makeCtx({ id: 2, appRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.sessions.cancel({ id: 1 })).rejects.toThrow("FORBIDDEN");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("profiles.listStudents", () => {
  it("returns empty array for trainer", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.profiles.listStudents();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN when student calls listStudents", async () => {
    const ctx = makeCtx({ id: 2, appRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profiles.listStudents()).rejects.toThrow("FORBIDDEN");
  });
});

describe("sessions.complete", () => {
  it("allows trainer to mark their own session as completed", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sessions.complete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("throws FORBIDDEN when student tries to complete a session", async () => {
    const ctx = makeCtx({ id: 2, appRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.sessions.complete({ id: 1 })).rejects.toThrow("FORBIDDEN");
  });
});

describe("notifications.list", () => {
  it("returns empty array for authenticated user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notifications.markAllRead", () => {
  it("returns success for authenticated user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notifications.markAllRead();
    expect(result.success).toBe(true);
  });
});
