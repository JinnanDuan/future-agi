"""Voice simulation tests -- requires Enterprise Edition."""
try:
    from ee.voice.tests.test_run_test_external_services import *  # noqa: F401,F403
except ImportError:
    pass
