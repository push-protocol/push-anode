import { Contract, ethers, Wallet } from 'ethers';
import StrUtil from '../../utils/strUtil';
import fs from 'fs';
import path from 'path';
import { JsonRpcProvider } from '@ethersproject/providers';
import { EnvLoader } from '../../utils/envLoader';
import { Logger } from 'winston';
import { WinstonUtil } from '../../utils/winstonUtil';
import { Injectable, OnModuleInit } from '@nestjs/common';

/*
Validator contract abstraction.
All blockchain goes here
 */
@Injectable()
export class ValidatorContractState implements OnModuleInit {
  nodeId!: string;
  wallet!: Wallet;

  public log: Logger = WinstonUtil.newLog(ValidatorContractState);

  private contractFactory: ContractClientFactory;
  public contractCli: ValidatorCtClient;

  public async onModuleInit() {
    this.log.info('ValidatorContractState.onModuleInit()');

    // Initialize contract factory and client
    this.contractFactory = new ContractClientFactory();
    this.contractCli = await this.contractFactory.buildROClient(this.log);
    await this.contractCli.connect();

    // Set wallet and nodeId
    this.wallet = this.contractFactory.nodeWallet;

    this.nodeId = this.wallet.address;

    // Perform necessary checks
    if (!this.wallet) throw new Error('wallet is not loaded');
    if (this.contractCli.vnodes == null)
      throw new Error('Nodes are not initialized');
  }

  public isActiveValidator(nodeId: string): boolean {
    const vi = this.contractCli.vnodes.get(nodeId);
    return vi != null;
  }

  public getAllNodesMap(): Map<string, NodeInfo> {
    return this.contractCli.vnodes;
  }

  public getValidatorNodesMap(): Map<string, NodeInfo> {
    return this.contractCli.vnodes;
  }

  public getStorageNodesMap(): Map<string, NodeInfo> {
    return this.contractCli.snodes;
  }

  public getActiveValidatorsExceptSelf(): NodeInfo[] {
    const allNodes = Array.from(this.getAllNodesMap().values());
    const onlyGoodValidators = allNodes.filter(
      (ni) =>
        ni.nodeType == NodeType.VNode &&
        ValidatorContractState.isEnabled(ni) &&
        this.nodeId !== ni.nodeId,
    );
    return onlyGoodValidators;
  }

  public getActiveValidators(): NodeInfo[] {
    const allNodes = Array.from(this.getAllNodesMap().values());
    const onlyGoodValidators = allNodes.filter(
      (ni) =>
        ni.nodeType == NodeType.VNode && ValidatorContractState.isEnabled(ni),
    );
    return onlyGoodValidators;
  }

  public getAllValidatorsExceptSelf(): NodeInfo[] {
    const allNodes = Array.from(this.getAllNodesMap().values());
    const onlyGoodValidators = allNodes.filter(
      (ni) =>
        ni.nodeType == NodeType.VNode &&
        ValidatorContractState.isEnabled(ni) &&
        this.nodeId !== ni.nodeId,
    );
    return onlyGoodValidators;
  }

  public static isEnabled(ni: NodeInfo) {
    return (
      ni.nodeStatus == NodeStatus.OK ||
      ni.nodeStatus == NodeStatus.Reported ||
      ni.nodeStatus == NodeStatus.Slashed
    );
  }
}

class ContractClientFactory {
  private validatorCtAddr: string;
  private provider: JsonRpcProvider;
  private abi: string;
  private validatorRpcEndpoint: string;
  private validatorRpcNetwork: number;
  private configDir: string;
  private validatorPrivateKeyFile: string;
  private validatorPrivateKeyPass: string;
  nodeWallet!: Wallet; // Definite assignment assertion
  private nodeAddress: string;

  constructor() {
    this.validatorCtAddr = EnvLoader.getPropertyOrFail(
      'VALIDATOR_CONTRACT_ADDRESS',
    );

    this.validatorRpcEndpoint = EnvLoader.getPropertyOrFail(
      'VALIDATOR_RPC_ENDPOINT',
    );
    this.validatorRpcNetwork = Number.parseInt(
      EnvLoader.getPropertyOrFail('VALIDATOR_RPC_NETWORK'),
    );
    this.provider = new ethers.providers.JsonRpcProvider(
      this.validatorRpcEndpoint,
      this.validatorRpcNetwork,
    );

    this.configDir = EnvLoader.getPropertyOrFail('CONFIG_DIR');
    this.abi = ContractClientFactory.loadValidatorContractAbi(
      this.configDir,
      'ValidatorV1.json',
    );
  }

  private static loadValidatorContractAbi(
    configDir: string,
    fileNameInConfigDir: string,
  ): string {
    const fileAbsolute = path.resolve(configDir, `./${fileNameInConfigDir}`);
    const file = fs.readFileSync(fileAbsolute, 'utf8');
    const json = JSON.parse(file);
    const abi = json.abi;
    console.log(`abi size:`, abi.length);
    return abi;
  }

