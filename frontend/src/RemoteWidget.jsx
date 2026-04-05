import { useEffect, useRef, useState } from 'react'

export default function RemoteWidget({ src }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = src
    script.async = true

    script.onload = () => {
      if (window.MicroFrontendWidget && containerRef.current) {
        window.MicroFrontendWidget.mount(containerRef.current)
      } else {
        setError('Widget loaded but mount function not found')
      }
    }

    script.onerror = () => setError('Failed to load remote widget')

    document.head.appendChild(script)

    return () => {
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
