from google.cloud import datastore
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

DATASTORE_KIND = "GcpDashboardData"
DATASTORE_PROJECT_ID = os.getenv("DATASTORE_PROJECT_ID")

if not DATASTORE_PROJECT_ID or DATASTORE_PROJECT_ID == "YOUR_DATASTORE_PROJECT_ID_HERE":
    raise RuntimeError("DATASTORE_PROJECT_ID is not set in the .env file.")

def get_datastore_client():
    """Initializes and returns a Datastore client."""
    return datastore.Client(project=DATASTORE_PROJECT_ID)

def save_dashboard_data(project_id: str, data: dict):
    """Saves the aggregated dashboard data to Datastore."""
    try:
        client = get_datastore_client()
        key = client.key(DATASTORE_KIND, project_id)
        entity = datastore.Entity(key=key)
        entity.update(data)
        entity.exclude_from_indexes = set(data.keys())

        client.put(entity)
        logging.info(f"Successfully saved data for project {project_id} to Datastore.")
        return True
    except Exception as e:
        logging.error(f"Failed to save data for project {project_id} to Datastore: {e}")
        return False

def get_dashboard_data(project_id: str):
    """Retrieves dashboard data from Datastore."""
    try:
        client = get_datastore_client()
        key = client.key(DATASTORE_KIND, project_id)
        entity = client.get(key)
        if entity:
            logging.info(f"Successfully retrieved data for project {project_id} from Datastore.")
            return dict(entity)
        else:
            logging.warning(f"No data found for project {project_id} in Datastore.")
            return None
    except Exception as e:
        logging.error(f"Failed to retrieve data for project {project_id} from Datastore: {e}")
        return None

PROJECTS_KIND = "OrganizationProjects"

def save_projects_data(org_id: str, projects_data: dict):
    """Saves the organization's project structure to Datastore."""
    try:
        client = get_datastore_client()
        key = client.key(PROJECTS_KIND, org_id)
        entity = datastore.Entity(key=key)
        entity.update(projects_data)
        # Since the data can be large and we don't need to query on it, exclude from indexes.
        entity.exclude_from_indexes = set(projects_data.keys())
        client.put(entity)
        logging.info(f"Successfully saved project data for organization {org_id}.")
        return True
    except Exception as e:
        logging.error(f"Failed to save project data for organization {org_id}: {e}")
        return False

def get_projects_data(org_id: str):
    """Retrieves the organization's project structure from Datastore."""
    try:
        client = get_datastore_client()
        key = client.key(PROJECTS_KIND, org_id)
        entity = client.get(key)
        if entity:
            logging.info(f"Successfully retrieved project data for organization {org_id}.")
            return dict(entity)
        else:
            logging.warning(f"No project data found for organization {org_id}.")
            return None
    except Exception as e:
        logging.error(f"Failed to retrieve project data for organization {org_id}: {e}")
        return None
