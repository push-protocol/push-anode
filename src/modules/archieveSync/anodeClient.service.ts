import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Logger } from 'winston';
import { WinstonUtil } from '../../utilz/winstonUtil';
import { RpcUtils } from '../../utilz/rpcUtil';
import { DateUtil } from '../../utilz/dateUtil';

@Injectable()
export class ANodeClient {
  private readonly log: Logger = WinstonUtil.newLog(ANodeClient);
  private nodeUrl: string;
  private ts: number;
  private offset: number;
  private state: number;
  private id: number;
  private start_time: number;
  private readonly PAGE_SIZE = 20;
  private readonly ORDER = 'DESC';
  private readonly SHOW_DETAILS = false;
  private rpcUtil: RpcUtils;

  constructor(
    private readonly prismaService: PrismaService,
    _nodeUrl?: string,
  ) {
    this.nodeUrl = _nodeUrl ?? null;
  }

  init(
    _nodeUrl: string,
    _ts: number,
    _offset: number,
    _state: number,
    _id: number,
    _startTime?: number,
  ) {
    this.id = _id;
    this.nodeUrl = `${_nodeUrl}/rpc`;
    this.ts = _ts;
    this.offset = _offset;
    this.state = _state;
    this.start_time = _startTime ?? DateUtil.currentTimeMillis();
  }

  async getANodeClientInfo(): Promise<Prisma.anodeSyncInfoGetPayload<{}> | null> {
    try {
      if (!this.nodeUrl) {
        this.log.warn('Cannot retrieve Anode client info: nodeUrl is not set');
        return null;
      }

      const result = await this.prismaService.anodeSyncInfo.findFirst({
        where: {
          anode_url: this.nodeUrl,
        },
      });

      if (!result) {
        this.log.info('No Anode client info found for the given nodeUrl', {
          nodeUrl: this.nodeUrl,
        });
      }

      return result;
    } catch (error) {
      this.log.error('Failed to retrieve Anode client info', {
        error,
        nodeUrl: this.nodeUrl,
        ts: this.ts,
        offset: this.offset,
        state: this.state,
      });
      throw error;
    }
  }

  async updateAnodeSyncInfo(data: Prisma.anodeSyncInfoUpdateInput) {
    try {
      const updatedRecord = await this.prismaService.anodeSyncInfo.update({
        where: {
          id: this.id,
        },
        data,
      });

      this.log.info('Updated Anode sync info record', {
        recordId: updatedRecord.id,
      });
      return updatedRecord;
    } catch (error) {
      this.log.error('Failed to update Anode sync info record', {
        error,
        data,
      });
      throw error;
    }
  }

  async push_anode_get_block(info?: {
    startTime?: number;
    offSet?: number;
    order?: 'ASC' | 'DESC';
    showDetails?: boolean;
    pageSize?: number;
  }) {
    try {
      const result: {
        data: {
          result: {
            blocks: any[];
            lastTs: number;
            totalPages: number;
          };
        };
      } = await new RpcUtils(this.nodeUrl, 'RpcService.getBlocksInternal', [
        info && info.startTime ? info.startTime : this.start_time,
        info && info.order ? info.order : this.ORDER,
        info && info.showDetails ? info.showDetails : this.SHOW_DETAILS,
        info && info.pageSize ? info.pageSize : this.PAGE_SIZE,
        info && info.offSet ? info.offSet : this.offset,
      ]).call();
      if (result && result.data.result.blocks.length > 0) {
        // if data is available, update the offset
        this.offset += 1;
        await this.updateAnodeSyncInfo({
          offset: this.offset,
        });
      } else {
        // else update the state to 1 i.e no for data to sync and mark it as synced
        this.state = 1;
        await this.updateAnodeSyncInfo({
          state: this.state,
        });
      }
      return {
        blocks: result.data.result.blocks,
        lastTs: result.data.result.lastTs,
        totalPages: result.data.result.totalPages,
      };
    } catch (error) {
      this.log.error('Failed to retrieve blocks from anode', {
        error,
        nodeUrl: this.nodeUrl,
        ts: this.ts,
        offset: this.offset,
        state: this.state,
      });
      throw error;
    }
    // once get the response, update the state in the db and in the state of object
  }
}
