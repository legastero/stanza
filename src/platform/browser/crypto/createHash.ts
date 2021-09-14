/* istanbul ignore file */

import Hash from './Hash';
import MD5 from './MD5';
import SHA1 from './SHA-1';
import SHA256 from './SHA-256';
import SHA512 from './SHA-512';

const HASH_IMPLEMENTATIONS = new Map<string, any>([
    ['md5', MD5],
    ['sha-1', SHA1],
    ['sha-256', SHA256],
    ['sha-512', SHA512],
    ['sha1', SHA1],
    ['sha256', SHA256],
    ['sha512', SHA512]
]);

export { Hash };

export default function createHash(alg: string): Hash {
    alg = alg.toLowerCase();
    const HashImp = HASH_IMPLEMENTATIONS.get(alg);
    if (HashImp) {
        return new HashImp() as Hash;
    } else {
        throw new Error('Unsupported hash algorithm: ' + alg);
    }
}
