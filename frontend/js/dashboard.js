/* ==========================================================================
   Smart Task Manager — Dashboard Core Application Controller
   ========================================================================== */

const taskList = document.getElementById("task-list");
const loadingMessage = document.getElementById("loading-message");
const errorMessage = document.getElementById("error-message");
const searchInput = document.getElementById("search-input");
const priorityFilter = document.getElementById("priority-filter");

let allTasks = [];
let currentViewMode = "list"; // "list" | "board"

// Initialize Workspace UI
document.addEventListener("DOMContentLoaded", () => {
    initUserContext();
    initTabNavigation();
    loadTasks();
});

// Initialize User Profile in Navigation & Sidebar
function initUserContext() {
    const user = typeof getUser === 'function' ? getUser() : null;
    if (!user && !localStorage.getItem("access_token")) {
        window.location.href = "login.html";
        return;
    }

    const userName = user && user.name ? user.name : "Workspace User";
    const userEmail = user && user.email ? user.email : "user@workspace.com";
    const avatarLetter = userName.charAt(0).toUpperCase();

    // Set avatar elements
    ['sidebar-user-avatar', 'topbar-user-avatar', 'settings-avatar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = avatarLetter;
    });

    // Set user name elements
    ['sidebar-user-name', 'topbar-user-name', 'dropdown-user-name', 'settings-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = userName;
    });

    // Set user email elements
    ['sidebar-user-email', 'dropdown-user-email', 'settings-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = userEmail;
    });
}

// Tab Navigation Logic
function initTabNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchToTab(tabId);
        });
    });
}

function switchToTab(tabId) {
    if (!tabId) return;

    // Update active nav links
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => {
        if (nav.getAttribute('data-tab') === tabId) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    // Hide all tab pages, show target
    document.querySelectorAll('.tab-page').forEach(page => {
        page.style.display = 'none';
    });

    const targetPage = document.getElementById(tabId);
    if (targetPage) {
        targetPage.style.display = 'block';
    }

    // Close mobile drawer if open
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
}

// Global Dropdown Handler
function toggleDropdown(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    // Close other dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== menuId) m.classList.remove('show');
    });

    menu.classList.toggle('show');
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    }
});

// Load Tasks from FastAPI Backend
async function loadTasks() {
    const priority = priorityFilter ? priorityFilter.value : "";
    const query = priority ? "?priority=" + priority : "";

    if (loadingMessage) loadingMessage.style.display = "block";
    if (errorMessage) errorMessage.textContent = "";

    try {
        const response = await authFetch("/tasks" + query);

        if (!response.ok) {
            if (errorMessage) errorMessage.textContent = "Failed to load tasks from server.";
            if (typeof showToast === 'function') showToast("Failed to load tasks.", 'error');
            return;
        }

        allTasks = await response.json();
        updateKPIMetrics(allTasks);
        applySearch();
    } catch (err) {
        if (errorMessage) errorMessage.textContent = "Network error. Please try again.";
        if (typeof showToast === 'function') showToast("Network error. Please check backend connection.", 'error');
    } finally {
        if (loadingMessage) loadingMessage.style.display = "none";
    }
}

// Search and Filter logic
function applySearch() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const statusVal = document.getElementById('status-filter') ? document.getElementById('status-filter').value : "";

    const filtered = allTasks.filter(function (task) {
        const matchesQuery = task.title.toLowerCase().includes(query) || (task.description && task.description.toLowerCase().includes(query));
        const matchesStatus = !statusVal || task.status === statusVal;
        return matchesQuery && matchesStatus;
    });

    if (currentViewMode === "list") {
        renderTasks(filtered);
    } else {
        renderKanbanBoard(filtered);
    }

    renderRecentTasks(allTasks);
}

if (searchInput) searchInput.addEventListener("input", applySearch);
if (priorityFilter) priorityFilter.addEventListener("change", loadTasks);

