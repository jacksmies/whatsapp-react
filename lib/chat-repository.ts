import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { contacts, conversations, messages } from "./db/schema";

export type StoredMessageRole = "user" | "assistant";
export type ConversationChannel = "web" | "whatsapp";
export type StoredMessageSenderType = "customer" | "ai" | "human";

export type StoredConversation = {
  id: string;
  channel: ConversationChannel;
  externalContactId: string | null;
  aiAutoReplyEnabled: boolean;
  createdAt: Date;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  role: StoredMessageRole;
  senderType: StoredMessageSenderType;
  content: string;
  externalMessageId: string | null;
  createdAt: Date;
};

export type ConversationSummary = {
  id: string;
  channel: ConversationChannel;
  externalContactId: string | null;
  aiAutoReplyEnabled: boolean;
  updatedAt: Date;
  lastMessage: {
    role: StoredMessageRole;
    senderType: StoredMessageSenderType;
    content: string;
  } | null;
};

export type WhatsAppContact = {
  id: string;
  phoneNumber: string;
  name: string | null;
  tags: string[];
  conversationId: string;
  lastMessageAt: Date;
  aiAutoReplyEnabled: boolean;
};

export type StoredContact = {
  id: string;
  phoneNumber: string;
  name: string | null;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type ContactDetail = {
  id: string;
  phoneNumber: string;
  name: string | null;
  notes: string | null;
  tags: string[];
  conversationId: string;
  messageCount: number;
  aiAutoReplyEnabled: boolean;
};

export type CourseAvailability = {
  id: string;
  title: string;
  startDate: Date;
  availability: number;
};

const MONTH_NAMES = new Map([
  ["january", 0],
  ["february", 1],
  ["march", 2],
  ["april", 3],
  ["may", 4],
  ["june", 5],
  ["july", 6],
  ["august", 7],
  ["september", 8],
  ["october", 9],
  ["november", 10],
  ["december", 11],
]);

export type ConversationContact = {
  id: string;
  phoneNumber: string;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
}

type SaveMessageInput = {
  conversationId: string;
  role: StoredMessageRole;
  content: string;
  senderType?: StoredMessageSenderType;
  externalMessageId?: string | null;
};

type FindOrCreateWhatsAppConversationInput = {
  externalContactId: string;
};

export async function saveMessage({
  conversationId,
  role,
  content,
  senderType = role === "assistant" ? "ai" : "customer",
  externalMessageId = null,
}: SaveMessageInput): Promise<StoredMessage> {
  return getDb().transaction(async (tx) => {
    await tx
      .insert(conversations)
      .values({ id: conversationId })
      .onConflictDoNothing();

    const [message] = await tx
      .insert(messages)
      .values({
        id: randomUUID(),
        conversationId,
        role,
        senderType,
        content,
        externalMessageId,
      })
      .returning();

    return mapStoredMessage(message);
  });
}

export async function saveMessageIfNew(input: SaveMessageInput): Promise<{
  created: boolean;
  message: StoredMessage | null;
}> {
  if (!input.externalMessageId) {
    return {
      created: true,
      message: await saveMessage(input),
    };
  }

  const existing = await findMessageByExternalMessageId(input.externalMessageId);

  if (existing) {
    return { created: false, message: existing };
  }

  const [message] = await getDb()
    .insert(messages)
    .values({
      id: randomUUID(),
      conversationId: input.conversationId,
      role: input.role,
      senderType:
        input.senderType ?? (input.role === "assistant" ? "ai" : "customer"),
      content: input.content,
      externalMessageId: input.externalMessageId,
    })
    .onConflictDoNothing()
    .returning();

  if (!message) {
    return {
      created: false,
      message: await findMessageByExternalMessageId(input.externalMessageId),
    };
  }

  return { created: true, message: mapStoredMessage(message) };
}

export async function findOrCreateWhatsAppConversation({
  externalContactId,
}: FindOrCreateWhatsAppConversationInput): Promise<StoredConversation> {
  await ensureContactForPhoneNumber(externalContactId);

  const existing = await findWhatsAppConversationByContact(externalContactId);

  if (existing) {
    return existing;
  }

  const id = randomUUID();
  const [conversation] = await getDb()
    .insert(conversations)
    .values({
      id,
      channel: "whatsapp",
      externalContactId,
      aiAutoReplyEnabled: true,
    })
    .onConflictDoNothing()
    .returning();

  if (conversation) {
    return mapStoredConversation(conversation);
  }

  const createdByAnotherRequest =
    await findWhatsAppConversationByContact(externalContactId);

  if (!createdByAnotherRequest) {
    throw new Error("Unable to create WhatsApp conversation.");
  }

  return createdByAnotherRequest;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const result = await getDb().execute(sql`
    select
      c.id,
      c.channel,
      c.external_contact_id as "externalContactId",
      c.ai_auto_reply_enabled as "aiAutoReplyEnabled",
      coalesce(latest.created_at, c.created_at) as "updatedAt",
      latest.role as "lastMessageRole",
      latest.sender_type as "lastMessageSenderType",
      latest.content as "lastMessageContent"
    from conversations c
    left join lateral (
      select m.role, m.sender_type, m.content, m.created_at
      from messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) latest on true
    order by "updatedAt" desc
  `);

  return result.rows.map((row) => {
    const record = row as {
      id: string;
      channel: ConversationChannel;
      externalContactId: string | null;
      aiAutoReplyEnabled: boolean;
      updatedAt: Date | string;
      lastMessageRole: StoredMessageRole | null;
      lastMessageSenderType: StoredMessageSenderType | null;
      lastMessageContent: string | null;
    };

    return {
      id: record.id,
      channel: record.channel,
      externalContactId: record.externalContactId,
      aiAutoReplyEnabled: record.aiAutoReplyEnabled,
      updatedAt: toDate(record.updatedAt),
      lastMessage:
        record.lastMessageRole &&
        record.lastMessageSenderType &&
        record.lastMessageContent
          ? {
              role: record.lastMessageRole,
              senderType: record.lastMessageSenderType,
              content: record.lastMessageContent,
            }
          : null,
    };
  });
}

export async function listWhatsAppContacts(): Promise<WhatsAppContact[]> {
  const result = await getDb().execute(sql`
    select
      ct.id,
      ct.phone_number as "phoneNumber",
      ct.name,
      ct.tags,
      c.id as "conversationId",
      coalesce(latest.created_at, c.created_at) as "lastMessageAt",
      c.ai_auto_reply_enabled as "aiAutoReplyEnabled"
    from contacts ct
    join conversations c on c.channel = 'whatsapp'
      and c.external_contact_id = ct.phone_number
    left join lateral (
      select m.created_at
      from messages m
      where m.conversation_id = c.id
      order by m.created_at desc
      limit 1
    ) latest on true
    order by "lastMessageAt" desc
  `);

  return result.rows.map((row) => {
    const record = row as {
      id: string;
      phoneNumber: string;
      name: string | null;
      tags: string[];
      conversationId: string;
      lastMessageAt: Date | string;
      aiAutoReplyEnabled: boolean;
    };

    return {
      id: record.id,
      phoneNumber: record.phoneNumber,
      name: record.name,
      tags: record.tags,
      conversationId: record.conversationId,
      lastMessageAt: toDate(record.lastMessageAt),
      aiAutoReplyEnabled: record.aiAutoReplyEnabled,
    };
  });
}

export async function getContactDetail(
  contactId: string,
): Promise<ContactDetail | null> {
  const result = await getDb().execute(sql`
    select
      ct.id,
      ct.phone_number as "phoneNumber",
      ct.name,
      ct.notes,
      ct.tags,
      c.id as "conversationId",
      c.ai_auto_reply_enabled as "aiAutoReplyEnabled",
      count(m.id)::int as "messageCount"
    from contacts ct
    left join conversations c on c.channel = 'whatsapp'
      and c.external_contact_id = ct.phone_number
    left join messages m on m.conversation_id = c.id
    where ct.id = ${contactId}
    group by ct.id, ct.phone_number, ct.name, ct.notes, c.id, c.ai_auto_reply_enabled
    limit 1
  `);

  const record = result.rows[0] as
    | {
        id: string;
        phoneNumber: string;
        name: string | null;
        notes: string | null;
        tags: string[];
        conversationId: string | null;
        messageCount: number;
        aiAutoReplyEnabled: boolean | null;
      }
    | undefined;

  if (!record || !record.conversationId) {
    return null;
  }

  return {
    id: record.id,
    phoneNumber: record.phoneNumber,
    name: record.name,
    notes: record.notes,
    tags: record.tags,
    conversationId: record.conversationId,
    messageCount: record.messageCount,
    aiAutoReplyEnabled: Boolean(record.aiAutoReplyEnabled),
  };
}

export async function getContactForConversation(
  conversationId: string,
): Promise<ConversationContact | null> {
  const result = await getDb().execute(sql`
    select
      ct.id,
      ct.phone_number as "phoneNumber"
    from conversations c
    join contacts ct on c.channel = 'whatsapp'
      and c.external_contact_id = ct.phone_number
    where c.id = ${conversationId}
    limit 1
  `);

  const record = result.rows[0] as
    | {
        id: string;
        phoneNumber: string;
      }
    | undefined;

  return record
    ? {
        id: record.id,
        phoneNumber: record.phoneNumber,
      }
    : null;
}

export async function listCourseAvailability({
  courseTitle,
  month,
  year,
}: {
  courseTitle: string;
  month?: string;
  year?: number;
}): Promise<CourseAvailability[]> {
  const normalizedTitle = courseTitle.trim().toLowerCase();
  const monthIndex =
    typeof month === "string"
      ? MONTH_NAMES.get(month.trim().toLowerCase())
      : undefined;

  if (!normalizedTitle) {
    return [];
  }

  const result = await getDb().execute(sql`
    select
      c.id,
      c.title,
      c.start_date as "startDate",
      c.availability
    from courses c
    where lower(c.title) like ${`%${normalizedTitle}%`}
      and c.availability > 0
      and c.start_date >= current_date
    order by c.start_date asc
  `);

  return result.rows
    .map((row) => {
      const record = row as {
        id: string;
        title: string;
        startDate: Date | string;
        availability: number;
      };

      return {
        id: record.id,
        title: record.title,
        startDate: toDate(record.startDate),
        availability: record.availability,
      };
    })
    .filter((course) => {
      if (monthIndex !== undefined && course.startDate.getUTCMonth() !== monthIndex) {
        return false;
      }

      if (year !== undefined && course.startDate.getUTCFullYear() !== year) {
        return false;
      }

      return true;
    });
}

export async function updateContact(
  contactId: string,
  {
    name,
    notes,
    tags,
  }: {
    name: string;
    notes: string;
    tags: string[];
  },
): Promise<StoredContact | null> {
  const [contact] = await getDb()
    .update(contacts)
    .set({
      name: name.trim() || null,
      notes: notes.trim() || null,
      tags: normalizeTags(tags),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
    .returning();

  return contact ? mapStoredContact(contact) : null;
}

export async function getConversationMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  const rows = await getDb()
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return rows.map(mapStoredMessage);
}

export async function getConversation(
  conversationId: string,
): Promise<StoredConversation | null> {
  const [conversation] = await getDb()
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return conversation ? mapStoredConversation(conversation) : null;
}

async function findWhatsAppConversationByContact(externalContactId: string) {
  const [conversation] = await getDb()
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.channel, "whatsapp"),
        eq(conversations.externalContactId, externalContactId),
      ),
    )
    .limit(1);

  return conversation ? mapStoredConversation(conversation) : null;
}

