/**
 * Portions of this file are derived from prior work.
 *
 * See NOTICE.md for full license text.
 *
 * Derived from:
 * - uuid, Copyright (c) 2010-2016 Robert Kieffer and other contributors
 */

// tslint:disable no-bitwise

import { randomBytes } from './platform';

const bth: string[] = [];
for (let i = 0; i < 256; ++i) {
    bth[i] = (i + 0x100).toString(16).substr(1);
}

export async function timeoutPromise<T>(
    target: Promise<T>,
    delay: number,
    rejectValue: () => any = () => undefined
): Promise<T> {
    let timeoutRef: any;
    const result = await Promise.race([
        target,
        new Promise<T>((resolve, reject) => {
            timeoutRef = setTimeout(() => reject(rejectValue()), delay);
        })
    ]);
    clearTimeout(timeoutRef);
    return result;
}

export async function promiseAny<T>(promises: Array<Promise<T>>): Promise<T> {
    try {
        const errors = await Promise.all(
            promises.map(p => {
                return p.then(
                    val => Promise.reject(val),
                    err => Promise.resolve(err)
                );
            })
        );
        return Promise.reject(errors);
    } catch (val) {
        return Promise.resolve(val as T);
    }
}

export function shuffle<T>(array: T[]): T[] {
    let end = array.length;
    while (end > 0) {
        const selected = Math.floor(Math.random() * end);
        end -= 1;

        const tmp = array[end];
        array[end] = array[selected];
        array[selected] = tmp;
    }
    return array;
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

export function uuid(): string {
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

const DATE_FIELDS = new Set([
    'date',
    'expires',
    'httpUploadRetry',
    'idleSince',
    'published',
    'since',
    'stamp',
    'timestamp',
    'updated',
    'utc'
]);

const ISO_DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(?:Z|((\+|-)([\d|:]*)))?$/;
export function reviveData(key: string, value: unknown): unknown {
    if (DATE_FIELDS.has(key) && value && typeof value === 'string' && ISO_DT.test(value)) {
        return new Date(value);
    }
    if (
        value &&
        typeof value === 'object' &&
        (value as any).type === 'Buffer' &&
        Array.isArray((value as any).data)
    ) {
        return Buffer.from(value as any);
    }
    return value;
}
