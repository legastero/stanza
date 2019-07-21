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

// tslint:disable no-bitwise

import Hash from './Hash';

const K = [
    0x428a2f98,
    0xd728ae22,
    0x71374491,
    0x23ef65cd,
    0xb5c0fbcf,
    0xec4d3b2f,
    0xe9b5dba5,
    0x8189dbbc,
    0x3956c25b,
    0xf348b538,
    0x59f111f1,
    0xb605d019,
    0x923f82a4,
    0xaf194f9b,
    0xab1c5ed5,
    0xda6d8118,
    0xd807aa98,
    0xa3030242,
    0x12835b01,
    0x45706fbe,
    0x243185be,
    0x4ee4b28c,
    0x550c7dc3,
    0xd5ffb4e2,
    0x72be5d74,
    0xf27b896f,
    0x80deb1fe,
    0x3b1696b1,
    0x9bdc06a7,
    0x25c71235,
    0xc19bf174,
    0xcf692694,
    0xe49b69c1,
    0x9ef14ad2,
    0xefbe4786,
    0x384f25e3,
    0x0fc19dc6,
    0x8b8cd5b5,
    0x240ca1cc,
    0x77ac9c65,
    0x2de92c6f,
    0x592b0275,
    0x4a7484aa,
    0x6ea6e483,
    0x5cb0a9dc,
    0xbd41fbd4,
    0x76f988da,
    0x831153b5,
    0x983e5152,
    0xee66dfab,
    0xa831c66d,
    0x2db43210,
    0xb00327c8,
    0x98fb213f,
    0xbf597fc7,
    0xbeef0ee4,
    0xc6e00bf3,
    0x3da88fc2,
    0xd5a79147,
    0x930aa725,
    0x06ca6351,
    0xe003826f,
    0x14292967,
    0x0a0e6e70,
    0x27b70a85,
    0x46d22ffc,
    0x2e1b2138,
    0x5c26c926,
    0x4d2c6dfc,
    0x5ac42aed,
    0x53380d13,
    0x9d95b3df,
    0x650a7354,
    0x8baf63de,
    0x766a0abb,
    0x3c77b2a8,
    0x81c2c92e,
    0x47edaee6,
    0x92722c85,
    0x1482353b,
    0xa2bfe8a1,
    0x4cf10364,
    0xa81a664b,
    0xbc423001,
    0xc24b8b70,
    0xd0f89791,
    0xc76c51a3,
    0x0654be30,
    0xd192e819,
    0xd6ef5218,
    0xd6990624,
    0x5565a910,
    0xf40e3585,
    0x5771202a,
    0x106aa070,
    0x32bbd1b8,
    0x19a4c116,
    0xb8d2d0c8,
    0x1e376c08,
    0x5141ab53,
    0x2748774c,
    0xdf8eeb99,
    0x34b0bcb5,
    0xe19b48a8,
    0x391c0cb3,
    0xc5c95a63,
    0x4ed8aa4a,
    0xe3418acb,
    0x5b9cca4f,
    0x7763e373,
    0x682e6ff3,
    0xd6b2b8a3,
    0x748f82ee,
    0x5defb2fc,
    0x78a5636f,
    0x43172f60,
    0x84c87814,
    0xa1f0ab72,
    0x8cc70208,
    0x1a6439ec,
    0x90befffa,
    0x23631e28,
    0xa4506ceb,
    0xde82bde9,
    0xbef9a3f7,
    0xb2c67915,
    0xc67178f2,
    0xe372532b,
    0xca273ece,
    0xea26619c,
    0xd186b8c7,
    0x21c0c207,
    0xeada7dd6,
    0xcde0eb1e,
    0xf57d4f7f,
    0xee6ed178,
    0x06f067aa,
    0x72176fba,
    0x0a637dc5,
    0xa2c898a6,
    0x113f9804,
    0xbef90dae,
    0x1b710b35,
    0x131c471b,
    0x28db77f5,
    0x23047d84,
    0x32caab7b,
    0x40c72493,
    0x3c9ebe0a,
    0x15c9bebc,
    0x431d67c4,
    0x9c100d4c,
    0x4cc5d4be,
    0xcb3e42b6,
    0x597f299c,
    0xfc657e2a,
    0x5fcb6fab,
    0x3ad6faec,
    0x6c44198c,
    0x4a475817
];

