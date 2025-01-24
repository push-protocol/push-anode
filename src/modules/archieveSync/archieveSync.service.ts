import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NodeInfo,
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
type ANodeClientInfo = typeof Prisma.AnodeSyncInfoScalarFieldEnum;

@Injectable()
export class ArchieveSync implements OnModuleInit {
  private log: Logger = WinstonUtil.newLog(ArchieveSync);
  private nodeInfo: Map<string, NodeInfo> = new Map<string, NodeInfo>();
  private anodeClientMap = new Map<string, ANodeClient>();
  constructor(
    private prisma: PrismaService,
    private valContractState: ValidatorContractState,
    private archiveNodeService: ArchiveNodeService,
  ) {}

  onModuleInit() {
    this.initBlockSync();
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
            await this.createRecordInAnodeSyncInfo({
              anode_url: node.url,
              offset: 1,
              ts_cutoff: cutOffTs,
              // TODO: delete it as it will be not used
              total_blocks: 0,
            });
            anodeClient.init(node.url, cutOffTs, 0, 0, 0, cutOffTs);
          } else {
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
  async parseBlockResponseAndFormSet(blocks: any[]) {
    const blockSet = new Set<string>();
    for (const block of blocks) {
      blockSet.add(JSON.stringify(block));
    }
    return blockSet;
  }
  async initBlockSync() {
    try {
      if (this.nodeInfo.size === 0) {
        await this.getANodeMap();
      }

      while (true) {
        try {
          const getBlockPromises = [];
          for (const [nodeUrl, anodeClient] of this.anodeClientMap) {
            getBlockPromises.push(anodeClient.push_anode_get_block());
          }

          const res = await PromiseUtil.allSettled<{
            blocks: { blockData: string; blockHash: string }[];
          }>(getBlockPromises);

          // Check if all nodes returned zero blocks
          const allNodesEmpty = res.every(
            (result) =>
              !result.isFullfilled() || result.val.blocks.length === 0,
          );

          if (allNodesEmpty) {
            // break
            break;
          }

          // Construct a map of unique blocks
          const blockMap = new Map<string, string>();
          for (let i = 0; i < res.length; i++) {
            if (res[i].isFullfilled()) {
              for (let j = 0; j < res[i].val.blocks.length; j++) {
                if (!blockMap.has(res[i].val.blocks[j].blockHash))
                  blockMap.set(
                    res[i].val.blocks[j].blockHash,
                    res[i].val.blocks[j].blockData,
                  );
              }
            }
          }

          // Process blocks
          const blockPromises = [];
          for (const [blockHash, blockData] of blockMap) {
            const blockBase16 = BitUtil.hex0xRemove(blockData).toLowerCase();
            const blockBytes = BitUtil.base16ToBytes(blockBase16);
            const block = BlockUtil.parseBlock(blockBytes);
            blockPromises.push(
              this.archiveNodeService.handleBlock(block, blockBytes),
            );
          }
          await PromiseUtil.allSettled(blockPromises);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {}
      }
      this.log.info('Block sync complete!!!');
    } catch (error) {
      this.log.error('Failed to sync blocks', { error });
      throw error;
    }
  }
  // function to get the block from each node parallaly with retry logic
  // CRUD functions for archievesync
  async createRecordInAnodeSyncInfo(info: Prisma.anodeSyncInfoCreateInput) {
    try {
      const createdRecord = await this.prisma.anodeSyncInfo.create({
        data: info,
      });

      this.log.info('Created Anode sync info record', {
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
