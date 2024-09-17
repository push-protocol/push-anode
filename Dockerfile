# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Run
FROM node:20-alpine

# Install and configure postgresql
RUN apk add --no-cache postgresql postgresql-contrib

RUN mkdir -p /var/lib/postgresql/data && chown -R postgres:postgres /var/lib/postgresql
RUN mkdir /run/postgresql && chown -R postgres:postgres /run/postgresql
RUN mkdir /docker-entrypoint-initdb.d && chown -R postgres:postgres /docker-entrypoint-initdb.d

USER postgres
RUN initdb -D /var/lib/postgresql/data

# Create initialization script
RUN echo -e "#!/bin/sh\n\
    pg_ctl start -D /var/lib/postgresql/data -l /var/lib/postgresql/logfile &\n\
    sleep 10\n\
    psql -c \"CREATE USER \\\"push-anode\\\" WITH PASSWORD 'tUT2uGTq0SglqkXO';\"\n\
    createdb -O push-anode push-anode\n\
    psql -c \"GRANT ALL PRIVILEGES ON DATABASE \\\"push-anode\\\" TO \\\"push-anode\\\";\"" > /docker-entrypoint-initdb.d/init.sh

RUN chmod +x /docker-entrypoint-initdb.d/init.sh

USER root
WORKDIR /app
COPY --from=builder /app .

# Install only production dependencies
RUN npm install --production

# Environment variable for Prisma to connect to the DB
ENV DATABASE_URL=postgres://push-anode:tUT2uGTq0SglqkXO@localhost:5432/push-anode

# Expose the necessary ports
EXPOSE 3000 5432

# Entry point to run database setup, Prisma generation, migration, seeding, and start the application
CMD ["sh", "-c", "\
    su postgres -c 'sh /docker-entrypoint-initdb.d/init.sh' && \
    sleep 10 && \
    npx prisma generate && \
    npx prisma migrate deploy && \
    npm run seed && \
    npm run start:prod \
    "]
