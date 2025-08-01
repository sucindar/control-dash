# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy application code
COPY gcp_data_sync /app/gcp_data_sync

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Run the data sync script when the container launches
CMD ["python", "-m", "gcp_data_sync.main"]
