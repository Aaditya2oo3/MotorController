export type MotorState = 'IDLE' | 'MOVING' | 'HOMING' | 'ESTOP' | 'PAUSED'

export interface MachineState {
  positionMm: number
  motorState: MotorState
  speedMmS: number
  travelMm: number
}

export interface LogEntry {
  id: number
  timestamp: string
  message: string
  type: 'info' | 'warn' | 'error' | 'position'
}
