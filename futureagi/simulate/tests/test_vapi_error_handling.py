"""Voice simulation tests -- requires Enterprise Edition."""
try:
    from ee.voice.tests.test_vapi_error_handling import *  # noqa: F401,F403
except ImportError:
    pass
