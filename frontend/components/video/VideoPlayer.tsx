'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import Cookies from 'js-cookie'

type VideoPlayerProps = {
  videoId: string
}

export default function VideoPlayer({ videoId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const streamingBase = (process.env.NEXT_PUBLIC_STREAMING_URL || 'http://localhost:3005')
      .replace(/\/$/, '')
    const playlistUrl = streamingBase + '/api/stream/hls/' +
      encodeURIComponent(videoId) + '/playlist.m3u8'
    const token = Cookies.get('access_token')

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playlistUrl
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    if (!Hls.isSupported()) {
      // Let the browser report its unsupported HLS source through onError.
      video.src = playlistUrl
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    const hls = new Hls({
      xhrSetup(xhr) {
        xhr.withCredentials = true
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token)
      }
    })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) setError('Video playback failed. Check the video status and try again.')
    })
    hls.loadSource(playlistUrl)
    hls.attachMedia(video)

    return () => hls.destroy()
  }, [videoId])

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        className="aspect-video w-full rounded-xl bg-black"
        controls
        playsInline
        preload="metadata"
        crossOrigin="use-credentials"
        onError={() => setError('Video could not be loaded. It may still be processing or access may be denied.')}
        aria-label="HLS video player"
      />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
