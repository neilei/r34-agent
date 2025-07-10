# Use an official Bun runtime as a parent image
FROM oven/bun:1-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the entire project structure first
COPY . .

# Change to the agent directory where package.json is located
WORKDIR /usr/src/app/apps/agent

# Install dependencies
# Using --frozen-lockfile ensures that the exact versions of dependencies from bun.lockb are used.
RUN bun install --frozen-lockfile

# The server listens on port 3000 by default, but can be configured with the PORT env var.
# Also expose 3001 for MCP TCP mode
EXPOSE 3000 3001

# The default command to run when starting the container
# This starts the server in REST mode by default, but can be overridden
CMD [ "bun", "run", "start" ] 