// Switch Between List View & Board View
function switchTaskView(mode) {
    currentViewMode = mode;
    const listViewBtn = document.getElementById('view-mode-list');
    const boardViewBtn = document.getElementById('view-mode-board');
    const listContainer = document.getElementById('task-list-view');
    const boardContainer = document.getElementById('task-board-view');

    if (mode === 'list') {
        listViewBtn.classList.add('active');
        boardViewBtn.classList.remove('active');
        listContainer.style.display = 'block';
        boardContainer.style.display = 'none';
    } else {
        boardViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        listContainer.style.display = 'none';
        boardContainer.style.display = 'block';
    }

    applySearch();
}

// Render Tasks in List View
function renderTasks(tasks) {
    if (!taskList) return;
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="card text-center p-4" style="background: rgba(15, 23, 42, 0.4);">
                <div style="font-size: 2rem; margin-bottom: 8px;">📋</div>
                <h4 class="font-semibold text-primary mb-1">No Tasks Found</h4>
                <p class="text-xs text-muted mb-3">Get started by creating your first task in this workspace.</p>
                <button class="btn btn-primary btn-sm" onclick="openModal('create-task-modal')">+ Add First Task</button>
            </div>
        `;
        return;
    }

    tasks.forEach(function (task) {
        const card = document.createElement("div");
        card.className = "card card-elevated flex items-center justify-between gap-3 p-3";
        if (task.status === "completed") {
            card.style.opacity = "0.75";
        }

        const isCompleted = task.status === "completed";
        const priorityBadgeClass = task.priority === "high" ? "badge-high" : (task.priority === "medium" ? "badge-medium" : "badge-low");

        card.innerHTML = `
            <div class="flex items-center gap-3 flex-1" style="overflow: hidden;">
                <button class="btn btn-icon ${isCompleted ? 'btn-primary' : 'btn-secondary'}" style="width: 28px; height: 28px; border-radius: 50%; font-size: 12px; padding: 0;" onclick="completeTask(${task.id})" title="${isCompleted ? 'Completed' : 'Mark as Complete'}">
                    ${isCompleted ? '✓' : ''}
                </button>
                <div style="overflow: hidden; flex: 1;" onclick="viewTaskDetail(${task.id})" style="cursor: pointer;">
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-base font-semibold text-primary truncate" style="${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHTML(task.title)}</h3>
                        <span class="badge ${priorityBadgeClass}">${task.priority}</span>
                        <span class="status-chip ${isCompleted ? 'status-completed' : 'status-pending'}">${task.status}</span>
                    </div>
                    ${task.description ? `<p class="text-xs text-secondary truncate">${escapeHTML(task.description)}</p>` : ''}
                </div>
            </div>

            <div class="flex items-center gap-1">
                <button class="btn btn-ghost btn-sm" onclick="viewTaskDetail(${task.id})" title="View Details">👁️</button>
                <button class="btn btn-secondary btn-sm" onclick="openEditModal(${task.id})" title="Edit Task">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})" title="Delete Task">🗑️</button>
            </div>
        `;

        taskList.appendChild(card);
    });
}

// Render Kanban Board View
function renderKanbanBoard(tasks) {
    const pendingCol = document.getElementById('kanban-pending-col');
    const completedCol = document.getElementById('kanban-completed-col');
    const pendingCountEl = document.getElementById('board-pending-count');
    const completedCountEl = document.getElementById('board-completed-count');

    if (!pendingCol || !completedCol) return;

    pendingCol.innerHTML = "";
    completedCol.innerHTML = "";

    const pendingTasks = tasks.filter(t => t.status !== "completed");
    const completedTasks = tasks.filter(t => t.status === "completed");

    if (pendingCountEl) pendingCountEl.textContent = pendingTasks.length;
    if (completedCountEl) completedCountEl.textContent = completedTasks.length;

    // Render Pending Cards
    if (pendingTasks.length === 0) {
        pendingCol.innerHTML = `<div class="text-xs text-muted text-center py-4">No pending tasks</div>`;
    } else {
        pendingTasks.forEach(task => {
            pendingCol.appendChild(createKanbanCard(task));
        });
    }

    // Render Completed Cards
    if (completedTasks.length === 0) {
        completedCol.innerHTML = `<div class="text-xs text-muted text-center py-4">No completed tasks</div>`;
    } else {
        completedTasks.forEach(task => {
            completedCol.appendChild(createKanbanCard(task));
        });
    }
}

function createKanbanCard(task) {
    const card = document.createElement("div");
    card.className = "card card-elevated p-3 flex flex-col gap-2";
    const priorityBadgeClass = task.priority === "high" ? "badge-high" : (task.priority === "medium" ? "badge-medium" : "badge-low");
    const isCompleted = task.status === "completed";

    card.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="badge ${priorityBadgeClass}">${task.priority}</span>
            <span class="text-xs text-muted">#${task.id}</span>
        </div>
        <h4 class="font-semibold text-sm text-primary" style="${isCompleted ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHTML(task.title)}</h4>
        ${task.description ? `<p class="text-xs text-secondary line-clamp-2">${escapeHTML(task.description)}</p>` : ''}
        <div class="flex justify-between items-center mt-2 pt-2" style="border-top: 1px solid var(--border);">
            <button class="btn btn-ghost btn-xs" onclick="completeTask(${task.id})">
                ${isCompleted ? '↺ Reopen' : '✓ Complete'}
            </button>
            <div class="flex gap-1">
                <button class="btn btn-ghost btn-xs" onclick="openEditModal(${task.id})">✏️</button>
                <button class="btn btn-ghost btn-xs text-danger" onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        </div>
    `;
    return card;
}

