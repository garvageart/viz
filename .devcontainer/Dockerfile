FROM mcr.microsoft.com/devcontainers/go:1-1.23-bookworm

# Install Node.js
ARG NODE_VERSION="22.x"
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION} | bash - \
    && apt-get install -y nodejs

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install system dependencies (libvips for image processing)
# vips-tools is useful for debugging vips issues
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y libvips-dev vips-tools \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install oapi-codegen
RUN go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest

# Persist bash history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    && mkdir /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R vscode /commandhistory \
    && echo "$SNIPPET" >> "/home/vscode/.bashrc"
