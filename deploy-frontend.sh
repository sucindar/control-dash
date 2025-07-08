#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
PROJECT_ID="evol-dev-456410"
REGION="us-central1"
REPO_NAME="gcp-security-dashboard"
BACKEND_SERVICE_NAME="gcp-dashboard-backend"
FRONTEND_SERVICE_NAME="gcp-dashboard-frontend"

# --- Get Backend URL ---
echo "--- Retrieving backend service URL ---"
BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE_NAME}" --platform=managed --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')

if [ -z "${BACKEND_URL}" ]; then
    echo "Error: Backend URL could not be retrieved. Make sure the backend service '${BACKEND_SERVICE_NAME}' is deployed successfully first."
    exit 1
fi

echo "Backend URL found: ${BACKEND_URL}"

# --- Frontend Deployment ---
echo "--- Building and pushing frontend image using Cloud Build ---"
FRONTEND_IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${FRONTEND_SERVICE_NAME}:latest"
gcloud builds submit ./frontend --tag "${FRONTEND_IMAGE_URI}" --project="${PROJECT_ID}"

echo "--- Deploying frontend service to Cloud Run ---"
gcloud run deploy "${FRONTEND_SERVICE_NAME}" \
    --image="${FRONTEND_IMAGE_URI}" \
    --platform=managed \
    --region="${REGION}" \
    --allow-unauthenticated \
    --project="${PROJECT_ID}" \
    --set-env-vars="NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}"

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE_NAME}" --platform=managed --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')

echo "---"
echo "Frontend deployment complete!"
echo "Frontend URL: ${FRONTEND_URL}"
