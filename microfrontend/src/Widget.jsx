import { useState, useEffect } from 'react'
import { VERSION, BUILD_TIME } from './buildInfo'

const styles = {
  widget: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '0.85rem',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  },
  label: { color: '#666' },
  value: { fontWeight: 600 },
  time: {
    textAlign: 'center',
    fontSize: '1.4rem',
    fontWeight: 700,
    padding: '16px 0',
    color: '#4f46e5',
  },
  tag: {
    display: 'inline-block',
    fontSize: '0.7rem',
    background: '#eef2ff',
    color: '#4f46e5',
    padding: '2px 8px',
    borderRadius: '10px',
    marginTop: '12px',
  },
}

export default function Widget() {
  const [time, setTime] = useState(new Date())
  const [apiStatus, setApiStatus] = useState('checking...')

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setApiStatus(d.status))
      .catch(() => setApiStatus('offline'))
  }, [])

  return (
    <div style={styles.widget}>
      <div style={styles.time}>{time.toLocaleTimeString()}</div>
      <div style={styles.statRow}>
        <span style={styles.label}>API Status</span>
        <span style={styles.value}>{apiStatus}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.label}>Environment</span>
        <span style={styles.value}>Container</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.label}>Version</span>
        <span style={styles.value}>{VERSION}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.label}>Built</span>
        <span style={styles.value}>{new Date(BUILD_TIME).toLocaleString()}</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span style={styles.tag}>micro-frontend</span>
      </div>
    </div>
  )
}
