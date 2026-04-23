from django.conf import settings


class ReadReplicaRouter:
    """
    Routes read queries to the replica database and writes to default.

    If no replica is configured (DATABASES has no "replica" key),
    all queries fall back to "default" — so this is safe to deploy
    before the replica exists.
    """

    def db_for_read(self, model, **hints):
        if "replica" in settings.DATABASES:
            return "replica"
        return "default"

    def db_for_write(self, model, **hints):
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == "default"
