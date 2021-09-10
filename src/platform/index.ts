/* istanbul ignore file */

import fetch from 'node-fetch';
import WebSocket from 'ws';
import {
    createHash as nodeCreateHash,
    createHmac as nodeCreateHmac,
    randomBytes as nodeRandomBytes,
    Hash,
    Hmac
} from 'crypto';

const ianaNames = new Map([
    ['md2', 'md2'],
    ['md5', 'md5'],
    ['sha-1', 'sha1'],
    ['sha-224', 'sha224'],
    ['sha-256', 'sha256'],
    ['sha-384', 'sha384'],
    ['sha-512', 'sha512']
]);

export function getHashes() {
    return ['sha-1', 'sha-256', 'sha-384', 'sha-512', 'md5'];
}

export function createHash(alg: string) {
    return nodeCreateHash(ianaNames.get(alg.toLowerCase()) || alg);
}

export function createHmac(alg: string, key: string | Buffer) {
    return nodeCreateHmac(ianaNames.get(alg.toLowerCase()) || alg, key);
}

export function randomBytes(size: number) {
    return nodeRandomBytes(size);
}

const nativeRTCPeerConnection = undefined;
export const name = 'node';

export { fetch, Hash, Hmac, nativeRTCPeerConnection as RTCPeerConnection, WebSocket };
