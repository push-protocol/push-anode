import { Test, TestingModule } from "@nestjs/testing";
import { TxService } from "./tx.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TxService", () => {
  let service: TxService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TxService,
        {
          provide: PrismaService,
          useValue: {
            tx: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TxService>(TxService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getTxsPaginated", () => {
    it("should return paginated transactions", async () => {
      const mockTransactions = [
        {
          hash: "hash1",
          blockHash: "blockHash1",
          category: "category1",
          data: {},
          timestamp: new Date(),
        },
        {
          hash: "hash2",
          blockHash: "blockHash2",
          category: "category2",
          data: {},
          timestamp: new Date(),
        },
      ];
      const totalItems = 2;

      jest
        .spyOn(prismaService.tx, "findMany")
        .mockResolvedValue(mockTransactions);
      jest.spyOn(prismaService.tx, "count").mockResolvedValue(totalItems);

      const params = {
        page: 1,
        pageSize: 10,
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-12-31T23:59:59Z",
      };

      const result = await service.getTxsPaginated(params);

      expect(result.items).toEqual(mockTransactions);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalItems).toBe(totalItems);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe("getTxByHash", () => {
    it("should return transaction by hash", async () => {
      const mockTransaction = {
        hash: "hash1",
        blockHash: "blockHash1",
        category: "category1",
        data: {},
        timestamp: new Date(),
      };

      jest
        .spyOn(prismaService.tx, "findUnique")
        .mockResolvedValue(mockTransaction);

      const result = await service.getTxByHash({ hash: "hash1" });

      expect(result).toEqual(mockTransaction);
    });

    it("should throw an error if transaction not found", async () => {
      jest.spyOn(prismaService.tx, "findUnique").mockResolvedValue(null);

      await expect(
        service.getTxByHash({ hash: "nonExistentHash" })
      ).rejects.toThrow("Transaction not found");
    });
  });
});
