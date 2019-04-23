const punycode = require('punycode');

export const NATIVE_STRINGPREP = false;

export function toUnicode(data) {
    return punycode.toUnicode(data);
}

export function nameprep(str) {
    return str.toLowerCase();
}

export function nodeprep(str) {
    return str.toLowerCase();
}

export function resourceprep(str) {
    return str;
}
