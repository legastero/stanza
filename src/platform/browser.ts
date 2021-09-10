/* istanbul ignore file */

import createHash, { Hash } from './crypto/createHash';
import Hmac from './crypto/Hmac';

export function randomBytes(size: number) {
    const rawBytes = new Uint8Array(size);
    if (size > 0) {
        (globalThis.crypto || (globalThis as any).msCrypto).getRandomValues(rawBytes);
    }
    return Buffer.from(rawBytes.buffer);
}

export function getHashes() {
    return ['sha-1', 'sha-256', 'sha-512', 'md5'];
}

export function createHmac(alg: string, key: string | Buffer): Hmac {
    return new Hmac(alg.toLowerCase(), key);
}

const nativeFetch = globalThis.fetch.bind(globalThis);
const nativeWS = globalThis.WebSocket;

const nativeRTCPeerConnection: RTCPeerConnection | undefined = (globalThis as any)
    .RTCPeerConnection;

export const name = 'browser';

export {
    createHash,
    Hash,
    Hmac,
    nativeFetch as fetch,
    nativeWS as WebSocket,
    nativeRTCPeerConnection as RTCPeerConnection
};
