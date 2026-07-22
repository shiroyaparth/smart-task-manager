from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    priority: str = "medium"
    description: str | None = None