import {
  boolean,
  date,
  integer,
  jsonb,
  timestamp,
  uuid,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().notNull(),
    channel: text("channel").default("web").notNull(),
    externalContactId: text("external_contact_id"),
    aiAutoReplyEnabled: boolean("ai_auto_reply_enabled")
      .default(true)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("conversations_channel_external_contact_id_idx").on(
      table.channel,
      table.externalContactId,
    ),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().notNull(),
    phoneNumber: text("phone_number").notNull(),
    name: text("name"),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("contacts_phone_number_idx").on(table.phoneNumber)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().notNull(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    senderType: text("sender_type").default("customer").notNull(),
    content: text("content").notNull(),
    externalMessageId: text("external_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("messages_external_message_id_idx").on(
      table.externalMessageId,
    ),
  ],
);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().notNull(),
  title: text("title").notNull(),
  startDate: date("start_date").notNull(),
  availability: integer("availability").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
