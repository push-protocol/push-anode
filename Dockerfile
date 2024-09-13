# Dockerfile

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
RUN npm install --production
ENV DATABASE_URL=postgres://push-anode:tUT2uGTq0SglqkXO@localhost:5432/push-anode
EXPOSE 3000 5432
CMD ["sh","-c","su postgres -c 'sh /docker-entrypoint-initdb.d/init.sh' && node dist/main"]