# This file will contain the logic for fetching VPC Service Controls data.

import logging

# Configure logging
logging.basicConfig(level=logging.INFO)


from google.cloud import resourcemanager_v3
from googleapiclient import discovery
import google.auth

def get_vpc_sc_status(project_id: str):
    """Fetches the VPC Service Controls status for a given project."""
    logging.info(f"Fetching VPC-SC status for project: {project_id}")
    status = "Disabled"
    details = "Project is not protected by a VPC Service Controls perimeter."

    try:
        credentials, _ = google.auth.default()

        # Get the organization ID from the project ID
        crm_client = resourcemanager_v3.ProjectsClient(credentials=credentials)
        project_info = crm_client.get_project(name=f"projects/{project_id}")
        parent = project_info.parent

        if not parent.startswith("organizations/"):
            return {
                "name": "VPC SC",
                "status": "Error",
                "controlType": "VPC Service Controls",
                "details": "Project does not belong to an organization."
            }
        
        organization_id = parent.split('/')[-1]

        # Build the Access Context Manager client
        acm_client = discovery.build('accesscontextmanager', 'v1', credentials=credentials, cache_discovery=False)

        # List access policies
        policies_request = acm_client.accessPolicies().list(parent=f"organizations/{organization_id}")
        policies_response = policies_request.execute()
        access_policies = policies_response.get('accessPolicies', [])

        if not access_policies:
            return {
                "name": "VPC SC",
                "status": "Disabled",
                "controlType": "VPC Service Controls",
                "details": "No Access Policy found for the organization."
            }

        policy_name = access_policies[0]['name']

        # List service perimeters
        perimeters_request = acm_client.accessPolicies().servicePerimeters().list(parent=policy_name)
        perimeters_response = perimeters_request.execute()
        service_perimeters = perimeters_response.get('servicePerimeters', [])

        # Check if the project is in any perimeter
        project_resource_name = f"projects/{project_id}"
        for perimeter in service_perimeters:
            if perimeter.get('status') and project_resource_name in perimeter['status'].get('resources', []):
                status = "Enabled"
                details = f"Project is protected by perimeter: {perimeter['title']}"
                break

    except Exception as e:
        logging.error(f"Error fetching VPC-SC status for {project_id}: {e}")
        status = "Error"
        details = str(e)

    return {
        "name": "VPC SC",
        "status": status,
        "controlType": "VPC Service Controls",
        "details": details
    }