  public async buildROClient(log: Logger): Promise<ValidatorCtClient> {
    this.validatorPrivateKeyFile = EnvLoader.getPropertyOrFail(
      'VALIDATOR_PRIVATE_KEY_FILE',
    );
    this.validatorPrivateKeyPass = EnvLoader.getPropertyOrFail(
      'VALIDATOR_PRIVATE_KEY_PASS',
    );

    const jsonFile = fs.readFileSync(
      this.configDir + '/' + this.validatorPrivateKeyFile,
      'utf-8',
    );
    this.nodeWallet = await Wallet.fromEncryptedJson(
      jsonFile,
      this.validatorPrivateKeyPass,
    );
    this.nodeAddress = await this.nodeWallet.getAddress();
    const contract = new ethers.Contract(
      this.validatorCtAddr,
      this.abi,
      this.provider,
    );
    return new ValidatorCtClient(contract, log);
  }
}

interface ValidatorContract {
  valPerBlock(): Promise<number>;

  valPerBlockTarget(): Promise<number>;

  nodeRandomMinCount(): Promise<number>;

  nodeRandomPingCount(): Promise<number>;

  getVNodes(): Promise<string[]>;

  getSNodes(): Promise<string[]>;

  getDNodes(): Promise<string[]>;

  getNodeInfo(address: string): Promise<NodeInfo2>;
}

interface NodeInfo2 {
  shortAddr: number;
  ownerWallet: string;
  nodeWallet: string;
  nodeType: NodeType;
  nodeTokens: number;
  nodeApiBaseUrl: string;
  counters: any;
  status: NodeStatus;
}

type TypedValidatorContract = ValidatorContract & Contract;

// all Validator contract interactions are wrapped into this class
// todo update with new events
export class ValidatorCtClient {
  contract: TypedValidatorContract;
  private log: Logger;

  vnodes: Map<string, NodeInfo> = new Map<string, NodeInfo>();
  snodes: Map<string, NodeInfo> = new Map<string, NodeInfo>();
  dnodes: Map<string, NodeInfo> = new Map<string, NodeInfo>();

  // Initialize with default values
  public valPerBlock: number = 0; // Default initialization
  private valPerBlockTarget: number = 0; // Default initialization
  public nodeRandomMinCount: number = 0; // Default initialization
  public nodeRandomPingCount: number = 0; // Default initialization

  constructor(contract: ethers.Contract, log: Logger) {
    this.contract = <TypedValidatorContract>contract;
    this.log = log;
  }

  private async loadConstantsAndSubscribeToUpdates() {
    this.valPerBlock = await this.contract.valPerBlock();
    this.valPerBlockTarget = await this.contract.valPerBlockTarget();
    this.log.info(`valPerBlock=${this.valPerBlock}`);
    if (this.valPerBlock == null) {
      throw new Error('valPerBlock is undefined');
    }
    this.contract.on(
      'BlockParamsUpdated',
      (valPerBlock: number, valPerBlockTarget: number) => {
        this.valPerBlock = valPerBlock;
        this.valPerBlockTarget = valPerBlockTarget;
        this.log.info(`attestersRequired=${this.valPerBlock}`);
      },
    );

    this.nodeRandomMinCount = await this.contract.nodeRandomMinCount();
    this.log.info(`nodeRandomMinCount=${this.nodeRandomMinCount}`);
    if (this.nodeRandomMinCount == null) {
      throw new Error('nodeRandomMinCount is undefined');
    }

    this.nodeRandomPingCount = await this.contract.nodeRandomPingCount();
    this.log.info(`nodeRandomPingCount=${this.nodeRandomPingCount}`);

    this.contract.on(
      'RandomParamsUpdated',
      (nodeRandomMinCount: number, nodeRandomPingCount: number) => {
        this.nodeRandomMinCount = nodeRandomMinCount;
        this.nodeRandomPingCount = nodeRandomPingCount;
        this.log.info(`nodeRandomMinCount=${this.nodeRandomMinCount}`);
      },
    );
  }

  // todo work with corrupted url's: returning nulls as of now
  private fixNodeUrl(nodeUrl: string): string {
    if (nodeUrl.length > 100) {
      this.log.error('nodeUrl should be less than 100 chars');
      return '';
    }

    try {
      // Ensure nodeUrl is non-null before passing to URL constructor
      const urlObj = new URL(nodeUrl);

      if (EnvLoader.getPropertyAsBool('LOCALH') && !StrUtil.isEmpty(nodeUrl)) {
        if (urlObj.hostname.endsWith('.local')) {
          urlObj.hostname = 'localhost';
        }
      }

      let fixedUrl = urlObj.toString();
      if (fixedUrl.endsWith('/')) {
        fixedUrl = fixedUrl.slice(0, -1);
      }
      return fixedUrl;
    } catch (e) {
      this.log.error(e);
      return '';
    }
  }

