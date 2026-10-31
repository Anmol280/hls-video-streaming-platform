export interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  bio?: string
  avatarUrl?: string
  website?: string
  location?: string
  role: 'user' | 'creator' | 'moderator' | 'admin'
  isVerified: boolean
  isActive: boolean
  subscriberCount?: number
  videoCount?: number
  totalViews?: number
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface AuthResponse {
  message: string
  user: User
  tokens: AuthTokens
}

export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  details?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface UpdateProfileRequest {
  firstName?: string
  lastName?: string
  bio?: string
  website?: string
  location?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface Video {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  duration?: number
  views: number
  likes: number
  dislikes: number
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  visibility: 'public' | 'private' | 'unlisted'
  userId: string
  user?: User
  createdAt: string
  updatedAt: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface DashboardStats {
  totalUsers: number
  totalVideos: number
  totalViews: number
  totalStorage: number
  recentUsers: User[]
  recentVideos: Video[]
  userGrowth: Array<{
    date: string
    count: number
  }>
  videoGrowth: Array<{
    date: string
    count: number
  }>
}

export interface CreatorStats {
  totalVideos: number
  totalViews: number
  totalLikes: number
  totalSubscribers: number
  totalRevenue: number
  viewsToday: number
  videosThisMonth: number
  subscribersGrowth: Array<{
    date: string
    count: number
  }>
  topVideos: Array<{
    id: string
    title: string
    views: number
    likes: number
  }>
  recentActivity: Array<{
    type: 'upload' | 'like' | 'comment' | 'subscribe'
    message: string
    timestamp: string
  }>
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface FormErrors {
  [key: string]: string | undefined
}
