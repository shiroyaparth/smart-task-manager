const taskList = document.getElementById("task-list");
const loadingMessage = document.getElementById("loading-message");
const errorMessage = document.getElementById("error-message");
const searchInput = document.getElementById("search-input");
const priorityFilter = document.getElementById("priority-filter");

let allTasks = [];

async function loadTasks() {
    const priority = priorityFilter.value;
    const query = priority ? "?priority=" + priority : "";

    try {
        const response = await authFetch("/tasks" + query);

        if (!response.ok) {
            errorMessage.textContent = "Failed to load tasks.";
            return;
        }

        allTasks = await response.json();
        applySearch();
    } catch (err) {
        errorMessage.textContent = "Network error. Please try again.";
    } finally {
        loadingMessage.style.display = "none";
    }
}

function applySearch() {
    const query = searchInput.value.toLowerCase();
    const filtered = allTasks.filter(function (task) {
        return task.title.toLowerCase().includes(query);
    });
    renderTasks(filtered);
}

searchInput.addEventListener("input", applySearch);
priorityFilter.addEventListener("change", loadTasks);

function renderTasks(tasks) {
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.textContent = "No tasks found. Add one above!";
        return;
    }

    tasks.forEach(function (task) {
        const card = document.createElement("div");
        card.className = "task-card";

        const title = document.createElement("h3");
        title.textContent = task.title;

        const status = document.createElement("p");
        status.textContent = "Status: " + task.status;

        const completeButton = document.createElement("button");
        completeButton.textContent = "Mark Complete";
        completeButton.addEventListener("click", function () {
            completeTask(task.id);
        });

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.addEventListener("click", function () {
            editTask(task);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", function () {
            deleteTask(task.id);
        });

        card.appendChild(title);
        card.appendChild(status);
        card.appendChild(completeButton);
        card.appendChild(editButton);
        card.appendChild(deleteButton);
        taskList.appendChild(card);
    });
}

async function completeTask(taskId) {
    const response = await authFetch("/tasks/" + taskId + "/complete", {
        method: "PATCH",
    });

    if (!response.ok) {
        errorMessage.textContent = "Failed to update task.";
        return;
    }

    loadTasks();
}

async function deleteTask(taskId) {
    const confirmed = confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;

    const response = await authFetch("/tasks/" + taskId, {
        method: "DELETE",
    });

    if (!response.ok) {
        errorMessage.textContent = "Failed to delete task.";
        return;
    }

    loadTasks();
}

async function editTask(task) {
    const newTitle = prompt("Edit title:", task.title);
    if (newTitle === null) return;

    const newPriority = prompt("Edit priority (low/medium/high):", task.priority);
    if (newPriority === null) return;

    const response = await authFetch("/tasks/" + task.id, {
        method: "PUT",
        body: JSON.stringify({ title: newTitle, priority: newPriority }),
    });

    if (!response.ok) {
        errorMessage.textContent = "Failed to update task.";
        return;
    }

    loadTasks();
}

const createForm = document.getElementById("create-task-form");

createForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = document.getElementById("new-title").value;
    const priority = document.getElementById("new-priority").value;

    const response = await authFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, priority }),
    });

    if (!response.ok) {
        errorMessage.textContent = "Failed to create task.";
        return;
    }

    createForm.reset();
    loadTasks();
});

loadTasks();