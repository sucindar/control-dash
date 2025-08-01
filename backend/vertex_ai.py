import os
import logging
import vertexai
from vertexai.generative_models import GenerativeModel, Part
import os
import logging
from google.auth import default

logging.basicConfig(level=logging.INFO)

def generate_summary(text_to_summarize):
    """Generates a summary of the provided text using Vertex AI."""
    project_id = os.getenv("DASHBOARD_GCP_PROJECT_ID")
    location = os.getenv("GCP_REGION", "us-central1")

    if not project_id:
        logging.error("DASHBOARD_GCP_PROJECT_ID not set.")
        return "Error: Project ID for AI Platform not configured."

    try:
        # Initialize the Vertex AI client
        vertexai.init(project=project_id, location=location)

        # Load the pre-trained text summarization model
        model = GenerativeModel("gemini-2.5-flash")

        # Define the prompt for the model
        prompt = f"Summarize the following security data in a concise manner, highlighting key risks and vulnerabilities. The data is: {text_to_summarize}"

        # Get the prediction
        response = model.generate_content(prompt)
        
        summary = response.text
        logging.info("Successfully generated summary from Vertex AI.")
        return summary

    except Exception as e:
        logging.error(f"An error occurred while generating summary with Vertex AI: {e}")
        return f"Error generating summary: {e}"
