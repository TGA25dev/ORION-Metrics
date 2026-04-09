from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import uvicorn
import asyncio
import os
import dotenv
import json
import fcntl
import logging

from telemetry import get_artemis_telemetry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log", mode="a", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

CACHE_FILE = "telemetry_cache.json"
LOCK_FILE = "telemetry_cache.lock"
env = dotenv.dotenv_values(".env")

async def fetch_telemetry_loop():
    #try to become leader and adquie lock file
    lock_f = open(LOCK_FILE, 'w')
    try:
        fcntl.flock(lock_f, fcntl.LOCK_EX | fcntl.LOCK_NB)
        is_leader = True
    except BlockingIOError:
        is_leader = False

    if is_leader:
        logger.info(f"[Worker {os.getpid()}] Becomes the fetch leader. Starting background loop...")
        nasa_down = False
        try:
            while True:
                try:
                    #fetch data and write to cache file
                    telemetry = await asyncio.to_thread(get_artemis_telemetry)
                    temp_cache = CACHE_FILE + ".tmp"

                    with open(temp_cache, 'w') as f:
                        json.dump(telemetry, f)
                    os.rename(temp_cache, CACHE_FILE)

                    if nasa_down:
                        logger.info("NASA telemetry feed is back online !")
                        nasa_down = False

                except Exception as e:
                    if not nasa_down:
                        logger.warning("NASA telemetry feed appears down.. Retrying every 5 seconds...")
                        nasa_down = True

                    logger.error(f"[Worker {os.getpid()}] Background fetch error: {e}", exc_info=True)

                await asyncio.sleep(5)

        except asyncio.CancelledError:
            logger.info(f"[Worker {os.getpid()}] Fetch loop cancelled. Releasing lock.")
            raise

        finally:
            fcntl.flock(lock_f, fcntl.LOCK_UN)
            lock_f.close()
    else:
        logger.info(f"[Worker {os.getpid()}] Follower worker started. Will read from cache file.")
        lock_f.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(fetch_telemetry_loop())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)
app.mount("/web", StaticFiles(directory="web"), name="web")

@app.get("/")
def read_root():
    return FileResponse("web/index.htm")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            try:
                with open(CACHE_FILE, 'r') as f:
                    cached_data = json.load(f)
                await websocket.send_json(cached_data)

            except FileNotFoundError:
                await websocket.send_json({"error": "No data available yet"})

            except json.JSONDecodeError:
                pass #prevent crash if reading during a file write split second

            await asyncio.sleep(5)

        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected")
            break

        except RuntimeError as e:
            if "close message has been sent" in str(e):
                break

            logger.error(f"Runtime error: {e}")
            await asyncio.sleep(5)

        except Exception as e:
            logger.error(f"Error serving telemetry: {e}", exc_info=True)

            try:
                await websocket.send_json({"error": "Unknown error serving telemetry"})

            except Exception:
                pass
            
            await asyncio.sleep(5)

if __name__ == "__main__":
    logger.info("Live telemetry server running !")
    host_ip = env.get("HOST_IP", "127.0.0.1")
    host_port = int(env.get("HOST_PORT", 8000))
    uvicorn.run(app, host=host_ip, port=host_port)
