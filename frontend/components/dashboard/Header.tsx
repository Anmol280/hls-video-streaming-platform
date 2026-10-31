'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { 
  Bars3Icon, 
  BellIcon, 
  ChevronDownIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/store/auth-store'
import { User } from '@/types'
import { getInitials, generateColor } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
  user: User
}

export default function Header({ setSidebarOpen, user }: HeaderProps) {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const userNavigation = [
    { name: 'Your Profile', href: '/dashboard/profile' },
    { name: 'Settings', href: '/dashboard/settings' },
    { name: 'Sign out', href: '#', onClick: handleLogout },
  ]

  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <button
        type="button"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>
      
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                {/* Search icon can go here */}
              </div>
              <input
                id="search-field"
                className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Search videos, creators..."
                type="search"
                name="search"
              />
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6">
          {/* Notifications */}
          <button
            type="button"
            className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Profile dropdown */}
          <Menu as="div" className="ml-3 relative">
            <div>
              <Menu.Button className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <span className="sr-only">Open user menu</span>
                {user.avatarUrl ? (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.avatarUrl}
                    alt={user.username}
                  />
                ) : (
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${generateColor(user.username)}`}>
                    {getInitials(user.firstName, user.lastName, user.username)}
                  </div>
                )}
                <div className="ml-3 hidden md:block">
                  <div className="text-sm font-medium text-gray-700">
                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                </div>
                <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                {userNavigation.map((item) => (
                  <Menu.Item key={item.name}>
                    {({ active }) => (
                      item.onClick ? (
                        <button
                          onClick={item.onClick}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          {item.name}
                        </button>
                      ) : (
                        <a
                          href={item.href}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } block px-4 py-2 text-sm text-gray-700`}
                        >
                          {item.name}
                        </a>
                      )
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  )
}
