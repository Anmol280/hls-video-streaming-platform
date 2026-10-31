# HLS Video Streaming Platform - Project Structure

This document outlines the complete file structure of the HLS Video Streaming Platform.

## Root Directory Structure

```
hls/
├── README.md                           # Main project documentation
├── package.json                       # Root package.json for workspace
├── docker-compose.dev.yml             # Documented local core-service stack
├── docker-compose.yml                 # Legacy stack; not the verified local setup
├── .env.example                       # Environment variables template
├── .gitignore                         # Git ignore rules
├── contex.md                          # Architecture context document
│
├── services/                          # Microservices
│   ├── user-management/               # User authentication service
│   │   ├── src/
│   │   │   ├── index.js              # Main application entry
│   │   │   ├── routes/               # API routes
│   │   │   ├── middleware/           # Express middleware
│   │   │   ├── models/               # Data models
│   │   │   ├── controllers/          # Route controllers
│   │   │   ├── services/             # Business logic
│   │   │   └── utils/                # Utility functions
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── video-upload/                  # Video upload service
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── video-metadata/                # Video metadata service
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── models/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── transcoding-orchestration/     # Transcoding job orchestration
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── orchestrator.js
│   │   │   ├── jobManager.js
│   │   │   └── utils/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── video-streaming/               # HLS streaming service
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   └── notification/                  # Real-time notification service
│       ├── src/
│       │   ├── index.js
│       │   ├── websocket.js
│       │   ├── handlers/
│       │   └── utils/
│       ├── package.json
│       ├── Dockerfile
│       └── README.md
│
├── workers/                           # Background workers
│   └── transcoding-worker/            # Video transcoding worker
│       ├── src/
│       │   ├── worker.js             # Main worker process ✓
│       │   ├── transcoder.js         # FFmpeg transcoding logic
│       │   ├── utils/                # Worker utilities
│       │   │   └── logger.js         # Logging utility
│       │   └── healthcheck.js        # Health check endpoint
│       ├── package.json              # Worker dependencies ✓
│       ├── Dockerfile                # Worker container config ✓
│       └── README.md
│
├── infrastructure/                    # Infrastructure as Code
│   ├── kubernetes/                    # Kubernetes manifests
│   │   ├── services.yaml             # Service deployments ✓
│   │   ├── transcoding-worker.yaml   # Transcoding worker deployment ✓
│   │   ├── databases.yaml            # Database deployments ✓
│   │   ├── config.yaml               # ConfigMaps and Secrets ✓
│   │   ├── ingress.yaml              # Ingress configuration
│   │   ├── monitoring.yaml           # Monitoring stack
│   │   └── namespace.yaml            # Namespace configuration
│   │
│   └── terraform/                     # Terraform configurations
│       ├── main.tf                   # Main Terraform config
│       ├── variables.tf              # Variable definitions
│       ├── outputs.tf                # Output definitions
│       ├── providers.tf              # Provider configurations
│       ├── vpc.tf                    # VPC configuration
│       ├── eks.tf                    # EKS cluster configuration
│       ├── rds.tf                    # RDS database configuration
│       ├── s3.tf                     # S3 bucket configuration
│       └── cloudfront.tf             # CloudFront CDN configuration
│
├── database/                          # Database related files
│   ├── init.sql                      # Database initialization ✓
│   ├── migrations/                   # Database migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_analytics.sql
│   │   ├── 003_add_playlists.sql
│   │   └── 004_add_indexes.sql
│   ├── seeds/                        # Database seed data
│   │   ├── users.sql
│   │   ├── videos.sql
│   │   └── playlists.sql
│   └── README.md
│
├── shared/                           # Shared libraries and utilities
│   ├── libs/                        # Common libraries
│   │   ├── logger.js                # Centralized logging ✓
│   │   ├── database.js              # Database connection helper ✓
│   │   ├── redis.js                 # Redis connection helper ✓
│   │   ├── auth.js                  # Authentication utilities
│   │   ├── validation.js            # Input validation schemas
│   │   ├── errors.js                # Custom error classes
│   │   ├── metrics.js               # Metrics collection
│   │   └── s3.js                    # S3 utilities
│   │
│   ├── configs/                     # Shared configurations
│   │   ├── database.js              # Database configuration
│   │   ├── redis.js                 # Redis configuration
│   │   ├── aws.js                   # AWS configuration
│   │   └── monitoring.js            # Monitoring configuration
│   │
│   └── types/                       # TypeScript type definitions
│       ├── user.ts
│       ├── video.ts
│       ├── job.ts
│       └── analytics.ts
│
├── frontend/                         # Web frontend application
│   ├── public/                      # Static assets
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   │
│   ├── src/                         # Frontend source code
│   │   ├── components/              # React components
│   │   │   ├── VideoPlayer/
│   │   │   ├── VideoUpload/
│   │   │   ├── VideoList/
│   │   │   ├── UserAuth/
│   │   │   └── Navigation/
│   │   │
│   │   ├── pages/                   # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Watch.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Admin.jsx
│   │   │
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── services/                # API service functions
│   │   ├── utils/                   # Frontend utilities
│   │   ├── styles/                  # CSS/SCSS files
│   │   ├── App.jsx                  # Main App component
│   │   └── index.js                 # Entry point
│   │
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
│
├── monitoring/                       # Monitoring and observability
│   ├── prometheus.yml               # Prometheus configuration ✓
│   ├── grafana/                     # Grafana configurations
│   │   ├── dashboards/              # Grafana dashboards
│   │   │   ├── dashboard.yml        # Dashboard provider ✓
│   │   │   ├── platform-overview.json
│   │   │   ├── transcoding-metrics.json
│   │   │   ├── video-analytics.json
│   │   │   └── infrastructure.json
│   │   │
│   │   └── datasources/             # Data source configurations
│   │       ├── prometheus.yml
│   │       └── loki.yml
│   │
│   ├── alerts/                      # Alert rules
│   │   ├── platform.yml
│   │   ├── transcoding.yml
│   │   └── infrastructure.yml
│   │
│   └── exporters/                   # Custom metric exporters
│       ├── video-metrics/
│       └── job-metrics/
│
├── scripts/                         # Utility scripts
│   ├── migrate.js                   # Database migration script ✓
│   ├── seed.js                      # Database seeding script ✓
│   ├── build-images.sh              # Docker image build script ✓
│   ├── build-images.ps1             # PowerShell build script ✓
│   ├── deploy.sh                    # Deployment script
│   ├── setup-dev.sh                 # Development environment setup
│   ├── backup-db.sh                 # Database backup script
│   ├── restore-db.sh                # Database restore script
│   └── cleanup.sh                   # Environment cleanup script
│
├── docs/                            # Documentation
│   ├── API.md                       # API documentation
│   ├── DEPLOYMENT.md                # Deployment guide
│   ├── DEVELOPMENT.md               # Development guide
│   ├── ARCHITECTURE.md              # Architecture documentation
│   ├── SECURITY.md                  # Security guidelines
│   ├── MONITORING.md                # Monitoring setup guide
│   ├── TROUBLESHOOTING.md           # Common issues and solutions
│   └── CONTRIBUTING.md              # Contribution guidelines
│
├── tests/                           # Test files
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   ├── e2e/                         # End-to-end tests
│   ├── load/                        # Load testing scripts
│   └── fixtures/                    # Test data fixtures
│
├── logs/                            # Log files (gitignored)
├── temp/                            # Temporary files (gitignored)
└── .github/                         # GitHub workflows
    └── workflows/
        ├── ci.yml                   # Continuous Integration
        ├── cd.yml                   # Continuous Deployment
        ├── security.yml             # Security scanning
        └── quality.yml              # Code quality checks
```

