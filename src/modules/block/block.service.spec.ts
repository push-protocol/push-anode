import { Test, TestingModule } from "@nestjs/testing";
import { BlockService } from "./block.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("BlockService", () => {
  let service: BlockService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        {
          provide: PrismaService,
          useValue: {
            block: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<BlockService>(BlockService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getBlocksPaginated", () => {
    it("should return paginated blocks", async () => {
      const mockBlocks = [
        { hash: "hash1", metaData: {}, timestamp: new Date() },
        { hash: "hash2", metaData: {}, timestamp: new Date() },
      ];
      const totalItems = 2;

      jest
        .spyOn(prismaService.block, "findMany")
        .mockResolvedValue(mockBlocks);
      jest.spyOn(prismaService.block, "count").mockResolvedValue(totalItems);

      const params = {
        page: 1,
        pageSize: 10,
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-12-31T23:59:59Z",
      };

      const result = await service.getBlocksPaginated(params);

      expect(result.items).toEqual(mockBlocks);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalItems).toBe(totalItems);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe("getBlockByHash", () => {
    it("should return block by hash", async () => {
      const mockBlock = {
        hash: "hash1",
        metaData: {},
        timestamp: new Date(),
      };

      jest
        .spyOn(prismaService.block, "findUnique")
        .mockResolvedValue(mockBlock);

      const result = await service.getBlockByHash({ hash: "hash1" });

      expect(result).toEqual(mockBlock);
    });

    it("should throw an error if block not found", async () => {
      jest.spyOn(prismaService.block, "findUnique").mockResolvedValue(null);

      await expect(
        service.getBlockByHash({ hash: "nonExistentHash" })
      ).rejects.toThrow("Block not found");
    });
  });
});
