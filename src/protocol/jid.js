const punycode = require('punycode');

let StringPrep;
try {
    StringPrep = require('node-stringprep');
} catch (err) {
    StringPrep = false;
}

const HAS_STRINGPREP = !!StringPrep && !!StringPrep.StringPrep;
export const NATIVE_STRINGPREP = HAS_STRINGPREP && new StringPrep.StringPrep('nodeprep').isNative();

export function toUnicode(data) {
    if (HAS_STRINGPREP) {
        return punycode.toUnicode(StringPrep.toUnicode(data));
    } else {
        return punycode.toUnicode(data);
    }
}

export function nameprep(str) {
    if (HAS_STRINGPREP) {
        const name = new StringPrep.StringPrep('nameprep');
        return name.prepare(str);
    } else {
        return str.toLowerCase();
    }
}

export function nodeprep(str) {
    if (HAS_STRINGPREP) {
        const node = new StringPrep.StringPrep('nodeprep');
        return node.prepare(str);
    } else {
        return str.toLowerCase();
    }
}

export function resourceprep(str) {
    if (HAS_STRINGPREP) {
        const res = new StringPrep.StringPrep('resourceprep');
        return res.prepare(str);
    } else {
        return str;
    }
}

// All of our StringPrep fallbacks work correctly
// in the ASCII range, so we can reliably mark
// ASCII-only JIDs as prepped.
const ASCII = /^[\x00-\x7F]*$/;

function createBareJID(local, domain) {
    if (local) {
        return local + '@' + domain;
    }
    return domain;
}

function createFullJID(local, domain, res) {
    if (res) {
        return createBareJID(local, domain) + '/' + res;
    }
    return createBareJID(local, domain);
}

export function prep(data) {
    let local = data.local;
    let domain = data.domain;
    let res = data.resource;
    let unescapedLocal = local;

    if (local) {
        local = nodeprep(local);
        unescapedLocal = unescape(local);
    }

    if (res) {
        res = resourceprep(res);
    }

    if (domain[domain.length - 1] === '.') {
        domain = domain.slice(0, domain.length - 1);
    }

    domain = nameprep(
        domain
            .split('.')
            .map(toUnicode)
            .join('.')
    );

    return {
        bare: createBareJID(local, domain),
        domain,
        full: createFullJID(local, domain, res),
        local,
        prepped: data.prepped || NATIVE_STRINGPREP,
        resource: res,
        unescapedBare: createBareJID(unescapedLocal, domain),
        unescapedFull: createFullJID(unescapedLocal, domain, res),
        unescapedLocal
    };
}

export function parse(jid, trusted) {
    let local = '';
    let domain = '';
    let res = '';

    trusted = trusted || ASCII.test(jid);

    const resourceStart = jid.indexOf('/');
    if (resourceStart > 0) {
        res = jid.slice(resourceStart + 1);
        jid = jid.slice(0, resourceStart);
    }

    const localEnd = jid.indexOf('@');
    if (localEnd > 0) {
        local = jid.slice(0, localEnd);
        jid = jid.slice(localEnd + 1);
    }

    domain = jid;

    const preppedJID = prep({
        domain,
        local,
        resource: res
    });

    preppedJID.prepped = preppedJID.prepped || trusted;

    return preppedJID;
}

export function allowedResponders(jid1, jid2) {
    const allowed = new Set();
    allowed.add(undefined);
    allowed.add('');

    const split1 = prep(jid1);
    allowed.add(split1.full);
    allowed.add(split1.bare);
    allowed.add(split1.domain);

    if (jid2) {
        const split2 = prep(jid2);
        allowed.add(split2.domain);
        allowed.add(split2.bare);
        allowed.add(split2.full);
    }

    return allowed;
}

export function equal(jid1, jid2, requirePrep) {
    jid1 = new JID(jid1);
    jid2 = new JID(jid2);
    if (arguments.length === 2) {
        requirePrep = true;
    }
    return (
        jid1.local === jid2.local &&
        jid1.domain === jid2.domain &&
        jid1.resource === jid2.resource &&
        (requirePrep ? jid1.prepped && jid2.prepped : true)
    );
}

export function equalBare(jid1, jid2, requirePrep) {
    jid1 = new JID(jid1);
    jid2 = new JID(jid2);
    if (arguments.length === 2) {
        requirePrep = true;
    }
    return (
        jid1.local === jid2.local &&
        jid1.domain === jid2.domain &&
        (requirePrep ? jid1.prepped && jid2.prepped : true)
    );
}

export function isBare(jid) {
    jid = new JID(jid);

    const hasResource = !!jid.resource;

    return !hasResource;
}

export function isFull(jid) {
    jid = new JID(jid);

    const hasResource = !!jid.resource;

    return hasResource;
}

export function bare(jid) {
    jid = new JID(jid);
    return jid.bare;
}

export function resource(jid) {
    jid = new JID(jid);
    return jid.resource;
}

export function escape(val) {
    return val
        .replace(/^\s+|\s+$/g, '')
        .replace(/\\5c/g, '\\5c5c')
        .replace(/\\20/g, '\\5c20')
        .replace(/\\22/g, '\\5c22')
        .replace(/\\26/g, '\\5c26')
        .replace(/\\27/g, '\\5c27')
        .replace(/\\2f/g, '\\5c2f')
        .replace(/\\3a/g, '\\5c3a')
        .replace(/\\3c/g, '\\5c3c')
        .replace(/\\3e/g, '\\5c3e')
        .replace(/\\40/g, '\\5c40')
        .replace(/ /g, '\\20')
        .replace(/\"/g, '\\22')
        .replace(/\&/g, '\\26')
        .replace(/\'/g, '\\27')
        .replace(/\//g, '\\2f')
        .replace(/:/g, '\\3a')
        .replace(/</g, '\\3c')
        .replace(/>/g, '\\3e')
        .replace(/@/g, '\\40');
}

export function unescape(val) {
    return val
        .replace(/\\20/g, ' ')
        .replace(/\\22/g, '"')
        .replace(/\\26/g, '&')
        .replace(/\\27/g, `'`)
        .replace(/\\2f/g, '/')
        .replace(/\\3a/g, ':')
        .replace(/\\3c/g, '<')
        .replace(/\\3e/g, '>')
        .replace(/\\40/g, '@')
        .replace(/\\5c/g, '\\');
}

export function create(local, domain, res) {
    return new JID(local, domain, res);
}

export class JID {
    constructor(localOrJID, domain, res) {
        let parsed = {};
        if (localOrJID && !domain && !res) {
            if (typeof localOrJID === 'string') {
                parsed = parse(localOrJID);
            } else if (localOrJID._isJID || localOrJID instanceof JID) {
                parsed = localOrJID;
            } else {
                throw new Error('Invalid argument type');
            }
        } else if (domain) {
            let trusted = ASCII.test(localOrJID) && ASCII.test(domain);
            if (res) {
                trusted = trusted && ASCII.test(res);
            }

            parsed = prep({
                domain,
                local: escape(localOrJID),
                prepped: trusted,
                resource: res
            });
        } else {
            parsed = {};
        }

        this._isJID = true;

        this.local = parsed.local || '';
        this.domain = parsed.domain || '';
        this.resource = parsed.resource || '';
        this.bare = parsed.bare || '';
        this.full = parsed.full || '';

        this.unescapedLocal = parsed.unescapedLocal || '';
        this.unescapedBare = parsed.unescapedBare || '';
        this.unescapedFull = parsed.unescapedFull || '';

        this.prepped = parsed.prepped;
    }

    toString() {
        return this.full;
    }

    toJSON() {
        return this.full;
    }
}
