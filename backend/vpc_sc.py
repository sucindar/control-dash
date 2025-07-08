# This file will contain the logic for fetching VPC Service Controls data.

import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# --- Configuration ---
# Hardcoded Organization ID as requested for debugging/stability.
HARDCODED_ORG_ID = "922071633244"

from google.cloud import resourcemanager_v3
from googleapiclient import discovery
import google.auth

def get_vpc_sc_status(project_id: str):
    """
    Checks if a project is protected by a VPC Service Controls perimeter.
    """
    logging.debug(f"[VPC-SC] Starting status check for project_id: {project_id}")
    status = "Disabled"
    details = "Project is not protected by any VPC Service Controls perimeter."
    project_number = None

    try:
        credentials, _ = google.auth.default()

        # Get the organization ID from the project ID
        crm_client = resourcemanager_v3.ProjectsClient(credentials=credentials)
        logging.debug(f"[VPC-SC] Fetching project details for {project_id}")
        project_info = crm_client.get_project(name=f"projects/{project_id}")
        logging.debug(f"[VPC-SC] Full project object received from API: {project_info}") 
        
        # FIX: The project number is part of the 'name' field, e.g., 'projects/123456789012'
        project_number = project_info.name.split('/')[-1]
        org_id = HARDCODED_ORG_ID # Using the hardcoded org ID as requested.
        logging.debug(f"[VPC-SC] Found project number: {project_number} and using hardcoded org_id: {org_id}")

        # Build the Access Context Manager client
        acm_client = discovery.build('accesscontextmanager', 'v1', credentials=credentials, cache_discovery=False)

        logging.debug(f"[VPC-SC] Listing access policies for organization {org_id}")
        policies_request = acm_client.accessPolicies().list(parent=f"organizations/{org_id}")
        policies_response = policies_request.execute()
        access_policies = policies_response.get('accessPolicies', [])

        project_resource_name = f"projects/{project_number}"
        logging.debug(f"[VPC-SC] Constructed project resource name: {project_resource_name}")

        if not access_policies:
            logging.warning(f"[VPC-SC] No Access Policies found for organization {org_id}. Cannot check perimeters.")
            return {
                "name": "VPC SC",
                "status": "Disabled",
                "controlType": "VPC Service Controls",
                "details": "No Access Policy found for the organization."
            }

        for policy in access_policies:
            logging.debug(f"[VPC-SC] Checking policy: {policy['name']} ({policy['title']})")
            perimeters_request = acm_client.accessPolicies().servicePerimeters().list(parent=policy['name'])
            perimeters_response = perimeters_request.execute()
            service_perimeters = perimeters_response.get('servicePerimeters', [])

            for perimeter in service_perimeters:
                logging.debug(f"[VPC-SC]   - Checking perimeter: {perimeter['name']} ({perimeter['title']})")
                if perimeter.get('status') and perimeter['status'].get('resources'):
                    logging.debug(f"[VPC-SC]     Perimeter resources: {perimeter['status']['resources']}")
                    if project_resource_name in perimeter['status']['resources']:
                        status = "Enabled"
                        details = f"Project is protected by perimeter: {perimeter['title']}"
                        logging.debug(f"[VPC-SC]     MATCH FOUND! Project is in this perimeter.")
                        break
                else:
                    logging.debug(f"[VPC-SC]     Perimeter has no status or resources defined.")
            
            if status == "Enabled":
                logging.debug(f"[VPC-SC] Project found in a perimeter within this policy. Stopping search.")
                break

    except Exception as e:
        logging.error(f"[VPC-SC] Error fetching VPC-SC status for {project_id}: {e}")
        status = "Error"
        details = str(e)

    logging.debug(f"[VPC-SC] Final status for {project_id}: {status}, Details: {details}")
    return {
        "name": "VPC SC",
        "status": status,
        "controlType": "VPC Service Controls",
        "details": details
    }
