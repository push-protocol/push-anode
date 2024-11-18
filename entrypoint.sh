#!/bin/sh

if [ -z "$DATABASE_URL" ]; then
  # DATABASE_URL is needed in
  # 1 migrations
  # 2 prisma orm config
  # 3 k8s script passes this
  # for docker I pass only user/pass/host/db
  DATABASE_URL="postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:5432/${DB_NAME}"
  export DATABASE_URL
fi


# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Start the application
npm run start:dev
