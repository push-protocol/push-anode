#!/bin/sh

if [ -z "$DATABASE_URL" ]; then
  # DATABASE_URL is needed in
  # 1 migrations
  # 2 prisma orm config
  # 3 k8s script passes this
  # for docker we pass only user/pass/host/db
  DATABASE_URL="postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${DB_NAME}"
  export DATABASE_URL
fi


if [ -z "$SKIP_MIGRATIONS" ]; then
  # if we don't need to skip migrations - we should apply them now
  echo "Applying prisma migrations"
  # Run Prisma migrations
  npx prisma migrate deploy

  # Generate Prisma Client
  npx prisma generate
fi

echo "Running app"
# Start the application
npm run start:no-migrate
