"""Voice simulation tests -- requires Enterprise Edition."""
try:
    from ee.voice.tests.test_voice_service_manager import *  # noqa: F401,F403
except ImportError:
    pass
