
# Push-Anode

Push-Anode is a Node.js project built with NestJS that serves as a backend service using JSON-RPC. It integrates with PostgreSQL via Prisma ORM and includes features like Prettier for code formatting, ESLint for linting, and Husky for Git hooks.


## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js v20.x.x
- PostgreSQL v16.x.x
- Docker (optional, for running the database in a container)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/push-protocol/push-anode.git
   cd push-anode

2. **Install dependencies:**

   ```bash
   npm install

3. **Set up environment variables:**
		Create a `.env` file in the root directory and add your environment variables. Here’s an example:

   ```bash
   DATABASE_URL=postgres://user:password@localhost:5432/push-anode

5. **Run the database migrations:**

   ```bash
   npx prisma migrate deploy

6. **Generate Prisma client:**

   ```bash
   npx prisma generate

7. **Usage:**
   To start the server, use:
   ```bash
   npm run start

7. **Testing:**

   ```bash
   npm run test
  7. **Linting:**

	  ```bash
	  npm run lint
7. **Migrations:**

	To create a new migration
    `npx prisma migrate dev --name migration_name` 

	To apply migrations
	`npx prisma migrate deploy`
