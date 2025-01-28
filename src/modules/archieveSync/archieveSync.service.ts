import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NodeInfo,
  NodeStatus,
  NodeType,
  ValidatorContractState,
} from '../validator/validator-contract-state.service';
import { Logger } from 'winston';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { Prisma } from '@prisma/client';
import { ANodeClient } from './anodeClient.service';
import { DateUtil } from '../../utilz/dateUtil';
import { PromiseUtil } from '../../utilz/promiseUtil';
import { ArchiveNodeService } from '../archive/archive-node.service';
import { BitUtil } from '../../utilz/bitUtil';
import { Block } from '../../generated/push/block_pb';
import { BlockUtil } from '../validator/blockUtil';
import { Mutex } from 'async-mutex';
import schedule from 'node-schedule';
import { EnvLoader } from '../../utilz/envLoader';

@Injectable()
export class ArchieveSync implements OnModuleInit {
  private log: Logger = WinstonUtil.newLog(ArchieveSync);
  private nodeInfo: Map<string, NodeInfo> = new Map<string, NodeInfo>();
  private anodeClientMap = new Map<string, ANodeClient>();
  private syncMutex = new Mutex();
  private isSyncing = false;
  public static instance: ArchieveSync;
  private readonly DELETE_SYNCED_RECORDS_SCHEDULE =
    EnvLoader.getPropertyOrDefault(
      'DELETE_SYNCED_RECORDS_SCHEDULE',
      '0 */12 * * *',
    );
  constructor(
    private prisma: PrismaService,
    private valContractState: ValidatorContractState,
    private archiveNodeService: ArchiveNodeService,
  ) {
    ArchieveSync.instance = this;
  }

  onModuleInit() {
    this.deleteSyncedRecords();
    this.initialiseContractistnerForNewANode()
  }

  async initialiseContractistnerForNewANode() {
    this.log.info("Initialising contract listener for new ANode");
    this.valContractState.contractCli.contract.on(
      'NodeAdded',
      async (
        ownerWallet: string,
        nodeWallet: string,
        nodeType: number,
        nodeTokens: number,
        nodeApiBaseUrl: string,
      ) => {
        this.log.info("Found new ANode!! %o", {ownerWallet, nodeType, nodeWallet, nodeApiBaseUrl });
        const ni = new NodeInfo(
          nodeWallet,
          nodeApiBaseUrl,
          nodeType,
          NodeStatus.OK,
        );
        await ArchieveSync.checkAndStartSyncing(ni);
      },
    );
  }

  async deleteSyncedRecords() {
    const self = this;
    schedule.scheduleJob(
      this.DELETE_SYNCED_RECORDS_SCHEDULE,
      async function () {
        try {
          self.log.info(
            'Running cron tasks to delete synced records [in every 12 hours]',
          );
          const records = await self.getAllAnodeSyncInfo();
          const recordsToDelete = records.filter((record) => record.state == 1);
          self.log.info('Founds records to be deleted %o', recordsToDelete);
          await Promise.all(
            recordsToDelete.map(async (record) => {
              await self.deleteAnodeSyncInfo({ id: record.id });
            }),
          );
        } catch (error) {
          console.log(error);
          self.log.error('Failed to delete synced records', { error });
          throw error;
        }
      },
    );
  }

  public static async checkAndStartSyncing(newNode: NodeInfo) {
    if (
      newNode.nodeType == NodeType.ANode &&
      newNode.nodeStatus == NodeStatus.OK &&
      newNode.nodeId == this.instance.valContractState.nodeId
    ) {
      void (async () => {
        try {
          await this.instance.initBlockSync();
        } catch (error) {
          this.instance.log.error('Background pooling error: %s', error);
        }
      })();
    }
  }
  // function to create the mapping of the node
  async getANodeMap(): Promise<void> {
    try {
      const nodeInfo =
        await this.valContractState.getActiveArchivalNodeExceptSelf();

      // Map anode url to anode info
      for (const node of nodeInfo) {
        if (node.url) {
          this.nodeInfo.set(node.url, node);
          const anodeClient = new ANodeClient(this.prisma, node.url);
          const nodeInfoFromDb = await anodeClient.getANodeClientInfo();
          // if nodeinfo exists, use that to init the client i.e. syncing was going on but it had to shut down and now it needs to continue
          // if nodeinfo does exists, make rpc call to the client to get the info like total blocks and everything and put it in the db and then call inti function
          if (!nodeInfoFromDb) {
            // call the node with just one block and endtime to get an estimate of total blocks
            const cutOffTs = DateUtil.currentTimeMillis();
            const recordId = await this.createRecordInAnodeSyncInfo({
              anode_url: node.url,
              offset: 1,
              ts_cutoff: cutOffTs,
              // TODO: delete it as it will be not used
              total_blocks: 0,
            });
            anodeClient.init(node.url, cutOffTs, 1, 0, recordId.id, cutOffTs);
          } else {
            if (nodeInfoFromDb.state != 1) {
              anodeClient.init(
                node.url,
                Number(nodeInfoFromDb.ts_cutoff),
                Number(nodeInfoFromDb.offset),
                nodeInfoFromDb.state,
                nodeInfoFromDb.id,
                Number(nodeInfoFromDb.ts_cutoff),
              );
            }
            this.anodeClientMap.set(node.url, anodeClient);
          }
        } else {
          this.log.warn('Node without URL found', { node });
        }
      }

      this.log.info(`Mapped ${this.nodeInfo.size} active archival nodes`);
    } catch (error) {
      this.log.error('Failed to retrieve active archival nodes', { error });
      throw error;
    }
  }
  parseBlockResponseAndFormSet(blocks: any[]) {
    const blockSet = new Set<string>();
    for (const block of blocks) {
      blockSet.add(block.blockData);
    }
    return blockSet;
  }

