import Link from 'next/link'
import VideoPlayer from '@/components/video/VideoPlayer'

export default async function WatchPage({
  params,
}: {
  params: Promise<{ videoId: string }>
}) {
  const { videoId } = await params

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/dashboard" className="text-sm text-slate-300 hover:text-white">
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Watch video</h1>
        <VideoPlayer videoId={videoId} />
        <p className="text-sm text-slate-400">Video ID: {videoId}</p>
      </div>
    </main>
  )
}
