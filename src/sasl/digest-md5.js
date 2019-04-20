import { createHash, randomBytes } from '../lib/crypto';

function parse(chal) {
    const dtives = {};
    const tokens = chal.split(/,(?=(?:[^"]|"[^"]*")*$)/);
    for (let i = 0, len = tokens.length; i < len; i++) {
        const dtiv = /(\w+)=["]?([^"]+)["]?$/.exec(tokens[i]);
        if (dtiv) {
            dtives[dtiv[1]] = dtiv[2];
        }
    }
    return dtives;
}

function genNonce() {
    return randomBytes(16).toString('hex');
}

export default class DigestMD5 {
    constructor(options) {
        options = options || {};
        this._genNonce = options.genNonce || genNonce;
    }

    response(cred) {
        if (this._completed) {
            return undefined;
        }
        let uri = cred.serviceType + '/' + cred.host;
        if (cred.serviceName && cred.host !== cred.serviceName) {
            uri += '/' + cred.serviceName;
        }
        const realm = cred.realm || this._realm || '';
        const cnonce = this._genNonce();
        const nc = '00000001';
        const qop = 'auth';
        let str = '';
        str += 'username="' + cred.username + '"';
        if (realm) {
            str += ',realm="' + realm + '"';
        }
        str += ',nonce="' + this._nonce + '"';
        str += ',cnonce="' + cnonce + '"';
        str += ',nc=' + nc;
        str += ',qop=' + qop;
        str += ',digest-uri="' + uri + '"';
        const base = createHash('md5')
            .update(cred.username)
            .update(':')
            .update(realm)
            .update(':')
            .update(cred.password)
            .digest();
        let ha1 = createHash('md5')
            .update(base)
            .update(':')
            .update(this._nonce)
            .update(':')
            .update(cnonce);
        if (cred.authzid) {
            ha1.update(':').update(cred.authzid);
        }
        ha1 = ha1.digest('hex');
        let ha2 = createHash('md5')
            .update('AUTHENTICATE:')
            .update(uri);
        if (qop === 'auth-int' || qop === 'auth-conf') {
            ha2.update(':00000000000000000000000000000000');
        }
        ha2 = ha2.digest('hex');
        const digest = createHash('md5')
            .update(ha1)
            .update(':')
            .update(this._nonce)
            .update(':')
            .update(nc)
            .update(':')
            .update(cnonce)
            .update(':')
            .update(qop)
            .update(':')
            .update(ha2)
            .digest('hex');
        str += ',response=' + digest;
        if (this._charset === 'utf-8') {
            str += ',charset=utf-8';
        }
        if (cred.authzid) {
            str += 'authzid="' + cred.authzid + '"';
        }
        return str;
    }

    challenge(chal) {
        const dtives = parse(chal);
        this._completed = !!dtives.rspauth;
        this._realm = dtives.realm;
        this._nonce = dtives.nonce;
        this._qop = (dtives.qop || 'auth').split(',');
        this._stale = dtives.stale;
        this._maxbuf = parseInt(dtives.maxbuf, 10) || 65536;
        this._charset = dtives.charset;
        this._algo = dtives.algorithm;
        this._cipher = dtives.cipher;
        if (this._cipher) {
            this._cipher.split(',');
        }
        return this;
    }
}

DigestMD5.prototype.name = 'DIGEST-MD5';
DigestMD5.prototype.clientFirst = false;
