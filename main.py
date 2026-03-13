import asyncio
import queue
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import serial
import serial.tools.list_ports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ─────────────────────────────────────────────
# Global serial state
# ─────────────────────────────────────────────
ser: serial.Serial | None = None
serial_read_lock  = threading.Lock()   # only for reading
serial_write_lock = threading.Lock()   # only for writing
write_queue: queue.Queue = queue.Queue()

connected_websockets: list[WebSocket] = []
ws_lock = asyncio.Lock()
broadcast_loop: asyncio.AbstractEventLoop | None = None


# ─────────────────────────────────────────────
# Lifespan: start background threads
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global broadcast_loop
    broadcast_loop = asyncio.get_event_loop()

    threading.Thread(target=serial_reader_thread, daemon=True).start()
    threading.Thread(target=serial_writer_thread, daemon=True).start()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Reader thread — never blocks writer
# ─────────────────────────────────────────────
def serial_reader_thread():
    while True:
        with serial_read_lock:
            active = ser and ser.is_open
        if active:
            try:
                with serial_read_lock:
                    # Only read if bytes are waiting — never blocks
                    if ser.in_waiting > 0:
                        line = ser.readline()
                    else:
                        line = None
                if line:
                    text = line.decode("utf-8", errors="replace").strip()
                    if text:
                        asyncio.run_coroutine_threadsafe(
                            broadcast({"type": "log", "message": text}),
                            broadcast_loop,
                        )
                else:
                    time.sleep(0.005)  # 5ms idle sleep — tight but not spinning
            except Exception:
                time.sleep(0.01)
        else:
            time.sleep(0.05)


# ─────────────────────────────────────────────
# Writer thread — drains queue immediately
# ─────────────────────────────────────────────
def serial_writer_thread():
    while True:
        try:
            # Block until a command arrives (no CPU spin)
            command = write_queue.get(timeout=0.1)
            with serial_write_lock:
                if ser and ser.is_open:
                    ser.write((command + "\n").encode("utf-8"))
                    ser.flush()   # push bytes out immediately
        except queue.Empty:
            pass
        except Exception:
            pass


# ─────────────────────────────────────────────
# WebSocket broadcaster
# ─────────────────────────────────────────────
async def broadcast(payload: dict):
    async with ws_lock:
        dead = []
        for ws in connected_websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            connected_websockets.remove(ws)


# ─────────────────────────────────────────────
# REST endpoints
# ─────────────────────────────────────────────
@app.get("/ports")
def list_ports():
    ports = serial.tools.list_ports.comports()
    return {"ports": [p.device for p in ports]}


class ConnectRequest(BaseModel):
    port: str
    baud: int = 115200


@app.post("/connect")
def connect_serial(req: ConnectRequest):
    global ser
    with serial_read_lock:
        with serial_write_lock:
            if ser and ser.is_open:
                ser.close()
            try:
                ser = serial.Serial(
                    req.port,
                    req.baud,
                    timeout=0.05,        # 50ms max — never blocks long
                    write_timeout=0.05,
                )
                return {"status": "connected", "port": req.port}
            except Exception as e:
                ser = None
                return {"status": "error", "detail": str(e)}


@app.post("/disconnect")
def disconnect_serial():
    global ser
    with serial_read_lock:
        with serial_write_lock:
            if ser and ser.is_open:
                ser.close()
            ser = None
    return {"status": "disconnected"}


@app.get("/status")
def get_status():
    with serial_read_lock:
        if ser and ser.is_open:
            return {"connected": True, "port": ser.port}
    return {"connected": False, "port": None}


class CommandRequest(BaseModel):
    command: str


@app.post("/command")
def send_command(req: CommandRequest):
    with serial_read_lock:
        active = ser and ser.is_open
    if not active:
        return {"status": "error", "detail": "Not connected"}

    # Drop into queue — returns in <1ms, never waits for serial
    write_queue.put(req.command)
    return {"status": "queued", "command": req.command}


# ─────────────────────────────────────────────
# WebSocket endpoint
# ─────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    async with ws_lock:
        connected_websockets.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        async with ws_lock:
            if websocket in connected_websockets:
                connected_websockets.remove(websocket)


# ─────────────────────────────────────────────
# Serve React frontend — MUST be last
# ─────────────────────────────────────────────
dist_path = Path(__file__).parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")