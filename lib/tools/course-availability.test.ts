import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCourseAvailability } from "../chat-repository";
import { courseAvailabilityTool } from "./course-availability";

vi.mock("../chat-repository", () => ({
  listCourseAvailability: vi.fn(),
}));

const listCourseAvailabilityMock = vi.mocked(listCourseAvailability);

describe("courseAvailabilityTool", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("retrieves matching course availability by title", async () => {
    listCourseAvailabilityMock.mockResolvedValue([
      {
        id: "course-1",
        title: "Public Speaking Course",
        startDate: new Date("2026-08-15T00:00:00.000Z"),
        availability: 8,
      },
    ]);

    await expect(
      courseAvailabilityTool.execute({ courseTitle: "public speaking" }),
    ).resolves.toEqual([
      {
        title: "Public Speaking Course",
        startDate: "2026-08-15",
        availability: 8,
      },
    ]);

    expect(listCourseAvailabilityMock).toHaveBeenCalledWith({
      courseTitle: "public speaking",
    });
  });

  it("passes optional month and year filters to the repository", async () => {
    listCourseAvailabilityMock.mockResolvedValue([
      {
        id: "course-1",
        title: "Public Speaking Course",
        startDate: new Date("2026-08-03T00:00:00.000Z"),
        availability: 3,
      },
    ]);

    await expect(
      courseAvailabilityTool.execute({
        courseTitle: "public speaking",
        month: "august",
        year: 2026,
      }),
    ).resolves.toEqual([
      {
        title: "Public Speaking Course",
        startDate: "2026-08-03",
        availability: 3,
      },
    ]);

    expect(listCourseAvailabilityMock).toHaveBeenCalledWith({
      courseTitle: "public speaking",
      month: "august",
      year: 2026,
    });
  });

  it("accepts string year values and ignores empty optional filters", async () => {
    listCourseAvailabilityMock.mockResolvedValue([]);

    await courseAvailabilityTool.execute({
      courseTitle: "public speaking",
      month: "",
      year: "2026",
    });

    expect(listCourseAvailabilityMock).toHaveBeenCalledWith({
      courseTitle: "public speaking",
      year: 2026,
    });

    await courseAvailabilityTool.execute({
      courseTitle: "public speaking",
      year: "",
    });

    expect(listCourseAvailabilityMock).toHaveBeenLastCalledWith({
      courseTitle: "public speaking",
    });
  });

  it("defines year as a string so empty optional values do not fail provider validation", () => {
    expect(
      courseAvailabilityTool.function.parameters.properties.year,
    ).toMatchObject({
      type: "string",
    });
  });

  it("rejects invalid course title arguments", async () => {
    await expect(
      courseAvailabilityTool.execute({ courseTitle: "   " }),
    ).rejects.toThrow("courseTitle is required.");
  });
});
