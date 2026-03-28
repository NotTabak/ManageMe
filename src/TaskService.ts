import type { Task } from "./Task";
import type { StoryService } from "./StoryService";

const STORAGE_KEY = "tasks";

export class TaskService {
  private storyService: StoryService;

  constructor(storyService: StoryService) {
    this.storyService = storyService;
  }

  private getTasks(): Task[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveTasks(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  getAll(): Task[] {
    return this.getTasks();
  }

  getByStory(storyId: string): Task[] {
    return this.getTasks().filter((t) => t.storyId === storyId);
  }

  create(task: Omit<Task, "id" | "createdAt">): Task {
    const tasks = this.getTasks();
    const newTask: Task = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...task,
    };
    tasks.push(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  update(task: Task): void {
    const tasks = this.getTasks().map((t) => (t.id === task.id ? task : t));
    this.saveTasks(tasks);
  }

  delete(id: string): void {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    this.saveTasks(tasks);
  }

  assign(taskId: string, userId: string): void {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.assignedUserId = userId;
    task.status = "doing";
    task.startedAt = new Date().toISOString();
    this.saveTasks(tasks);

    // If story was todo → change to doing
    const story = this.storyService.getAll().find((s) => s.id === task.storyId);
    if (story && story.status === "todo") {
      this.storyService.update({ ...story, status: "doing" });
    }
  }

  complete(taskId: string): void {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.status = "done";
    task.finishedAt = new Date().toISOString();
    this.saveTasks(tasks);

    // If all tasks in story are done → change story to done
    const storyTasks = tasks.filter((t) => t.storyId === task.storyId);
    if (storyTasks.length > 0 && storyTasks.every((t) => t.status === "done")) {
      const story = this.storyService.getAll().find((s) => s.id === task.storyId);
      if (story && story.status !== "done") {
        this.storyService.update({ ...story, status: "done" });
      }
    }
  }
}
