import os
import logging
import json
from sha_modules import get_sha_custom_modules, get_sha_modules

# Configure logging to see debug messages
logging.basicConfig(level=logging.DEBUG)

if __name__ == "__main__":
    # Make sure to set this environment variable in your shell
    # export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
    project_id = "evol-dev-456410"

    if not project_id:
        logging.error("GOOGLE_CLOUD_PROJECT environment variable not set.")
    else:
        print(f"--- Testing SHA Custom Modules for project: {project_id} ---")
        custom_modules = get_sha_custom_modules(project_id)
        print(json.dumps(custom_modules, indent=2))
        print("--- Finished testing SHA Custom Modules ---\n")

        print(f"--- Testing SHA Modules (Service Details) for project: {project_id} ---")
        sha_details = get_sha_modules(project_id)
        print(json.dumps(sha_details, indent=2))
        print("--- Finished testing SHA Modules (Service Details) ---")
