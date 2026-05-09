import "./style.css";
import { ProjectService } from "./ProjectService";
import { UserService } from "./UserService";
import { StoryService } from "./StoryService";
import { TaskService } from "./TaskService";
import { NotificationService } from "./NotificationService";
import type { Story } from "./Story";
import type { Task } from "./Task";
import type { UserNotification } from "./Notification";

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

// ── Services & state ──────────────────────────────────────────────────────────
const projectService = new ProjectService();
const storyService = new StoryService();
const userService = new UserService();
const taskService = new TaskService(storyService);
const notifService = new NotificationService();
const currentUser = userService.getLoggedUser();

let editingProjectId: string | null = null;
let editingStoryId: string | null = null;
let editingTaskId: string | null = null;
let activeStoryId: string | null = null;
let currentView: "projects" | "notifications" = "projects";

// ── Labels ────────────────────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<string, string> = { low: "Niski", medium: "Średni", high: "Wysoki" };
const STATUS_LABEL: Record<string, string> = { todo: "Do zrobienia", doing: "W trakcie", done: "Gotowe" };
const ROLE_LABEL: Record<string, string> = { admin: "Admin", developer: "Developer", devops: "DevOps" };

// ── HTML skeleton ─────────────────────────────────────────────────────────────
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="app-layout">
    <header class="app-header">
      <span class="app-title">ManageMe</span>
      <nav class="flex items-center gap-1">
        <button id="nav-projects-btn" class="nav-btn-active">Projekty</button>
        <button id="nav-notifs-btn" class="nav-btn">
          Powiadomienia
          <span id="notif-badge" class="notif-badge ml-1.5" style="display:none;">0</span>
        </button>
      </nav>
      <div class="header-right">
        <button id="theme-toggle" class="btn-icon" title="Przełącz motyw"></button>
        <span class="user-badge">
          ${escapeHtml(currentUser.firstName)} ${escapeHtml(currentUser.lastName)}
          <span class="role-${currentUser.role}">${ROLE_LABEL[currentUser.role]}</span>
        </span>
      </div>
    </header>

    <main class="app-main" id="projects-main">
      <!-- Projects -->
      <section class="panel" id="projects-panel">
        <h2 class="panel-title">Projekty</h2>
        <form id="project-form" class="form-col">
          <input type="text" id="proj-name" class="form-input" placeholder="Nazwa projektu" required />
          <input type="text" id="proj-desc" class="form-input" placeholder="Opis projektu" required />
          <div class="form-row">
            <button type="submit" id="proj-submit-btn" class="btn-submit">Dodaj projekt</button>
            <button type="button" id="proj-cancel-btn" class="btn" style="display:none;">Anuluj</button>
          </div>
        </form>
        <p id="proj-empty" class="empty-state" style="display:none;">Brak projektów</p>
        <ul id="project-list" class="project-list"></ul>
      </section>

      <!-- Stories -->
      <section class="panel" id="stories-panel">
        <div id="stories-placeholder" class="placeholder-box">
          <p class="placeholder-text">Wybierz projekt, aby zobaczyć historyjki</p>
        </div>
        <div id="stories-content" style="display:none;">
          <h2 class="panel-title" id="stories-title"></h2>
          <form id="story-form">
            <div class="story-form-grid">
              <input type="text" id="story-name" class="form-input col-span-2" placeholder="Nazwa historyjki" required />
              <input type="text" id="story-desc" class="form-input col-span-2" placeholder="Opis historyjki" required />
              <select id="story-priority" class="form-select">
                <option value="low">Niski priorytet</option>
                <option value="medium" selected>Średni priorytet</option>
                <option value="high">Wysoki priorytet</option>
              </select>
              <select id="story-status" class="form-select">
                <option value="todo" selected>Do zrobienia</option>
                <option value="doing">W trakcie</option>
                <option value="done">Gotowe</option>
              </select>
            </div>
            <div class="form-row" style="margin-top:10px;">
              <button type="submit" id="story-submit-btn" class="btn-submit">Dodaj historyjkę</button>
              <button type="button" id="story-cancel-btn" class="btn" style="display:none;">Anuluj</button>
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

      <!-- Tasks -->
      <section class="panel" id="tasks-panel">
        <div id="tasks-placeholder" class="placeholder-box">
          <p class="placeholder-text">Wybierz historyjkę, aby zobaczyć zadania</p>
        </div>
        <div id="tasks-content" style="display:none;">
          <h2 class="panel-title" id="tasks-title"></h2>
          <form id="task-form">
            <div class="story-form-grid">
              <input type="text" id="task-name" class="form-input col-span-2" placeholder="Nazwa zadania" required />
              <input type="text" id="task-desc" class="form-input col-span-2" placeholder="Opis zadania" required />
              <select id="task-priority" class="form-select">
                <option value="low">Niski priorytet</option>
                <option value="medium" selected>Średni priorytet</option>
                <option value="high">Wysoki priorytet</option>
              </select>
              <input type="number" id="task-estimated" class="form-input" placeholder="Szac. czas (h)" min="0" step="0.5" required />
            </div>
            <div class="form-row" style="margin-top:10px;">
              <button type="submit" id="task-submit-btn" class="btn-submit">Dodaj zadanie</button>
              <button type="button" id="task-cancel-btn" class="btn" style="display:none;">Anuluj</button>
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

    <!-- Notifications view -->
    <div id="notifications-view" style="display:none;">
      <div class="max-w-2xl mx-auto px-6 py-6 w-full">
        <div class="panel">
          <div class="flex items-center justify-between mb-4">
            <h2 class="panel-title m-0">Powiadomienia</h2>
            <button id="mark-all-read-btn" class="btn-sm">Oznacz wszystkie jako przeczytane</button>
          </div>
          <div id="notif-list" class="flex flex-col gap-2"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Task detail modal -->
  <div id="task-modal" class="modal-overlay" style="display:none;">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title" id="modal-task-name"></h3>
        <button id="modal-close-btn" class="modal-close">✕</button>
      </div>
      <div class="modal-body" id="modal-body"></div>
    </div>
  </div>

  <!-- Notification detail modal -->
  <div id="notif-modal" class="modal-overlay" style="display:none;">
    <div class="modal" style="max-width:480px;">
      <div class="modal-header">
        <h3 class="modal-title" id="notif-modal-title"></h3>
        <button id="notif-modal-close" class="modal-close">✕</button>
      </div>
      <div class="modal-body" id="notif-modal-body"></div>
    </div>
  </div>

  <!-- Toast container -->
  <div id="toast-container" class="fixed bottom-5 right-5 flex flex-col gap-3 z-50"></div>
