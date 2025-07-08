from google.cloud import datastore
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

DATASTORE_KIND = "GcpDashboardData"

def get_datastore_client():
    """Initializes and returns a Datastore client."""
    return datastore.Client()

def save_dashboard_data(project_id: str, data: dict):
    """Saves the aggregated dashboard data to Datastore."""
    try:
        client = get_datastore_client()
        key = client.key(DATASTORE_KIND, project_id)
        entity = datastore.Entity(key=key)
        # Datastore doesn't support storing complex objects directly without some handling.
        # We will store the entire dict as a JSON string in a single property for simplicity,
        # but for more complex query needs, you'd flatten the structure.
        entity.update(data)
        # Exclude large, unqueryable fields from indexes
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
