import type { Priority } from "./Story";

export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  storyId: string;
  estimatedTime: number;
  status: TaskStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  assignedUserId?: string;
  actualTime?: number;
}