`;

// ── Theme toggle ──────────────────────────────────────────────────────────────
function updateThemeIcon(): void {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = document.documentElement.classList.contains("dark") ? "☀️" : "🌙";
}

updateThemeIcon();

document.getElementById("theme-toggle")!.addEventListener("click", () => {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon();
});

// ── DOM references ────────────────────────────────────────────────────────────
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

// ── Notification helpers ──────────────────────────────────────────────────────
function sendNotif(data: Omit<UserNotification, "id" | "date" | "isRead">): void {
  const notif = notifService.send(data);
  updateBadge();
  if (notif.recipientId === currentUser.id && (notif.priority === "medium" || notif.priority === "high")) {
    showToast(notif);
  }
}

function updateBadge(): void {
  const count = notifService.getUnreadCount(currentUser.id);
  const badge = document.getElementById("notif-badge");
  if (badge) {
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }
}

function showToast(notif: UserNotification): void {
  const container = document.getElementById("toast-container")!;
  const div = document.createElement("div");
  div.className = "toast-card";
  div.innerHTML = `
    <div class="toast-header">
      <div class="flex flex-col gap-1">
        <span class="badge-${notif.priority}">${PRIORITY_LABEL[notif.priority]}</span>
        <p class="toast-title">${escapeHtml(notif.title)}</p>
      </div>
      <button class="toast-close">✕</button>
    </div>
    <p class="toast-message">${escapeHtml(notif.message)}</p>
  `;
  container.appendChild(div);
  div.querySelector<HTMLButtonElement>(".toast-close")!.addEventListener("click", () => div.remove());
  setTimeout(() => div.remove(), 5000);
}

function showView(view: "projects" | "notifications"): void {
  currentView = view;
  const projectsMain = document.getElementById("projects-main")!;
  const notifView = document.getElementById("notifications-view")!;
  const btnProjects = document.getElementById("nav-projects-btn")!;
  const btnNotifs = document.getElementById("nav-notifs-btn")!;

  if (view === "projects") {
    projectsMain.style.display = "";
    notifView.style.display = "none";
    btnProjects.className = "nav-btn-active";
    btnNotifs.className = "nav-btn";
  } else {
    projectsMain.style.display = "none";
    notifView.style.display = "block";
    btnProjects.className = "nav-btn";
    btnNotifs.className = "nav-btn-active";
    renderNotifications();
  }
}

function renderNotifications(): void {
  const notifList = document.getElementById("notif-list")!;
  const notifs = notifService.getForUser(currentUser.id);

  if (notifs.length === 0) {
    notifList.innerHTML = `<p class="empty-state">Brak powiadomień</p>`;
    return;
  }

  notifList.innerHTML = "";
  notifs.forEach((notif) => {
    const div = document.createElement("div");
    div.className = notif.isRead ? "notif-item" : "notif-item-unread";
    div.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <span class="text-sm font-semibold text-slate-800 dark:text-gray-200 leading-tight">${escapeHtml(notif.title)}</span>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="badge-${notif.priority}">${PRIORITY_LABEL[notif.priority]}</span>
          ${!notif.isRead ? '<span class="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Nowe</span>' : ""}
        </div>
      </div>
      <p class="text-xs text-slate-500 dark:text-gray-400 leading-relaxed mt-0.5">${escapeHtml(notif.message)}</p>
      <span class="text-xs text-slate-400 dark:text-gray-600">${fmt(notif.date)}</span>
    `;
    div.addEventListener("click", () => openNotifDetail(notif.id));
    notifList.appendChild(div);
  });
}

