# Use Microsoft's Go dev container image (Go 1.25)
FROM mcr.microsoft.com/devcontainers/go:1.25-bookworm AS dev

# Install Node.js 24
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm

# Install build tools and required dependencies to build libvips from source.
COPY .libvips-version /tmp/.libvips-version

# Install dependencies for libvips
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential pkg-config git ca-certificates \
    meson ninja-build python3 python3-pip python3-setuptools \
    libglib2.0-dev libexpat1-dev libjpeg-dev libpng-dev libtiff-dev \
    libwebp-dev libheif-dev libopenexr-dev liborc-0.4-dev libgirepository1.0-dev \
    libxml2-dev libexif-dev libpoppler-glib-dev libgsf-1-dev libopenjp2-7-dev \
    libjxl-dev libimagequant-dev libarchive-dev librsvg2-dev \
    libopenslide-dev libmatio-dev libcfitsio-dev libcgif-dev \
    libmagickwand-dev libraw-dev libnifti-dev && \
    rm -rf /var/lib/apt/lists/*

# Download, build and install libvips so headers/libs match the generated bindings
RUN set -eux; \
    VIPS_VERSION=$(cat /tmp/.libvips-version | tr -d '[:space:]'); \
    mkdir -p /tmp/build && cd /tmp/build; \
    curl -fsSL "https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.xz" -o vips.tar.xz; \
    tar xJf vips.tar.xz; \
    cd vips-${VIPS_VERSION}; \
    meson setup build --prefix=/usr ; \
    ninja -C build; \
    ninja -C build install; \
    rm -rf /tmp/build; \
    ldconfig || true

# Set up development tools for Go and JS
RUN go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest && \
    go install github.com/go-task/task/v3/cmd/task@latest && \
    chmod -R 777 /go

# Set working directory
WORKDIR /workspace

# Configure bash and zsh history persistence for vscode user
ARG USERNAME=vscode

RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history && export HISTSIZE=10000 && export HISTFILESIZE=10000" \
    && mkdir -p /commandhistory \
    && touch /commandhistory/.bash_history \
    && touch /commandhistory/.zsh_history \
    && chown -R $USERNAME /commandhistory \
    && echo "$SNIPPET" >> "/home/$USERNAME/.bashrc" \
    && echo "export HISTFILE=/commandhistory/.zsh_history && export SAVEHIST=10000 && setopt INC_APPEND_HISTORY" >> "/home/$USERNAME/.zshrc" \
    && echo "$SNIPPET" >> "/root/.bashrc" \
    && echo "export HISTFILE=/commandhistory/.zsh_history && export SAVEHIST=10000 && setopt INC_APPEND_HISTORY" >> "/root/.zshrc"

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/*
