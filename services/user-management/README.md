# User Management Service

The User Management Service handles user authentication, authorization, and profile management for the HLS Video Streaming Platform.

## Features

### Authentication
- User registration with email verification
- Login/logout with JWT tokens
- Password reset functionality
- Refresh token mechanism
- Rate limiting on auth endpoints

### Authorization
- Role-based access control (user, creator, moderator, admin)
- JWT middleware for protected routes
- Resource ownership validation
- Permission checks for sensitive operations

### User Management
- Profile management (bio, avatar, contact info)
- Password change functionality
- Account deletion
- User search and filtering (admin)
- User statistics

### Admin Features
- User role management
- Account suspension/activation
- User statistics and analytics
- System-wide user operations

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | User login | No |
| POST | `/logout` | User logout | No |
| POST | `/refresh` | Refresh access token | No |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password with token | No |
| POST | `/verify-email` | Verify email address | No |
| POST | `/resend-verification` | Resend verification email | No |

### User Routes (`/api/users`)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/profile` | Get current user profile | Yes | All |
| PUT | `/profile` | Update current user profile | Yes | All |
| POST | `/avatar` | Upload user avatar | Yes | All |
| DELETE | `/avatar` | Remove user avatar | Yes | All |
| PUT | `/password` | Change password | Yes | All |
| GET | `/:userId` | Get public user profile | No | - |
| GET | `/` | Get users list | Yes | Admin, Moderator |
| PUT | `/:userId/role` | Update user role | Yes | Admin |
| PUT | `/:userId/status` | Update user status | Yes | Admin, Moderator |
| DELETE | `/account` | Delete current user account | Yes | All |
| GET | `/admin/stats` | Get user statistics | Yes | Admin |

## Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Response
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

### Update Profile
```bash
PUT /api/users/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Video content creator",
  "website": "https://johnsmith.com",
  "location": "New York, NY"
}
```

## Validation Rules

### Registration
- **Username**: 3-50 characters, alphanumeric and underscores only
- **Email**: Valid email format
- **Password**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **First/Last Name**: 1-50 characters (optional)

### Profile Update
- **Bio**: Maximum 500 characters
- **Website**: Valid URL format
- **Location**: Maximum 100 characters

## Security Features

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes per IP
- Role-based rate limiting for different user types
- Configurable limits per endpoint

### Password Security
- Bcrypt hashing with salt rounds of 12
- Password strength validation
- Password history prevention (optional)

### Token Management
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Token invalidation on logout
- Automatic token cleanup

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hls_platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Run the health-route test**
   ```bash
   npm test
   ```

## Production Deployment

1. **Build Docker Image**
   ```bash
   docker build -t user-management-service .
   ```

2. **Run Container**
   ```bash
   docker run -p 3001:3001 \
     -e DATABASE_URL=your-db-url \
     -e REDIS_URL=your-redis-url \
     -e JWT_SECRET=your-jwt-secret \
     user-management-service
   ```

## Health Check

The service provides a health check endpoint:

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "user-management",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Logging

The service uses structured logging with different levels:
- **Error**: System errors and exceptions
- **Warn**: Security events and warnings
- **Info**: User actions and audit events
- **Debug**: Detailed operation information

Log files are stored in the `logs/` directory:
- `error-YYYY-MM-DD.log`: Error logs
- `combined-YYYY-MM-DD.log`: All logs
- `exceptions-YYYY-MM-DD.log`: Uncaught exceptions
- `rejections-YYYY-MM-DD.log`: Unhandled promise rejections

## Monitoring

The service exposes metrics for monitoring:
- Request/response times
- Authentication success/failure rates
- User registration metrics
- Error rates

## Error Handling

The service provides consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (duplicate data)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

## Testing

Run the health-route test suite:
```bash
npm test
```

This test checks the service liveness response. Authentication and database-backed flows still require integration testing with PostgreSQL and Redis.

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Follow semantic versioning