function openNotifDetail(notifId: string): void {
  const notif = notifService.getAll().find((n) => n.id === notifId);
  if (!notif) return;

  notifService.markAsRead(notifId);
  updateBadge();
  if (currentView === "notifications") renderNotifications();

  const modal = document.getElementById("notif-modal")!;
  document.getElementById("notif-modal-title")!.textContent = notif.title;
  document.getElementById("notif-modal-body")!.innerHTML = `
    <div class="flex flex-col gap-3">
      <div class="detail-row">
        <span class="detail-label">Priorytet</span>
        <span class="badge-${notif.priority}">${PRIORITY_LABEL[notif.priority]}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Data</span>
        <span class="detail-value">${fmt(notif.date)}</span>
      </div>
      <div class="detail-row" style="align-items:flex-start;">
        <span class="detail-label" style="padding-top:2px;">Wiadomość</span>
        <span class="detail-value">${escapeHtml(notif.message)}</span>
      </div>
    </div>
  `;

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeNotifDetail(): void {
  document.getElementById("notif-modal")!.style.display = "none";
  document.body.style.overflow = "";
}

// ── Project form modes ────────────────────────────────────────────────────────
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
  projCancelBtn.style.display = "inline-flex";
  projNameInput.focus();
}

// ── Story form modes ──────────────────────────────────────────────────────────
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
  storyCancelBtn.style.display = "inline-flex";
  storyNameInput.focus();
}

// ── Task form modes ───────────────────────────────────────────────────────────
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
  taskCancelBtn.style.display = "inline-flex";
  taskNameInput.focus();
}

