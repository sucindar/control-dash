import logging
import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.datastore_client import get_dashboard_data, get_projects_data
from backend.vertex_ai import generate_summary

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)

app = FastAPI()

# --- CORS Middleware ---
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "https://gcp-dashboard-frontend-is66mkdbpa-uc.a.run.app",  # Deployed frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/dashboard/{project_id}")
def get_dashboard(project_id: str):
    """Retrieves cached dashboard data from Datastore."""
    logging.info(f"Fetching dashboard data for project: {project_id}")
    data = get_dashboard_data(project_id)
    if data:
        return data
    else:
        raise HTTPException(status_code=404, detail="Dashboard data not found. The data sync job may not have run yet.")

@app.get("/api/projects")
def list_projects(folderName: str = None):
    """Lists all projects, optionally filtered by folder name."""
    logging.debug(f"API call to /api/projects received with folderName='{folderName}'")
    org_id = os.getenv("ORGANIZATION_ID")
    if not org_id:
        raise HTTPException(status_code=500, detail="ORGANIZATION_ID not set.")

    logging.info("Fetching projects from Datastore cache.")
    data = get_projects_data(org_id)

    if not data or "projects" not in data:
        raise HTTPException(status_code=404, detail="No cached project data found. The data sync job may not have run yet.")

    projects = data["projects"]
    logging.debug(f"Found {len(projects)} projects in cache.")

    if folderName:
        logging.info(f"Filtering projects for folder: {folderName}")
        filtered_projects = [p for p in projects if p.get("folder_name") == folderName]
        logging.debug(f"Found {len(filtered_projects)} projects in folder '{folderName}'.")
        return filtered_projects

    return projects

@app.get("/api/projects")
def list_projects(folderName: str = None):
    """Lists all projects in the organization, optionally filtered by folder or region."""
    logging.debug(f"API call to /api/projects received with folderName='{folderName}'")
    org_id = os.getenv("ORGANIZATION_ID")
    if not org_id:
        raise HTTPException(status_code=500, detail="ORGANIZATION_ID not set.")

    logging.info("Fetching projects from Datastore cache.")
    data = get_projects_data(org_id)

    if not data or "projects" not in data:
        raise HTTPException(status_code=404, detail="No cached project data found. Please refresh first.")

    projects = data["projects"]
    logging.debug(f"Found {len(projects)} projects in cache.")

    if folderName:
        logging.info(f"Filtering projects for folder: {folderName}")
        filtered_projects = [p for p in projects if p.get("folder_name") == folderName]
        logging.debug(f"Found {len(filtered_projects)} projects in folder '{folderName}'.")
        return filtered_projects

    return projects

@app.post("/api/summarize")
async def summarize_data(request: Request):
    """Generates a summary of the provided data using the Vertex AI service."""
    ai_summary_enabled = os.getenv("AI_SUMMARY_ENABLED", "false").lower() == "true"
    if not ai_summary_enabled:
        raise HTTPException(status_code=403, detail="AI summary feature is disabled.")

    try:
        body = await request.json()
        data_to_summarize = body.get('data', '')
        summary = generate_summary(str(data_to_summarize))
        return {"summary": summary}
    except Exception as e:
        logging.error(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))