#!/bin/sh
# entrypoint.sh

# Print a message indicating the script is running
echo "Starting FastAPI application with Gunicorn..."

# Command to run the FastAPI app using Gunicorn
exec gunicorn -w 1 -t 100 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8080 app.main:app
