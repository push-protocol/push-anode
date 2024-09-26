export interface QItem {
  id: number;
  object: any;
  object_hash: string;
}

export interface DCmd {
  // Command structure here
}

export interface Consumer<T> {
  accept(item: T): Promise<boolean>;
}
