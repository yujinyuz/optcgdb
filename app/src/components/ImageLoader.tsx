import { useState } from 'react'

interface ImageLoaderProps {
  src: string
  alt: string
  className?: string
  onClick?: () => void
}

export default function ImageLoader({ src, alt, className = '', onClick }: ImageLoaderProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (error) return null

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-[#1a1d2e]">
          <img
            src="/opcg-favicon.png"
            alt=""
            className="w-6 h-6 opacity-40 animate-pulse"
          />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        onClick={onClick}
      />
    </div>
  )
}
