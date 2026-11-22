#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  python manage.py migrate --noinput
  if [ "${BOOTSTRAP_DEMO_ACCOUNTS:-false}" = "true" ]; then
    python manage.py ensure_demo_accounts
  fi
fi

exec "$@"
