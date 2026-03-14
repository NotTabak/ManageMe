import type { Story } from "./Story";

const STORAGE_KEY = "stories";

export class StoryService {
  private getStories(): Story[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStories(stories: Story[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }

  getAll(): Story[] {
    return this.getStories();
  }

  getByProject(projectId: string): Story[] {
    return this.getStories().filter((s) => s.projectId === projectId);
  }

  create(story: Omit<Story, "id" | "createdAt">): Story {
    const stories = this.getStories();
    const newStory: Story = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...story,
    };
    stories.push(newStory);
    this.saveStories(stories);
    return newStory;
  }

  update(story: Story): void {
    const stories = this.getStories().map((s) =>
      s.id === story.id ? story : s
    );
    this.saveStories(stories);
  }

  delete(id: string): void {
    const stories = this.getStories().filter((s) => s.id !== id);
    this.saveStories(stories);
  }
}
