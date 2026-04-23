"""Voice simulation tests -- requires Enterprise Edition."""
try:
    from ee.voice.tests.test_phone_number_dispatcher import *  # noqa: F401,F403
except ImportError:
    pass
