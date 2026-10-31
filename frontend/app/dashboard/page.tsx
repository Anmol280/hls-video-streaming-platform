'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/store/auth-store'
import { CreatorStats, DashboardStats } from '@/types'
import { creatorService, adminService } from '@/lib/api'
import {
  VideoCameraIcon as VideoIcon,
  EyeIcon,
  HeartIcon,
  UsersIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { formatNumber, formatRelativeTime } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user } = useAuth()
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null)
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'creator' || user?.role === 'admin' || user?.role === 'moderator') {
          const stats = await creatorService.getCreatorStats()
          setCreatorStats(stats)
        }
        
        if (user?.role === 'admin' || user?.role === 'moderator') {
          const stats = await adminService.getUserStats()
          setAdminStats(stats)
        }
      } catch (error: any) {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const isCreator = user?.role === 'creator' || user?.role === 'admin' || user?.role === 'moderator'
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator'

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.firstName || user?.username}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here&apos;s what&apos;s happening with your content today.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`badge ${
              user?.role === 'admin' ? 'badge-danger' :
              user?.role === 'moderator' ? 'badge-warning' :
              user?.role === 'creator' ? 'badge-primary' : 'badge-success'
            }`}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
            </span>
            {user?.isVerified && (
              <span className="badge badge-success">Verified</span>
            )}
          </div>
        </div>
      </div>

      {/* Creator Stats */}
      {isCreator && creatorStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <VideoIcon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Videos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatNumber(creatorStats.totalVideos)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Views
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatNumber(creatorStats.totalViews)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <HeartIcon className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Likes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatNumber(creatorStats.totalLikes)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Subscribers
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatNumber(creatorStats.totalSubscribers)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today&apos;s Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Views Today</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatNumber(creatorStats.viewsToday)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Videos This Month</span>
                  <span className="text-sm font-medium text-gray-900">
                    {creatorStats.videosThisMonth}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Videos</h3>
              <div className="space-y-3">
                {creatorStats.topVideos.slice(0, 3).map((video, index) => (
                  <div key={video.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {video.title}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <EyeIcon className="h-3 w-3 mr-1" />
                        {formatNumber(video.views)}
                        <HeartIcon className="h-3 w-3 ml-2 mr-1" />
                        {formatNumber(video.likes)}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {creatorStats.recentActivity.slice(0, 4).map((activity, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        activity.type === 'upload' ? 'bg-blue-500' :
                        activity.type === 'like' ? 'bg-red-500' :
                        activity.type === 'comment' ? 'bg-green-500' :
                        'bg-purple-500'
                      }`}></div>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Admin Stats */}
      {isAdmin && adminStats && (
        <>
          <div className="border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Platform Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Users
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatNumber(adminStats.totalUsers)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <VideoIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Videos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatNumber(adminStats.totalVideos)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <EyeIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Views
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatNumber(adminStats.totalViews)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUpIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Storage Used
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {(adminStats.totalStorage / (1024 * 1024 * 1024)).toFixed(1)} GB
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Users</h3>
              <div className="space-y-3">
                {adminStats.recentUsers.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {user.avatarUrl ? (
                          <img className="h-8 w-8 rounded-full" src={user.avatarUrl} alt="" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {user.username[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatRelativeTime(user.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Videos</h3>
              <div className="space-y-3">
                {adminStats.recentVideos.slice(0, 5).map((video) => (
                  <div key={video.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {video.title}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <EyeIcon className="h-3 w-3 mr-1" />
                        {formatNumber(video.views)}
                        <span className="ml-2">by {video.user?.username}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatRelativeTime(video.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Regular User Dashboard */}
      {!isCreator && (
        <div className="text-center py-12">
          <VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No content yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading your first video or explore content from other creators.
          </p>
          <div className="mt-6">
            <button
              type="button"
              className="btn-primary"
            >
              <VideoIcon className="-ml-1 mr-2 h-5 w-5" />
              Explore Videos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
