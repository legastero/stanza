/* istanbul ignore file */

import { Buffer } from './buffer';
import createHash, { Hash } from './crypto/createHash';
import Hmac from './crypto/Hmac';
import { Readable, Writable, Transform, PassThrough, Duplex } from './stream';

export function randomBytes(size: number): Buffer {
    const rawBytes = new Uint8Array(size);
    if (size > 0) {
        (globalThis.crypto || (globalThis as any).msCrypto).getRandomValues(rawBytes);
    }
    return Buffer.from(rawBytes.buffer);
}

export function getHashes(): string[] {
    return ['sha-1', 'sha-256', 'sha-512', 'md5'];
}

export function createHmac(alg: string, key: string | Buffer): Hmac {
    return new Hmac(alg.toLowerCase(), key);
}

export type Resolver = undefined;
export function createResolver(): Resolver | undefined {
    return undefined;
}

const nativeFetch = globalThis.fetch.bind(globalThis);
const nativeWS = globalThis.WebSocket;

const nativeRTCPeerConnection: RTCPeerConnection | undefined = (globalThis as any)
    .RTCPeerConnection;

export const name = 'browser';
export {
    Buffer,
    createHash,
    Hash,
    Hmac,
    nativeFetch as fetch,
    nativeRTCPeerConnection as RTCPeerConnection,
    nativeWS as WebSocket,
    Readable,
    Writable,
    Transform,
    Duplex,
    PassThrough
};
