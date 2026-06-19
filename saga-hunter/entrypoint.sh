#!/bin/bash
set -e

echo "=== SagaHunter Entrypoint ==="

echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -U sagahunter -d sagahunter; do
  sleep 2
done
echo "PostgreSQL ready."

echo "Generating Prisma client..."
cd /app/web
npx prisma generate

echo "Pushing schema to database..."
npx prisma db push

echo "Running seed data..."
npx prisma db seed

echo "Starting supervisord..."
exec supervisord -c /app/supervisord.conf
