"""
utils/rate_limiter.py
=====================
A simple in-memory token-bucket style rate limiter, keyed by user ID.

Design goals:
- No external dependencies (no Redis, no database).
- Thread-safe enough for asyncio (single-threaded event loop).
- Easy to configure via settings.

Usage:
    limiter = RateLimiter(max_requests=5, window_seconds=60)
    if limiter.is_allowed(user_id):
        # process request
    else:
        remaining = limiter.retry_after(user_id)
        # tell user to wait `remaining` seconds
"""
import time
from collections import deque
from typing import Dict, Deque


class RateLimiter:
    """Sliding-window rate limiter.

    Tracks up to *max_requests* calls per *window_seconds* for each key.
    """

    def __init__(self, max_requests: int = 5, window_seconds: int = 60) -> None:
        self._max = max_requests
        self._window = window_seconds
        # Maps user_id → deque of timestamps (oldest first)
        self._buckets: Dict[str, Deque[float]] = {}

    def _clean(self, key: str) -> None:
        """Remove timestamps older than the current window for *key*."""
        now = time.monotonic()
        if key in self._buckets:
            bucket = self._buckets[key]
            while bucket and now - bucket[0] > self._window:
                bucket.popleft()

    def is_allowed(self, key: str) -> bool:
        """Return True if *key* has not exceeded the rate limit."""
        self._clean(key)
        bucket = self._buckets.setdefault(key, deque())
        if len(bucket) < self._max:
            bucket.append(time.monotonic())
            return True
        return False

    def retry_after(self, key: str) -> float:
        """Return how many seconds *key* must wait before the next allowed request."""
        self._clean(key)
        bucket = self._buckets.get(key)
        if not bucket or len(bucket) < self._max:
            return 0.0
        # The oldest timestamp in the window; once it ages out there's room
        oldest = bucket[0]
        return max(0.0, self._window - (time.monotonic() - oldest))
