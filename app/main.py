from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import text

from app import models, schemas, security
from app.database import engine, get_db

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

import os
origins = os.getenv("CORS_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    token = credentials.credentials

    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@app.get("/")
def read_root():
    return {"message": "Welcome to TaskFlow AI API"}

    

@app.post("/register", response_model=schemas.UserResponse, status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=security.hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not security.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


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
def get_tasks(
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Task).filter(models.Task.user_id == current_user.id)
    if priority:
        query = query.filter(models.Task.priority == priority)
    results = query.all()
    return [task_to_dict(t) for t in results]


@app.get("/tasks/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_to_dict(task)


@app.post("/tasks", status_code=201)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_task = models.Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        user_id=current_user.id,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return task_to_dict(new_task)


@app.put("/tasks/{task_id}")
def replace_task(
    task_id: int,
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing_task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
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
def complete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "completed"
    task.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(task)
    return task_to_dict(task)


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.user_id == current_user.id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()


@app.post("/ai/chat")
def ai_chat(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.ai import assistant
    prompt = payload.get("prompt", "")
    reply = assistant.process_chat_message(prompt, current_user, db)
    return {"response": reply}


@app.post("/ai/coach")
def ai_coach(
    payload: Optional[dict] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.ai import assistant
    query = payload.get("query") if payload else None
    advice = assistant.get_productivity_coaching(current_user, db, query)
    return {"response": advice}


@app.post("/ai/breakdown")
def ai_breakdown(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.ai import assistant
    title = payload.get("title", "")
    if not title:
        raise HTTPException(status_code=400, detail="Task title is required for breakdown.")
    result = assistant.breakdown_task(title, current_user, db)
    return result


@app.post("/ai/parse-task")
def ai_parse_task(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.ai import assistant
    text = payload.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Text input is required.")
    parsed = assistant.parse_natural_language_task(text, current_user, db)
    return parsed


@app.get("/ai/daily-summary")
def ai_daily_summary(
    force_refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.ai import assistant
    summary = assistant.generate_daily_summary(current_user, db, force_refresh)
    return {"response": summary}


@app.get("/ai/weekly-report")
def ai_weekly_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.ai import assistant
    report = assistant.generate_weekly_report(current_user, db)
    return {"response": report}


@app.post("/ai/search-intent")
def ai_search_intent(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from services.ai import assistant
    query = payload.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="Search query is required.")
    filters = assistant.parse_search_intent(query, current_user, db)
    return filters






