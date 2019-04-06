import punycode from 'punycode';
import { nameprep, nodeprep, resourceprep } from '../lib/stringprep';

export interface JIDParts {
    domain: string;
    local?: string;
    resource?: string;
}

export interface ParsedJID {
    bare: string;
    domain: string;
    full: string;
    local?: string;
    resource?: string;
}

export interface PreparationOptions {
    prepared?: boolean;
    escaped?: boolean;
}

export function create(data: JIDParts, opts: PreparationOptions = {}): string {
    let localPart = data.local;
    if (!opts.escaped) {
        localPart = escapeLocal(data.local);
    }
    const prep = !opts.prepared
        ? prepare({ local: localPart, domain: data.domain, resource: data.resource })
        : data;

    const bareJID = !!localPart ? `${localPart}@${prep.domain}` : prep.domain;

    if (prep.resource) {
        return `${bareJID}/${prep.resource}`;
    }
    return bareJID;
}

export function prepare(data: JIDParts): JIDParts {
    let local = data.local || '';
    let domain = data.domain;
    let resource = data.resource || '';

    if (local) {
        local = nodeprep(local);
    }

    if (resource) {
        resource = resourceprep(resource);
    }

    if (domain[domain.length - 1] === '.') {
        domain = domain.slice(0, domain.length - 1);
    }

    domain = nameprep(
        domain
            .split('.')
            .map(punycode.toUnicode)
            .join('.')
    );

    return {
        domain,
        local,
        resource
    };
}

export function parse(jid: string = ''): ParsedJID {
    let local = '';
    let domain = '';
    let resource = '';

    const resourceStart = jid.indexOf('/');
    if (resourceStart > 0) {
        resource = jid.slice(resourceStart + 1);
        jid = jid.slice(0, resourceStart);
    }

    const localEnd = jid.indexOf('@');
    if (localEnd > 0) {
        local = jid.slice(0, localEnd);
        jid = jid.slice(localEnd + 1);
    }

    domain = jid;

    const prepped = prepare({
        domain,
        local,
        resource
    });

    return {
        bare: create(
            { local: prepped.local, domain: prepped.domain },
            {
                escaped: true,
                prepared: true
            }
        ),
        domain: prepped.domain,
        full: create(prepped, {
            escaped: true,
            prepared: true
        }),
        local: unescapeLocal(prepped.local!),
        resource: prepped.resource
    };
}

export function allowedResponders(jid1?: string, jid2?: string): Set<string | undefined> {
    const allowed = new Set<string | undefined>();
    allowed.add(undefined);
    allowed.add('');

    if (jid1) {
        const split1 = parse(jid1);
        allowed.add(split1.full);
        allowed.add(split1.bare);
        allowed.add(split1.domain);
    }

    if (jid2) {
        const split2 = parse(jid2);
        allowed.add(split2.domain);
        allowed.add(split2.bare);
        allowed.add(split2.full);
    }

    return allowed;
}

export function equal(jid1: string, jid2: string): boolean {
    if (!jid1 || !jid2) {
        return false;
    }
    const parsed1 = parse(jid1);
    const parsed2 = parse(jid2);
    return (
        parsed1.local === parsed2.local &&
        parsed1.domain === parsed2.domain &&
        parsed1.resource === parsed2.resource
    );
}

export function equalBare(jid1?: string, jid2?: string): boolean {
    if (!jid1 || !jid2) {
        return false;
    }
    const parsed1 = parse(jid1);
    const parsed2 = parse(jid2);
    return parsed1.local === parsed2.local && parsed1.domain === parsed2.domain;
}

export function isBare(jid: string): boolean {
    return !isFull(jid);
}

export function isFull(jid: string): boolean {
    const parsed = parse(jid);
    return !!parsed.resource;
}

export function getLocal(jid: string = ''): string | undefined {
    return parse(jid).local;
}

export function getDomain(jid: string = ''): string | undefined {
    return parse(jid).domain;
}

export function getResource(jid: string = ''): string | undefined {
    return parse(jid).resource;
}

export function toBare(jid: string = ''): string | undefined {
    return parse(jid).bare;
}

export function escapeLocal(val: string = '') {
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

export function unescapeLocal(val: string): string {
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
