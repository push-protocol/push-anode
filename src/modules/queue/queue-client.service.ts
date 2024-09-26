import { Service } from 'typedi';
import { Logger } from 'winston';
import { WinstonUtil } from '../../utils/winstonUtil';
import { PrismaService } from '../../prisma/prisma.service';
import { QItem } from '../../messaging/types/queue-types';
import { ArchiveNodeService } from '../archive/archive-node.service';
import { RpcUtils } from '../../utils/rpcUtil';

@Service()
export class QueueClient {
  private log: Logger = WinstonUtil.newLog(QueueClient);
  private consumer!: ArchiveNodeService; // Consumer is QueueServer in your case
  private queueName!: string;

  constructor(
    consumer: ArchiveNodeService,
    queueName: string,
    private prisma: PrismaService,
  ) {
    this.consumer = consumer;
    this.queueName = queueName;
  }

  public async pollRemoteQueue(maxRequests: number): Promise<any> {
    const result = [];

    // Use Prisma to fetch data
    const sameQueueEndpoints = await this.prisma.dsetClient.findMany({
      where: {
        queue_name: this.queueName,
        state: 1,
      },
      orderBy: {
        id: 'asc',
      },
      select: {
        id: true,
        queue_name: true,
        target_node_id: true,
        target_node_url: true,
        target_offset: true,
      },
    });

    for (const endpoint of sameQueueEndpoints) {
      const endpointStats = {
        queueName: this.queueName,
        target_node_id: endpoint.target_node_id,
        target_node_url: endpoint.target_node_url,
        queries: 0,
        downloadedItems: 0,
        newItems: 0,
        lastOffset: Number(endpoint.target_offset), // Ensure this is a number
      };

      // Convert `target_offset` (bigint) to number for further processing
      let lastOffset = Number(endpoint.target_offset);

      for (let i = 0; i < maxRequests; i++) {
        result.push(endpointStats);
        endpointStats.queries++;

        const reply = await this.readItems(
          endpoint.queue_name,
          endpoint.target_node_url,
          lastOffset, // Pass `lastOffset` as a number
        );

        console.log("\n\n\n")

        console.log(reply);

        console.log('\n\n\n');


        if (!reply || reply.items?.length === 0) {
          break;
        }

        for (const item of reply.items) {
          endpointStats.downloadedItems++;
          let appendSuccessful = false;

          try {
            appendSuccessful = await this.consumer.accept(item);
          } catch (e) {
            this.log.error(
              'error processing accept(): queue %s: ',
              this.queueName,
            );
            this.log.error(e);
          }

          if (appendSuccessful) {
            endpointStats.newItems++;
          }
        }

        // Convert `reply.lastOffset` (number) to bigint before updating the database
        await this.prisma.dsetClient.update({
          where: { id: endpoint.id },
          data: { target_offset: BigInt(reply.lastOffset) },
        });

        lastOffset = reply.lastOffset; // Continue using `lastOffset` as a number
        endpointStats.lastOffset = reply.lastOffset; // This is now compatible since both are numbers
      }
    }

    return { result: result };
  }

  /**
   * Updates the queue offset after processing an item.
   * @param itemId The ID of the item processed.
   */
  private async updateQueueOffset(itemId: number): Promise<void> {
    try {
      await this.prisma.dsetClient.update({
        where: { id: itemId },
        data: { target_offset: itemId },
      });
      this.log.info(`Queue offset updated to ${itemId}.`);
    } catch (error) {
      this.log.error(
        `Failed to update queue offset for item ID ${itemId}: %o`,
        error,
      );
      throw error;
    }
  }

  public async readItems(
    queueName: string,
    baseUri: string,
    firstOffset: number = 0,
  ): Promise<{ items: QItem[]; lastOffset: number } | null> {
    const url = `${baseUri}/api/v1/rpc`;
    try {
      const re = await new RpcUtils(url, 'push_readBlockQueue', [
        `${firstOffset}`,
      ]).call();
      // TODO: implement the logic to deserialise the blocks
      this.log.debug(
        'readItems %s from offset %d %o',
        url,
        firstOffset,
        re?.data,
      );
      const obj: { items: QItem[]; lastOffset: number } = re.data.result;
      return obj;
    } catch (e) {
      this.log.warn('readItems failed for url %s', url);
      return null;
    }
  }

  public async readLastOffset(
    queueName: string,
    baseUri: string,
  ): Promise<number> {
    const url = `${baseUri}/api/v1/rpc`;
    const resp = await new RpcUtils(url, 'push_readBlockQueueSize', []).call();
    const result: number = resp.data.result;
    return result;
  }
}