// ── Render projects ───────────────────────────────────────────────────────────
function renderProjects(): void {
  const projects = projectService.getAll();
  const active = projectService.getActive();
  projectList.innerHTML = "";
  projEmpty.style.display = projects.length === 0 ? "block" : "none";

  projects.forEach((project) => {
    const isActive = active?.id === project.id;
    const li = document.createElement("li");
    li.className = isActive ? "project-item-active" : "project-item";
    li.innerHTML = `
      <div>
        <div class="flex items-center gap-1.5 flex-wrap font-semibold text-sm text-slate-800 dark:text-gray-200">
          ${escapeHtml(project.name)}
          ${isActive ? '<span class="active-badge">aktywny</span>' : ""}
        </div>
        <div class="text-xs text-slate-500 dark:text-gray-500 mt-0.5 truncate">${escapeHtml(project.description)}</div>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        ${!isActive ? `<button class="select-btn btn-select" data-id="${project.id}">Wybierz</button>` : ""}
        <button class="edit-btn btn-sm" data-id="${project.id}">Edytuj</button>
        <button class="delete-btn btn-sm" data-id="${project.id}">Usuń</button>
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

// ── Render story columns ──────────────────────────────────────────────────────
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
    li.className = isActiveTask ? "story-card tasks-active" : "story-card";
    li.innerHTML = `
      <div class="flex items-start justify-between gap-2 mb-1.5">
        <span class="font-semibold text-sm text-slate-800 dark:text-gray-200 leading-tight">${escapeHtml(story.name)}</span>
        <span class="badge-${story.priority} shrink-0">${PRIORITY_LABEL[story.priority]}</span>
      </div>
      <div class="text-xs text-slate-500 dark:text-gray-500 mb-2.5 leading-relaxed">${escapeHtml(story.description)}</div>
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-slate-500 dark:text-gray-500">👤 ${ownerName}</span>
          <span class="text-xs text-slate-400 dark:text-gray-600">${fmt(story.createdAt)}</span>
        </div>
        <div class="flex gap-1.5 flex-wrap">
          <button class="story-tasks-btn ${isActiveTask ? "btn-tasks-active" : "btn-tasks"}" data-id="${story.id}">
            Zadania${taskCount > 0 ? ` (${taskCount})` : ""}
          </button>
          <button class="story-edit-btn btn-sm" data-id="${story.id}">Edytuj</button>
          <button class="story-delete-btn btn-sm" data-id="${story.id}">Usuń</button>
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

// ── Render task columns ───────────────────────────────────────────────────────
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
      <div class="flex items-start justify-between gap-2 mb-1.5">
        <span class="font-semibold text-sm text-slate-800 dark:text-gray-200 leading-tight">${escapeHtml(task.name)}</span>
        <span class="badge-${task.priority} shrink-0">${PRIORITY_LABEL[task.priority]}</span>
      </div>
      <div class="text-xs text-slate-500 dark:text-gray-500 mb-2.5 leading-relaxed">${escapeHtml(task.description)}</div>
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-slate-500 dark:text-gray-500">👤 ${assignedName}</span>
          <span class="text-xs text-slate-400 dark:text-gray-600">⏱ ${task.estimatedTime}h</span>
        </div>
        <div class="flex gap-1.5 flex-wrap">
          <button class="task-detail-btn btn-select" data-id="${task.id}">Szczegóły</button>
          <button class="task-edit-btn btn-sm" data-id="${task.id}">Edytuj</button>
          <button class="task-delete-btn btn-sm" data-id="${task.id}">Usuń</button>
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
      const task = taskService.getAll().find((x) => x.id === btn.dataset.id);
      if (task) {
        const parentStory = storyService.getAll().find((s) => s.id === task.storyId);
        if (parentStory) {
          sendNotif({
            title: "Zadanie usunięte",
            message: `Zadanie "${task.name}" zostało usunięte z historyjki "${parentStory.name}".`,
            priority: "medium",
            recipientId: parentStory.ownerId,
          });
        }
      }
      taskService.delete(btn.dataset.id!);
      if (editingTaskId === btn.dataset.id) setTaskModeCreate();
      renderTasks();
    });
  });
}