## Key Features Implemented

### ✅ Completed Components

1. **Database Schema** (`database/init.sql`)
   - Complete PostgreSQL schema with all tables
   - Proper relationships and constraints
   - Indexes for performance
   - Triggers for timestamp updates

2. **Transcoding Worker** (`workers/transcoding-worker/`)
   - Complete FFmpeg-based transcoding
   - HLS playlist generation
   - Multi-resolution support
   - S3 integration
   - Thumbnail generation
   - Health checks

3. **Docker Configuration**
   - Docker Compose setup
   - Individual Dockerfiles for services
   - Multi-stage builds
   - Security best practices

4. **Kubernetes Manifests**
   - Service deployments
   - Auto-scaling configurations
   - ConfigMaps and Secrets
   - Database deployments
   - Worker scaling policies

5. **Shared Libraries**
   - Centralized logging
   - Database connection pooling
   - Redis client wrapper
   - Error handling utilities

6. **Build and Deployment Scripts**
   - Docker image building
   - Database migration
   - Environment setup
   - Cross-platform support

7. **Monitoring Setup**
   - Prometheus configuration
   - Grafana dashboard structure
   - Health check endpoints

### 🔄 Next Steps for Implementation

1. **Complete Service Implementation**
   - Implement all microservice APIs
   - Add authentication middleware
   - Implement business logic

2. **Frontend Development**
   - React-based video streaming interface
   - HLS video player integration
   - Upload interface
   - User management

3. **Advanced Features**
   - Live streaming support
   - Advanced analytics
   - Content moderation
   - DRM integration

4. **Production Readiness**
   - Security hardening
   - Performance optimization
   - Comprehensive testing
   - CI/CD pipeline setup

## Environment Variables

Copy `.env.example` to `.env` and configure:

- Database connections
- AWS credentials
- Redis configuration
- JWT secrets
- Storage settings

## Quick Start

1. **Development Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   docker compose -f docker-compose.dev.yml up --build -d
   npm run db:migrate
   ```
   Demo records are optional. To seed them, set `SEED_DEMO_DATA=true` and a local-only `SEED_DEMO_PASSWORD` in `.env`, then run `npm run db:seed`.

2. **Production Deployment**:
   ```bash
   # Build and push Docker images
   ./scripts/build-images.sh push your-registry.com
   
   # Deploy to Kubernetes
   kubectl apply -f infrastructure/kubernetes/
   ```

This structure provides a complete foundation for a scalable HLS video streaming platform with room for future enhancements and optimizations.
