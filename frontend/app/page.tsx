import Link from 'next/link'
import { ArrowRightIcon, PlayIcon, UsersIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-morphism">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold gradient-text">HLS Stream</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="btn-ghost">
                Sign In
              </Link>
              <Link href="/auth/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-8">
              Professional Video
              <span className="gradient-text block">Streaming Platform</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Upload, manage, and stream your videos with our cutting-edge HLS technology. 
              Built for creators, optimized for performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="btn-primary text-lg px-8 py-4">
                Start Creating
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <button className="btn-secondary text-lg px-8 py-4">
                <PlayIcon className="mr-2 h-5 w-5" />
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-gray-600">
              Powerful tools designed for modern content creators
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-8 text-center hover-glow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <CloudArrowUpIcon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Easy Upload</h3>
              <p className="text-gray-600">
                Drag and drop your videos for instant upload. Our system automatically 
                processes and optimizes your content for streaming.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8 text-center hover-glow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <PlayIcon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">HLS Streaming</h3>
              <p className="text-gray-600">
                Advanced HLS technology ensures smooth playback across all devices 
                with adaptive bitrate streaming.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8 text-center hover-glow">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <UsersIcon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Creator Dashboard</h3>
              <p className="text-gray-600">
                Comprehensive analytics and management tools to track your content 
                performance and audience engagement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">10K+</div>
              <div className="text-gray-600">Active Creators</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">1M+</div>
              <div className="text-gray-600">Videos Streamed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">50M+</div>
              <div className="text-gray-600">Total Views</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to start streaming?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of creators who trust our platform
          </p>
          <Link href="/auth/register" className="btn-secondary text-lg px-8 py-4 bg-white text-primary-600 hover:bg-gray-50">
            Create Your Account
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">HLS Stream</h3>
              <p className="text-gray-400">
                Professional video streaming platform for modern creators.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Features</Link></li>
                <li><Link href="#" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 HLS Stream. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
