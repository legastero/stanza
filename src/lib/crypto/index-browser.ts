// tslint:disable no-bitwise

import { Transform } from 'readable-stream';

import Hash from './Hash';
import MD5 from './MD5';
import SHA1 from './SHA-1';
import SHA256 from './SHA-256';
import SHA512 from './SHA-512';

let root: any;
if (typeof window !== 'undefined') {
    root = window;
} else if (typeof global !== 'undefined') {
    root = global;
}

// ====================================================================
const ZEROS = Buffer.alloc(128);

export class Hmac extends Transform {
    private _alg: string;
    private _hash: Hash;
    private _ipad: Buffer;
    private _opad: Buffer;

    constructor(alg: string, key: string | Buffer) {
        super();

        if (typeof key === 'string') {
            key = Buffer.from(key);
        }

        const blocksize = alg === 'sha512' ? 128 : 64;

        this._alg = alg;
        if (key.length > blocksize) {
            key = createHash(alg)
                .update(key)
                .digest();
        } else if (key.length < blocksize) {
            key = Buffer.concat([key, ZEROS], blocksize);
        }

        this._ipad = Buffer.alloc(blocksize);
        this._opad = Buffer.alloc(blocksize);

        for (let i = 0; i < blocksize; i++) {
            this._ipad[i] = key[i] ^ 0x36;
            this._opad[i] = key[i] ^ 0x5c;
        }

        this._hash = createHash(alg).update(this._ipad);
    }

    public _transform(data: Buffer | string, enc: string | undefined, next: (err?: Error) => void) {
        let err;
        try {
            this.update(data, enc);
        } catch (e) {
            err = e;
        } finally {
            next(err);
        }
    }

    public _flush(done: (err?: Error) => void) {
        let err: any;
        try {
            this.push(this._final());
        } catch (e) {
            err = e;
        }

        done(err);
    }

    public _final() {
        const h = this._hash.digest();
        return createHash(this._alg)
            .update(this._opad)
            .update(h)
            .digest();
    }

    public update(data: Buffer | string, inputEnc?: string): this {
        this._hash.update(data, inputEnc as BufferEncoding);
        return this;
    }

    public digest(outputEnc?: string) {
        const outData = this._final() || Buffer.alloc(0);
        if (outputEnc) {
            return outData.toString(outputEnc);
        }
        return outData;
    }
}
// ====================================================================

const HASH_IMPLEMENTATIONS = new Map<string, any>([
    ['md5', MD5],
    ['sha-1', SHA1],
    ['sha-256', SHA256],
    ['sha-512', SHA512],
    ['sha1', SHA1],
    ['sha256', SHA256],
    ['sha512', SHA512]
]);

export { Hash };

export function randomBytes(size: number) {
    const rawBytes = new Uint8Array(size);
    if (size > 0) {
        root.crypto.getRandomValues(rawBytes);
    }
    return Buffer.from(rawBytes.buffer);
}

export function getHashes() {
    return ['sha-1', 'sha-256', 'sha-512', 'md5'];
}

export function createHash(alg: string): Hash {
    alg = alg.toLowerCase();
    const HashImp = HASH_IMPLEMENTATIONS.get(alg);
    if (HashImp) {
        return new HashImp() as Hash;
    } else {
        throw new Error('Unsupported hash algorithm: ' + alg);
    }
}

export function createHmac(alg: string, key: string): Hmac {
    return new Hmac(alg.toLowerCase(), key);
}
