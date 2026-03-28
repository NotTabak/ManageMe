import "./style.css";
import { ProjectService } from "./ProjectService";
import { UserService } from "./UserService";
import { StoryService } from "./StoryService";
import { TaskService } from "./TaskService";
import type { Story } from "./Story";
import type { Task } from "./Task";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pl-PL");
}

const projectService = new ProjectService();
const storyService = new StoryService();
const userService = new UserService();
const taskService = new TaskService(storyService);
const currentUser = userService.getLoggedUser();

let editingProjectId: string | null = null;
let editingStoryId: string | null = null;
let editingTaskId: string | null = null;
let activeStoryId: string | null = null;

const PRIORITY_LABEL: Record<string, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "Do zrobienia",
  doing: "W trakcie",
  done: "Gotowe",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  developer: "Developer",
  devops: "DevOps",
};

// ── HTML skeleton ──────────────────────────────────────────────────────────────
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="app-layout">
    <header class="app-header">
      <span class="app-title">ManageMe</span>
      <span class="user-badge">
        ${escapeHtml(currentUser.firstName)} ${escapeHtml(currentUser.lastName)}
        <span class="role-badge role-${currentUser.role}">${ROLE_LABEL[currentUser.role]}</span>
      </span>
    </header>

    <main class="app-main">
      <section class="panel" id="projects-panel">
        <h2 class="panel-title">Projekty</h2>
        <form id="project-form">
          <input type="text" id="proj-name" placeholder="Nazwa projektu" required />
          <input type="text" id="proj-desc" placeholder="Opis projektu" required />
          <div class="form-row">
            <button type="submit" id="proj-submit-btn">Dodaj projekt</button>
            <button type="button" id="proj-cancel-btn" style="display:none;">Anuluj</button>
          </div>
        </form>
        <p id="proj-empty" class="empty-state" style="display:none;">Brak projektów</p>
        <ul id="project-list"></ul>
      </section>

      <section class="panel" id="stories-panel">
        <div id="stories-placeholder" class="placeholder-box">
          <p class="placeholder-text">Wybierz projekt, aby zobaczyć historyjki</p>
        </div>
        <div id="stories-content" style="display:none;">
          <h2 class="panel-title" id="stories-title"></h2>
          <form id="story-form">
            <div class="story-form-grid">
              <input type="text" id="story-name" placeholder="Nazwa historyjki" required />
              <input type="text" id="story-desc" placeholder="Opis historyjki" required />
              <select id="story-priority">
                <option value="low">Niski priorytet</option>
                <option value="medium" selected>Średni priorytet</option>
                <option value="high">Wysoki priorytet</option>
              </select>
              <select id="story-status">
                <option value="todo" selected>Do zrobienia</option>
                <option value="doing">W trakcie</option>
                <option value="done">Gotowe</option>
              </select>
            </div>
            <div class="form-row" style="margin-top:10px;">
              <button type="submit" id="story-submit-btn">Dodaj historyjkę</button>
              <button type="button" id="story-cancel-btn" style="display:none;">Anuluj</button>
            </div>
          </form>
          <div class="story-columns">
            <div class="story-col">
              <h3 class="col-title col-todo">Do zrobienia</h3>
              <ul id="stories-todo" class="story-list"></ul>
            </div>
            <div class="story-col">
              <h3 class="col-title col-doing">W trakcie</h3>
              <ul id="stories-doing" class="story-list"></ul>
            </div>
            <div class="story-col">
              <h3 class="col-title col-done">Gotowe</h3>
              <ul id="stories-done" class="story-list"></ul>
            </div>
          </div>
        </div>
      </section>

      <section class="panel" id="tasks-panel">
        <div id="tasks-placeholder" class="placeholder-box">
          <p class="placeholder-text">Wybierz historyjkę, aby zobaczyć zadania</p>
        </div>
        <div id="tasks-content" style="display:none;">
          <h2 class="panel-title" id="tasks-title"></h2>
          <form id="task-form">
            <div class="story-form-grid">
              <input type="text" id="task-name" placeholder="Nazwa zadania" required />
              <input type="text" id="task-desc" placeholder="Opis zadania" required />
              <select id="task-priority">
                <option value="low">Niski priorytet</option>
                <option value="medium" selected>Średni priorytet</option>
                <option value="high">Wysoki priorytet</option>
              </select>
              <input type="number" id="task-estimated" placeholder="Szac. czas (h)" min="0" step="0.5" required />
            </div>
            <div class="form-row" style="margin-top:10px;">
              <button type="submit" id="task-submit-btn">Dodaj zadanie</button>
              <button type="button" id="task-cancel-btn" style="display:none;">Anuluj</button>
            </div>
          </form>
          <div class="story-columns">
            <div class="story-col">
              <h3 class="col-title col-todo">Do zrobienia</h3>
              <ul id="tasks-todo" class="story-list"></ul>
            </div>
            <div class="story-col">
              <h3 class="col-title col-doing">W trakcie</h3>
              <ul id="tasks-doing" class="story-list"></ul>
            </div>
            <div class="story-col">
              <h3 class="col-title col-done">Gotowe</h3>
              <ul id="tasks-done" class="story-list"></ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <div id="task-modal" class="modal-overlay" style="display:none;">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title" id="modal-task-name"></h3>
        <button id="modal-close-btn" class="modal-close">✕</button>
      </div>
      <div class="modal-body" id="modal-body"></div>
    </div>
  </div>
