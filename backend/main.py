import logging
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from org_policies import get_all_effective_policies
from vpc_sc import get_vpc_sc_status
from datastore_client import save_dashboard_data, get_dashboard_data

# Configure logging
logging.basicConfig(level=logging.INFO)

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
    """Fetches all security data from GCP APIs and caches it in Datastore."""
    logging.info(f"Starting data refresh for project: {project_id}")
    try:
        # Await the async task
        org_policies = await get_all_effective_policies(project_id)
        # Call the synchronous VPC SC function
        vpc_sc_status = get_vpc_sc_status(project_id)

        # More data sources can be added here in the future
        # e.g., sha_modules, etd_status, etc.

        dashboard_data = {
            "org_policies": org_policies,
            "vpc_sc_status": vpc_sc_status,
            "identity_controls": [],
            "data_controls": [],
            "sha_modules": []
        }

        # Save the aggregated data to Datastore
        if not save_dashboard_data(project_id, dashboard_data):
            raise HTTPException(status_code=500, detail="Failed to save data to Datastore.")

        return {"status": "success", "message": f"Data for project {project_id} has been refreshed and cached."}

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