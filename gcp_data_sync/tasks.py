import logging
import asyncio
from celery import group
from .celery_app import celery_app
from .datastore_client import save_dashboard_data
from .firewall import get_denied_internet_ingress_rules
from .org_policies import get_all_effective_policies
from .scc_services import get_security_center_services
from .sha_modules import get_sha_custom_modules, get_sha_modules
from .vpc_sc import get_vpc_sc_status

# Silence the successful task completion log message from Celery
from celery.app.log import get_logger
celery_trace_logger = get_logger('celery.app.trace')
celery_trace_logger.setLevel(logging.WARNING)

@celery_app.task
def get_all_effective_policies_task(project_id):
    return asyncio.run(get_all_effective_policies(project_id))

@celery_app.task
def get_vpc_sc_status_task(project_id):
    return get_vpc_sc_status(project_id)

@celery_app.task
def get_sha_custom_modules_task(project_id):
    return get_sha_custom_modules(project_id)

@celery_app.task
def get_sha_modules_task(project_id):
    return get_sha_modules(project_id)

@celery_app.task
def get_security_center_services_task(project_id):
    return get_security_center_services(project_id)

@celery_app.task
def get_denied_internet_ingress_rules_task(project_id):
    return get_denied_internet_ingress_rules(project_id)

@celery_app.task(bind=True)
def refresh_single_project_data_task(self, project_id):
    """
    Celery task to refresh all security data for a single project.
    This task calls the data fetching functions in parallel using a Celery group.
    """
    logging.info(f"Executing data refresh task for project: {project_id}")
    try:
        # Run the org policies task sequentially first to avoid hitting API quota limits.
        logging.info(f"Running org policies task sequentially for project: {project_id}")
        org_policies_result = get_all_effective_policies_task.delay(project_id)

        # Create a group of the remaining tasks to run in parallel
        logging.info(f"Running remaining tasks in parallel for project: {project_id}")
        other_tasks_group = group(
            get_vpc_sc_status_task.s(project_id),
            get_sha_custom_modules_task.s(project_id),
            get_sha_modules_task.s(project_id),
            get_security_center_services_task.s(project_id),
            get_denied_internet_ingress_rules_task.s(project_id)
        )

        # Execute the parallel group
        other_results_group = other_tasks_group.apply_async()

        # Wait for all tasks to complete and get the results
        org_policies = org_policies_result.get()
        other_results = other_results_group.get()

        # Unpack the results from the parallel group
        vpc_sc_status, sha_custom_modules, sha_module_details, other_security_services, denied_firewall_rules = other_results

        all_sha_modules = []
        if sha_custom_modules:
            # Ensure all custom modules have a controlType for frontend stability
            for module in sha_custom_modules:
                module['controlType'] = 'SHA Custom Module'
            all_sha_modules.extend(sha_custom_modules)
        if sha_module_details and sha_module_details.get('modules'):
            all_sha_modules.extend(sha_module_details['modules'])

        processed_security_services = []
        if other_security_services:
            for service in other_security_services:
                if service.get('modules'):
                    service_id = service.get('details', '').replace('Service ID: ', '')
                    processed_security_services.extend([{'name': m.get('name'), 'status': m.get('status'), 'controlType': service_id, 'details': f"Part of {service.get('name')}"} for m in service['modules']])
                else:
                    processed_security_services.append(service)

        security_data = {
            "org_policies": org_policies,
            "vpc_sc_status": vpc_sc_status,
            "sha_modules": all_sha_modules,
            "security_services": processed_security_services,
            "firewall_rules": denied_firewall_rules
        }

        save_dashboard_data(project_id, security_data)
        logging.info(f"Successfully saved data for project {project_id} to Datastore.")
        return project_id, True, None
    except Exception as e:
        logging.error(f"Error refreshing data for project {project_id}: {e}", exc_info=True)
        return project_id, False, str(e)
