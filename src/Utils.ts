// tslint:disable no-bitwise

import { randomBytes } from './lib/crypto';

const bth: string[] = [];
for (let i = 0; i < 256; ++i) {
    bth[i] = (i + 0x100).toString(16).substr(1);
}

export async function timeoutPromise<T>(
    target: Promise<T>,
    delay: number,
    rejectValue: () => any = () => undefined
) {
    let timeoutRef: any;
    const result = await Promise.race([
        target,
        new Promise<T>((resolve, reject) => {
            timeoutRef = setTimeout(() => reject(rejectValue()), delay);
        })
    ]);
    if (timeoutRef) {
        clearTimeout(timeoutRef);
    }
    return result;
}

export async function sleep(time: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(() => resolve(), time);
    });
}

export function octetCompare(str1: string | Buffer, str2: string | Buffer): number {
    const b1 = typeof str1 === 'string' ? Buffer.from(str1, 'utf8') : str1;
    const b2 = typeof str2 === 'string' ? Buffer.from(str2, 'utf8') : str2;

    return b1.compare(b2);
}

export function uuid() {
    const buf = randomBytes(16);

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;

    let i = 0;
    return [
        bth[buf[i++]],
        bth[buf[i++]],
        bth[buf[i++]],
        bth[buf[i++]],
        '-',
        bth[buf[i++]],
        bth[buf[i++]],
        '-',
        bth[buf[i++]],
        bth[buf[i++]],
        '-',
        bth[buf[i++]],
        bth[buf[i++]],
        '-',
        bth[buf[i++]],
        bth[buf[i++]],
        bth[buf[i++]],
        bth[buf[i++]],
        bth[buf[i++]],
        bth[buf[i]]
    ].join('');
}

const ISO_DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
export function reviveData(key: string, value: any): any {
    if (value && typeof value === 'string' && ISO_DT.test(value)) {
        return new Date(value);
    }
    if (
        value &&
        typeof value === 'object' &&
        value.type === 'Buffer' &&
        Array.isArray(value.data)
    ) {
        return Buffer.from(value);
    }
    return value;
}