// ── Task detail modal ─────────────────────────────────────────────────────────
function openTaskDetail(taskId: string): void {
  const task = taskService.getAll().find((t) => t.id === taskId);
  if (!task) return;

  const story = storyService.getAll().find((s) => s.id === task.storyId);
  const assignedUser = task.assignedUserId ? userService.getById(task.assignedUserId) : null;
  const assignedName = assignedUser
    ? `${escapeHtml(assignedUser.firstName)} ${escapeHtml(assignedUser.lastName)}
       <span class="role-${assignedUser.role}">${ROLE_LABEL[assignedUser.role]}</span>`
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
          <span class="badge-${task.priority}">${PRIORITY_LABEL[task.priority]}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Stan</span>
          <span class="badge-${task.status}">${STATUS_LABEL[task.status]}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Historyjka</span>
          <span class="detail-value">${story ? escapeHtml(story.name) : "—"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Data dodania</span>
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
          <input type="number" id="modal-actual-time" class="detail-input"
            value="${task.actualTime ?? ""}" placeholder="0" min="0" step="0.5" />
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
                <label class="text-xs text-slate-500 dark:text-gray-500">Przypisz osobę</label>
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
            ? `<div class="modal-action-group">
                <button id="modal-complete-btn" class="btn-done">Oznacz jako zakończone</button>
              </div>`
            : ""
        }
        ${
          !canAssign && !canComplete
            ? `<p class="text-sm text-emerald-600 dark:text-emerald-400 mt-1">✓ Zadanie zakończone</p>`
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

    const assignedTo = userService.getById(userId);
    const taskStory = storyService.getAll().find((s) => s.id === task.storyId);
    if (assignedTo && taskStory) {
      sendNotif({
        title: "Przypisano zadanie",
        message: `Zostałeś przypisany do zadania "${task.name}" w historyjce "${taskStory.name}".`,
        priority: "high",
        recipientId: assignedTo.id,
      });
      sendNotif({
        title: "Zadanie przypisane",
        message: `Zadanie "${task.name}" zostało przypisane do ${assignedTo.firstName} ${assignedTo.lastName}.`,
        priority: "low",
        recipientId: taskStory.ownerId,
      });
    }

    renderStories();
    renderTasks();
    openTaskDetail(taskId);
  });

  const completeBtn = document.getElementById("modal-complete-btn");
  completeBtn?.addEventListener("click", () => {
    const taskStory = storyService.getAll().find((s) => s.id === task.storyId);
    taskService.complete(taskId);

    if (taskStory) {
      sendNotif({
        title: "Zadanie zakończone",
        message: `Zadanie "${task.name}" w historyjce "${taskStory.name}" zostało oznaczone jako zakończone.`,
        priority: "medium",
        recipientId: taskStory.ownerId,
      });
    }

    renderStories();
    renderTasks();
    openTaskDetail(taskId);
  });
}

function closeTaskDetail(): void {
  taskModal.style.display = "none";
  document.body.style.overflow = "";
}

// ── Modal events ──────────────────────────────────────────────────────────────
modalCloseBtn.addEventListener("click", closeTaskDetail);
taskModal.addEventListener("click", (e) => {
  if (e.target === taskModal) closeTaskDetail();
});

document.getElementById("notif-modal-close")!.addEventListener("click", closeNotifDetail);
document.getElementById("notif-modal")!.addEventListener("click", (e) => {
  if (e.target === document.getElementById("notif-modal")) closeNotifDetail();
});

// ── Nav events ────────────────────────────────────────────────────────────────
document.getElementById("nav-projects-btn")!.addEventListener("click", () => showView("projects"));
document.getElementById("nav-notifs-btn")!.addEventListener("click", () => showView("notifications"));

document.getElementById("mark-all-read-btn")!.addEventListener("click", () => {
  notifService.markAllAsRead(currentUser.id);
  updateBadge();
  renderNotifications();
});

// ── Project form events ───────────────────────────────────────────────────────
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
    userService.getAll()
      .filter((u) => u.role === "admin")
      .forEach((u) => sendNotif({
        title: "Nowy projekt",
        message: `Projekt "${name}" został dodany.`,
        priority: "high",
        recipientId: u.id,
      }));
    projForm.reset();
    projNameInput.focus();
  }
  renderProjects();
  renderStories();
});

projCancelBtn.addEventListener("click", () => setProjectModeCreate());

// ── Story form events ─────────────────────────────────────────────────────────
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
    storyService.create({ name, description, priority, status, projectId: active.id, ownerId: currentUser.id });
    sendNotif({
      title: "Nowa historyjka",
      message: `Historyjka "${name}" została dodana do projektu "${active.name}".`,
      priority: "high",
      recipientId: currentUser.id,
    });
    storyForm.reset();
    storyNameInput.focus();
  }
  renderStories();
});

storyCancelBtn.addEventListener("click", () => setStoryModeCreate());

// ── Task form events ──────────────────────────────────────────────────────────
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
    taskService.create({ name, description, priority, estimatedTime, storyId: activeStoryId, status: "todo" });
    const parentStory = storyService.getAll().find((s) => s.id === activeStoryId);
    if (parentStory) {
      sendNotif({
        title: "Nowe zadanie",
        message: `Zadanie "${name}" zostało dodane do historyjki "${parentStory.name}".`,
        priority: "medium",
        recipientId: parentStory.ownerId,
      });
    }
    taskForm.reset();
    taskNameInput.focus();
  }
  renderTasks();
});

taskCancelBtn.addEventListener("click", () => setTaskModeCreate());

// ── Init ──────────────────────────────────────────────────────────────────────
renderProjects();
renderStories();
renderTasks();
updateBadge();
