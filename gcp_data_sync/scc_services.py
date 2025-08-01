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

def get_security_center_services(project_id: str):
    """Fetches all Security Center services for a project and their enablement state."""
    logging.info(f"Attempting to fetch Security Center services for project: {project_id}")
    services_list = []
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
        else:
            #logging.info(f"Found {len(responses)} Security Center service(s).")
            for service in responses:
                #logging.debug(f"Full service object: {service}")
                # The service name is a long path, let's get the last part.
                service_id = service.name.split('/')[-1]

                # Exclude Security Health Analytics as it's handled separately
                if service_id.lower() == 'security_health_analytics':
                    continue

                service_modules = []
                if service.modules:
                    for module_name, module_settings in service.modules.items():
                        service_modules.append({
                            "name": module_name.replace('_', ' ').title(),
                            "status": module_settings.effective_enablement_state.name.capitalize()
                        })

                services_list.append({
                    "name": service_id.replace('-', ' ').title(),
                    "status": service.effective_enablement_state.name.capitalize(),
                    "controlType": "Security Service",
                    "details": f"Service ID: {service_id}",
                    "modules": service_modules,
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

    logging.info(f"Finished fetching Security Center services. Returning {len(services_list)} service(s).")
    return services_list