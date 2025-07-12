import logging
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from org_policies import get_all_effective_policies
from vpc_sc import get_vpc_sc_status
from sha_modules import get_sha_custom_modules, get_sha_modules
from scc_services import get_security_center_services
from datastore_client import save_dashboard_data, get_dashboard_data

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
    """Fetches all security data from GCP APIs and caches it in Datastore."""
    logging.info(f"Starting data refresh for project: {project_id}")
    try:
        # Await the async task
        org_policies = await get_all_effective_policies(project_id)
        # Call the synchronous functions
        vpc_sc_status = get_vpc_sc_status(project_id)
        sha_custom_modules = get_sha_custom_modules(project_id)
        sha_module_details = get_sha_modules(project_id)
        other_security_services = get_security_center_services(project_id)

        # Combine all security services and modules
        all_sha_modules = sha_custom_modules
        if sha_module_details and 'modules' in sha_module_details:
            for module in sha_module_details['modules']:
                all_sha_modules.append({
                    'name': module.get('name'),
                    'status': module.get('status'),
                    'controlType': 'SHA Module',
                    'details': f"Part of {sha_module_details.get('name')}"
                })

        # Process security services to handle modules as requested
        processed_security_services = []
        for service in other_security_services:
            if service.get('modules'):
                # Extract the service_id from the details string, e.g., "Service ID: web-security-scanner"
                service_id = service.get('details', '').replace('Service ID: ', '')
                for module in service['modules']:
                    processed_security_services.append({
                        'name': module.get('name'),
                        'status': module.get('status'),
                        'controlType': service_id,  # Use the parent's service ID as the control type
                        'details': f"Part of {service.get('name')}"
                    })
            else:
                # If the service has no modules, add it as is.
                processed_security_services.append(service)

        dashboard_data = {
            "org_policies": org_policies,
            "vpc_sc": [vpc_sc_status],  # Store as a list for consistency
            "sha_modules": all_sha_modules,
            "security_services": processed_security_services,
            "identity_controls": [],
            "data_controls": [],
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