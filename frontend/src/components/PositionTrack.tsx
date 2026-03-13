import type { MachineState } from '../types'

interface Props {
  machine: MachineState
  onTravelChange: (t: number) => void
}

export function PositionTrack({ machine, onTravelChange }: Props) {
  const { positionMm, motorState, travelMm } = machine
  const pct = Math.min(100, Math.max(0, (positionMm / travelMm) * 100))
  const isMoving = motorState === 'MOVING' || motorState === 'HOMING'

  return (
    <section className="track-section">
      <div className="track-meta">
        <div className="track-meta-left">
          <span className="pos-label">POSITION</span>
          <span className="pos-value">{positionMm.toFixed(1)}<span className="pos-unit"> mm</span></span>
        </div>
        <div className="track-meta-right">
          <span className="state-pill state-pill--moving" style={{ opacity: isMoving ? 1 : 0.2 }}>
            {motorState === 'HOMING' ? '⌂ HOMING' : '▶ MOVING'}
          </span>
          <label className="travel-label">
            Travel:
            <input
              className="travel-input"
              type="number"
              value={travelMm}
              min={10}
              max={2000}
              onChange={e => onTravelChange(Number(e.target.value))}
            />
            mm
          </label>
        </div>
      </div>

      <div className="track-bar-wrap">
        <span className="track-endpoint">MIN<br/>0</span>
        <div className="track-bar">
          <div className="track-fill" style={{ width: `${pct}%` }} />
          <div
            className={`track-thumb ${isMoving ? 'track-thumb--moving' : ''}`}
            style={{ left: `${pct}%` }}
          />
          <div className="track-label" style={{ left: `${pct}%` }}>
            {positionMm.toFixed(1)}mm
          </div>
        </div>
        <span className="track-endpoint">MAX<br/>{travelMm}</span>
      </div>
    </section>
  )
}
