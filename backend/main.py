import logging
import asyncio
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from org_policies import get_all_effective_policies
from vpc_sc import get_vpc_sc_status
from sha_modules import get_sha_custom_modules, get_sha_modules
from scc_services import get_security_center_services
from datastore_client import save_dashboard_data, get_dashboard_data, save_projects_data, get_projects_data
from projects import get_projects_in_org
from firewall import get_denied_internet_ingress_rules
from vertex_ai import generate_summary

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

# --- CORS Middleware --- 
# This must be placed before any routes are defined.
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "https://gcp-dashboard-frontend-is66mkdbpa-uc.a.run.app", # Deployed frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/refresh/{project_id}")
async def refresh_project_data(project_id: str):
    """Fetches security data and project hierarchy, then caches both in Datastore."""
    logging.info(f"Starting data refresh for project: {project_id}")
    try:
        # Fetch and process security data
        org_policies = await get_all_effective_policies(project_id)
        vpc_sc_status = get_vpc_sc_status(project_id)
        sha_custom_modules = get_sha_custom_modules(project_id)
        sha_module_details = get_sha_modules(project_id)
        other_security_services = get_security_center_services(project_id)
        denied_firewall_rules = get_denied_internet_ingress_rules(project_id)

        all_sha_modules = sha_custom_modules
        if sha_module_details and 'modules' in sha_module_details:
            all_sha_modules.extend([{'name': m.get('name'), 'status': m.get('status'), 'controlType': 'SHA Module', 'details': f"Part of {sha_module_details.get('name')}"} for m in sha_module_details['modules']])

        processed_security_services = []
        for service in other_security_services:
            if service.get('modules'):
                service_id = service.get('details', '').replace('Service ID: ', '')
                processed_security_services.extend([{'name': m.get('name'), 'status': m.get('status'), 'controlType': service_id, 'details': f"Part of {service.get('name')}"} for m in service['modules']])
            else:
                processed_security_services.append(service)

        dashboard_data = {
            "org_policies": org_policies,
            "vpc_sc": vpc_sc_status,
            "scc_services": processed_security_services,
            "sha_modules": all_sha_modules,
            "firewall": denied_firewall_rules
        }

        if not save_dashboard_data(project_id, dashboard_data):
            raise HTTPException(status_code=500, detail="Failed to save dashboard data.")

        # After refreshing project data, also refresh and save the organization's project list
        logging.info("Refreshing organization's project list...")
        org_id = os.getenv("ORGANIZATION_ID")
        if not org_id:
            logging.error("ORGANIZATION_ID not found. Skipping project list refresh.")
        else:
            projects_data = get_projects_in_org()
            if not save_projects_data(org_id, {"projects": projects_data}):
                logging.error("Failed to save project hierarchy to Datastore.")

        return {"status": "success", "message": f"Data for project {project_id} refreshed and cached."}

    except Exception as e:
        logging.error(f"Error during data refresh for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/{project_id}")
def get_dashboard(project_id: str):
    """Retrieves cached dashboard data from Datastore."""
    logging.info(f"Fetching dashboard data for project: {project_id} from cache.")
    try:
        data = get_dashboard_data(project_id)
        if data:
            return data
        else:
            # If no data is in cache, return 404 or you could trigger a refresh
            raise HTTPException(status_code=404, detail="No cached data found for this project. Please refresh first.")
    except Exception as e:
        logging.error(f"Error fetching dashboard data for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config")
def get_config():
    """Returns configuration details from environment variables."""
    dashboard_gcp_project_id = os.getenv("DASHBOARD_GCP_PROJECT_ID")
    if not dashboard_gcp_project_id:
        raise HTTPException(status_code=500, detail="DASHBOARD_GCP_PROJECT_ID not set in the environment.")
    ai_summary_enabled = os.getenv("AI_SUMMARY_ENABLED", "false").lower() == "true"
    return {"dashboard_gcp_project_id": dashboard_gcp_project_id, "ai_summary_enabled": ai_summary_enabled}

@app.get("/api/projects")
def list_projects():
    """Lists all projects in the organization from the Datastore cache."""
    logging.info("Fetching projects from Datastore cache.")
    org_id = os.getenv("ORGANIZATION_ID")
    if not org_id:
        raise HTTPException(status_code=500, detail="ORGANIZATION_ID not set.")

    data = get_projects_data(org_id)
    if data and "projects" in data:
        return data["projects"]
    else:
        raise HTTPException(status_code=404, detail="No cached project data found. Please refresh first.")

@app.post("/api/summarize")
async def summarize_data(request: Request):
    """Generates a summary of the provided data using the Vertex AI service."""
    ai_summary_enabled = os.getenv("AI_SUMMARY_ENABLED", "false").lower() == "true"
    if not ai_summary_enabled:
        raise HTTPException(status_code=403, detail="AI summary feature is disabled.")

    try:
        data = await request.json()
        summary = generate_summary(str(data))
        return {"summary": summary}
    except Exception as e:
        logging.error(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))