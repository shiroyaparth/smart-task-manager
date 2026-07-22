from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import engine, get_db

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Task Manager API"}


def task_to_dict(task: models.Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "status": task.status,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


@app.get("/tasks")
def get_tasks(priority: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Task)
    if priority:
        query = query.filter(models.Task.priority == priority)
    results = query.all()
    return [task_to_dict(t) for t in results]


@app.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_to_dict(task)


@app.post("/tasks", status_code=201)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    new_task = models.Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return task_to_dict(new_task)


@app.put("/tasks/{task_id}")
def replace_task(task_id: int, task: schemas.TaskCreate, db: Session = Depends(get_db)):
    existing_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if existing_task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    existing_task.title = task.title
    existing_task.priority = task.priority
    existing_task.description = task.description
    existing_task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(existing_task)
    return task_to_dict(existing_task)


@app.patch("/tasks/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "completed"
    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)
    return task_to_dict(task)


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()