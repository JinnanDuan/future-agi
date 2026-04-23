"""Voice simulation tests -- requires Enterprise Edition."""
try:
    from ee.voice.tests.test_livekit_api import *  # noqa: F401,F403
except ImportError:
    pass