// Update KPI Metrics and Progress Rings across Overview & Analytics tabs
function updateKPIMetrics(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const pending = total - completed;
    const high = tasks.filter(t => t.priority === "high").length;
    const medium = tasks.filter(t => t.priority === "medium").length;
    const low = tasks.filter(t => t.priority === "low").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Overview KPIs
    const elTotal = document.getElementById('kpi-total-count');
    const elCompleted = document.getElementById('kpi-completed-count');
    const elPending = document.getElementById('kpi-pending-count');
    const elHigh = document.getElementById('kpi-high-count');
    const elBar = document.getElementById('overview-progress-bar');
    const elPercentText = document.getElementById('progress-percentage-text');
    const elRatioText = document.getElementById('progress-ratio-text');

    if (elTotal) elTotal.textContent = total;
    if (elCompleted) elCompleted.textContent = completed;
    if (elPending) elPending.textContent = pending;
    if (elHigh) elHigh.textContent = high;

    if (elBar) elBar.style.width = percent + "%";
    if (elPercentText) elPercentText.textContent = percent + "%";
    if (elRatioText) elRatioText.textContent = `${completed} of ${total} tasks completed`;

    // Priority breakdown overview
    if (document.getElementById('breakdown-high')) document.getElementById('breakdown-high').textContent = high;
    if (document.getElementById('breakdown-medium')) document.getElementById('breakdown-medium').textContent = medium;
    if (document.getElementById('breakdown-low')) document.getElementById('breakdown-low').textContent = low;

    // Analytics KPIs
    if (document.getElementById('analytics-total')) document.getElementById('analytics-total').textContent = total;
    if (document.getElementById('analytics-completed')) document.getElementById('analytics-completed').textContent = completed;
    if (document.getElementById('analytics-efficiency')) document.getElementById('analytics-efficiency').textContent = percent + "%";

    const highRatio = total > 0 ? Math.round((high / total) * 100) : 0;
    const medRatio = total > 0 ? Math.round((medium / total) * 100) : 0;
    const lowRatio = total > 0 ? Math.round((low / total) * 100) : 0;

    if (document.getElementById('ratio-high-bar')) document.getElementById('ratio-high-bar').style.width = highRatio + "%";
    if (document.getElementById('ratio-high-label')) document.getElementById('ratio-high-label').textContent = highRatio + "%";

    if (document.getElementById('ratio-medium-bar')) document.getElementById('ratio-medium-bar').style.width = medRatio + "%";
    if (document.getElementById('ratio-medium-label')) document.getElementById('ratio-medium-label').textContent = medRatio + "%";

    if (document.getElementById('ratio-low-bar')) document.getElementById('ratio-low-bar').style.width = lowRatio + "%";
    if (document.getElementById('ratio-low-label')) document.getElementById('ratio-low-label').textContent = lowRatio + "%";
}

