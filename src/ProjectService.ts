import type { Project } from "./Project";

const STORAGE_KEY = "projects";

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
    const projects = this.getProjects().filter((p) => p.id !== id);
    this.saveProjects(projects);
  }
}