`;

// ── DOM references ─────────────────────────────────────────────────────────────
const projForm = document.getElementById("project-form") as HTMLFormElement;
const projNameInput = document.getElementById("proj-name") as HTMLInputElement;
const projDescInput = document.getElementById("proj-desc") as HTMLInputElement;
const projSubmitBtn = document.getElementById("proj-submit-btn") as HTMLButtonElement;
const projCancelBtn = document.getElementById("proj-cancel-btn") as HTMLButtonElement;
const projEmpty = document.getElementById("proj-empty") as HTMLParagraphElement;
const projectList = document.getElementById("project-list") as HTMLUListElement;

const storyForm = document.getElementById("story-form") as HTMLFormElement;
const storyNameInput = document.getElementById("story-name") as HTMLInputElement;
const storyDescInput = document.getElementById("story-desc") as HTMLInputElement;
const storyPrioritySelect = document.getElementById("story-priority") as HTMLSelectElement;
const storyStatusSelect = document.getElementById("story-status") as HTMLSelectElement;
const storySubmitBtn = document.getElementById("story-submit-btn") as HTMLButtonElement;
const storyCancelBtn = document.getElementById("story-cancel-btn") as HTMLButtonElement;
const storiesPlaceholder = document.getElementById("stories-placeholder") as HTMLDivElement;
const storiesContent = document.getElementById("stories-content") as HTMLDivElement;
const storiesTitle = document.getElementById("stories-title") as HTMLHeadingElement;

const taskForm = document.getElementById("task-form") as HTMLFormElement;
const taskNameInput = document.getElementById("task-name") as HTMLInputElement;
const taskDescInput = document.getElementById("task-desc") as HTMLInputElement;
const taskPrioritySelect = document.getElementById("task-priority") as HTMLSelectElement;
const taskEstimatedInput = document.getElementById("task-estimated") as HTMLInputElement;
const taskSubmitBtn = document.getElementById("task-submit-btn") as HTMLButtonElement;
const taskCancelBtn = document.getElementById("task-cancel-btn") as HTMLButtonElement;
const tasksPlaceholder = document.getElementById("tasks-placeholder") as HTMLDivElement;
const tasksContent = document.getElementById("tasks-content") as HTMLDivElement;
const tasksTitle = document.getElementById("tasks-title") as HTMLHeadingElement;

const taskModal = document.getElementById("task-modal") as HTMLDivElement;
const modalTaskName = document.getElementById("modal-task-name") as HTMLHeadingElement;
const modalBody = document.getElementById("modal-body") as HTMLDivElement;
const modalCloseBtn = document.getElementById("modal-close-btn") as HTMLButtonElement;

// ── Project form modes ─────────────────────────────────────────────────────────
function setProjectModeCreate(): void {
  editingProjectId = null;
  projSubmitBtn.textContent = "Dodaj projekt";
  projCancelBtn.style.display = "none";
  projForm.reset();
  projNameInput.focus();
}

function setProjectModeEdit(project: { id: string; name: string; description: string }): void {
  editingProjectId = project.id;
  projNameInput.value = project.name;
  projDescInput.value = project.description;
  projSubmitBtn.textContent = "Zapisz projekt";
  projCancelBtn.style.display = "inline-block";
  projNameInput.focus();
}

// ── Story form modes ───────────────────────────────────────────────────────────
function setStoryModeCreate(): void {
  editingStoryId = null;
  storySubmitBtn.textContent = "Dodaj historyjkę";
  storyCancelBtn.style.display = "none";
  storyForm.reset();
}

function setStoryModeEdit(story: Story): void {
  editingStoryId = story.id;
  storyNameInput.value = story.name;
  storyDescInput.value = story.description;
  storyPrioritySelect.value = story.priority;
  storyStatusSelect.value = story.status;
  storySubmitBtn.textContent = "Zapisz historyjkę";
  storyCancelBtn.style.display = "inline-block";
  storyNameInput.focus();
}

// ── Task form modes ────────────────────────────────────────────────────────────
function setTaskModeCreate(): void {
  editingTaskId = null;
  taskSubmitBtn.textContent = "Dodaj zadanie";
  taskCancelBtn.style.display = "none";
  taskForm.reset();
}

function setTaskModeEdit(task: Task): void {
  editingTaskId = task.id;
  taskNameInput.value = task.name;
  taskDescInput.value = task.description;
  taskPrioritySelect.value = task.priority;
  taskEstimatedInput.value = String(task.estimatedTime);
  taskSubmitBtn.textContent = "Zapisz zadanie";
  taskCancelBtn.style.display = "inline-block";
  taskNameInput.focus();
}

// ── Render projects ────────────────────────────────────────────────────────────
function renderProjects(): void {
  const projects = projectService.getAll();
  const active = projectService.getActive();
  projectList.innerHTML = "";
  projEmpty.style.display = projects.length === 0 ? "block" : "none";

  projects.forEach((project) => {
    const isActive = active?.id === project.id;
    const li = document.createElement("li");
    li.className = `project-item${isActive ? " project-active" : ""}`;
    li.innerHTML = `
      <div>
        <div class="project-title">
          ${escapeHtml(project.name)}
          ${isActive ? '<span class="active-badge">aktywny</span>' : ""}
        </div>
        <div class="project-desc">${escapeHtml(project.description)}</div>
      </div>
      <div class="actions">
        ${!isActive ? `<button class="select-btn" data-id="${project.id}">Wybierz</button>` : ""}
        <button class="edit-btn" data-id="${project.id}">Edytuj</button>
        <button class="delete-btn" data-id="${project.id}">Usuń</button>
      </div>
    `;
    projectList.appendChild(li);
  });

  projectList.querySelectorAll<HTMLButtonElement>(".select-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      projectService.setActive(btn.dataset.id!);
      activeStoryId = null;
      setProjectModeCreate();
      renderProjects();
      renderStories();
      renderTasks();
    });
  });

  projectList.querySelectorAll<HTMLButtonElement>(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = projectService.getAll().find((x) => x.id === btn.dataset.id);
      if (p) setProjectModeEdit(p);
    });
  });

  projectList.querySelectorAll<HTMLButtonElement>(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      projectService.delete(btn.dataset.id!);
      if (editingProjectId === btn.dataset.id) setProjectModeCreate();
      renderProjects();
      renderStories();
    });
  });
}

// ── Render story columns ───────────────────────────────────────────────────────
function renderStoryColumn(stories: Story[], listEl: HTMLUListElement): void {
  listEl.innerHTML = "";

  if (stories.length === 0) {
    listEl.innerHTML = `<li class="story-empty">Brak historyjek</li>`;
    return;
  }

  stories.forEach((story) => {
    const owner = userService.getById(story.ownerId);
    const ownerName = owner
      ? `${escapeHtml(owner.firstName)} ${escapeHtml(owner.lastName)}`
      : escapeHtml(story.ownerId);
    const isActiveTask = story.id === activeStoryId;
    const taskCount = taskService.getByStory(story.id).length;

    const li = document.createElement("li");
    li.className = `story-card${isActiveTask ? " story-tasks-active" : ""}`;
    li.innerHTML = `
      <div class="story-card-top">
        <span class="story-card-name">${escapeHtml(story.name)}</span>
        <span class="priority-badge priority-${story.priority}">${PRIORITY_LABEL[story.priority]}</span>
      </div>
      <div class="story-card-desc">${escapeHtml(story.description)}</div>
      <div class="story-card-footer">
        <div class="story-meta">
          <span class="story-owner">👤 ${ownerName}</span>
          <span class="story-date">${fmt(story.createdAt)}</span>
        </div>
        <div class="actions">
          <button class="story-tasks-btn${isActiveTask ? " btn-active" : ""}" data-id="${story.id}">
            Zadania${taskCount > 0 ? ` (${taskCount})` : ""}
          </button>
          <button class="story-edit-btn" data-id="${story.id}">Edytuj</button>
          <button class="story-delete-btn" data-id="${story.id}">Usuń</button>
        </div>
      </div>
    `;
    listEl.appendChild(li);
  });
}

function renderStories(): void {
  const active = projectService.getActive();

  if (!active) {
    storiesPlaceholder.style.display = "flex";
    storiesContent.style.display = "none";
    return;
  }

  storiesPlaceholder.style.display = "none";
  storiesContent.style.display = "block";
  storiesTitle.textContent = `Historyjki: ${active.name}`;

  const stories = storyService.getByProject(active.id);
  const todoList = document.getElementById("stories-todo") as HTMLUListElement;
  const doingList = document.getElementById("stories-doing") as HTMLUListElement;
  const doneList = document.getElementById("stories-done") as HTMLUListElement;

  renderStoryColumn(stories.filter((s) => s.status === "todo"), todoList);
  renderStoryColumn(stories.filter((s) => s.status === "doing"), doingList);
  renderStoryColumn(stories.filter((s) => s.status === "done"), doneList);

  document.querySelectorAll<HTMLButtonElement>(".story-tasks-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeStoryId = btn.dataset.id!;
      setTaskModeCreate();
      renderStories();
      renderTasks();
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".story-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = storyService.getAll().find((x) => x.id === btn.dataset.id);
      if (s) setStoryModeEdit(s);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".story-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      storyService.delete(btn.dataset.id!);
      if (editingStoryId === btn.dataset.id) setStoryModeCreate();
      if (activeStoryId === btn.dataset.id) {
        activeStoryId = null;
        renderTasks();
      }
      renderStories();
    });
  });
}

// ── Render task columns ────────────────────────────────────────────────────────
function renderTaskColumn(tasks: Task[], listEl: HTMLUListElement): void {
  listEl.innerHTML = "";

  if (tasks.length === 0) {
    listEl.innerHTML = `<li class="story-empty">Brak zadań</li>`;
    return;
  }

  tasks.forEach((task) => {
    const assignedUser = task.assignedUserId ? userService.getById(task.assignedUserId) : null;
    const assignedName = assignedUser
      ? `${escapeHtml(assignedUser.firstName)} ${escapeHtml(assignedUser.lastName)}`
      : "Nieprzypisane";

    const li = document.createElement("li");
    li.className = "story-card";
    li.innerHTML = `
      <div class="story-card-top">
        <span class="story-card-name">${escapeHtml(task.name)}</span>
        <span class="priority-badge priority-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
      </div>
      <div class="story-card-desc">${escapeHtml(task.description)}</div>
      <div class="story-card-footer">
        <div class="story-meta">
          <span class="story-owner">👤 ${assignedName}</span>
          <span class="story-date">⏱ ${task.estimatedTime}h</span>
        </div>
        <div class="actions">
          <button class="task-detail-btn" data-id="${task.id}">Szczegóły</button>
          <button class="task-edit-btn" data-id="${task.id}">Edytuj</button>
          <button class="task-delete-btn" data-id="${task.id}">Usuń</button>
        </div>
      </div>
    `;
    listEl.appendChild(li);
  });
}

function renderTasks(): void {
  if (!activeStoryId) {
    tasksPlaceholder.style.display = "flex";
    tasksContent.style.display = "none";
    return;
  }

  const story = storyService.getAll().find((s) => s.id === activeStoryId);
  if (!story) {
    tasksPlaceholder.style.display = "flex";
    tasksContent.style.display = "none";
    return;
  }

  tasksPlaceholder.style.display = "none";
  tasksContent.style.display = "block";
  tasksTitle.textContent = `Zadania: ${story.name}`;

  const tasks = taskService.getByStory(activeStoryId);
  const todoList = document.getElementById("tasks-todo") as HTMLUListElement;
  const doingList = document.getElementById("tasks-doing") as HTMLUListElement;
  const doneList = document.getElementById("tasks-done") as HTMLUListElement;

  renderTaskColumn(tasks.filter((t) => t.status === "todo"), todoList);
  renderTaskColumn(tasks.filter((t) => t.status === "doing"), doingList);
  renderTaskColumn(tasks.filter((t) => t.status === "done"), doneList);

  document.querySelectorAll<HTMLButtonElement>(".task-detail-btn").forEach((btn) => {
    btn.addEventListener("click", () => openTaskDetail(btn.dataset.id!));
  });

  document.querySelectorAll<HTMLButtonElement>(".task-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = taskService.getAll().find((x) => x.id === btn.dataset.id);
      if (t) setTaskModeEdit(t);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".task-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      taskService.delete(btn.dataset.id!);
      if (editingTaskId === btn.dataset.id) setTaskModeCreate();
      renderTasks();
    });
  });
}

// ── Task detail modal ──────────────────────────────────────────────────────────
function openTaskDetail(taskId: string): void {
  const task = taskService.getAll().find((t) => t.id === taskId);
  if (!task) return;

  const story = storyService.getAll().find((s) => s.id === task.storyId);
  const assignedUser = task.assignedUserId ? userService.getById(task.assignedUserId) : null;
  const assignedName = assignedUser
    ? `${escapeHtml(assignedUser.firstName)} ${escapeHtml(assignedUser.lastName)}
       <span class="role-badge role-${assignedUser.role}">${ROLE_LABEL[assignedUser.role]}</span>`
    : "—";

  const assignableUsers = userService.getAssignable();
  const assignOptions = assignableUsers
    .map(
      (u) =>
        `<option value="${u.id}" ${u.id === task.assignedUserId ? "selected" : ""}>
          ${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)} (${ROLE_LABEL[u.role]})
        </option>`
    )
    .join("");

  const canAssign = task.status !== "done";
  const canComplete = task.status === "doing" && !!task.assignedUserId;

  modalTaskName.textContent = task.name;
  modalBody.innerHTML = `
    <div class="modal-grid">
      <div class="modal-section">
        <h4 class="modal-section-title">Dane zadania</h4>
        <div class="detail-row">
          <span class="detail-label">Opis</span>
          <span class="detail-value">${escapeHtml(task.description)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Priorytet</span>
          <span class="priority-badge priority-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Stan</span>
          <span class="status-badge status-${task.status}">${STATUS_LABEL[task.status]}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Historyjka</span>
          <span class="detail-value">${story ? escapeHtml(story.name) : "—"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Dodano</span>
          <span class="detail-value">${fmt(task.createdAt)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data startu</span>
          <span class="detail-value">${fmt(task.startedAt)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data zakończenia</span>
          <span class="detail-value">${fmt(task.finishedAt)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Szac. czas</span>
          <span class="detail-value">${task.estimatedTime}h</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Realiz. roboczogodziny</span>
          <input
            type="number"
            id="modal-actual-time"
            class="detail-input"
            value="${task.actualTime ?? ""}"
            placeholder="0"
            min="0"
            step="0.5"
            data-task-id="${task.id}"
          />
        </div>
        <div class="detail-row">
          <span class="detail-label">Przypisany</span>
          <span class="detail-value">${assignedName}</span>
        </div>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Akcje</h4>
        ${
          canAssign
            ? `<div class="modal-action-group">
                <label class="detail-label">Przypisz osobę</label>
                <select id="modal-assign-select" class="modal-select">
                  <option value="">— wybierz —</option>
                  ${assignOptions}
                </select>
                <button id="modal-assign-btn" class="btn-primary">Przypisz</button>
              </div>`
            : ""
        }
        ${
          canComplete
            ? `<div class="modal-action-group" style="margin-top:12px;">
                <button id="modal-complete-btn" class="btn-done">Oznacz jako zakończone</button>
              </div>`
            : ""
        }
        ${
          !canAssign && !canComplete
            ? `<p class="detail-value" style="color:var(--accent-done);margin-top:0;">✓ Zadanie zakończone</p>`
            : ""
        }
      </div>
    </div>
  `;

  taskModal.style.display = "flex";
  document.body.style.overflow = "hidden";

  const actualTimeInput = document.getElementById("modal-actual-time") as HTMLInputElement;
  actualTimeInput?.addEventListener("blur", () => {
    const val = parseFloat(actualTimeInput.value);
    const t = taskService.getAll().find((x) => x.id === taskId);
    if (t) taskService.update({ ...t, actualTime: isNaN(val) ? undefined : val });
  });

  const assignBtn = document.getElementById("modal-assign-btn");
  const assignSelect = document.getElementById("modal-assign-select") as HTMLSelectElement;
  assignBtn?.addEventListener("click", () => {
    const userId = assignSelect?.value;
    if (!userId) return;
    taskService.assign(taskId, userId);
    renderStories();
    renderTasks();
    openTaskDetail(taskId);
  });

  const completeBtn = document.getElementById("modal-complete-btn");
  completeBtn?.addEventListener("click", () => {
    taskService.complete(taskId);
    renderStories();
    renderTasks();
    openTaskDetail(taskId);
  });
}

function closeTaskDetail(): void {
  taskModal.style.display = "none";
  document.body.style.overflow = "";
}

// ── Modal events ───────────────────────────────────────────────────────────────
modalCloseBtn.addEventListener("click", closeTaskDetail);
taskModal.addEventListener("click", (e) => {
  if (e.target === taskModal) closeTaskDetail();
});

// ── Project form events ────────────────────────────────────────────────────────
projForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = projNameInput.value.trim();
  const description = projDescInput.value.trim();
  if (!name || !description) return;

  if (editingProjectId) {
    projectService.update({ id: editingProjectId, name, description });
    setProjectModeCreate();
  } else {
    projectService.create({ name, description });
    projForm.reset();
    projNameInput.focus();
  }
  renderProjects();
  renderStories();
});

projCancelBtn.addEventListener("click", () => setProjectModeCreate());

// ── Story form events ──────────────────────────────────────────────────────────
storyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = storyNameInput.value.trim();
  const description = storyDescInput.value.trim();
  const priority = storyPrioritySelect.value as Story["priority"];
  const status = storyStatusSelect.value as Story["status"];
  const active = projectService.getActive();
  if (!name || !description || !active) return;

  if (editingStoryId) {
    const existing = storyService.getAll().find((s) => s.id === editingStoryId);
    if (existing) storyService.update({ ...existing, name, description, priority, status });
    setStoryModeCreate();
  } else {
    storyService.create({
      name,
      description,
      priority,
      status,
      projectId: active.id,
      ownerId: currentUser.id,
    });
    storyForm.reset();
    storyNameInput.focus();
  }
  renderStories();
});

storyCancelBtn.addEventListener("click", () => setStoryModeCreate());

// ── Task form events ───────────────────────────────────────────────────────────
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = taskNameInput.value.trim();
  const description = taskDescInput.value.trim();
  const priority = taskPrioritySelect.value as Task["priority"];
  const estimatedTime = parseFloat(taskEstimatedInput.value);
  if (!name || !description || !activeStoryId || isNaN(estimatedTime)) return;

  if (editingTaskId) {
    const existing = taskService.getAll().find((t) => t.id === editingTaskId);
    if (existing) taskService.update({ ...existing, name, description, priority, estimatedTime });
    setTaskModeCreate();
  } else {
    taskService.create({
      name,
      description,
      priority,
      estimatedTime,
      storyId: activeStoryId,
      status: "todo",
    });
    taskForm.reset();
    taskNameInput.focus();
  }
  renderTasks();
});

taskCancelBtn.addEventListener("click", () => setTaskModeCreate());

// ── Init ───────────────────────────────────────────────────────────────────────
renderProjects();
renderStories();
renderTasks();
