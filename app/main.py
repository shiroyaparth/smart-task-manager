# from fastapi import FastAPI

# app = FastAPI()

# @app.get("/")
# def read_root():
#     return {"message": "Welcome to Smart Task Manager API"}

# @app.get("/health")
# def read_root1():
#     return { "status": "ok" }
from typing import Optional
from fastapi import FastAPI, HTTPException

app = FastAPI()

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