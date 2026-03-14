export type Priority = "low" | "medium" | "high";
export type StoryStatus = "todo" | "doing" | "done";

export interface Story {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  projectId: string;
  createdAt: string;
  status: StoryStatus;
  ownerId: string;
}
