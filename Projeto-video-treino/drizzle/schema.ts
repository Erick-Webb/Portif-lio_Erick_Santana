import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // App-level role: trainer or student (set during onboarding)
  appRole: mysqlEnum("appRole", ["trainer", "student"]),
  avatarUrl: text("avatarUrl"),
  phone: varchar("phone", { length: 32 }),
  onboardingDone: int("onboardingDone").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Extended profile for personal trainers
export const trainerProfiles = mysqlTable("trainer_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  specialty: varchar("specialty", { length: 255 }),
  bio: text("bio"),
  experience: varchar("experience", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainerProfile = typeof trainerProfiles.$inferSelect;
export type InsertTrainerProfile = typeof trainerProfiles.$inferInsert;

// Sessions (scheduled training sessions)
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  studentId: int("studentId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(), // UTC ms timestamp
  durationMinutes: int("durationMinutes").notNull().default(60),
  roomName: varchar("roomName", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

// In-app notifications
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),           // recipient
  type: varchar("type", { length: 64 }).notNull(), // e.g. 'session_scheduled'
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 512 }),    // optional deep-link inside the app
  read: int("read").default(0).notNull(),    // 0 = unread, 1 = read
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
