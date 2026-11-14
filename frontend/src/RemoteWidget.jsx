import { useEffect, useRef, useState } from 'react'

export default function RemoteWidget({ src }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const script = document.createElement('script')
    script.src = src
    script.async = true

    script.onload = () => {
      if (!mounted) return
      if (window.MicroFrontendWidget && containerRef.current) {
        window.MicroFrontendWidget.mount(containerRef.current)
      } else {
        setError('Widget loaded but mount function not found')
      }
    }

    script.onerror = () => {
      if (mounted) setError('Failed to load remote widget')
    }

    document.head.appendChild(script)

    return () => {
      mounted = false
      if (window.MicroFrontendWidget?.unmount && containerRef.current) {
        window.MicroFrontendWidget.unmount(containerRef.current)
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [src])

  if (error) return <div className="widget-error">{error}</div>

  return <div ref={containerRef} />
}
