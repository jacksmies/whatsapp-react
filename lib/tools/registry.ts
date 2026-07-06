import type { ToolDefinition } from "../ollama";
import { courseAvailabilityTool } from "./course-availability";

export const academyTools: ToolDefinition[] = [courseAvailabilityTool];
