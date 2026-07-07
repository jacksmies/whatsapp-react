import { describe, expect, it } from "vitest";
import { buildAcademyMessages, buildSystemPromptWithKnowledge } from "./academy-chat";

describe("buildSystemPromptWithKnowledge", () => {
  it("adds the knowledge base and current customer question to the system prompt", () => {
    const prompt = buildSystemPromptWithKnowledge({
      knowledge: "Course fee is AED 1,200.",
      question: "How much is public speaking?",
    });

    expect(prompt).toContain("Course fee is AED 1,200.");
    expect(prompt).toContain("Customer question:\nHow much is public speaking?");
    expect(prompt).toContain(
      "Use list_course_availability when the customer asks about available course dates or seats.",
    );
  });

  it("requires course availability answers to come from the availability tool only", () => {
    const prompt = buildSystemPromptWithKnowledge({
      knowledge: "The Public Speaking course has weekend batches.",
      question: "What availability do you have for public speaking?",
    });

    expect(prompt).toContain(
      "Never invent course dates, batch times, seat counts, or availability.",
    );
    expect(prompt).toContain(
      "If list_course_availability returns no courses, say that no available dates are currently listed and offer to connect a human advisor.",
    );
    expect(prompt).toContain(
      "When the customer mentions a month or year, include that month or year in the list_course_availability tool arguments.",
    );
    expect(prompt).toContain(
      "Do not use list_course_availability for price, fee, curriculum, location, or registration questions unless the customer also asks about dates, seats, or availability.",
    );
    expect(prompt).toContain(
      "For optional tool arguments, omit unknown values. Never send empty strings for month or year.",
    );
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
