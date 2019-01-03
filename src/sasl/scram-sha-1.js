import { createHash, createHmac, randomBytes } from 'iana-hashes';

const RESP = {};
const CLIENT_KEY = 'Client Key';
const SERVER_KEY = 'Server Key';

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

function saslname(name) {
    const escaped = [];
    let curr = '';
    for (let i = 0; i < name.length; i++) {
        curr = name[i];
        if (curr === ',') {
            escaped.push('=2C');
        } else if (curr === '=') {
            escaped.push('=3D');
        } else {
            escaped.push(curr);
        }
    }
    return escaped.join('');
}

function genNonce(len) {
    return randomBytes((len || 32) / 2).toString('hex');
}

function XOR(a, b) {
    const length = Math.min(a.length, b.length);
    const buffer = Buffer.alloc(Math.max(a.length, b.length));

    for (let i = 0; i < length; ++i) {
        // tslint:disable-next-line no-bitwise
        buffer[i] = a[i] ^ b[i];
    }

    return buffer;
}

function H(text) {
    return createHash('sha1')
        .update(text)
        .digest();
}

function HMAC(key, msg) {
    return createHmac('sha1', key)
        .update(msg)
        .digest();
}

function Hi(text, salt, iterations) {
    let ui1 = HMAC(text, Buffer.concat([salt, Buffer.from([0, 0, 0, 1], 'binary')]));
    let ui = ui1;
    for (let i = 0; i < iterations - 1; i++) {
        ui1 = HMAC(text, ui1);
        ui = XOR(ui, ui1);
    }

    return ui;
}

export default class SCRAM {
    constructor(options) {
        options = options || {};
        this._genNonce = options.genNonce || genNonce;
        this._stage = 'initial';
    }
    response(cred) {
        return RESP[this._stage](this, cred);
    }
    challenge(chal) {
        const values = parse(chal);
        this._salt = Buffer.from(values.s || '', 'base64');
        this._iterationCount = parseInt(values.i, 10);
        this._nonce = values.r;
        this._verifier = values.v;
        this._error = values.e;
        this._challenge = chal;
        return this;
    }
}

SCRAM.prototype.name = 'SCRAM-SHA-1';
SCRAM.prototype.clientFirst = true;

RESP.initial = function(mech, cred) {
    mech._cnonce = mech._genNonce();

    let authzid = '';
    if (cred.authzid) {
        authzid = 'a=' + saslname(cred.authzid);
    }

    mech._gs2Header = 'n,' + authzid + ',';

    const nonce = 'r=' + mech._cnonce;
    const username = 'n=' + saslname(cred.username || '');

    mech._clientFirstMessageBare = username + ',' + nonce;
    const result = mech._gs2Header + mech._clientFirstMessageBare;

    mech._stage = 'challenge';

    return result;
};

RESP.challenge = function(mech, cred) {
    const gs2Header = Buffer.from(mech._gs2Header).toString('base64');

    mech._clientFinalMessageWithoutProof = 'c=' + gs2Header + ',r=' + mech._nonce;

    let saltedPassword;
    let clientKey;
    let serverKey;

    // If our cached salt is the same, we can reuse cached credentials to speed
    // up the hashing process.
    if (cred.salt && Buffer.compare(cred.salt, mech._salt) === 0) {
        if (cred.clientKey && cred.serverKey) {
            clientKey = cred.clientKey;
            serverKey = cred.serverKey;
        } else if (cred.saltedPassword) {
            saltedPassword = cred.saltedPassword;
            clientKey = HMAC(saltedPassword, CLIENT_KEY);
            serverKey = HMAC(saltedPassword, SERVER_KEY);
        }
    } else {
        saltedPassword = Hi(cred.password || '', mech._salt, mech._iterationCount);
        clientKey = HMAC(saltedPassword, CLIENT_KEY);
        serverKey = HMAC(saltedPassword, SERVER_KEY);
    }

    const storedKey = H(clientKey);
    const authMessage =
        mech._clientFirstMessageBare +
        ',' +
        mech._challenge +
        ',' +
        mech._clientFinalMessageWithoutProof;
    const clientSignature = HMAC(storedKey, authMessage);

    const clientProof = XOR(clientKey, clientSignature).toString('base64');

    mech._serverSignature = HMAC(serverKey, authMessage);

    const result = mech._clientFinalMessageWithoutProof + ',p=' + clientProof;

    mech._stage = 'final';

    mech.cache = {
        clientKey: clientKey,
        salt: mech._salt,
        saltedPassword: saltedPassword,
        serverKey: serverKey
    };

    return result;
};

RESP.final = function() {
    // TODO: Signal errors
    return '';
};
