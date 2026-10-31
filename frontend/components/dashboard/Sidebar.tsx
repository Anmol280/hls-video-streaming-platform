'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  HomeIcon, 
  FilmIcon, 
  ChartBarIcon, 
  CogIcon,
  UsersIcon,
  FolderIcon,
  DocumentTextIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  userRole: string
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['user', 'creator', 'moderator', 'admin'] },
  { name: 'My Videos', href: '/dashboard/videos', icon: FilmIcon, roles: ['creator', 'moderator', 'admin'] },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon, roles: ['creator', 'moderator', 'admin'] },
  { name: 'Content Library', href: '/dashboard/library', icon: FolderIcon, roles: ['creator', 'moderator', 'admin'] },
  { name: 'Notifications', href: '/dashboard/notifications', icon: BellIcon, roles: ['user', 'creator', 'moderator', 'admin'] },
]

const adminNavigation = [
  { name: 'User Management', href: '/dashboard/admin/users', icon: UsersIcon, roles: ['admin', 'moderator'] },
  { name: 'Content Moderation', href: '/dashboard/admin/content', icon: DocumentTextIcon, roles: ['admin', 'moderator'] },
  { name: 'System Settings', href: '/dashboard/admin/settings', icon: CogIcon, roles: ['admin'] },
]

function SidebarContent({ pathname, userRole }: { pathname: string; userRole: string }) {
  const filteredNavigation = navigation.filter(item => item.roles.includes(userRole))
  const filteredAdminNavigation = adminNavigation.filter(item => item.roles.includes(userRole))

  return (
    <div className="flex flex-col h-0 flex-1">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary-600">
        <h1 className="text-xl font-bold text-white">HLS Stream</h1>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-primary-500' : 'text-gray-500 group-hover:text-gray-900'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
          
          {filteredAdminNavigation.length > 0 && (
            <>
              <div className="pt-6">
                <div className="px-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
                <div className="mt-2 space-y-1">
                  {filteredAdminNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                          isActive
                            ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        <item.icon
                          className={cn(
                            'mr-3 h-5 w-5 flex-shrink-0',
                            isActive ? 'text-primary-500' : 'text-gray-500 group-hover:text-gray-900'
                          )}
                        />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </>
          )}
          
          <div className="pt-6">
            <div className="px-2">
              <Link
                href="/dashboard/settings"
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === '/dashboard/settings'
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <CogIcon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    pathname === '/dashboard/settings' ? 'text-primary-500' : 'text-gray-500 group-hover:text-gray-900'
                  )}
                />
                Settings
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, userRole }: SidebarProps) {
  const pathname = usePathname()



  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent pathname={pathname} userRole={userRole} />
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14">{/* Force sidebar to shrink to fit close icon */}</div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <SidebarContent pathname={pathname} userRole={userRole} />
        </div>
      </div>
    </>
  )
}
