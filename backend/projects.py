from fastapi import HTTPException
from google.cloud import resourcemanager_v3
from google.api_core import exceptions
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

def get_projects_in_org():
    """Recursively fetches all projects under an organization, including those in folders."""
    organization_id = os.getenv("ORGANIZATION_ID")
    if not organization_id or organization_id == "YOUR_ORGANIZATION_ID_HERE":
        raise HTTPException(
            status_code=500,
            detail="ORGANIZATION_ID is not set in the .env file. Please set it and restart the server."
        )

    try:
        project_client = resourcemanager_v3.ProjectsClient()
        folders_client = resourcemanager_v3.FoldersClient()
        
        all_projects = {}

        def process_projects(query):
            request = resourcemanager_v3.SearchProjectsRequest(query=query)
            for project in project_client.search_projects(request=request):
                if project.project_id not in all_projects:
                    all_projects[project.project_id] = {
                        "project_id": project.project_id,
                        "display_name": project.display_name,
                        "state": project.state.name
                    }

        def traverse_folders(parent):
            request = resourcemanager_v3.ListFoldersRequest(parent=parent)
            for folder in folders_client.list_folders(request=request):
                folder_id = folder.name.split('/')[-1]
                logging.info(f"Scanning folder: {folder.display_name} ({folder_id})")
                process_projects(query=f"parent:folders/{folder_id}")
                traverse_folders(parent=folder.name)

        # Start traversal
        org_parent = f"organizations/{organization_id}"
        logging.info(f"Scanning projects directly under organization: {organization_id}")
        process_projects(query=f"parent:{org_parent}")
        
        logging.info(f"Starting folder traversal for organization: {organization_id}")
        traverse_folders(parent=org_parent)

        projects_list = list(all_projects.values())
        logging.info(f"Successfully fetched a total of {len(projects_list)} unique projects.")
        return projects_list

    except exceptions.PermissionDenied as e:
        logging.error(f"Permission denied for organization {organization_id}: {e}")
        raise HTTPException(
            status_code=403,
            detail=f"Permission Denied: Ensure you have 'resourcemanager.projects.list' and 'resourcemanager.folders.list' permissions. Details: {e}"
        )
    except Exception as e:
        logging.error(f"An unexpected error occurred for organization {organization_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred. Details: {e}"
        )
