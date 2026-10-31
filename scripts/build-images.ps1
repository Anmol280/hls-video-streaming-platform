# Build all Docker images for the HLS platform

Write-Host "Building HLS Video Streaming Platform Docker Images..." -ForegroundColor Green

# Build services
Write-Host "Building User Management Service..." -ForegroundColor Yellow
docker build -t hls-platform/user-management:latest ./services/user-management

Write-Host "Building Video Upload Service..." -ForegroundColor Yellow
docker build -t hls-platform/video-upload:latest ./services/video-upload

Write-Host "Building Video Metadata Service..." -ForegroundColor Yellow
docker build -t hls-platform/video-metadata:latest ./services/video-metadata

Write-Host "Building Transcoding Orchestration Service..." -ForegroundColor Yellow
docker build -t hls-platform/transcoding-orchestration:latest ./services/transcoding-orchestration

Write-Host "Building Video Streaming Service..." -ForegroundColor Yellow
docker build -t hls-platform/video-streaming:latest ./services/video-streaming

Write-Host "Building Notification Service..." -ForegroundColor Yellow
docker build -t hls-platform/notification:latest ./services/notification

# Build workers
Write-Host "Building Transcoding Worker..." -ForegroundColor Yellow
docker build -t hls-platform/transcoding-worker:latest ./workers/transcoding-worker

# Build frontend (if exists)
if (Test-Path "./frontend") {
    Write-Host "Building Frontend..." -ForegroundColor Yellow
    docker build -t hls-platform/frontend:latest ./frontend
}

Write-Host "All Docker images built successfully!" -ForegroundColor Green

# Tag images for registry (optional)
if ($args[0] -eq "tag") {
    $registry = if ($args[1]) { $args[1] } else { "your-registry.com" }
    
    Write-Host "Tagging images for registry: $registry" -ForegroundColor Cyan
    
    docker tag hls-platform/user-management:latest "$registry/hls-platform/user-management:latest"
    docker tag hls-platform/video-upload:latest "$registry/hls-platform/video-upload:latest"
    docker tag hls-platform/video-metadata:latest "$registry/hls-platform/video-metadata:latest"
    docker tag hls-platform/transcoding-orchestration:latest "$registry/hls-platform/transcoding-orchestration:latest"
    docker tag hls-platform/video-streaming:latest "$registry/hls-platform/video-streaming:latest"
    docker tag hls-platform/notification:latest "$registry/hls-platform/notification:latest"
    docker tag hls-platform/transcoding-worker:latest "$registry/hls-platform/transcoding-worker:latest"
    
    if (Test-Path "./frontend") {
        docker tag hls-platform/frontend:latest "$registry/hls-platform/frontend:latest"
    }
    
    Write-Host "Images tagged for registry!" -ForegroundColor Green
}

# Push to registry (optional)
if ($args[0] -eq "push") {
    $registry = if ($args[1]) { $args[1] } else { "your-registry.com" }
    
    Write-Host "Pushing images to registry: $registry" -ForegroundColor Cyan
    
    docker push "$registry/hls-platform/user-management:latest"
    docker push "$registry/hls-platform/video-upload:latest"
    docker push "$registry/hls-platform/video-metadata:latest"
    docker push "$registry/hls-platform/transcoding-orchestration:latest"
    docker push "$registry/hls-platform/video-streaming:latest"
    docker push "$registry/hls-platform/notification:latest"
    docker push "$registry/hls-platform/transcoding-worker:latest"
    
    if (Test-Path "./frontend") {
        docker push "$registry/hls-platform/frontend:latest"
    }
    
    Write-Host "Images pushed to registry!" -ForegroundColor Green
}
