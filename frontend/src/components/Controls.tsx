import { useState } from 'react'
import { sendCommand } from '../api'
import type { MachineState } from '../types'

interface Props {
  machine: MachineState
  connected: boolean
  onSpeedChange: (s: number) => void
}

export function Controls({ machine, connected, onSpeedChange }: Props) {
  const [moveTarget, setMoveTarget] = useState('')
  const [speedInput, setSpeedInput] = useState(String(machine.speedMmS))

  const   cmd = (c: string) => { if (connected) sendCommand(c) }

  function handleGo() {
    const v = parseFloat(moveTarget)
    if (!isNaN(v)) { cmd(String(v)); setMoveTarget('') }
  }

  function handleSetSpeed() {
    const v = parseFloat(speedInput)
    if (!isNaN(v) && v > 0) { cmd(`v${v}`); onSpeedChange(v) }
  }

  const dis = !connected

  return (
    <section className="controls-section">
      {/* ── MOVE ── */}
      <div className="ctrl-panel">
        <h3 className="ctrl-title">MOVE</h3>

        <div className="nudge-row">
          <button className="btn-nudge" onClick={() => cmd('-')} disabled={dis}>− 0.5mm</button>
          <button className="btn-nudge" onClick={() => cmd('+')} disabled={dis}>+ 0.5mm</button>
        </div>

        <div className="move-row">
          <input
            className="ctrl-input"
            type="number"
            placeholder="distance mm"
            value={moveTarget}
            onChange={e => setMoveTarget(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGo()}
          />
          <button className="btn-primary" onClick={handleGo} disabled={dis || !moveTarget}>GO</button>
          <button className="btn-secondary" onClick={() => cmd('p')} disabled={dis}>PAUSE</button>
        </div>
      </div>

      {/* ── SETTINGS ── */}
      <div className="ctrl-panel">
        <h3 className="ctrl-title">SETTINGS</h3>

        <div className="setting-row">
          <label className="setting-label">Speed</label>
          <input
            className="ctrl-input ctrl-input--sm"
            type="number"
            value={speedInput}
            onChange={e => setSpeedInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetSpeed()}
          />
          <span className="setting-unit">mm/s</span>
          <button className="btn-secondary" onClick={handleSetSpeed} disabled={dis}>SET</button>
        </div>

        <button className="btn-action" onClick={() => cmd('set')} disabled={dis}>
          ◎ SET ZERO
        </button>
      </div>

      {/* ── ACTIONS ── */}
      <div className="ctrl-panel">
        <h3 className="ctrl-title">ACTIONS</h3>
        <div className="action-row">
          <button className="btn-action btn-action--home" onClick={() => cmd('c')} disabled={dis}>
            ⌂ CALIBRATE
          </button>
          <button className="btn-action btn-action--estop" onClick={() => cmd('e')} disabled={dis}>
            ⬡ EMERGENCY
          </button>
        </div>
      </div>
    </section>
  )
}
