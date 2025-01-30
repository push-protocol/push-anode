<h1 align="center">
    <a href="https://push.org/#gh-light-mode-only">
    <img width='20%' height='10%' src="https://res.cloudinary.com/drdjegqln/image/upload/v1686227557/Push-Logo-Standard-Dark_xap7z5.png">
    </a>
    <a href="https://push.org/#gh-dark-mode-only">
    <img width='20%' height='10%' src="https://res.cloudinary.com/drdjegqln/image/upload/v1686227558/Push-Logo-Standard-White_dlvapc.png">
    </a>
</h1>

<p align="center">
  <i align="center">Push protocol is evolving to Push Chain, a shared-state L1 designed to deliver universal app experiences (Any Chain. Any User. Any App).🚀</i>
</p>

<h4 align="center">

  <a href="https://discord.com/invite/pushprotocol">
    <img src="https://img.shields.io/badge/discord-7289da.svg?style=flat-square" alt="discord">
  </a>
  <a href="https://twitter.com/pushprotocol">
    <img src="https://img.shields.io/badge/twitter-18a1d6.svg?style=flat-square" alt="twitter">
  </a>
  <a href="https://www.youtube.com/@pushprotocol">
    <img src="https://img.shields.io/badge/youtube-d95652.svg?style=flat-square&" alt="youtube">
  </a>
</h4>

# Push Archival Node

Archival nodes store and stream all transaction data on the Push Network, supporting full transaction history access and real-time data streaming.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)

## Overview

Archival nodes on the Push Network maintain a comprehensive log of all processed transactions, enabling users to access the complete transaction history and utilize web socket functionality for real-time streaming of transaction data. These nodes are crucial for applications like blockchain explorers and scenarios where an entire network's activity needs to be retrieved.

## Architecture

### Staking Requirement

To operate an archival node, participants must stake a certain amount of tokens. This staking process serves as a security deposit, ensuring that storage nodes act in the network's best interest.

### Interaction in Network

In the network, once blocks are processed by validator nodes, archival nodes index the block and transaction data for quick retrieval. The diagram below illustrates the interaction between the nodes in the network:

![Network Interaction](assets/nodeInteraction.jpg)

### Indexation of Data

Indexing transaction and block data is crucial for quick retrieval and efficient querying. The tables below represents a proposed structure for block & transaction indexation:

| Block Hash                           | Block Data        | Timestamp |
| ------------------------------------ | ----------------- | --------- |
| b0249fbb-a03d-4292-9599-042c6993958e | Packed Block Data | epoch     |

| Tx Hash                              | Block Hash                           | Category | Tx Data                  | Timestamp |
| ------------------------------------ | ------------------------------------ | -------- | ------------------------ | --------- |
| b0249fbb-a03d-4292-9599-042c6993958e | 2608d687-fe55-4fe9-9fa5-1f782dcebb34 | email    | protobuf_serialized_data | epoch     |

> **Note:** The above table example is a simplified representation of the transaction indexation structure. The actual implementation may include additional fields based on the requirements of the network.

## Installation

⚠️ **Warning: Work In Progress** ⚠️

This project is currently a work in progress. Please be aware that things might break, and the installation process might change as we improve and dockerize it completely for public running of the node. Proceed with caution and check back frequently for updates.

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 20)
- [PostgewaSQL](https://www.postgresql.org/) (>= 16)
- [Docker](https://www.docker.com/) ((optional, for running the database in a container))

### Running the Node

1. **Clone the repository:**

   ```bash
   git clone https://github.com/push-protocol/push-anode.git
   cd push-anode

   ```

2. **Starting node using Docker**

   ```bash
   docker compose up
   ```

3. **Starting node without Docker**

   1. **Install dependencies:**

      ```bash
      npm install

      ```

   2. **Set up environment variables:**
      Create a `.env` file in the root directory and add your environment variables. Here’s an example:

      ```bash
      DATABASE_URL=postgres://user:password@localhost:5432/push-anode

      ```

   3. **Run the database migrations:**

      ```bash
      npx prisma migrate deploy

      ```

   4. **Generate Prisma client:**

      ```bash
      npx prisma generate

      ```

   5. **Usage:**
      To start the server, use:

      ```bash
      npm run start

      ```

4. **Testing:**

   ```bash
   npm run test
   ```

5. **Linting:**

   ```bash
   npm run lint
   ```

6. **Migrations:**

   To create a new migration
   `npx prisma migrate dev --name migration_name`

   To apply migrations
   `npx prisma migrate deploy`

## Contributing

We welcome contributions from the community! To contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/your-feature-name`).
5. Open a pull request.

Please ensure your code adheres to our coding standards and includes appropriate tests.

## Licenses

All crates of this repository are licensed under either of

- Apache License, Version 2.0, ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)

at your option.
