export interface Transaction {
  ts: Date;
  block_hash: string;
  category: string;
  source: string;
  recipients?: JSON;
  data: string;
  data_as_json?: JSON;
  sig: string;
}