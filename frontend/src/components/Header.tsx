import { useEffect, useState } from 'react'
import { connectPort, disconnectPort, fetchPorts } from '../api'
import type { MotorState } from '../types'

interface Props {
  connected: boolean
  motorState: MotorState
  onConnectionChange: (c: boolean) => void
}

export function Header({ connected, motorState, onConnectionChange }: Props) {
  const [ports, setPorts] = useState<string[]>([])
  const [selectedPort, setSelectedPort] = useState('')
  const [loading, setLoading] = useState(false)

  const isEStop = motorState === 'ESTOP'

  useEffect(() => {
    fetchPorts().then(p => { setPorts(p); if (p.length) setSelectedPort(p[0]) }).catch(() => {})
  }, [])

  async function handleRefresh() {
    const p = await fetchPorts().catch(() => [])
    setPorts(p)
    if (p.length) setSelectedPort(p[0])
  }

  async function handleToggle() {
    setLoading(true)
    if (connected) {
      await disconnectPort()
      onConnectionChange(false)
    } else {
      const res = await connectPort(selectedPort)
      onConnectionChange(res.status === 'connected')
    }
    setLoading(false)
  }

  return (
    <header className="header">
      <div className="header-left" style={{ flex: '0 0 auto' }}>
        <div className="brand">
          <img src="/logowhite.png" alt="Logo" className="logo" />
          <span className="brand-name">Motor<span className="brand-sub">CTL</span></span>
        </div>
      </div>

      <div className="header-center">
        <select
          className="port-select"
          value={selectedPort}
          onChange={e => setSelectedPort(e.target.value)}
          disabled={connected}
        >
          {ports.length === 0 && <option value="">— no ports —</option>}
          {ports.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn-icon" onClick={handleRefresh} title="Refresh ports" disabled={connected}>⟳</button>
        <button
          className={`btn-connect ${connected ? 'btn-connect--on' : ''}`}
          onClick={handleToggle}
          disabled={loading || (!selectedPort && !connected)}
        >
          <span className={`dot ${connected ? 'dot--green' : 'dot--red'}`} />
          {loading ? '...' : connected ? 'DISCONNECT' : 'CONNECT'}
        </button>
      </div>

      <div className="header-right">
        <div className={`estop-badge ${isEStop ? 'estop-badge--active' : ''}`}>
          <span className={`dot ${isEStop ? 'dot--red dot--pulse' : 'dot--dim'}`} />
          E-STOP
        </div>
        <div className={`state-badge state-badge--${motorState.toLowerCase()}`}>
          {motorState}
        </div>
      </div>
    </header>
  )
}
