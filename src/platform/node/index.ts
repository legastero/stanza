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
import * as dns from 'dns';
import { Buffer } from 'buffer';
import { Readable, Writable, Transform, PassThrough, Duplex } from 'stream';

const ianaNames = new Map([
    ['md2', 'md2'],
    ['md5', 'md5'],
    ['sha-1', 'sha1'],
    ['sha-224', 'sha224'],
    ['sha-256', 'sha256'],
    ['sha-384', 'sha384'],
    ['sha-512', 'sha512']
]);

export function getHashes(): string[] {
    return ['sha-1', 'sha-256', 'sha-384', 'sha-512', 'md5'];
}

export function createHash(alg: string): Hash {
    return nodeCreateHash(ianaNames.get(alg.toLowerCase()) || alg);
}

export function createHmac(alg: string, key: string | Buffer): Hmac {
    return nodeCreateHmac(ianaNames.get(alg.toLowerCase()) || alg, key);
}

export function randomBytes(size: number): Buffer {
    return nodeRandomBytes(size);
}

export type Resolver = dns.promises.Resolver;
export function createResolver(opts?: dns.ResolverOptions): Resolver | undefined {
    return new dns.promises.Resolver(opts);
}

const nativeRTCPeerConnection: RTCPeerConnection | undefined = undefined;

export const name = 'node';
export {
    Buffer,
    fetch,
    Hash,
    Hmac,
    nativeRTCPeerConnection as RTCPeerConnection,
    WebSocket,
    Readable,
    Writable,
    Transform,
    Duplex,
    PassThrough
};
