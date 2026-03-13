import { useState } from 'react'
import { Controls } from './components/Controls'
import { Header } from './components/Header'
import { PositionTrack } from './components/PositionTrack'
import { SerialLog } from './components/SerialLog'
import { useSerial } from './hooks/useSerial'
import './styles.css'

export default function App() {
  const [connected, setConnected] = useState(false)
  const { machine, logs, updateSpeed, updateTravel } = useSerial(connected)
  const [logList, setLogList] = useState(logs)

  // sync logs from hook
  const allLogs = logs

  return (
    <div className="app">
      <Header
        connected={connected}
        motorState={machine.motorState}
        onConnectionChange={setConnected}
      />
      <main className="main">
        <PositionTrack machine={machine} onTravelChange={updateTravel} />
        <Controls machine={machine} connected={connected} onSpeedChange={updateSpeed} />
        <SerialLog logs={allLogs} onClear={() => {}} />
      </main>
    </div>
  )
}
