/**
 * This file is derived from prior work.
 *
 * See NOTICE.md for full license text.
 *
 * Derived from:
 * - hash-base, Copyright (c) 2016 Kirill Fomichev
 * - cipher-base, Copyright (c) 2017 crypto-browserify contributors
 * - create-hash, Copyright (c) 2017 crypto-browserify contributors
 * - create-hmac, Copyright (c) 2017 crypto-browserify contributors
 * - randombytes, Copyright (c) 2017 crypto-browserify
 */

// tslint:disable no-bitwise

/* istanbul ignore file */

import { Transform } from 'readable-stream';

import createHash, { Hash } from './createHash';

const ZEROS = Buffer.alloc(128);

export default class Hmac extends Transform {
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
            key = createHash(alg).update(key).digest();
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

    public _transform(
        data: Buffer | string,
        enc: string | undefined,
        next: (err?: Error) => void
    ): void {
        let err: any;
        try {
            this.update(data, enc);
        } catch (e) {
            err = e;
        } finally {
            next(err);
        }
    }

    public _flush(done: (err?: Error) => void): void {
        let err: any;
        try {
            this.push(this._final());
        } catch (e) {
            err = e;
        }

        done(err);
    }

    public _final(): Buffer {
        const h = this._hash.digest();
        return createHash(this._alg).update(this._opad).update(h).digest();
    }

    public update(data: Buffer | string, inputEnc?: string): this {
        this._hash.update(data, inputEnc as BufferEncoding);
        return this;
    }

    public digest(outputEnc?: BufferEncoding): Buffer | string {
        const outData = this._final() || Buffer.alloc(0);
        if (outputEnc) {
            return outData.toString(outputEnc);
        }
        return outData;
    }
}