  async getBlockHashValidateAndGetFullBlock(anodeClient: ANodeClient) {
    try {
      this.log.info(
        'Getting block hashes from node %s',
        anodeClient.getAnodeURL(),
      );
      const blockHashesResponse = await anodeClient.push_anode_get_blockHash();
      const blockHashesNotFound: string[] = [];

      await Promise.all(
        blockHashesResponse.blockHashes.map(async (blockHash) => {
          const blockExists =
            await this.archiveNodeService.isBlockAlreadyStored(
              blockHash.blockHash,
            );
          if (!blockExists) {
            blockHashesNotFound.push(blockHash.blockHash);
          }
        }),
      );

      this.log.debug('Blocks not found: %o', blockHashesNotFound);

      if (blockHashesNotFound.length > 0) {
        const blocks =
          await anodeClient.getBlockFromBlockHash(blockHashesNotFound);
        this.log.info('Blocks found: %o', blocks);
        const blockSet = this.parseBlockResponseAndFormSet(blocks);
        const blockPromises = [];

        for (const block of blockSet) {
          const mb = BitUtil.base16ToBytes(block);
          const parsedBlock = BlockUtil.parseBlock(mb);
          blockPromises.push(
            this.archiveNodeService.handleBlock(parsedBlock, mb),
          );
        }

        const results = await PromiseUtil.allSettled(blockPromises);
        this.log.info('Block processing results: %o', results);
        return {
          hasProcessedBlocks: true,
          processedBlocksCount: blockSet.size,
          success: results.every((result) => result.isFullfilled()),
        };
      }

      return {
        hasProcessedBlocks: false,
        processedBlocksCount: 0,
        success: true,
      };
    } catch (error) {
      this.log.error('Error in getBlockHashValidateAndGetFullBlock %o', {
        error,
      });
      return {
        hasProcessedBlocks: false,
        processedBlocksCount: 0,
        success: false,
      };
    }
  }
  async initBlockSync() {
    if (this.isSyncing) {
      this.log.info('Sync already in progress, skipping...');
      return;
    }

    // Use the mutex to ensure only one sync process runs
    await this.syncMutex.runExclusive(async () => {
      if (this.isSyncing) {
        return;
      }

      this.isSyncing = true;
      try {
        if (this.nodeInfo.size === 0) {
          await this.getANodeMap();
        }

        while (true) {
          try {
            const blockValidationPromises = Array.from(
              this.anodeClientMap.entries(),
            ).map(([nodeUrl, anodeClient]) =>
              this.getBlockHashValidateAndGetFullBlock(anodeClient),
            );

            const results = await PromiseUtil.allSettled(
              blockValidationPromises,
            );

            // Check if all operations were successful
            const allSuccessful = results.every(
              (result) => result.isFullfilled() && result.val.success,
            );

            // Check if any blocks were processed
            const anyBlocksProcessed = results.some(
              (result) =>
                result.isFullfilled() && result.val.hasProcessedBlocks,
            );

            if (allSuccessful && !anyBlocksProcessed) {
              // If all operations were successful and no blocks were processed,
              // we can safely break the loop
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
          } catch (error) {
            this.log.error('Error in sync iteration', { error });
          }
        }

        this.log.info('Block sync complete!!!');
      } catch (error) {
        this.log.error('Failed to sync blocks', { error });
        throw error;
      } finally {
        this.isSyncing = false;
      }
    });
  }
  // function to get the block from each node parallaly with retry logic
  // CRUD functions for archievesync
  async createRecordInAnodeSyncInfo(info: Prisma.anodeSyncInfoCreateInput) {
    try {
      this.log.info('Creating Anode sync info record %o', info);
      const createdRecord = await this.prisma.anodeSyncInfo.create({
        data: info,
      });

      this.log.info('Created Anode sync info record %o', {
        recordId: createdRecord.id,
      });
      return createdRecord;
    } catch (error) {
      this.log.error('Failed to create Anode sync info record', {
        error,
        info,
      });
      throw error;
    }
  }

  async getAllAnodeSyncInfo() {
    try {
      const records = await this.prisma.anodeSyncInfo.findMany();

      return records;
    } catch (error) {
      this.log.error('Failed to retrieve Anode sync info', { error });
      throw error;
    }
  }

  async deleteAnodeSyncInfo(where: Prisma.anodeSyncInfoWhereUniqueInput) {
    try {
      const deletedRecord = await this.prisma.anodeSyncInfo.delete({
        where,
      });

      this.log.info('Deleted Anode sync info record', {
        recordId: deletedRecord.id,
      });
      return deletedRecord;
    } catch (error) {
      this.log.error('Failed to delete Anode sync info record', {
        error,
        where,
      });
      throw error;
    }
  }
  // function to group the block, from the nodes, form a set and and pass it to handleBlock.
  // function to check and call the syncing logic.
  // cron task to delete the records once they are marked as synced.
  // function to check if the anode needs to sync up with other nodes or not
  // check if the blocks table has data or not. if not, its a new node and it needs to sync up as there is no resharding or anything
}
