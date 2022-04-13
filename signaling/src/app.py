import os

import websockets
import json
import asyncio
import redis.asyncio as redis

JOIN = {}

async def start(websocket, user):
  JOIN[user] = websocket
  try:
    await receive(websocket)
  finally:
    del JOIN[user]

async def receive(websocket):
  async for message in websocket:
    event = json.loads(message)
    print(event)
    if event["type"] == "pose":
      await pose(event)

async def pose(event):
  await redis_connection.lpush("poses", json.dumps(event['poses']))

async def handler(websocket):
  message = await websocket.recv()
  event = json.loads(message)
  assert event["type"] == "init"
  await start(websocket, event["id"])

async def main():
  async with websockets.serve(handler, "", 8050):
    await asyncio.Future()  # run forever

if __name__ == '__main__':
  print("WebSockets Signaling listening on port 8050")
  redis_connection = redis.Redis(host=os.environ['REDIS_HOST'],
                                 port=os.environ['REDIS_PORT'],
                                 db=0,
                                 password=os.environ['REDIS_PASSWORD'])
  asyncio.run(main())