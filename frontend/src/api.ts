const BASE = 'http://localhost:8000'

export async function fetchPorts(): Promise<string[]> {
  const res = await fetch(`${BASE}/ports`)
  const data = await res.json()
  return data.ports
}

export async function connectPort(port: string): Promise<{ status: string; detail?: string }> {
  const res = await fetch(`${BASE}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port, baud: 115200 }),
  })
  return res.json()
}

export async function disconnectPort(): Promise<void> {
  await fetch(`${BASE}/disconnect`, { method: 'POST' })
}

export async function sendCommand(command: string): Promise<void> {
  await fetch(`${BASE}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  })
}

export function createWebSocket(onMessage: (data: { type: string; message: string }) => void): WebSocket {
  const ws = new WebSocket('ws://localhost:8000/ws')
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data))
    } catch {}
  }
  return ws
}
