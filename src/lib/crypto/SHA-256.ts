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

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

// tslint:disable no-bitwise

import Hash from './Hash';

const K = [
    0x428a2f98,
    0x71374491,
    0xb5c0fbcf,
    0xe9b5dba5,
    0x3956c25b,
    0x59f111f1,
    0x923f82a4,
    0xab1c5ed5,
    0xd807aa98,
    0x12835b01,
    0x243185be,
    0x550c7dc3,
    0x72be5d74,
    0x80deb1fe,
    0x9bdc06a7,
    0xc19bf174,
    0xe49b69c1,
    0xefbe4786,
    0x0fc19dc6,
    0x240ca1cc,
    0x2de92c6f,
    0x4a7484aa,
    0x5cb0a9dc,
    0x76f988da,
    0x983e5152,
    0xa831c66d,
    0xb00327c8,
    0xbf597fc7,
    0xc6e00bf3,
    0xd5a79147,
    0x06ca6351,
    0x14292967,
    0x27b70a85,
    0x2e1b2138,
    0x4d2c6dfc,
    0x53380d13,
    0x650a7354,
    0x766a0abb,
    0x81c2c92e,
    0x92722c85,
    0xa2bfe8a1,
    0xa81a664b,
    0xc24b8b70,
    0xc76c51a3,
    0xd192e819,
    0xd6990624,
    0xf40e3585,
    0x106aa070,
    0x19a4c116,
    0x1e376c08,
    0x2748774c,
    0x34b0bcb5,
    0x391c0cb3,
    0x4ed8aa4a,
    0x5b9cca4f,
    0x682e6ff3,
    0x748f82ee,
    0x78a5636f,
    0x84c87814,
    0x8cc70208,
    0x90befffa,
    0xa4506ceb,
    0xbef9a3f7,
    0xc67178f2
];

function ch(x: number, y: number, z: number) {
    return z ^ (x & (y ^ z));
}

function maj(x: number, y: number, z: number) {
    return (x & y) | (z & (x | y));
}

function sigma0(x: number) {
    return ((x >>> 2) | (x << 30)) ^ ((x >>> 13) | (x << 19)) ^ ((x >>> 22) | (x << 10));
}

function sigma1(x: number) {
    return ((x >>> 6) | (x << 26)) ^ ((x >>> 11) | (x << 21)) ^ ((x >>> 25) | (x << 7));
}

function gamma0(x: number) {
    return ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
}

function gamma1(x: number) {
    return ((x >>> 17) | (x << 15)) ^ ((x >>> 19) | (x << 13)) ^ (x >>> 10);
}

export default class Sha256 extends Hash {
    private _a = 0x6a09e667;
    private _b = 0xbb67ae85;
    private _c = 0x3c6ef372;
    private _d = 0xa54ff53a;
    private _e = 0x510e527f;
    private _f = 0x9b05688c;
    private _g = 0x1f83d9ab;
    private _h = 0x5be0cd19;
    private _w = new Array(64);

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
        let f = this._f | 0;
        let g = this._g | 0;
        let h = this._h | 0;

        let i;
        for (i = 0; i < 16; ++i) {
            W[i] = M.readInt32BE(i * 4);
        }
        for (; i < 64; ++i) {
            W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0;
        }

        for (let j = 0; j < 64; ++j) {
            const T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0;
            const T2 = (sigma0(a) + maj(a, b, c)) | 0;

            h = g;
            g = f;
            f = e;
            e = (d + T1) | 0;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2) | 0;
        }

        this._a = (a + this._a) | 0;
        this._b = (b + this._b) | 0;
        this._c = (c + this._c) | 0;
        this._d = (d + this._d) | 0;
        this._e = (e + this._e) | 0;
        this._f = (f + this._f) | 0;
        this._g = (g + this._g) | 0;
        this._h = (h + this._h) | 0;
    }

    public _hash(): Buffer {
        const H = Buffer.allocUnsafe(32);

        H.writeInt32BE(this._a, 0);
        H.writeInt32BE(this._b, 4);
        H.writeInt32BE(this._c, 8);
        H.writeInt32BE(this._d, 12);
        H.writeInt32BE(this._e, 16);
        H.writeInt32BE(this._f, 20);
        H.writeInt32BE(this._g, 24);
        H.writeInt32BE(this._h, 28);

        return H;
    }
}
