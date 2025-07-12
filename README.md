# GCP Security Dashboard

This project is a web-based dashboard for visualizing Google Cloud Platform (GCP) security metrics. It consists of a Python backend using FastAPI and a Next.js frontend.

## Project Structure

- `/backend`: Contains the FastAPI backend application.
- `/frontend`: Contains the Next.js frontend application.

## Local Development Setup

### Prerequisites

- Python 3.9+ and `venv`
- Node.js and `npm`

### Backend Setup

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a Python virtual environment:**
    If you haven't already, create a virtual environment.
    ```bash
    python3 -m venv venv
    ```
    Activate it:
    ```bash
    source venv/bin/activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Start the backend server:**
    The server will run on `http://localhost:8080`.
    ```bash
    uvicorn main:app --host 0.0.0.0 --port 8080
    ```

5.  **To stop the server:**
    Press `Ctrl+C` in the terminal where the server is running.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the frontend server:**
    The development server will run on `http://localhost:3000`.
    ```bash
    npm run dev
    ```

4.  **To stop the server:**
    Press `Ctrl+C` in the terminal where the server is running.
