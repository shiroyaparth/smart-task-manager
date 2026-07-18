from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Task Manager API"}

@app.get("/health")
def read_root1():
    return { "status": "ok" }