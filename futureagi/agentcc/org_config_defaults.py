DEFAULT_COST_TRACKING = {"enabled": True}

DEFAULT_CACHE = {
    "enabled": False,
    "default_ttl": "5m",
    "max_entries": 10000,
}


def default_cost_tracking_config():
    return DEFAULT_COST_TRACKING.copy()


def normalize_cost_tracking_config(value):
    if not isinstance(value, dict):
        value = {}
    normalized = value.copy()
    normalized.setdefault("enabled", True)
    return normalized


def default_cache_config():
    return DEFAULT_CACHE.copy()


def normalize_cache_config(value):
    if not isinstance(value, dict):
        value = {}
    normalized = value.copy()
    for key, default in DEFAULT_CACHE.items():
        normalized.setdefault(key, default)
    return normalized
