import * as Hashes from 'stanza-shims';
import { saslprep } from '../stringprep';

export interface Credentials {
    username?: string;
    password?: string;
    token?: string;
    authzid?: string;
    realm?: string;
    host?: string;
    port?: number;
    serviceType?: string;
    serviceName?: string;
    trace?: string;
    tlsUnique?: Buffer;
    clientNonce?: string;
}

export interface CacheableCredentials extends Credentials {
    salt?: Buffer;
    saltedPassword?: Buffer;
    serverKey?: Buffer;
    clientKey?: Buffer;
}

export interface ExpectedCredentials {
    required: string[][];
    optional: string[];
}

export interface MechanismResult {
    authenticated?: boolean;
    mutuallyAuthenticated?: boolean;
    error?: string;
    errorData?: { [key: string]: string };
}

export interface Mechanism {
    name: string;
    providesMutualAuthentication?: boolean;
    getExpectedCredentials(): ExpectedCredentials;
    getCacheableCredentials(): CacheableCredentials | null;
    processChallenge(challenge: Buffer): void;
    processSuccess(challenge?: Buffer): void;
    createResponse(credentials: Credentials & CacheableCredentials): Buffer | null;
    finalize(credentials?: Credentials): MechanismResult;
}

export type MechanismConstructor = new (name: string) => Mechanism;

export abstract class SimpleMech {
    public name: string;
    protected authenticated = false;
    protected mutuallyAuthenticated = false;
    protected errorData?: { [key: string]: string };

    constructor(name: string) {
        this.name = name;
    }

    public getCacheableCredentials(): CacheableCredentials | null {
        return null;
    }

    // istanbul ignore next
    public processChallenge(_challenge: Buffer): void {
        return;
    }

    public processSuccess(_success?: Buffer): void {
        this.authenticated = true;
    }

    public finalize(): MechanismResult {
        const result: MechanismResult = {
            authenticated: this.authenticated,
            mutuallyAuthenticated: this.mutuallyAuthenticated
        };
        if (this.errorData) {
            result.errorData = this.errorData;
        }
        return result;
    }
}

export class Factory {
    private mechanisms: Array<{
        name: string;
        constructor: MechanismConstructor;
        priority: number;
    }>;

    constructor() {
        this.mechanisms = [];
    }

    public register(name: string, constructor: MechanismConstructor, priority: number): void {
        this.mechanisms.push({
            constructor,
            name: name.toUpperCase(),
            priority: priority
        });
        // We want mechanisms with highest priority at the start of the list
        this.mechanisms.sort((a, b) => b.priority - a.priority);
    }

    public disable(name: string): void {
        const mechName = name.toUpperCase();
        this.mechanisms = this.mechanisms.filter(mech => mech.name !== mechName);
    }

    public createMechanism(names: string[], credentials: Credentials): Mechanism | null {
        const availableNames = names.map(name => name.toUpperCase());
        for (const knownMech of this.mechanisms) {
            for (const availableMechName of availableNames) {
                if (availableMechName === knownMech.name) {
                    const mech = new knownMech.constructor(knownMech.name);
                    for (const requiredCredentials of mech.getExpectedCredentials().required as (keyof Credentials)[][]) {
                        if (requiredCredentials.every(req => credentials[req] !== undefined)) {
                            return mech;
                        }
                    }
                }
            }
        }
        return null;
    }
}

// ====================================================================
// Utility helpers
// ====================================================================

// istanbul ignore next
export function createClientNonce(length = 32): string {
    return Hashes.randomBytes(length).toString('hex');
}

// tslint:disable no-bitwise
export function XOR(a: Buffer, b: Buffer): Buffer {
    const res: number[] = [];
    for (let i = 0; i < a.length; i++) {
        res.push(a[i] ^ b[i]);
    }
    return Buffer.from(res);
}
// tslint:enable no-bitwise

export function H(text: Buffer, alg: string): Buffer {
    return Hashes.createHash(alg).update(text).digest();
}

export function HMAC(key: Buffer, msg: Buffer, alg: string): Buffer {
    return Hashes.createHmac(alg, key).update(msg).digest() as Buffer;
}