  private async loadVSDNodesAndSubscribeToUpdates() {
    const vNodes = await this.contract.getVNodes();
    for (const nodeAddr of vNodes) {
      const niFromCt = await this.contract.getNodeInfo(nodeAddr);
      const ni = new NodeInfo(
        niFromCt.nodeWallet,
        this.fixNodeUrl(niFromCt.nodeApiBaseUrl),
        niFromCt.nodeType,
        niFromCt.status,
      );
      this.vnodes.set(niFromCt.nodeWallet, ni);
    }
    this.log.info('validator nodes loaded %o', this.vnodes);

    const sNodes = await this.contract.getSNodes();
    for (const nodeAddr of sNodes) {
      const niFromCt = await this.contract.getNodeInfo(nodeAddr);
      const ni = new NodeInfo(
        niFromCt.nodeWallet,
        this.fixNodeUrl(niFromCt.nodeApiBaseUrl),
        niFromCt.nodeType,
        niFromCt.status,
      );
      this.snodes.set(niFromCt.nodeWallet, ni);
    }
    this.log.info('storage nodes loaded %o', this.snodes);

    const dNodes = await this.contract.getDNodes();
    for (const nodeAddr of dNodes) {
      const niFromCt = await this.contract.getNodeInfo(nodeAddr);
      const ni = new NodeInfo(
        niFromCt.nodeWallet,
        this.fixNodeUrl(niFromCt.nodeApiBaseUrl),
        niFromCt.nodeType,
        niFromCt.status,
      );
      this.dnodes.set(niFromCt.nodeWallet, ni);
    }
    this.log.info('delivery nodes loaded %o', this.dnodes);

    this.contract.on(
      'NodeAdded',
      (
        ownerWallet: string,
        nodeWallet: string,
        nodeType: number,
        nodeTokens: number,
        nodeApiBaseUrl: string,
      ) => {
        nodeApiBaseUrl = this.fixNodeUrl(nodeApiBaseUrl);
        this.log.info('NodeAdded %o', arguments);
        this.log.info(
          'NodeAdded %s %s %s %s %s',
          ownerWallet,
          nodeWallet,
          nodeType,
          nodeTokens,
          nodeApiBaseUrl,
        );
        const nodeMapByType = this.getNodeMapByType(nodeType);
        const ni = new NodeInfo(
          nodeWallet,
          nodeApiBaseUrl,
          nodeType,
          NodeStatus.OK,
        );
        nodeMapByType.set(nodeWallet, ni);
        this.log.info(
          'NodeAdded: nodeType: %s , %s -> %s',
          nodeType,
          nodeWallet,
          JSON.stringify(ni),
        );
      },
    );

    this.contract.on(
      'NodeStatusChanged',
      (nodeWallet: string, nodeStatus: number, nodeTokens: number) => {
        this.log.info('NodeStatusChanged', arguments);
        this.log.info('NodeStatusChanged', nodeWallet, nodeStatus, nodeTokens);
        const ni =
          this.vnodes.get(nodeWallet) ??
          this.snodes.get(nodeWallet) ??
          this.dnodes.get(nodeWallet);
        if (ni == null) {
          this.log.error(`unknown node ${nodeWallet}`);
          return;
        }
        ni.nodeStatus = nodeStatus;
      },
    );
  }

  private getNodeMapByType(nodeType: NodeType) {
    if (nodeType == NodeType.VNode) {
      return this.vnodes;
    } else if (nodeType == NodeType.SNode) {
      return this.snodes;
    } else if (nodeType == NodeType.DNode) {
      return this.dnodes;
    } else {
      throw new Error('unsupported node type ' + nodeType);
    }
  }

  async connect() {
    await this.loadConstantsAndSubscribeToUpdates();
    const result = this.loadNodesFromEnv();
    if (result != null) {
      // we have a debug variable set; no need to do blockchain
      this.vnodes = result;
      return;
    }
    await this.loadVSDNodesAndSubscribeToUpdates();
  }

  private loadNodesFromEnv(): Map<string, NodeInfo> | null {
    const testValidatorsEnv = process.env.VALIDATOR_CONTRACT_TEST_VALIDATORS;
    if (testValidatorsEnv) {
      // test mode
      const testValidators = <{ validators: NodeInfo[] }>(
        JSON.parse(testValidatorsEnv)
      );
      const result = new Map<string, NodeInfo>();
      for (const vi of testValidators.validators) {
        vi.nodeId = StrUtil.normalizeEthAddress(vi.nodeId);
        result.set(vi.nodeId, vi);
      }
      return result;
    } else {
      return null;
    }
  }
}

// from smart contract
export enum NodeStatus {
  OK,
  Reported,
  Slashed,
  BannedAndUnstaked,
  Unstaked,
}

export class NodeInfo {
  nodeId: string;
  url: string;
  nodeType: NodeType;
  nodeStatus: NodeStatus;

  constructor(
    nodeId: string,
    url: string,
    nodeType: NodeType,
    nodeStatus: NodeStatus,
  ) {
    this.nodeId = nodeId;
    this.url = url;
    this.nodeType = nodeType;
    this.nodeStatus = nodeStatus;
  }
}

export enum NodeType {
  VNode = 0, // validator 0
  SNode = 1, // storage 1
  DNode = 2, // delivery 2
}