function Ch(x: number, y: number, z: number) {
    return z ^ (x & (y ^ z));
}

function maj(x: number, y: number, z: number) {
    return (x & y) | (z & (x | y));
}

function sigma0(x: number, xl: number) {
    return ((x >>> 28) | (xl << 4)) ^ ((xl >>> 2) | (x << 30)) ^ ((xl >>> 7) | (x << 25));
}

function sigma1(x: number, xl: number) {
    return ((x >>> 14) | (xl << 18)) ^ ((x >>> 18) | (xl << 14)) ^ ((xl >>> 9) | (x << 23));
}

function Gamma0(x: number, xl: number) {
    return ((x >>> 1) | (xl << 31)) ^ ((x >>> 8) | (xl << 24)) ^ (x >>> 7);
}

function Gamma0l(x: number, xl: number) {
    return ((x >>> 1) | (xl << 31)) ^ ((x >>> 8) | (xl << 24)) ^ ((x >>> 7) | (xl << 25));
}

function Gamma1(x: number, xl: number) {
    return ((x >>> 19) | (xl << 13)) ^ ((xl >>> 29) | (x << 3)) ^ (x >>> 6);
}

function Gamma1l(x: number, xl: number) {
    return ((x >>> 19) | (xl << 13)) ^ ((xl >>> 29) | (x << 3)) ^ ((x >>> 6) | (xl << 26));
}

function getCarry(a: number, b: number) {
    return a >>> 0 < b >>> 0 ? 1 : 0;
}

export default class Sha512 extends Hash {
    private _ah = 0x6a09e667;
    private _bh = 0xbb67ae85;
    private _ch = 0x3c6ef372;
    private _dh = 0xa54ff53a;
    private _eh = 0x510e527f;
    private _fh = 0x9b05688c;
    private _gh = 0x1f83d9ab;
    private _hh = 0x5be0cd19;

    private _al = 0xf3bcc908;
    private _bl = 0x84caa73b;
    private _cl = 0xfe94f82b;
    private _dl = 0x5f1d36f1;
    private _el = 0xade682d1;
    private _fl = 0x2b3e6c1f;
    private _gl = 0xfb41bd6b;
    private _hl = 0x137e2179;

    private _w = new Array(160);

    constructor() {
        super(128, 112);
    }

