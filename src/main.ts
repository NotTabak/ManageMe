import "./style.css";
import { ProjectService } from "./ProjectService";
import type { Project } from "./Project";

const service = new ProjectService();

let editingId: string | null = null;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="container">
    <h1>ManageMe</h1>

    <form id="project-form">
      <input type="text" id="name" placeholder="Nazwa projektu" required />
      <input type="text" id="description" placeholder="Opis projektu" required />
      <button type="submit" id="submit-btn">Dodaj projekt</button>
      <button type="button" id="cancel-btn" style="display:none;">Anuluj</button>
    </form>

    <p id="empty-state" style="display:none; margin-top:12px;">Brak projektów</p>
    <ul id="project-list"></ul>
  </div>
`;

const form = document.getElementById("project-form") as HTMLFormElement;
const list = document.getElementById("project-list") as HTMLUListElement;

const nameInput = document.getElementById("name") as HTMLInputElement;
const descInput = document.getElementById("description") as HTMLInputElement;

const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
const cancelBtn = document.getElementById("cancel-btn") as HTMLButtonElement;

const emptyState = document.getElementById("empty-state") as HTMLParagraphElement;

function setModeCreate() {
  editingId = null;
  submitBtn.textContent = "Dodaj projekt";
  cancelBtn.style.display = "none";
  form.reset();
  nameInput.focus();
}

function setModeEdit(project: Project) {
  editingId = project.id;
  nameInput.value = project.name;
  descInput.value = project.description;

  submitBtn.textContent = "Zapisz zmiany";
  cancelBtn.style.display = "inline-block";
  nameInput.focus();
}

function render(): void {
  const projects = service.getAll();
  list.innerHTML = "";

  emptyState.style.display = projects.length === 0 ? "block" : "none";

  projects.forEach((project) => {
    const li = document.createElement("li");

    li.className = "project-item";
    li.innerHTML = `
      <div>
        <div class="project-title">${escapeHtml(project.name)}</div>
        <div class="project-desc">${escapeHtml(project.description)}</div>
      </div>

      <div class="actions">
        <button class="edit-btn" data-id="${project.id}">Edytuj</button>
        <button class="delete-btn" data-id="${project.id}">Usuń</button>
      </div>
    `;

    list.appendChild(li);
  });

  document.querySelectorAll<HTMLButtonElement>(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id!;
      const p = service.getAll().find((x) => x.id === id);
      if (p) setModeEdit(p);
    });
  });

  document.querySelectorAll<HTMLButtonElement>(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id!;
      service.delete(id);

      if (editingId === id) setModeCreate();

      render();
    });
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const description = descInput.value.trim();

  if (!name || !description) return;

  if (editingId) {
    service.update({ id: editingId, name, description });
    setModeCreate();
  } else {
    service.create({ name, description });
    form.reset();
    nameInput.focus();
  }

  render();
});

cancelBtn.addEventListener("click", () => {
  setModeCreate();
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();