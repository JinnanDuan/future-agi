FROM 375763256607.dkr.ecr.us-east-2.amazonaws.com/model-serving:v1.0.7_base

# Copy the rest of the application code into the container
COPY . .

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

# Expose ports
EXPOSE 8000
EXPOSE 8080

# Use the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
