"""A database-session lock shared by scheduled and manual import processes."""

from contextlib import contextmanager
from functools import wraps
from threading import Lock

from django.db import connection

_LOCK_ID = 72626001
_local_lock = Lock()


class IngestionBusyError(Exception):
    pass


@contextmanager
def ingestion_lock():
    postgres = connection.vendor == "postgresql"
    if postgres:
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_try_advisory_lock(%s)", [_LOCK_ID])
            acquired = cursor.fetchone()[0]
    else:
        acquired = _local_lock.acquire(blocking=False)
    if not acquired:
        raise IngestionBusyError(
            "Pobieranie już trwa. Spróbuj po zakończeniu bieżącej synchronizacji."
        )
    try:
        yield
    finally:
        if postgres:
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_unlock(%s)", [_LOCK_ID])
        else:
            _local_lock.release()


def exclusive_ingestion(function):
    @wraps(function)
    def locked(*args, **kwargs):
        with ingestion_lock():
            return function(*args, **kwargs)
    return locked
