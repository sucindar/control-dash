import os
import vertexai
from vertexai.generative_models import GenerativeModel, Part

def generate_summary(dashboard_data: str) -> str:
    """Generates a summary of the dashboard data using the Gemini model."""
    project_id = os.getenv("DASHBOARD_GCP_PROJECT_ID")
    location = os.getenv("GCP_REGION", "us-central1")

    vertexai.init(project=project_id, location=location)

    model = GenerativeModel("gemini-2.5-flash")

    prompt = f"""Provide a brief, high-level summary of the following GCP security dashboard data. 
    Focus on the most critical findings and potential risks. The data is in JSON format.
    Format the summary using Markdown.

    Data:
    {dashboard_data}

    Summary:
    """

    response = model.generate_content([Part.from_text(prompt)])
    return response.text
