import Anonymous from './anonymous';
import External from './external';
import Plain from './plain';
import DigestMD5 from './digest-md5';
import ScramSha1 from './scram-sha-1';
import XOauth2 from './x-oauth2';


export {
    Anonymous,
    External,
    Plain,
    DigestMD5,
    ScramSha1,
    XOauth2
};


export class Factory {
    constructor() {
        this._mechs = [];
    }

    use(name, mech) {
        if (!mech) {
            mech = name;
            name = mech.prototype.name;
        }
        this._mechs.push({ name: name, mech: mech });
        return this;
    }

    create(mechs) {
        for (let i = 0, len = this._mechs.length; i < len; i++) {
            for (let j = 0, jlen = mechs.length; j < jlen; j++) {
                const entry = this._mechs[i];
                if (entry.name == mechs[j]) {
                    return new entry.mech();
                }
            }
        }
        return null;
    }
}
