import { Test, TestingModule } from '@nestjs/testing';
import { ArchieveSync } from './archieveSync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidatorContractState } from '../validator/validator-contract-state.service';

process.env.VALIDATOR_CONTRACT_ADDRESS =
  '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9';
process.env.VALIDATOR_PUSH_TOKEN_ADDRESS =
  '0x5FbDB2315678afecb367f032d93F642f64180aa3';
describe('ArchieveSync', () => {
  let service: ArchieveSync;
  let validatorContractState: ValidatorContractState;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArchieveSync, PrismaService, ValidatorContractState],
    }).compile();

    service = module.get<ArchieveSync>(ArchieveSync);
    validatorContractState = module.get<ValidatorContractState>(
      ValidatorContractState,
    );
    await validatorContractState.onModuleInit();
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getANodeMap', () => {
    it('Should retrieve active archival nodes', async () => {
      const nodeInfo = await service.getANodeMap();
      console.log(nodeInfo);
    });
  });

  describe("initBlockSync", () => {
    it("Should initialize block sync", async () => {
      const blockSync = await service.initBlockSync();
      console.log(blockSync);
    });
  })
});