    public _update(M: Buffer): void {
        const W = this._w;

        let ah = this._ah | 0;
        let bh = this._bh | 0;
        let ch = this._ch | 0;
        let dh = this._dh | 0;
        let eh = this._eh | 0;
        let fh = this._fh | 0;
        let gh = this._gh | 0;
        let hh = this._hh | 0;

        let al = this._al | 0;
        let bl = this._bl | 0;
        let cl = this._cl | 0;
        let dl = this._dl | 0;
        let el = this._el | 0;
        let fl = this._fl | 0;
        let gl = this._gl | 0;
        let hl = this._hl | 0;

        let Wih;
        let Wil;

        let i = 0;
        for (i = 0; i < 32; i += 2) {
            W[i] = M.readInt32BE(i * 4);
            W[i + 1] = M.readInt32BE(i * 4 + 4);
        }
        for (; i < 160; i += 2) {
            let xh = W[i - 15 * 2];
            let xl = W[i - 15 * 2 + 1];
            const gamma0 = Gamma0(xh, xl);
            const gamma0l = Gamma0l(xl, xh);

            xh = W[i - 2 * 2];
            xl = W[i - 2 * 2 + 1];
            const gamma1 = Gamma1(xh, xl);
            const gamma1l = Gamma1l(xl, xh);

            // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
            const Wi7h = W[i - 7 * 2];
            const Wi7l = W[i - 7 * 2 + 1];

            const Wi16h = W[i - 16 * 2];
            const Wi16l = W[i - 16 * 2 + 1];

            Wil = (gamma0l + Wi7l) | 0;
            Wih = (gamma0 + Wi7h + getCarry(Wil, gamma0l)) | 0;
            Wil = (Wil + gamma1l) | 0;
            Wih = (Wih + gamma1 + getCarry(Wil, gamma1l)) | 0;
            Wil = (Wil + Wi16l) | 0;
            Wih = (Wih + Wi16h + getCarry(Wil, Wi16l)) | 0;

            W[i] = Wih;
            W[i + 1] = Wil;
        }

        for (let j = 0; j < 160; j += 2) {
            Wih = W[j];
            Wil = W[j + 1];

            const majh = maj(ah, bh, ch);
            const majl = maj(al, bl, cl);

            const sigma0h = sigma0(ah, al);
            const sigma0l = sigma0(al, ah);
            const sigma1h = sigma1(eh, el);
            const sigma1l = sigma1(el, eh);

            // t1 = h + sigma1 + ch + K[j] + W[j]
            const Kih = K[j];
            const Kil = K[j + 1];

            const chh = Ch(eh, fh, gh);
            const chl = Ch(el, fl, gl);

            let t1l = (hl + sigma1l) | 0;
            let t1h = (hh + sigma1h + getCarry(t1l, hl)) | 0;
            t1l = (t1l + chl) | 0;
            t1h = (t1h + chh + getCarry(t1l, chl)) | 0;
            t1l = (t1l + Kil) | 0;
            t1h = (t1h + Kih + getCarry(t1l, Kil)) | 0;
            t1l = (t1l + Wil) | 0;
            t1h = (t1h + Wih + getCarry(t1l, Wil)) | 0;

            // t2 = sigma0 + maj
            const t2l = (sigma0l + majl) | 0;
            const t2h = (sigma0h + majh + getCarry(t2l, sigma0l)) | 0;

            hh = gh;
            hl = gl;
            gh = fh;
            gl = fl;
            fh = eh;
            fl = el;
            el = (dl + t1l) | 0;
            eh = (dh + t1h + getCarry(el, dl)) | 0;
            dh = ch;
            dl = cl;
            ch = bh;
            cl = bl;
            bh = ah;
            bl = al;
            al = (t1l + t2l) | 0;
            ah = (t1h + t2h + getCarry(al, t1l)) | 0;
        }

        this._al = (this._al + al) | 0;
        this._bl = (this._bl + bl) | 0;
        this._cl = (this._cl + cl) | 0;
        this._dl = (this._dl + dl) | 0;
        this._el = (this._el + el) | 0;
        this._fl = (this._fl + fl) | 0;
        this._gl = (this._gl + gl) | 0;
        this._hl = (this._hl + hl) | 0;

        this._ah = (this._ah + ah + getCarry(this._al, al)) | 0;
        this._bh = (this._bh + bh + getCarry(this._bl, bl)) | 0;
        this._ch = (this._ch + ch + getCarry(this._cl, cl)) | 0;
        this._dh = (this._dh + dh + getCarry(this._dl, dl)) | 0;
        this._eh = (this._eh + eh + getCarry(this._el, el)) | 0;
        this._fh = (this._fh + fh + getCarry(this._fl, fl)) | 0;
        this._gh = (this._gh + gh + getCarry(this._gl, gl)) | 0;
        this._hh = (this._hh + hh + getCarry(this._hl, hl)) | 0;
    }

    public _hash(): Buffer {
        const H = Buffer.allocUnsafe(64);

        function writeInt64BE(h: number, l: number, offset: number) {
            H.writeInt32BE(h, offset);
            H.writeInt32BE(l, offset + 4);
        }

        writeInt64BE(this._ah, this._al, 0);
        writeInt64BE(this._bh, this._bl, 8);
        writeInt64BE(this._ch, this._cl, 16);
        writeInt64BE(this._dh, this._dl, 24);
        writeInt64BE(this._eh, this._el, 32);
        writeInt64BE(this._fh, this._fl, 40);
        writeInt64BE(this._gh, this._gl, 48);
        writeInt64BE(this._hh, this._hl, 56);

        return H;
    }
}
