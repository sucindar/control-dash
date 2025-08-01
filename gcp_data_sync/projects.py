from fastapi import HTTPException
from google.cloud import resourcemanager_v3, compute_v1
from google.api_core import exceptions
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

def get_projects_in_org(region: str = None, folderName: str = None):
    """Recursively fetches all projects under an organization, optionally filtered by region or folder."""
    organization_id = os.getenv("ORGANIZATION_ID")
    if not organization_id or organization_id == "YOUR_ORGANIZATION_ID_HERE":
        raise HTTPException(
            status_code=500,
            detail="ORGANIZATION_ID is not set in the .env file. Please set it and restart the server."
        )

    try:
        project_client = resourcemanager_v3.ProjectsClient()
        folders_client = resourcemanager_v3.FoldersClient()
        compute_client = compute_v1.InstancesClient()
        
        all_projects = {}

        def process_projects(query, folder_name=None):
            request = resourcemanager_v3.SearchProjectsRequest(query=query)
            for project in project_client.search_projects(request=request):
                if project.project_id not in all_projects:
                    project_details = {
                        "project_id": project.project_id,
                        "display_name": project.display_name,
                        "state": project.state.name,
                        "environment": project.labels.get("environment", "N/A")
                    }
                    if folder_name:
                        project_details["folder_name"] = folder_name
                    all_projects[project.project_id] = project_details

        def traverse_folders(parent):
            request = resourcemanager_v3.ListFoldersRequest(parent=parent)
            for folder in folders_client.list_folders(request=request):
                folder_id = folder.name.split('/')[-1]
                logging.info(f"Scanning folder: {folder.display_name} ({folder_id})")
                process_projects(query=f"parent:folders/{folder_id}", folder_name=folder.display_name)
                traverse_folders(parent=folder.name)

        start_parent = f"organizations/{organization_id}"
        if folderName:
            logging.info(f"Searching for folder with displayName: {folderName}")
            try:
                search_request = resourcemanager_v3.SearchFoldersRequest(query=f'displayName="{folderName}" AND parent=organizations/{organization_id}')
                search_results = folders_client.search_folders(request=search_request)
                first_folder = next(iter(search_results), None)
                if first_folder:
                    start_parent = first_folder.name
                    logging.info(f"Found folder: {first_folder.display_name} ({start_parent}). Starting scan from this folder.")
                else:
                    logging.warning(f"Folder with name '{folderName}' not found. Returning empty list.")
                    return []
            except Exception as e:
                logging.error(f"Error searching for folder '{folderName}': {e}")
                raise HTTPException(status_code=500, detail=f"Error finding folder: {e}")

        # Start traversal from the determined parent (org or specific folder)
        current_folder_name = None
        if folderName:
            # We already found the folder and its name is in the folderName variable.
            current_folder_name = folderName

        logging.info(f"Scanning projects under parent: {start_parent}")
        process_projects(query=f"parent:{start_parent}", folder_name=current_folder_name)

        logging.info(f"Starting folder traversal under parent: {start_parent}")
        traverse_folders(parent=start_parent)

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
