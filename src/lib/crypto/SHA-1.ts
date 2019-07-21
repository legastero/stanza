/**
 * This file is derived from prior work.
 *
 * See NOTICE.md for full license text.
 *
 * Derived from:
 * - hash-base, Copyright (c) 2016 Kirill Fomichev
 * - cipher-base, Copyright (c) 2017 crypto-browserify contributors
 * - sha.js, Copyright (c) 2013-2018 sha.js contributors
 */

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

// tslint:disable no-bitwise

import Hash from './Hash';

const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0];

function rotl1(num: number) {
    return (num << 1) | (num >>> 31);
}

function rotl5(num: number) {
    return (num << 5) | (num >>> 27);
}

function rotl30(num: number) {
    return (num << 30) | (num >>> 2);
}

function ft(s: number, b: number, c: number, d: number) {
    if (s === 0) {
        return (b & c) | (~b & d);
    }
    if (s === 2) {
        return (b & c) | (b & d) | (c & d);
    }
    return b ^ c ^ d;
}

export default class Sha1 extends Hash {
    private _a = 0x67452301;
    private _b = 0xefcdab89;
    private _c = 0x98badcfe;
    private _d = 0x10325476;
    private _e = 0xc3d2e1f0;
    private _w = new Array(80);

    constructor() {
        super(64, 56);
    }

    public _update(M: Buffer): void {
        const W = this._w;

        let a = this._a | 0;
        let b = this._b | 0;
        let c = this._c | 0;
        let d = this._d | 0;
        let e = this._e | 0;

        let i;
        for (i = 0; i < 16; ++i) {
            W[i] = M.readInt32BE(i * 4);
        }
        for (; i < 80; ++i) {
            W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]);
        }

        for (let j = 0; j < 80; ++j) {
            const s = ~~(j / 20);
            const t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0;

            e = d;
            d = c;
            c = rotl30(b);
            b = a;
            a = t;
        }

        this._a = (a + this._a) | 0;
        this._b = (b + this._b) | 0;
        this._c = (c + this._c) | 0;
        this._d = (d + this._d) | 0;
        this._e = (e + this._e) | 0;
    }

    public _hash(): Buffer {
        const H = Buffer.allocUnsafe(20);

        H.writeInt32BE(this._a | 0, 0);
        H.writeInt32BE(this._b | 0, 4);
        H.writeInt32BE(this._c | 0, 8);
        H.writeInt32BE(this._d | 0, 12);
        H.writeInt32BE(this._e | 0, 16);

        return H;
    }
}
