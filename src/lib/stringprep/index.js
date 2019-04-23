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
        const resource = new StringPrep.StringPrep('resourceprep');
        return resource.prepare(str);
    } else {
        return str;
    }
}
