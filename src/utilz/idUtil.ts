import { randomBytes } from 'crypto';
import * as uuid from "uuid";

export default class IdUtil {

    public static getUuidV4(): string {
        return uuid.v4();
    }

    public static getUuidV4AsBytes(): Uint8Array {
        const uint8ArrayOrArrayLikeInNode20_9 = uuid.parse(uuid.v4());
        return Uint8Array.from(uint8ArrayOrArrayLikeInNode20_9)
    }

     /**
     * Generates a cryptographically secure random nonce for authentication.
     * @returns Hexadecimal string representation of the nonce
     * @private
     */
     public static generateNonce(): string {
        return randomBytes(32).toString('hex');
    }
}