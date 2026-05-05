import { eq, or, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, notifications, sessions, trainerProfiles, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; avatarUrl?: string; phone?: string; appRole?: "trainer" | "student"; onboardingDone?: number }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getAllStudents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.appRole, "student"));
}

export async function getAllTrainers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.appRole, "trainer"));
}

// ─── Trainer Profiles ─────────────────────────────────────────────────────────

export async function getTrainerProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trainerProfiles).where(eq(trainerProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertTrainerProfile(
  userId: number,
  data: { specialty?: string; bio?: string; experience?: string }
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getTrainerProfile(userId);
  if (existing) {
    await db.update(trainerProfiles).set({ ...data, updatedAt: new Date() }).where(eq(trainerProfiles.userId, userId));
  } else {
    await db.insert(trainerProfiles).values({ userId, ...data });
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(data: {
  trainerId: number;
  studentId: number;
  title: string;
  scheduledAt: number;
  durationMinutes: number;
  roomName: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sessions).values({ ...data, status: "scheduled" });
  const result = await db.select().from(sessions).where(eq(sessions.roomName, data.roomName)).limit(1);
  return result[0];
}

export async function getSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionByRoomName(roomName: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions).where(eq(sessions.roomName, roomName)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(sessions)
    .where(or(eq(sessions.trainerId, userId), eq(sessions.studentId, userId)))
    .orderBy(desc(sessions.scheduledAt));
}

export async function getUpcomingSessionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const all = await db
    .select()
    .from(sessions)
    .where(and(or(eq(sessions.trainerId, userId), eq(sessions.studentId, userId)), eq(sessions.status, "scheduled")))
    .orderBy(sessions.scheduledAt);
  return all.filter((s) => s.scheduledAt >= now);
}

export async function getPastSessionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const all = await db
    .select()
    .from(sessions)
    .where(or(eq(sessions.trainerId, userId), eq(sessions.studentId, userId)))
    .orderBy(desc(sessions.scheduledAt));
  return all.filter((s) => s.scheduledAt < now || s.status === "completed" || s.status === "cancelled");
}

export async function updateSessionStatus(id: number, status: "scheduled" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return;
  await db.update(sessions).set({ status, updatedAt: new Date() }).where(eq(sessions.id, id));
}

export async function cancelSession(id: number) {
  return updateSessionStatus(id, "cancelled");
}

// ─── Notifications ──────────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ ...data, read: 0 });
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)));
}
