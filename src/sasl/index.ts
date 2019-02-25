import Anonymous from './anonymous';
import DigestMD5 from './digest-md5';
import External from './external';
import Plain from './plain';
import ScramSha1 from './scram-sha-1';
import XOauth2 from './x-oauth2';

export { Anonymous, External, Plain, DigestMD5, ScramSha1, XOauth2 };

export interface MechClass {
    prototype: {
        name: string;
        clientFirst?: boolean;
    };
    new (): Mechanism;
}

export interface Mechanism {
    cache?: {
        [key: string]: any;
    };
    name: string;
    clientFirst?: boolean;

    challenge(value?: string): void;
    response(credentials?: { [key: string]: any }): string | undefined;
}

export class Factory {
    private _mechs: Array<{ name: string; mech: MechClass }>;

    constructor() {
        this._mechs = [];
    }

    public use(name: string | MechClass, mech?: MechClass) {
        if (typeof name !== 'string') {
            mech = name;
            name = mech.prototype.name;
        }
        this._mechs.push({ name, mech: mech! });
        return this;
    }

    public create(mechs: string[]): Mechanism | null {
        for (let i = 0, len = this._mechs.length; i < len; i++) {
            for (let j = 0, jlen = mechs.length; j < jlen; j++) {
                const entry = this._mechs[i];
                if (entry.name === mechs[j]) {
                    return new entry.mech();
                }
            }
        }
        return null;
    }
}
