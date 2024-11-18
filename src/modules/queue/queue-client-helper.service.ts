import { Logger } from 'winston';
import { PrismaService } from '../../prisma/prisma.service';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { ValidatorContractState } from '../validator/validator-contract-state.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QueueClientHelper {
  private log: Logger = WinstonUtil.newLog(QueueClientHelper);

  constructor(private prisma: PrismaService) {}

  /**
   * Initializes the client for every validator across multiple queues.
   * @param contract The ValidatorContractState containing validator information.
   * @param queueNames The list of queue names.
   */
  public async initClientForEveryQueueForEveryValidator(
    contract: ValidatorContractState,
    queueNames: string[],
  ): Promise<void> {
    // Check that queueNames is not empty
    if (!queueNames.length) {
      throw new Error('Queue names are missing');
    }

    const allValidators = contract.getAllValidatorsExceptSelf();

    for (const queueName of queueNames) {
      for (const nodeInfo of allValidators) {
        const targetNodeId = nodeInfo.nodeId;
        const targetNodeUrl = nodeInfo.url;
        const targetState = ValidatorContractState.isEnabled(nodeInfo) ? 1 : 0;

        // Prisma upsert for inserting or updating target node information
        await this.prisma.dsetClient.upsert({
          where: {
            queue_name_target_node_id: {
              queue_name: queueName,
              target_node_id: targetNodeId,
            },
          },
          update: {
            target_node_url: targetNodeUrl,
            state: targetState,
          },
          create: {
            queue_name: queueName,
            target_node_id: targetNodeId,
            target_node_url: targetNodeUrl,
            target_offset: 0,
            state: targetState,
          },
        });

        // Retrieve target offset using Prisma
        const targetOffset = await this.prisma.dsetClient.findUnique({
          where: {
            queue_name_target_node_id: {
              queue_name: queueName,
              target_node_id: targetNodeId,
            },
          },
          select: {
            target_offset: true,
          },
        });

        // Logging information
        this.log.info(
          'Client polls (state: %s) queue: %s node: %s from offset: %d',
          targetState,
          queueName,
          targetNodeId,
          targetOffset?.target_offset ?? 0,
        );
      }
    }
  }
}
