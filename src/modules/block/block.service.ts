import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginatedResponseDto } from "../../common/dto/paginated-response.dto";
import { BlockDto } from "./dto/block.dto";

@Injectable()
export class BlockService {
  constructor(private prisma: PrismaService) {}

  async getBlocksPaginated(params: {
    page?: number;
    pageSize?: number;
    startTime?: string;
    endTime?: string;
  }): Promise<PaginatedResponseDto<BlockDto>> {
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

    const [blocks, totalItems] = await Promise.all([
      this.prisma.block.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          timestamp: "desc",
        },
      }),
      this.prisma.block.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    const blockDtos: BlockDto[] = blocks.map((block) => ({
      hash: block.hash,
      metaData: block.metaData as BlockDto["metaData"], // Cast to your DTO type
      timestamp: block.timestamp,
    }));

    return {
      items: blockDtos,
      meta: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async getBlockByHash(params: { hash: string }): Promise<BlockDto> {
    const block = await this.prisma.block.findUnique({
      where: { hash: params.hash },
    });

    if (!block) {
      throw new Error("Block not found");
    }

    return {
      hash: block.hash,
      metaData: block.metaData as BlockDto["metaData"], // Cast to your DTO type
      timestamp: block.timestamp,
    };
  }
}
