import { useEffect, useRef } from 'react'
import type { LogEntry } from '../types'

interface Props {
  logs: LogEntry[]
  onClear: () => void
}

export function SerialLog({ logs, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <section className="log-section">
      <div className="log-header">
        <span className="ctrl-title">SERIAL LOG</span>
        <span className="log-count">{logs.length} lines</span>
        <button className="btn-icon" onClick={onClear} title="Clear log">✕</button>
      </div>
      <div className="log-body">
        {logs.map(entry => (
          <div key={entry.id} className={`log-line log-line--${entry.type}`}>
            <span className="log-ts">{entry.timestamp}</span>
            <span className="log-msg">{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  )
}
