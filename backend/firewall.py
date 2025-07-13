import logging
from google.cloud import compute_v1

def get_denied_internet_ingress_rules(project_id: str) -> list:
    """
    Fetches firewall rules and identifies those that deny all internet ingress traffic.

    Args:
        project_id: The GCP project ID.

    Returns:
        A list of firewall rule names that deny ingress from 0.0.0.0/0.
    """
    logging.info(f"Fetching firewall rules for project {project_id}.")
    try:
        client = compute_v1.FirewallsClient()
        request = compute_v1.ListFirewallsRequest(project=project_id)
        firewalls = client.list(request=request)

        denied_rules = []
        for rule in firewalls:
            is_ingress = rule.direction == compute_v1.Firewall.Direction.INGRESS.name
            is_denied_all = any(d.I_p_protocol == 'all' for d in rule.denied)
            denies_all_ips = '0.0.0.0/0' in rule.source_ranges

            if is_ingress and is_denied_all and denies_all_ips:
                denied_rules.append({
                    'name': rule.name,
                    'status': 'Enabled',
                    'controlType': 'Firewall',
                    'details': 'Firewall rule denies all internet ingress traffic (0.0.0.0/0).'
                })

        if denied_rules:
            logging.warning(f"Found {len(denied_rules)} firewall rules denying all internet ingress for project {project_id}: {denied_rules}")
        else:
            logging.info(f"No firewall rules found denying all internet ingress for project {project_id}.")
        
        return denied_rules

    except Exception as e:
        logging.error(f"Error fetching firewall rules for project {project_id}: {e}")
        return []
