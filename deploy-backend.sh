#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
PROJECT_ID="evol-dev-456410"
REGION="us-central1"
REPO_NAME="gcp-security-dashboard"
BACKEND_SERVICE_NAME="gcp-dashboard-backend"

# --- Setup ---
echo "--- Enabling required Google Cloud services ---"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com iam.googleapis.com --project="${PROJECT_ID}"

echo "--- Granting Cloud Build service account permissions to deploy to Cloud Run ---"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
CLOUD_BUILD_SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUD_BUILD_SERVICE_ACCOUNT}" \
    --role="roles/run.admin" \
    --condition=None || echo "IAM role 'roles/run.admin' already exists for the service account."

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUD_BUILD_SERVICE_ACCOUNT}" \
    --role="roles/iam.serviceAccountUser" \
    --condition=None || echo "IAM role 'roles/iam.serviceAccountUser' already exists for the service account."

echo "--- Creating Artifact Registry repository (if it doesn't exist) ---"
gcloud artifacts repositories create "${REPO_NAME}" \
    --project="${PROJECT_ID}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker repository for GCP Security Dashboard" || echo "Repository '${REPO_NAME}' already exists."

# --- Backend Deployment ---
echo "--- Building and pushing backend image using Cloud Build ---"
BACKEND_IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${BACKEND_SERVICE_NAME}:latest"
gcloud builds submit ./backend --tag "${BACKEND_IMAGE_URI}" --project="${PROJECT_ID}"

echo "--- Deploying backend service to Cloud Run ---"
gcloud run deploy "${BACKEND_SERVICE_NAME}" \
    --image="${BACKEND_IMAGE_URI}" \
    --platform=managed \
    --region="${REGION}" \
    --allow-unauthenticated \
    --project="${PROJECT_ID}"

BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE_NAME}" --platform=managed --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')

echo "---"
echo "Backend deployment complete!"
echo "Backend URL: ${BACKEND_URL}"
