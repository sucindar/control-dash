from google.cloud import securitycentermanagement_v1
from google.api_core import exceptions
import os
import logging
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(level=logging.INFO)

# Disable credentials validation for local development if needed
if os.environ.get("ENV") == "dev":
    os.environ["GOOGLE_API_USE_CLIENT_CERTIFICATE"] = "false"

def get_sha_custom_modules(project_id: str):
    """Fetches effective Security Health Analytics **custom** modules for a project.
    
    Note: There is no public API to list the enablement state of predefined SHA detectors.
    This function only covers custom modules created by the user.
    """
    logging.info(f"Attempting to fetch SHA custom modules for project: {project_id}")
    modules_list = []
    try:
        client = securitycentermanagement_v1.SecurityCenterManagementClient()
        parent = f"projects/{project_id}/locations/global"
        logging.info(f"Requesting SHA modules with parent: {parent}")

        request = securitycentermanagement_v1.ListEffectiveSecurityHealthAnalyticsCustomModulesRequest(
            parent=parent,
        )
        page_result = client.list_effective_security_health_analytics_custom_modules(request=request)

        # Convert iterator to a list to check if it's empty
        responses = list(page_result)
        if not responses:
            logging.warning("API returned no effective SHA custom modules. This is expected if none are configured.")
        else:
            logging.info(f"Found {len(responses)} effective SHA module(s).")
            for response in responses:
                logging.info(f"Processing module: {response.display_name}")
                modules_list.append({
                    "name": response.display_name,
                    "status": response.enablement_state.name.capitalize(),
                    "controlType": "SHA Custom Module",
                    "details": f"Module ID: {response.name.split('/')[-1]}",
                    "ControlObjective": "Detect Security Misconfigurations"
                })

    except exceptions.PermissionDenied as e:
        logging.error(f"Permission denied for project {project_id}: {e}")
        return JSONResponse(
            status_code=403,
            content={"error": "Permission Denied", "details": str(e)}
        )
    except Exception as e:
        logging.error(f"An unexpected error occurred for project {project_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "An unexpected error occurred", "details": str(e)}
        )

    logging.info(f"Finished fetching SHA custom modules. Returning {len(modules_list)} module(s).")
    return modules_list

def get_sha_modules(project_id: str):
    """Fetches details for the Security Health Analytics service."""
    logging.info(f"Attempting to fetch Security Health Analytics service details for project: {project_id}")
    try:
        client = securitycentermanagement_v1.SecurityCenterManagementClient()
        parent = f"projects/{project_id}/locations/global"
        logging.info(f"Requesting Security Center services with parent: {parent}")

        request = securitycentermanagement_v1.ListSecurityCenterServicesRequest(
            parent=parent,
        )
        page_result = client.list_security_center_services(request=request)

        responses = list(page_result)
        if not responses:
            logging.warning("API returned no Security Center services.")
            return None
        else:
            #logging.info(f"Found {responses} Security Center service(s). Filtering for SECURITY_HEALTH_ANALYTICS.")
            for service in responses:
                service_id = service.name.split('/')[-1]
                if service_id == 'SECURITY_HEALTH_ANALYTICS':
                    #logging.info(f"Found Security Health Analytics service: {service.display_name}")
                    service_modules = []
                    if service.modules:
                        for module_name, module_settings in service.modules.items():
                            service_modules.append({
                                "name": module_name.replace('_', ' ').title(),
                                "status": module_settings.effective_enablement_state.name.capitalize(),
                                "controlType": "SHA Module",
                                "details": f"Service ID: {service_id}",
                                "ControlObjective": "Detect Security Misconfigurations"
                            })

                    sha_service_details = {
                        "name": service_id.replace('-', ' ').title(),
                        "status": service.effective_enablement_state.name.capitalize(),
                        "controlType": "SHA Module",
                        "details": f"Service ID: {service_id}",
                        "modules": service_modules,
                        "ControlObjective": "Detect Security Misconfigurations"
                    }
                    return sha_service_details

    except exceptions.PermissionDenied as e:
        logging.error(f"Permission denied for project {project_id}: {e}")
        return JSONResponse(
            status_code=403,
            content={"error": "Permission Denied", "details": str(e)}
        )
    except Exception as e:
        logging.error(f"An unexpected error occurred for project {project_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "An unexpected error occurred", "details": str(e)}
        )

    logging.warning("Security Health Analytics service not found.")
    return None
