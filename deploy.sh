#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# Google Cloud Project ID
PROJECT_ID="evol-dev-456410"
# Google Cloud Region
REGION="us-central1"
# Name for your Artifact Registry repository
REPO_NAME="gcp-security-dashboard"
# Names for your Cloud Run services
BACKEND_SERVICE_NAME="gcp-dashboard-backend"
FRONTEND_SERVICE_NAME="gcp-dashboard-frontend"

# --- Setup ---
echo "--- Enabling required Google Cloud services ---"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com

echo "--- Creating Artifact Registry repository (if it doesn't exist) ---"
gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker repository for GCP Security Dashboard" || echo "Repository '${REPO_NAME}' already exists."

# --- Backend Deployment ---
echo "--- Building and pushing backend image using Cloud Build ---"
BACKEND_IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${BACKEND_SERVICE_NAME}:latest"
gcloud builds submit ./backend --tag "${BACKEND_IMAGE_URI}"

echo "--- Deploying backend service to Cloud Run ---"
gcloud run deploy "${BACKEND_SERVICE_NAME}" \
    --image="${BACKEND_IMAGE_URI}" \
    --platform=managed \
    --region="${REGION}" \
    --allow-unauthenticated \
    --project="${PROJECT_ID}"

# Get the URL of the deployed backend service
BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE_NAME}" --platform=managed --region="${REGION}" --format='value(status.url)')
echo "Backend deployed to: ${BACKEND_URL}"

# --- Frontend Deployment ---
echo "--- Building and pushing frontend image using Cloud Build ---"
FRONTEND_IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${FRONTEND_SERVICE_NAME}:latest"
gcloud builds submit ./frontend --tag "${FRONTEND_IMAGE_URI}"

echo "--- Deploying frontend service to Cloud Run ---"
gcloud run deploy "${FRONTEND_SERVICE_NAME}" \
    --image="${FRONTEND_IMAGE_URI}" \
    --platform=managed \
    --region="${REGION}" \
    --allow-unauthenticated \
    --project="${PROJECT_ID}" \
    --set-env-vars="NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}"

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE_NAME}" --platform=managed --region="${REGION}" --format='value(status.url)')

echo "---"
echo "Deployment complete!"
echo "Backend URL: ${BACKEND_URL}"
echo "Frontend URL: ${FRONTEND_URL}"
