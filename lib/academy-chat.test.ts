import { describe, expect, it } from "vitest";
import { buildAcademyMessages, buildSystemPromptWithKnowledge } from "./academy-chat";

describe("buildSystemPromptWithKnowledge", () => {
  it("adds the knowledge base and current customer question to the system prompt", () => {
    expect(
      buildSystemPromptWithKnowledge({
        knowledge: "Course fee is AED 1,200.",
        question: "How much is public speaking?",
      }),
    ).toContain("Course fee is AED 1,200.");

    expect(
      buildSystemPromptWithKnowledge({
        knowledge: "Course fee is AED 1,200.",
        question: "How much is public speaking?",
      }),
    ).toContain("Customer question:\nHow much is public speaking?");
  });
});

describe("buildAcademyMessages", () => {
  it("prepends academy knowledge and keeps recent chat memory before the latest question", () => {
    expect(
      buildAcademyMessages({
        knowledge: "Future Skills Academy is in Dubai Knowledge Park.",
        messages: [
          { role: "assistant", content: "Hi. Ask me anything." },
          { role: "user", content: "Where are you located?" },
          { role: "assistant", content: "Dubai Knowledge Park." },
          { role: "user", content: "What about parking?" },
        ],
      }),
    ).toEqual([
      {
        role: "system",
        content: expect.stringContaining(
          "Future Skills Academy is in Dubai Knowledge Park.",
        ),
      },
      { role: "user", content: "Where are you located?" },
      { role: "assistant", content: "Dubai Knowledge Park." },
      { role: "user", content: "What about parking?" },
    ]);
  });

  it("limits memory to the most recent chat messages and ignores system messages", () => {
    const messages = buildAcademyMessages({
      knowledge: "Knowledge",
      maxHistoryMessages: 4,
      messages: [
        { role: "system", content: "Ignore me" },
        { role: "user", content: "one" },
        { role: "assistant", content: "two" },
        { role: "user", content: "three" },
        { role: "assistant", content: "four" },
        { role: "user", content: "five" },
      ],
    });

    expect(messages).toEqual([
      { role: "system", content: expect.any(String) },
      { role: "assistant", content: "two" },
      { role: "user", content: "three" },
      { role: "assistant", content: "four" },
      { role: "user", content: "five" },
    ]);
  });
});
