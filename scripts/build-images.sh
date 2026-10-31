#!/bin/bash

# Build all Docker images for the HLS platform

echo "Building HLS Video Streaming Platform Docker Images..."

# Build services
echo "Building User Management Service..."
docker build -t hls-platform/user-management:latest ./services/user-management

echo "Building Video Upload Service..."
docker build -t hls-platform/video-upload:latest ./services/video-upload

echo "Building Video Metadata Service..."
docker build -t hls-platform/video-metadata:latest ./services/video-metadata

echo "Building Transcoding Orchestration Service..."
docker build -t hls-platform/transcoding-orchestration:latest ./services/transcoding-orchestration

echo "Building Video Streaming Service..."
docker build -t hls-platform/video-streaming:latest ./services/video-streaming

echo "Building Notification Service..."
docker build -t hls-platform/notification:latest ./services/notification

# Build workers
echo "Building Transcoding Worker..."
docker build -t hls-platform/transcoding-worker:latest ./workers/transcoding-worker

# Build frontend (if exists)
if [ -d "./frontend" ]; then
    echo "Building Frontend..."
    docker build -t hls-platform/frontend:latest ./frontend
fi

echo "All Docker images built successfully!"

# Tag images for registry (optional)
if [ "$1" == "tag" ]; then
    REGISTRY=${2:-"your-registry.com"}
    
    echo "Tagging images for registry: $REGISTRY"
    
    docker tag hls-platform/user-management:latest $REGISTRY/hls-platform/user-management:latest
    docker tag hls-platform/video-upload:latest $REGISTRY/hls-platform/video-upload:latest
    docker tag hls-platform/video-metadata:latest $REGISTRY/hls-platform/video-metadata:latest
    docker tag hls-platform/transcoding-orchestration:latest $REGISTRY/hls-platform/transcoding-orchestration:latest
    docker tag hls-platform/video-streaming:latest $REGISTRY/hls-platform/video-streaming:latest
    docker tag hls-platform/notification:latest $REGISTRY/hls-platform/notification:latest
    docker tag hls-platform/transcoding-worker:latest $REGISTRY/hls-platform/transcoding-worker:latest
    
    if [ -d "./frontend" ]; then
        docker tag hls-platform/frontend:latest $REGISTRY/hls-platform/frontend:latest
    fi
    
    echo "Images tagged for registry!"
fi

# Push to registry (optional)
if [ "$1" == "push" ]; then
    REGISTRY=${2:-"your-registry.com"}
    
    echo "Pushing images to registry: $REGISTRY"
    
    docker push $REGISTRY/hls-platform/user-management:latest
    docker push $REGISTRY/hls-platform/video-upload:latest
    docker push $REGISTRY/hls-platform/video-metadata:latest
    docker push $REGISTRY/hls-platform/transcoding-orchestration:latest
    docker push $REGISTRY/hls-platform/video-streaming:latest
    docker push $REGISTRY/hls-platform/notification:latest
    docker push $REGISTRY/hls-platform/transcoding-worker:latest
    
    if [ -d "./frontend" ]; then
        docker push $REGISTRY/hls-platform/frontend:latest
    fi
    
    echo "Images pushed to registry!"
fi
