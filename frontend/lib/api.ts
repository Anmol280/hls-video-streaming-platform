import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  UpdateProfileRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ApiResponse,
  PaginatedResponse,
  DashboardStats,
  CreatorStats
} from '@/types'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = Cookies.get('refresh_token')
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken)
              const { accessToken } = response.tokens
              
              Cookies.set('access_token', accessToken, { expires: 1 })
              originalRequest.headers.Authorization = `Bearer ${accessToken}`
              
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            Cookies.remove('access_token')
            Cookies.remove('refresh_token')
            window.location.href = '/auth/login'
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request({
        method,
        url,
        data,
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || error.response.data.message)
      }
      throw new Error(error.message || 'An unexpected error occurred')
    }
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/api/auth/login', data)
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/api/auth/register', data)
  }

  async logout(): Promise<void> {
    return this.request<void>('POST', '/api/auth/logout')
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/api/auth/refresh', { refreshToken })
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/auth/forgot-password', data)
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/auth/reset-password', data)
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/auth/verify-email', { token })
  }

  async resendVerification(email: string): Promise<ApiResponse> {
    return this.request<ApiResponse>('POST', '/api/auth/resend-verification', { email })
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    return this.request<User>('GET', '/api/users/profile')
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    return this.request<User>('PUT', '/api/users/profile', data)
  }

  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    return this.request<ApiResponse>('PUT', '/api/users/password', data)
  }

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    try {
      const response = await this.client.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || error.response.data.message)
      }
      throw new Error(error.message || 'Avatar upload failed')
    }
  }

  async removeAvatar(): Promise<User> {
    return this.request<User>('DELETE', '/api/users/avatar')
  }

  async getPublicProfile(userId: string): Promise<User> {
    return this.request<User>('GET', `/api/users/${userId}`)
  }

  async deleteAccount(): Promise<ApiResponse> {
    return this.request<ApiResponse>('DELETE', '/api/users/account')
  }

  // Admin endpoints
  async getUsers(page = 1, limit = 10, search?: string): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    })
    return this.request<PaginatedResponse<User>>('GET', `/api/users?${params}`)
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    return this.request<User>('PUT', `/api/users/${userId}/role`, { role })
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    return this.request<User>('PUT', `/api/users/${userId}/status`, { isActive })
  }

  async getUserStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('GET', '/api/users/admin/stats')
  }

  // Creator endpoints
  async getCreatorStats(): Promise<CreatorStats> {
    return this.request<CreatorStats>('GET', '/api/creator/stats')
  }
}

// Create a singleton instance
const apiClient = new ApiClient()

// Export services
export const authService = {
  login: apiClient.login.bind(apiClient),
  register: apiClient.register.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  refreshToken: apiClient.refreshToken.bind(apiClient),
  forgotPassword: apiClient.forgotPassword.bind(apiClient),
  resetPassword: apiClient.resetPassword.bind(apiClient),
  verifyEmail: apiClient.verifyEmail.bind(apiClient),
  resendVerification: apiClient.resendVerification.bind(apiClient),
  getCurrentUser: apiClient.getCurrentUser.bind(apiClient),
}

export const userService = {
  updateProfile: apiClient.updateProfile.bind(apiClient),
  changePassword: apiClient.changePassword.bind(apiClient),
  uploadAvatar: apiClient.uploadAvatar.bind(apiClient),
  removeAvatar: apiClient.removeAvatar.bind(apiClient),
  getPublicProfile: apiClient.getPublicProfile.bind(apiClient),
  deleteAccount: apiClient.deleteAccount.bind(apiClient),
}

export const adminService = {
  getUsers: apiClient.getUsers.bind(apiClient),
  updateUserRole: apiClient.updateUserRole.bind(apiClient),
  updateUserStatus: apiClient.updateUserStatus.bind(apiClient),
  getUserStats: apiClient.getUserStats.bind(apiClient),
}

export const creatorService = {
  getCreatorStats: apiClient.getCreatorStats.bind(apiClient),
}

export default apiClient
