import type { Project } from "./Project";

const STORAGE_KEY = "projects";
const ACTIVE_KEY = "activeProjectId";

export class ProjectService {
  private getProjects(): Project[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveProjects(projects: Project[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  getAll(): Project[] {
    return this.getProjects();
  }

  getActive(): Project | null {
    const id = localStorage.getItem(ACTIVE_KEY);
    if (!id) return null;
    return this.getProjects().find((p) => p.id === id) ?? null;
  }

  setActive(id: string): void {
    localStorage.setItem(ACTIVE_KEY, id);
  }

  clearActive(): void {
    localStorage.removeItem(ACTIVE_KEY);
  }

  create(project: Omit<Project, "id">): Project {
    const projects = this.getProjects();
    const newProject: Project = {
      id: crypto.randomUUID(),
      ...project,
    };
    projects.push(newProject);
    this.saveProjects(projects);
    return newProject;
  }

  update(updatedProject: Project): void {
    const projects = this.getProjects().map((p) =>
      p.id === updatedProject.id ? updatedProject : p
    );
    this.saveProjects(projects);
  }

  delete(id: string): void {
    if (this.getActive()?.id === id) this.clearActive();
    const projects = this.getProjects().filter((p) => p.id !== id);
    this.saveProjects(projects);
  }
}
