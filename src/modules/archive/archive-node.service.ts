import { Service } from 'typedi';
import { Consumer, QItem } from '../../messaging/types/queue-types';
import {Block} from '@pushprotocol/node-core'
@Service()
export class ArchiveNodeService implements Consumer<QItem> {
  public async accept(item: QItem): Promise<boolean> {

    
   try {
    console.log("Hellooo")
     if (!item.object || typeof item.object !== 'string') {
       throw new Error(
         'Invalid object: item.object must be a valid hex string.',
       );
     }

     // Validate that the string contains only hex characters
     if (!/^[0-9a-fA-F]+$/.test(item.object)) {
       throw new Error('Invalid hex string.');
     }

    const bytes = Uint8Array.from(Buffer.from(item.object, 'hex'));
    const b = Block.deserialize(bytes);
    console.log(b)
     // Attempt deserialization
    /* const b = Block.deserializeBinary(
       Uint8Array.from(Buffer.from(item.object, 'hex')),
     ).toObject();*/

     // Further processing with `b`
   } catch (error) {
     console.log('Failed to deserialize Block:', error);
     // Optionally re-throw the error or handle it gracefully
   }
    //console.log('Hello ', b);

    // Process the message block (e.g., store, process, or distribute)
    return true;
  }
}