export function Hi(text: Buffer, salt: Buffer, iterations: number, alg: string): Buffer {
    let ui1 = HMAC(text, Buffer.concat([salt, Buffer.from('00000001', 'hex')]), alg);
    let ui = ui1;
    for (let i = 0; i < iterations - 1; i++) {
        ui1 = HMAC(text, ui1, alg);
        ui = XOR(ui, ui1);
    }

    return ui;
}

function parse(challenge: Buffer): { [key: string]: string } {
    const directives: { [key: string]: string } = {};
    const tokens = challenge.toString().split(/,(?=(?:[^"]|"[^"]*")*$)/);

    for (let i = 0, len = tokens.length; i < len; i++) {
        const directive = /(\w+)=["]?([^"]+)["]?$/.exec(tokens[i]);
        if (directive) {
            directives[directive[1]] = directive[2];
        }
    }

    return directives;
}

function escapeUsername(name: string): string {
    const escaped: string[] = [];
    for (const curr of name) {
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

// ====================================================================
// ANONYMOUS
// ====================================================================

export class ANONYMOUS extends SimpleMech implements Mechanism {
    public getExpectedCredentials(): ExpectedCredentials {
        return { optional: ['trace'], required: [[]] };
    }

    public createResponse(credentials: Credentials): Buffer {
        return Buffer.from(credentials.trace || '');
    }
}

// ====================================================================
// EXTERNAL
// ====================================================================

export class EXTERNAL extends SimpleMech implements Mechanism {
    public getExpectedCredentials(): ExpectedCredentials {
        return { optional: ['authzid'], required: [[]] };
    }

    public createResponse(credentials: Credentials): Buffer {
        return Buffer.from(credentials.authzid || '');
    }
}

// ====================================================================
// PLAIN
// ====================================================================

export class PLAIN extends SimpleMech implements Mechanism {
    public getExpectedCredentials(): ExpectedCredentials {
        return {
            optional: ['authzid'],
            required: [['username', 'password']]
        };
    }

    public createResponse(credentials: Credentials): Buffer {
        return Buffer.from(
            (credentials.authzid || '') +
                '\x00' +
                credentials.username +
                '\x00' +
                (credentials.password || credentials.token)
        );
    }
}

// ====================================================================
// X-OAUTH2
// ====================================================================

export class X_OAUTH2 extends SimpleMech implements Mechanism {
    public getExpectedCredentials(): ExpectedCredentials {
        return {
            optional: ['authzid'],
            required: [['username', 'token']],
        };
    }

    public createResponse(credentials: Credentials): Buffer {
        return Buffer.from(
            (credentials.authzid || '') +
                '\x00' +
                credentials.username +
                '\x00' +
                credentials.token
        );
    }
}

// ====================================================================
// OAUTHBEARER
// ====================================================================

export class OAUTH extends SimpleMech implements Mechanism {
    private failed = false;

    constructor(name: string) {
        super(name);
        this.name = name;
    }

    public getExpectedCredentials(): ExpectedCredentials {
        return {
            optional: ['authzid'],
            required: [['token']]
        };
    }

    public createResponse(credentials: Credentials): Buffer {
        if (this.failed) {
            return Buffer.from('\u0001');
        }
        const gs2header = `n,${escapeUsername(saslprep(credentials.authzid))},`;
        const auth = `auth=Bearer ${credentials.token!}\u0001`;
        return Buffer.from(gs2header + '\u0001' + auth + '\u0001', 'utf8');
    }

    public processChallenge(challenge: Buffer): void {
        this.failed = true;
        this.errorData = JSON.parse(challenge.toString('utf8'));
    }
}

// ====================================================================
// DIGEST-MD5
// ====================================================================

export class DIGEST extends SimpleMech implements Mechanism {
    public name: string;
    public providesMutualAuthentication = false;

    private nonce?: string;
    private realm?: string;
    private charset?: string;
    private state: 'INITIAL' | 'CHALLENGE' = 'INITIAL';

    constructor(name: string) {
        super(name);
        this.name = name;
    }

    public processChallenge(challenge: Buffer): void {
        this.state = 'CHALLENGE';

        interface Challenge {
            rspauth?: string;
            charset?: string;
            realm?: string;
            nonce?: string;
        }
        const values: Challenge = parse(challenge);

        this.authenticated = !!values.rspauth;
        this.realm = values.realm;
        this.nonce = values.nonce;
        this.charset = values.charset;
    }

    public getExpectedCredentials(): ExpectedCredentials {
        return {
            optional: ['authzid', 'clientNonce', 'realm'],
            required: [['host', 'password', 'serviceName', 'serviceType', 'username']]
        };
    }

    public createResponse(credentials: Credentials): Buffer | null {
        if (this.state === 'INITIAL' || this.authenticated) {
            return null;
        }
        let uri = credentials.serviceType + '/' + credentials.host;
        if (credentials.serviceName && credentials.host !== credentials.serviceName) {
            uri += '/' + credentials.serviceName;
        }
        const realm = credentials.realm || this.realm || '';
        const cnonce = credentials.clientNonce || createClientNonce(16);
        const nc = '00000001';
        const qop = 'auth';
        let str = '';
        str += 'username="' + credentials.username + '"';
        if (realm) {
            str += ',realm="' + realm + '"';
        }
        str += ',nonce="' + this.nonce + '"';
        str += ',cnonce="' + cnonce + '"';
        str += ',nc=' + nc;
        str += ',qop=' + qop;
        str += ',digest-uri="' + uri + '"';
        const base = Hashes.createHash('md5')
            .update(credentials.username!)
            .update(':')
            .update(realm)
            .update(':')
            .update(credentials.password!)
            .digest();
        const ha1 = Hashes.createHash('md5')
            .update(base)
            .update(':')
            .update(this.nonce!)
            .update(':')
            .update(cnonce);
        if (credentials.authzid) {
            ha1.update(':').update(credentials.authzid);
        }
        const dha1 = ha1.digest('hex');
        const ha2 = Hashes.createHash('md5').update('AUTHENTICATE:').update(uri);
        const dha2 = ha2.digest('hex');
        const digest = Hashes.createHash('md5')
            .update(dha1)
            .update(':')
            .update(this.nonce!)
            .update(':')
            .update(nc)
            .update(':')
            .update(cnonce)
            .update(':')
            .update(qop)
            .update(':')
            .update(dha2)
            .digest('hex');
        str += ',response=' + digest;
        if (this.charset === 'utf-8') {
            str += ',charset=utf-8';
        }
        if (credentials.authzid) {
            str += ',authzid="' + credentials.authzid + '"';
        }
        return Buffer.from(str);
    }
}

// ====================================================================
// SCRAM-SHA-1(-PLUS)
// ====================================================================

export class SCRAM implements Mechanism {
    public name: string;
    public providesMutualAuthentication = true;

    private useChannelBinding: boolean;
    private algorithm: string;
    private challenge!: Buffer;
    private salt!: Buffer;
    private iterationCount!: number;
    private nonce!: string;
    private clientNonce!: string;
    private verifier!: string;
    private error!: string;
    private gs2Header!: Buffer;
    private clientFirstMessageBare!: Buffer;
    private serverSignature!: Buffer;
    private cache!: CacheableCredentials;
    private state: 'INITIAL' | 'CHALLENGE' | 'FINAL';

    constructor(name: string) {
        this.name = name;
        this.state = 'INITIAL';
        this.useChannelBinding = this.name.toLowerCase().endsWith('-plus');
        this.algorithm = this.name.toLowerCase().split('scram-')[1].split('-plus')[0];
    }

    public getExpectedCredentials(): ExpectedCredentials {
        const optional = ['authzid', 'clientNonce'];
        const required = [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']];
        if (this.useChannelBinding) {
            required.forEach(x => x.push('tlsUnique'));
        }
        return {
            optional,
            required
        };
    }

    public getCacheableCredentials(): CacheableCredentials {
        return this.cache;
    }

    public createResponse(credentials: Credentials): Buffer | null {
        if (this.state === 'INITIAL') {
            return this.initialResponse(credentials);
        }
        return this.challengeResponse(credentials);
    }

    public processChallenge(challenge: Buffer): void {
        interface Challenge {
            s?: string;
            i?: string;
            r?: string;
            v?: string;
            e?: string;
        }
        const values: Challenge = parse(challenge);

        this.salt = Buffer.from(values.s || '', 'base64');
        this.iterationCount = parseInt(values.i!, 10);
        this.nonce = values.r!;
        this.verifier = values.v!;
        this.error = values.e!;
        this.challenge = challenge;
    }

    public processSuccess(success: Buffer): void {
        this.processChallenge(success);
    }

    public finalize(): MechanismResult {
        if (!this.verifier) {
            return {
                authenticated: false,
                error: this.error,
                mutuallyAuthenticated: false
            };
        }
        if (this.serverSignature.toString('base64') !== this.verifier) {
            return {
                authenticated: false,
                error: 'Mutual authentication failed',
                mutuallyAuthenticated: false
            };
        }

        return {
            authenticated: true,
            mutuallyAuthenticated: true
        };
    }

    private initialResponse(credentials: Credentials): Buffer {
        const authzid = escapeUsername(saslprep(credentials.authzid));
        const username = escapeUsername(saslprep(credentials.username));

        this.clientNonce = credentials.clientNonce || createClientNonce();

        let cbindHeader = 'n';
        if (credentials.tlsUnique) {
            if (!this.useChannelBinding) {
                cbindHeader = 'y';
            } else {
                cbindHeader = 'p=tls-unique';
            }
        }

        this.gs2Header = Buffer.from(authzid ? `${cbindHeader},a=${authzid},` : `${cbindHeader},,`);

        this.clientFirstMessageBare = Buffer.from(`n=${username},r=${this.clientNonce}`);

        const result = Buffer.concat([this.gs2Header, this.clientFirstMessageBare]);

        this.state = 'CHALLENGE';

        return result;
    }

    private challengeResponse(credentials: CacheableCredentials): Buffer {
        const CLIENT_KEY = Buffer.from('Client Key');
        const SERVER_KEY = Buffer.from('Server Key');

        const cbindData = Buffer.concat([
            this.gs2Header,
            credentials.tlsUnique || Buffer.from('')
        ]).toString('base64');
        const clientFinalMessageWithoutProof = Buffer.from(`c=${cbindData},r=${this.nonce}`);

        let saltedPassword: Buffer | undefined;
        let clientKey: Buffer;
        let serverKey: Buffer;

        // If our cached salt is the same, we can reuse cached credentials to speed
        // up the hashing process.
        const cached = credentials.salt && Buffer.compare(credentials.salt, this.salt) === 0;

        if (cached && credentials.clientKey && credentials.serverKey) {
            clientKey = Buffer.from(credentials.clientKey);
            serverKey = Buffer.from(credentials.serverKey);
        } else if (cached && credentials.saltedPassword) {
            saltedPassword = Buffer.from(credentials.saltedPassword);
            clientKey = HMAC(saltedPassword, CLIENT_KEY, this.algorithm);
            serverKey = HMAC(saltedPassword, SERVER_KEY, this.algorithm);
        } else {
            saltedPassword = Hi(
                Buffer.from(saslprep(credentials.password)),
                this.salt,
                this.iterationCount,
                this.algorithm
            );
            clientKey = HMAC(saltedPassword, CLIENT_KEY, this.algorithm);
            serverKey = HMAC(saltedPassword, SERVER_KEY, this.algorithm);
        }

        const storedKey = H(clientKey, this.algorithm);

        const separator = Buffer.from(',');
        const authMessage = Buffer.concat([
            this.clientFirstMessageBare,
            separator,
            this.challenge,
            separator,
            clientFinalMessageWithoutProof
        ]);
        const clientSignature = HMAC(storedKey, authMessage, this.algorithm);
        const clientProof = XOR(clientKey, clientSignature).toString('base64');

        this.serverSignature = HMAC(serverKey, authMessage, this.algorithm);

        const result = Buffer.concat([
            clientFinalMessageWithoutProof,
            Buffer.from(`,p=${clientProof}`)
        ]);

        this.state = 'FINAL';

        this.cache = {
            clientKey,
            salt: this.salt,
            saltedPassword,
            serverKey
        };

        return result;
    }
}
