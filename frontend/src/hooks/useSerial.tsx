import { useCallback, useEffect, useRef, useState } from 'react'
import { createWebSocket } from '../api'
import type { LogEntry, MachineState, MotorState } from '../types'

let logId = 0

function classifyMessage(msg: string): LogEntry['type'] {
  if (msg.includes('!!!')) return 'error'
  if (msg.includes('WARNING') || msg.includes('ERROR')) return 'warn'
  if (msg.startsWith('Pos:') || msg.includes('Arrived at')) return 'position'
  return 'info'
}

function parsePosition(msg: string): number | null {
  const arrived = msg.match(/Arrived at:\s*([\d.]+)\s*mm/)
  if (arrived) return parseFloat(arrived[1])
  const pos = msg.match(/^Pos:\s*([\d.]+)\s*mm/)
  if (pos) return parseFloat(pos[1])
  return null
}

function parseMotorState(msg: string): MotorState | null {
  if (msg.includes('EMERGENCY')) return 'ESTOP'
  if (msg.includes('HOMING') || msg.includes('Backing off') || msg.includes('CALIBRAT')) return 'HOMING'
  if (msg.includes('PAUSED')) return 'PAUSED'
  if (msg.startsWith('Pos:')) return 'MOVING'
  if (msg.includes('Arrived at') || msg.includes('Ready.') || msg.includes('ZERO SET') || msg.includes('Button Released')) return 'IDLE'
  return null
}

export function useSerial(connected: boolean) {
  const [machine, setMachine] = useState<MachineState>({
    positionMm: 0,
    motorState: 'IDLE',
    speedMmS: 5,
    travelMm: 200,
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const pushLog = useCallback((msg: string) => {
    const now = new Date()
    const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`
    const entry: LogEntry = { id: logId++, timestamp: ts, message: msg, type: classifyMessage(msg) }
    setLogs(prev => [...prev.slice(-199), entry])

    const pos = parsePosition(msg)
    if (pos !== null) setMachine(m => ({ ...m, positionMm: pos }))

    const state = parseMotorState(msg)
    if (state) setMachine(m => ({ ...m, motorState: state }))
  }, [])

  useEffect(() => {
    if (!connected) { wsRef.current?.close(); return }
    const ws = createWebSocket(({ message }) => pushLog(message))
    wsRef.current = ws
    return () => ws.close()
  }, [connected, pushLog])

  const updateSpeed = useCallback((s: number) => setMachine(m => ({ ...m, speedMmS: s })), [])
  const updateTravel = useCallback((t: number) => setMachine(m => ({ ...m, travelMm: t })), [])

  return { machine, logs, updateSpeed, updateTravel }
}