// Render Recent Tasks Widget on Dashboard
function renderRecentTasks(tasks) {
    const container = document.getElementById('recent-tasks-container');
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-3">No recent tasks.</div>`;
        return;
    }

    const recent = tasks.slice(-5).reverse();
    container.innerHTML = "";

    recent.forEach(task => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center py-2 px-3 mb-1 glass-surface';
        const isCompleted = task.status === 'completed';

        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span style="color: ${isCompleted ? 'var(--success)' : 'var(--warning)'}">${isCompleted ? '✓' : '⏳'}</span>
                <span class="text-sm font-medium ${isCompleted ? 'text-muted' : 'text-primary'}" style="${isCompleted ? 'text-decoration: line-through;' : ''}">${escapeHTML(task.title)}</span>
            </div>
            <span class="badge ${task.priority === 'high' ? 'badge-high' : (task.priority === 'medium' ? 'badge-medium' : 'badge-low')}">${task.priority}</span>
        `;
        container.appendChild(item);
    });
}

// Complete Task Action (PATCH /tasks/{id}/complete)
async function completeTask(taskId) {
    try {
        const response = await authFetch("/tasks/" + taskId + "/complete", {
            method: "PATCH",
        });

        if (!response.ok) {
            if (errorMessage) errorMessage.textContent = "Failed to update task status.";
            if (typeof showToast === 'function') showToast("Failed to update task.", 'error');
            return;
        }

        if (typeof showToast === 'function') showToast("Task status updated!", 'success');
        loadTasks();
    } catch (err) {
        if (errorMessage) errorMessage.textContent = "Network error. Failed to complete task.";
    }
}

// Delete Task Action (DELETE /tasks/{id}) with custom confirmation dialog
async function deleteTask(taskId) {
    const taskObj = allTasks.find(t => t.id === taskId);
    const taskTitle = taskObj ? taskObj.title : 'this task';

    showConfirmDialog({
        title: "Delete Task",
        message: `Are you sure you want to permanently delete "${taskTitle}"? This action cannot be undone.`,
        confirmText: "Delete Task",
        confirmStyle: "btn-danger",
        onConfirm: async () => {
            try {
                const response = await authFetch("/tasks/" + taskId, {
                    method: "DELETE",
                });

                if (!response.ok) {
                    if (errorMessage) errorMessage.textContent = "Failed to delete task.";
                    if (typeof showToast === 'function') showToast("Failed to delete task.", 'error');
                    return;
                }

                if (typeof showToast === 'function') showToast("Task deleted permanently.", 'info');
                closeModal('task-detail-modal');
                loadTasks();
            } catch (err) {
                if (errorMessage) errorMessage.textContent = "Network error. Failed to delete task.";
            }
        }
    });
}

// View Task Details Drawer / Modal
function viewTaskDetail(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('detail-title').textContent = task.title;
    document.getElementById('detail-description').textContent = task.description || "No description provided.";
    document.getElementById('detail-created-at').textContent = typeof formatDate === 'function' ? formatDate(task.created_at) : (task.created_at || 'N/A');
    document.getElementById('detail-updated-at').textContent = typeof formatDate === 'function' ? formatDate(task.updated_at) : (task.updated_at || 'N/A');

    const badge = document.getElementById('detail-priority-badge');
    badge.className = `badge ${task.priority === 'high' ? 'badge-high' : (task.priority === 'medium' ? 'badge-medium' : 'badge-low')}`;
    badge.textContent = task.priority;

    const chip = document.getElementById('detail-status-chip');
    chip.className = `status-chip ${task.status === 'completed' ? 'status-completed' : 'status-pending'}`;
    chip.textContent = task.status;

    // Action buttons in modal
    const completeBtn = document.getElementById('detail-complete-btn');
    completeBtn.onclick = () => {
        closeModal('task-detail-modal');
        completeTask(task.id);
    };

    const editBtn = document.getElementById('detail-edit-btn');
    editBtn.onclick = () => {
        closeModal('task-detail-modal');
        openEditModal(task.id);
    };

    const deleteBtn = document.getElementById('detail-delete-btn');
    deleteBtn.onclick = () => {
        deleteTask(task.id);
    };

    openModal('task-detail-modal');
}

// Open Edit Task Modal & populate form
function openEditModal(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-title').value = task.title;
    document.getElementById('edit-priority').value = task.priority || "medium";
    document.getElementById('edit-description').value = task.description || "";

    openModal('edit-task-modal');
}

// Handle Saving Task Edit (PUT /tasks/{id})
async function handleSaveEditTask(event) {
    event.preventDefault();

    const taskId = document.getElementById('edit-task-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const priority = document.getElementById('edit-priority').value;
    const description = document.getElementById('edit-description').value.trim();

    if (!title) {
        if (typeof showToast === 'function') showToast("Task title cannot be empty.", 'error');
        return;
    }

    try {
        const response = await authFetch("/tasks/" + taskId, {
            method: "PUT",
            body: JSON.stringify({ title, priority, description: description || null }),
        });

        if (!response.ok) {
            if (errorMessage) errorMessage.textContent = "Failed to update task.";
            if (typeof showToast === 'function') showToast("Failed to update task.", 'error');
            return;
        }

        if (typeof showToast === 'function') showToast("Task updated successfully!", 'success');
        closeModal('edit-task-modal');
        loadTasks();
    } catch (err) {
        if (errorMessage) errorMessage.textContent = "Network error. Failed to update task.";
    }
}

// Legacy inline/prompts editTask function preserved for contract compatibility
async function editTask(task) {
    openEditModal(task.id);
}

// Inline Quick Create Form Listener (POST /tasks)
const createForm = document.getElementById("create-task-form");
if (createForm) {
    createForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const title = document.getElementById("new-title").value.trim();
        const priority = document.getElementById("new-priority").value;

        if (!title) return;

        try {
            const response = await authFetch("/tasks", {
                method: "POST",
                body: JSON.stringify({ title, priority }),
            });

            if (!response.ok) {
                if (errorMessage) errorMessage.textContent = "Failed to create task.";
                if (typeof showToast === 'function') showToast("Failed to create task.", 'error');
                return;
            }

            createForm.reset();
            if (typeof showToast === 'function') showToast("Task created!", 'success');
            loadTasks();
        } catch (err) {
            if (errorMessage) errorMessage.textContent = "Network error. Failed to create task.";
        }
    });
}

// Modal Create Task Form Handler (POST /tasks)
async function handleModalCreateTask(event) {
    event.preventDefault();

    const title = document.getElementById("modal-new-title").value.trim();
    const priority = document.getElementById("modal-new-priority").value;
    const description = document.getElementById("modal-new-description").value.trim();

    if (!title) {
        if (typeof showToast === 'function') showToast("Please provide a task title.", 'error');
        return;
    }

    try {
        const response = await authFetch("/tasks", {
            method: "POST",
            body: JSON.stringify({ title, priority, description: description || null }),
        });

        if (!response.ok) {
            if (errorMessage) errorMessage.textContent = "Failed to create task.";
            if (typeof showToast === 'function') showToast("Failed to create task.", 'error');
            return;
        }

        document.getElementById("modal-create-task-form").reset();
        closeModal("create-task-modal");
        if (typeof showToast === 'function') showToast("Task created successfully!", 'success');
        loadTasks();
    } catch (err) {
        if (errorMessage) errorMessage.textContent = "Network error. Failed to create task.";
    }
}