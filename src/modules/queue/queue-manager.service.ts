import schedule from 'node-schedule';
import { Logger } from 'winston';

import { EnvLoader } from '../../utils/envLoader';
import { WinstonUtil } from '../../utils/winstonUtil';
import { QueueClient } from './queue-client.service';
import { QueueClientHelper } from './queue-client-helper.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ArchiveNodeService } from '../archive/archive-node.service';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ValidatorContractState } from '../validator/validator-contract-state.service';

@Injectable()
export class QueueManagerService implements OnModuleInit {
  public log: Logger = WinstonUtil.newLog(QueueManagerService);

  constructor(
    private readonly contract: ValidatorContractState,
    private readonly archiveNode: ArchiveNodeService,
    private readonly prisma: PrismaService,
    private readonly queueClientHelper: QueueClientHelper, // Inject through constructor
  ) {}

  private mblockClient!: QueueClient;

  private readonly CLIENT_READ_SCHEDULE = EnvLoader.getPropertyOrDefault(
    'CLIENT_READ_SCHEDULE',
    '*/10 * * * * *',
  );

  private readonly CLIENT_REQUEST_PER_SCHEDULED_JOB = 10;

  public static QUEUE_MBLOCK = 'mblock';

  /**
   * Called after the module's providers are initialized
   */
  public async onModuleInit() {
    this.log.debug('onModuleInit');
    this.mblockClient = new QueueClient(
      this.archiveNode,
      QueueManagerService.QUEUE_MBLOCK,
      this.prisma,
    );

    await this.queueClientHelper.initClientForEveryQueueForEveryValidator(
      this.contract,
      [QueueManagerService.QUEUE_MBLOCK],
    );

    this.scheduleQueuePolling();
  }

  /**
   * Schedule polling for the queue based on CLIENT_READ_SCHEDULE
   */
  private scheduleQueuePolling() {
    const qs = this;
    schedule.scheduleJob(this.CLIENT_READ_SCHEDULE, async function () {
      const dbgPrefix = 'PollRemoteQueue';
      try {
        await qs.mblockClient.pollRemoteQueue(
          qs.CLIENT_REQUEST_PER_SCHEDULED_JOB,
        );
        qs.log.info(`CRON %s started`, dbgPrefix);
      } catch (err) {
        qs.log.error(`CRON %s failed %o`, dbgPrefix, err);
      } finally {
        qs.log.info(`CRON %s finished`, dbgPrefix);
      }
    });
  }

  /**
   * Poll remote queues
   * @returns Result of polling the queue
   */
  public async pollRemoteQueues(): Promise<any> {
    const result = await this.mblockClient.pollRemoteQueue(1);
    return result;
  }
}
