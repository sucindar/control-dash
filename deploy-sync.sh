#!/bin/bash

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(python -c "
import sys
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            key, value = line.split('=', 1)
            # Simple shell-escape for the value
            value = value.replace('\'', "'\\''")
            sys.stdout.write(f\"{key}='{value}' \")
")
fi

# --- Configuration ---
# GCP_PROJECT_ID and GCP_REGION are now loaded from the .env file.
# You can still override them here or set other variables if needed.
export AR_REPO_NAME="${AR_REPO_NAME:-gcp-data-sync-repo}"         # Artifact Registry repository name
export JOB_NAME="${JOB_NAME:-gcp-data-sync-job}"               # Cloud Run job name
export SCHEDULER_JOB_NAME="${SCHEDULER_JOB_NAME:-gcp-data-sync-scheduler}" # Cloud Scheduler job name
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_EMAIL:-1088176764975-compute@developer.gserviceaccount.com}"  # Service account for the job

# 1. Check if required variables are set
if [[ -z "$GCP_PROJECT_ID" || -z "$GCP_REGION" || -z "$SERVICE_ACCOUNT_EMAIL" ]]; then
    echo "Error: Please ensure GCP_PROJECT_ID, GCP_REGION, and SERVICE_ACCOUNT_EMAIL are set in your .env file or exported."
    exit 1
fi

# 2. Set the project context
gcloud config set project $GCP_PROJECT_ID

# 3. Enable necessary APIs
_enable_api() {
    echo "Enabling $1..."
    gcloud services enable $1 >/dev/null
}
_enable_api "artifactregistry.googleapis.com"
_enable_api "cloudbuild.googleapis.com"
_enable_api "run.googleapis.com"
_enable_api "cloudscheduler.googleapis.com"

# 4. Check for --deploy-only flag
DEPLOY_ONLY=false
if [ "$1" == "--deploy-only" ]; then
    DEPLOY_ONLY=true
    echo "--deploy-only flag detected. Skipping image build and pushing..."
fi

IMAGE_TAG="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${AR_REPO_NAME}/${JOB_NAME}:latest"

if [ "$DEPLOY_ONLY" = false ]; then
    # 5. Create Artifact Registry repository if it doesn't exist
    if ! gcloud artifacts repositories describe $AR_REPO_NAME --location=$GCP_REGION &>/dev/null; then
        echo "Creating Artifact Registry repository: $AR_REPO_NAME..."
        gcloud artifacts repositories create $AR_REPO_NAME \
            --repository-format=docker \
            --location=$GCP_REGION
    else
        echo "Artifact Registry repository $AR_REPO_NAME already exists."
    fi

    # 6. Build the container image using Cloud Build
    echo "Building container image: $IMAGE_TAG..."
    gcloud builds submit --tag $IMAGE_TAG
fi

# 7. Prepare environment variables from .env file
TEMP_ENV_FILE="temp_env.yaml"
if [ -f .env ]; then
    echo "Found .env file. Converting to YAML for Cloud Run Job..."

    # Check if PyYAML is installed, and install it if it's not.
    if ! python3 -c "import yaml" &>/dev/null; then
        echo "PyYAML not found. Installing it now..."
        pip3 install PyYAML
    fi

    # Use Python to robustly convert .env to YAML, handling special characters.
    python3 -c "
import os
import yaml

env_vars = {}
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            key, value = line.split('=', 1)
            env_vars[key.strip()] = value.strip()

with open('$TEMP_ENV_FILE', 'w') as f:
    yaml.dump(env_vars, f, default_flow_style=False)
"
fi

# 8. Deploy the Cloud Run Job
echo "Deploying Cloud Run Job: $JOB_NAME..."
if [ -f $TEMP_ENV_FILE ]; then
    gcloud run jobs deploy $JOB_NAME \
        --image $IMAGE_TAG \
        --region $GCP_REGION \
        --service-account=$SERVICE_ACCOUNT_EMAIL \
        --env-vars-file=$TEMP_ENV_FILE \
        --task-timeout=3600 # 1 hour timeout, adjust as needed
    # Clean up the temporary file
    rm $TEMP_ENV_FILE
else
    # Deploy without environment variables if .env file doesn't exist
    gcloud run jobs deploy $JOB_NAME \
        --image $IMAGE_TAG \
        --region $GCP_REGION \
        --service-account=$SERVICE_ACCOUNT_EMAIL \
        --task-timeout=3600 # 1 hour timeout, adjust as needed
fi

# 9. Create Cloud Scheduler job to trigger the Cloud Run Job
if gcloud scheduler jobs describe $SCHEDULER_JOB_NAME --location=$GCP_REGION &>/dev/null; then
    echo "Cloud Scheduler job $SCHEDULER_JOB_NAME already exists. Deleting to recreate..."
    gcloud scheduler jobs delete $SCHEDULER_JOB_NAME --location=$GCP_REGION -q
fi

echo "Creating Cloud Scheduler job: $SCHEDULER_JOB_NAME..."
gcloud scheduler jobs create http $SCHEDULER_JOB_NAME \
    --location=$GCP_REGION \
    --schedule="*/30 * * * *" \
    --uri="https://"$GCP_REGION"-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/"$GCP_PROJECT_ID"/jobs/"$JOB_NAME":run" \
    --http-method=POST \
    --oauth-service-account-email=$SERVICE_ACCOUNT_EMAIL

echo "
Deployment complete!

- Your container image has been pushed to Artifact Registry.
- Your application is deployed as Cloud Run Job '$JOB_NAME'.
- A Cloud Scheduler job '$SCHEDULER_JOB_NAME' has been created to trigger the job every 30 minutes.
"
