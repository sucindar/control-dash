import os
# This must be set before any grpc imports
os.environ["GRPC_POLL_STRATEGY"] = "poll"

import logging
from datetime import datetime
from celery import group
from .tasks import refresh_single_project_data_task
from .projects import get_projects_in_org
from .datastore_client import save_dashboard_data
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)

ORGANIZATION_ID = os.getenv("ORGANIZATION_ID")
MAX_WORKERS = int(os.getenv("MAX_WORKERS", 5))

def refresh_and_cache_project_list():
    """Fetches all active projects and caches the list in Datastore."""
    logging.info("Step 1: Refreshing and caching project list...")
    try:
        # The get_projects_in_org function reads the org ID from the environment
        projects = get_projects_in_org()
        
        # Cache the full project list with a specific key
        save_dashboard_data('all_projects', {'projects': projects})
        
        logging.info(f"Successfully fetched and cached {len(projects)} projects.")
        return projects
    except Exception as e:
        logging.error(f"Failed to refresh and cache project list: {e}")
        return []

def run_all_tasks_for_project(project_id: str):
    """Runs all data collection tasks for a single project."""
    logging.info(f"Starting data collection for single project: {project_id}")
    datastore_client = datastore.Client()
    project_controls = []
    for task in TASKS:
        try:
            controls = task(project_id)
            if controls:
                project_controls.extend(controls)
                logging.info(f"  {task.__name__}: Found {len(controls)} controls.")
            else:
                logging.info(f"  {task.__name__}: No controls found.")
        except Exception as e:
            logging.error(f"Error in task {task.__name__} for project {project_id}: {e}")
    
    if project_controls:
        save_dashboard_data(project_id, project_controls, datastore_client)
    logging.info(f"Finished data collection for {project_id}")

def main():
    """Main orchestration function."""

    start_time = datetime.now()
    logging.info(f"--- Starting Self-Contained Data Synchronization Job at {start_time.strftime('%Y-%m-%d %H:%M:%S')} ---")

    if not ORGANIZATION_ID:
        logging.critical("ORGANIZATION_ID environment variable not set. Halting job.")
        return

    # Step 1: Determine which projects to run on (Debug vs. Full)
    debug_project_id = os.getenv("DEBUG_DATASYNC_PROJECT")

    if debug_project_id:
        logging.warning(f"--- DEBUG MODE: Running for single project: {debug_project_id} ---")
        project_ids = [debug_project_id]
    else:
        logging.info("Step 1: Fetching master project list from GCP...")
        projects_data = refresh_and_cache_project_list()
        if not projects_data:
            logging.info("No projects found or an error occurred. Exiting.")
            return
        project_ids = [p['project_id'] for p in projects_data]
    logging.info(f"Step 2: Starting data refresh for {len(project_ids)} projects with {MAX_WORKERS} parallel workers...")

    successful_refreshes = []
    failed_refreshes = []

    # Step 2: Refresh each project's security data in parallel using Celery.
    job = group(refresh_single_project_data_task.s(pid) for pid in project_ids)
    result = job.apply_async()

    logging.info(f"Submitted Celery group task {result.id}. Waiting for results...")

    # Wait for the tasks to complete and get the results
    task_results = result.get()

    for res in task_results:
        project_id, success, error_msg = res
        if success:
            successful_refreshes.append(project_id)
        else:
            failed_refreshes.append((project_id, error_msg))

    end_time = datetime.now()
    duration = end_time - start_time
    logging.info(f"--- Data Synchronization Job Finished at {end_time.strftime('%Y-%m-%d %H:%M:%S')} ---")
    logging.info(f"--- Total execution time: {duration} ---")
    logging.info(f"Successfully refreshed {len(successful_refreshes)} projects.")
    if failed_refreshes:
        logging.warning(f"Failed to refresh {len(failed_refreshes)} projects:")
        for pid, error in failed_refreshes:
            logging.warning(f"  - Project: {pid}, Error: {error}")
    else:
        logging.info("All projects were refreshed successfully.")

if __name__ == "__main__":
    main()