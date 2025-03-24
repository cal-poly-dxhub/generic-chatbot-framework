FROM docker:dind

# Install dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    nodejs \
    npm \
    git \
    curl \
    aws-cli \
    bash \
    jq

# Install AWS CDK globally
RUN npm install -g aws-cdk

# Create working directory
WORKDIR /app

# Create the entrypoint script using heredoc syntax
COPY <<EOF /usr/local/bin/entrypoint.sh
#!/bin/bash
set -e

# Start Docker daemon in the background
echo "Starting Docker daemon..."
dockerd-entrypoint.sh > /var/log/docker.log 2>&1 &

# Wait for Docker daemon to start
echo "Waiting for Docker daemon to initialize..."
for i in {1..30}; do
  if docker info &>/dev/null; then
    echo "Docker daemon started successfully!"
    break
  fi
  echo -n "."
  sleep 1
done

# Check if Docker daemon failed to start
if ! docker info &>/dev/null; then
  echo "ERROR: Docker daemon failed to start within 30 seconds."
  exit 1
fi

# Check if a command is provided via CMD
if [ -z "\$1" ]; then
  echo "No command provided. Sleeping indefinitely..."
  exec tail -f /dev/null
else
  echo "Executing command: \$*"
  exec "\$@"
fi
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash", "./deployment/deployment.sh"]