async function ensureContactForPhoneNumber(phoneNumber: string) {
  const [existing] = await getDb()
    .select()
    .from(contacts)
    .where(eq(contacts.phoneNumber, phoneNumber))
    .limit(1);

  if (existing) {
    return mapStoredContact(existing);
  }

  const [contact] = await getDb()
    .insert(contacts)
    .values({
      id: randomUUID(),
      phoneNumber,
      tags: [],
    })
    .onConflictDoNothing()
    .returning();

  if (contact) {
    return mapStoredContact(contact);
  }

  const [createdByAnotherRequest] = await getDb()
    .select()
    .from(contacts)
    .where(eq(contacts.phoneNumber, phoneNumber))
    .limit(1);

  if (!createdByAnotherRequest) {
    throw new Error("Unable to create contact.");
  }

  return mapStoredContact(createdByAnotherRequest);
}

async function findMessageByExternalMessageId(externalMessageId: string) {
  const [message] = await getDb()
    .select()
    .from(messages)
    .where(eq(messages.externalMessageId, externalMessageId))
    .limit(1);

  return message ? mapStoredMessage(message) : null;
}

export async function setAiAutoReply(
  conversationId: string,
  enabled: boolean,
): Promise<StoredConversation | null> {
  const [conversation] = await getDb()
    .update(conversations)
    .set({ aiAutoReplyEnabled: enabled })
    .where(eq(conversations.id, conversationId))
    .returning();

  return conversation ? mapStoredConversation(conversation) : null;
}

export async function disableAiAutoReply(conversationId: string) {
  return setAiAutoReply(conversationId, false);
}

function mapStoredConversation(
  conversation: typeof conversations.$inferSelect,
): StoredConversation {
  return {
    id: conversation.id,
    channel: conversation.channel as ConversationChannel,
    externalContactId: conversation.externalContactId,
    aiAutoReplyEnabled: conversation.aiAutoReplyEnabled,
    createdAt: conversation.createdAt,
  };
}

function mapStoredContact(contact: typeof contacts.$inferSelect): StoredContact {
  return {
    id: contact.id,
    phoneNumber: contact.phoneNumber,
    name: contact.name,
    notes: contact.notes,
    tags: contact.tags,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

function mapStoredMessage(message: typeof messages.$inferSelect): StoredMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as StoredMessageRole,
    senderType: message.senderType as StoredMessageSenderType,
    content: message.content,
    externalMessageId: message.externalMessageId,
    createdAt: message.createdAt,
  };
}
