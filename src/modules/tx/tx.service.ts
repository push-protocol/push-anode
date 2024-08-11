import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginatedResponseDto } from "../../common/dto/paginated-response.dto";
import { TxDto } from "./dto/tx.dto";

@Injectable()
export class TxService {
  constructor(private prisma: PrismaService) {}

  async getTxsPaginated(params: {
    page?: number;
    pageSize?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<PaginatedResponseDto<TxDto>> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const start = params.startTime
      ? new Date(params.startTime)
      : new Date("1970-01-01T00:00:00Z");
    const end = params.endTime ? new Date(params.endTime) : new Date();

    const skip = (page - 1) * pageSize;
    const where = {
      timestamp: {
        gte: start,
        lte: end,
      },
    };

    const [txs, totalItems] = await Promise.all([
      this.prisma.tx.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          timestamp: "desc",
        },
      }),
      this.prisma.tx.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      items: txs,
      meta: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getTxByHash(params: { hash: string }): Promise<TxDto> {
    const tx = await this.prisma.tx.findUnique({
      where: { hash: params.hash },
    });

    if (!tx) {
      throw new Error("Transaction not found");
    }

    return {
      hash: tx.hash,
      blockHash: tx.blockHash,
      category: tx.category,
      data: tx.data as TxDto["data"],
      timestamp: tx.timestamp,
    };
  }
}
