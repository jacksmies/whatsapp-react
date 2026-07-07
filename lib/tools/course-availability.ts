import { listCourseAvailability } from "../chat-repository";
import type { ToolDefinition } from "../ollama";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function readCourseTitle(args: Record<string, unknown>) {
  const courseTitle = args.courseTitle;

  if (typeof courseTitle !== "string" || !courseTitle.trim()) {
    throw new Error("courseTitle is required.");
  }

  return courseTitle.trim();
}

function readOptionalMonth(args: Record<string, unknown>) {
  return typeof args.month === "string" && args.month.trim()
    ? args.month.trim()
    : undefined;
}

function readOptionalYear(args: Record<string, unknown>) {
  if (typeof args.year === "number" && Number.isInteger(args.year)) {
    return args.year;
  }

  if (typeof args.year === "string" && args.year.trim()) {
    const parsedYear = Number.parseInt(args.year.trim(), 10);
    return Number.isInteger(parsedYear) ? parsedYear : undefined;
  }

  return undefined;
}

export const courseAvailabilityTool: ToolDefinition = {
  type: "function",
  function: {
    name: "list_course_availability",
    description:
      "List upcoming course dates with available seats for a requested course title. Include month and year when the customer asks for a specific month.",
    parameters: {
      type: "object",
      required: ["courseTitle"],
      properties: {
        courseTitle: {
          type: "string",
          description:
            "The course title or topic the customer is asking about, for example public speaking.",
        },
        month: {
          type: "string",
          description:
            "Optional requested month name, for example august, when the customer asks for availability in a specific month.",
        },
        year: {
          type: "string",
          description:
            "Optional requested four-digit year, for example 2026, when the customer asks for a specific year. Omit this field when no year is requested; do not send an empty string.",
        },
      },
    },
  },
  async execute(args) {
    const courseTitle = readCourseTitle(args);
    const courses = await listCourseAvailability({
      courseTitle,
      month: readOptionalMonth(args),
      year: readOptionalYear(args),
    });

    return courses.map((course) => ({
      title: course.title,
      startDate: formatDate(course.startDate),
      availability: course.availability,
    }));
  },
};
