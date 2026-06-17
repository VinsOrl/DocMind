import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

# Sliding-window, in-memory rate limiter keyed by client IP.
# NOTE: in-memory state is per-process — fine for a single instance. For multiple
# workers/instances, back this with Redis instead.
_WINDOW_SECONDS = 300  # 5 minutes
_MAX_ATTEMPTS = 10

_attempts: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # Behind nginx we get the real client via X-Real-IP / X-Forwarded-For.
    fwd = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def login_rate_limit(request: Request) -> None:
    """FastAPI dependency: throttle repeated login attempts per client IP."""
    ip = _client_ip(request)
    now = time.time()
    window = _attempts[ip]
    while window and now - window[0] > _WINDOW_SECONDS:
        window.popleft()
    if len(window) >= _MAX_ATTEMPTS:
        retry = int(_WINDOW_SECONDS - (now - window[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(max(retry, 1))},
        )
    window.append(now)
