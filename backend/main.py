import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from org_policies import get_all_effective_policies
from vpc_sc import get_vpc_sc_status

# Configure logging
logging.basicConfig(level=logging.INFO)

app = FastAPI()

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mock Endpoints ---
@app.get("/api/projects")
def get_projects():
    return []

@app.get("/api/project-details/{project_id}")
def get_project_details(project_id: str):
    return {}

@app.get("/api/services/{project_id}")
def get_services(project_id: str):
    return []

@app.get("/api/iam-policies/{project_id}")
def get_iam_policies(project_id: str):
    return []

@app.get("/api/cloud-assets/{project_id}")
def get_cloud_assets(project_id: str):
    return []

# --- Effective Org Policies Endpoint ---
@app.get("/api/effective-org-policies/{project_id}")
async def get_effective_org_policies(project_id: str):
    return await get_all_effective_policies(project_id)

@app.get("/api/vpc-sc-status/{project_id}")
async def read_vpc_sc_status(project_id: str):
    return get_vpc_sc_status(project_id)