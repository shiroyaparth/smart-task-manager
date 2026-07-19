from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


class TaskCreate(BaseModel):
    title: str
    priority: str
    completed: bool = False

# Temporary in-memory data store.
# This is NOT a database — it's just a Python list living in RAM.
# It resets every time the server restarts. We'll replace this
# with real persistence (PostgreSQL) in a later phase.
tasks = [
    {"id": 1, "title": "Learn FastAPI", "priority": "high", "completed": False},
    {"id": 2, "title": "Buy groceries", "priority": "low", "completed": False},
    {"id": 3, "title": "Write report", "priority": "medium", "completed": True},
]


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Task Manager API"}


@app.get("/tasks")
def get_tasks(priority: Optional[str] = None):
    if priority:
        return [task for task in tasks if task["priority"] == priority]
    return tasks


@app.get("/tasks/{task_id}")
def get_task(task_id: int):
    for task in tasks:
        if task["id"] == task_id:
            return task
    raise HTTPException(status_code=404, detail="Task not found")


@app.post("/tasks", status_code=201)
def create_task(task: TaskCreate):
    new_id = max((t["id"] for t in tasks), default=0) + 1
    new_task = {
        "id": new_id,
        "title": task.title,
        "priority": task.priority,
        "completed": task.completed,
    }
    tasks.append(new_task)
    return new_task


@app.put("/tasks/{task_id}")
def replace_task(task_id: int, task: TaskCreate):
    for existing_task in tasks:
        if existing_task["id"] == task_id:
            existing_task["title"] = task.title
            existing_task["priority"] = task.priority
            existing_task["completed"] = task.completed
            return existing_task
    raise HTTPException(status_code=404, detail="Task not found")



@app.patch("/tasks/{task_id}/complete")
def complete_task(task_id: int):
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = True
            return task
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int):
    for index, task in enumerate(tasks):
        if task["id"] == task_id:
            tasks.pop(index)
            return
    raise HTTPException(status_code=404, detail="Task not found")

#aaj get post put patch delete sikh liyaaa