import asyncio
from typing import Dict, Set
from collections import defaultdict

class LiveLogger:
    def __init__(self):
        self._subscribers: Dict[str, Set[asyncio.Queue]] = defaultdict(set)
        self._global_subscribers: Set[asyncio.Queue] = set()

    def subscribe(self, proxy_id: str = None) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        if proxy_id:
            self._subscribers[proxy_id].add(queue)
        else:
            self._global_subscribers.add(queue)
        return queue

    def unsubscribe(self, proxy_id: str, queue: asyncio.Queue):
        if proxy_id and proxy_id in self._subscribers:
            self._subscribers[proxy_id].discard(queue)
        self._global_subscribers.discard(queue)

    def log(self, entry: Dict):
        entry_str = str(entry)

        for queue in list(self._global_subscribers):
            try:
                queue.put_nowait(entry)
            except asyncio.QueueFull:
                pass

        proxy_id = entry.get("proxy_id")
        if proxy_id and proxy_id in self._subscribers:
            for queue in list(self._subscribers[proxy_id]):
                try:
                    queue.put_nowait(entry)
                except asyncio.QueueFull:
                    pass
