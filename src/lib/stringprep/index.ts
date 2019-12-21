import Punycode from 'punycode';
import { TABLE_DATA } from './Tables';

export class Table {
    public name: string;

    public singles: Set<number> = new Set();
    public ranges: Array<[number, number]> = [];
    public mappings: Map<number, null | number | number[]> = new Map();

    constructor(name: string, points?: number[]) {
        const data = TABLE_DATA[name];
        this.name = name;

        if (data) {
            if (data.s) {
                this.singles = new Set(data.s.split('|').map(s => parseInt(s, 32)));
            }
            if (data.r) {
                this.ranges = data.r.split('|').map(r => {
                    const [start, end] = r.split(':');
                    return [parseInt(start, 32), parseInt(end, 32)];
                });
            }

            if (data.m) {
                this.mappings = new Map(
                    data.m.split('|').map(m => {
                        const [point, mapping] = m.split(':');
                        const mappedPoints = mapping.split(';').map(p => parseInt(p, 32));
                        return [parseInt(point, 32), mappedPoints];
                    })
                );
            }
        } else if (points) {
            this.singles = new Set(points);
        }
    }

    public contains(codePoint: number): boolean {
        if (this.singles.has(codePoint)) {
            return true;
        }

        let left = 0;
        let right = this.ranges.length - 1;
        while (left <= right) {
            const pivot = Math.floor((left + right) / 2);
            const range = this.ranges[pivot];

            if (codePoint < range[0]) {
                right = pivot - 1;
                continue;
            }
            if (codePoint > range[1]) {
                left = pivot + 1;
                continue;
            }

            return true;
        }

        return false;
    }

    public hasMapping(codePoint: number): boolean {
        return this.mappings.has(codePoint) || this.contains(codePoint);
    }

    public map(codePoint: number): number | number[] | null {
        if (this.contains(codePoint) && !this.mappings.has(codePoint)) {
            return String.fromCodePoint(codePoint)
                .toLowerCase()
                .codePointAt(0)!;
        }
        return this.mappings.get(codePoint) || null;
    }
}

export const A1 = new Table('A.1');

export const B1 = new Table('B.1');
export const B2 = new Table('B.2');
export const B3 = new Table('B.3');

export const C11 = new Table('C.1.1');
export const C12 = new Table('C.1.2');
export const C21 = new Table('C.2.1');
export const C22 = new Table('C.2.2');
export const C3 = new Table('C.3');
export const C4 = new Table('C.4');
export const C5 = new Table('C.5');
export const C6 = new Table('C.6');
export const C7 = new Table('C.7');
export const C8 = new Table('C.8');
export const C9 = new Table('C.9');

export const D1 = new Table('D.1');
export const D2 = new Table('D.2');

// Shortcut some of the simpler table operations
B1.map = () => {
    return null;
};
C11.contains = (codePoint: number) => codePoint === 32;
C12.map = (codePoint: number) => {
    return C12.contains(codePoint) ? 32 : null;
};

interface StringPrepProfile {
    bidirectional: boolean;
    normalize: boolean;
    unassigned: Table;
    mappings: Table[];
    prohibited: Table[];
}

export function prepare(
    profile: StringPrepProfile,
    allowUnassigned: boolean,
    input: string = ''
): string {
    const inputCodePoints = Punycode.ucs2.decode(input);
    let mappedCodePoints: number[] = [];
    for (const codePoint of inputCodePoints) {
        if (!allowUnassigned && profile.unassigned.contains(codePoint)) {
            throw new Error('Unassigned code point: x' + codePoint.toString(16));
        }

        let hasMapping = false;
        for (const mappingTable of profile.mappings) {
            if (!mappingTable.hasMapping(codePoint)) {
                continue;
            }
            hasMapping = true;
            const mappedPoint = mappingTable.map(codePoint);
            if (!mappedPoint) {
                continue;
            }
            if (Array.isArray(mappedPoint)) {
                mappedCodePoints = mappedCodePoints.concat(mappedPoint);
            } else {
                mappedCodePoints.push(mappedPoint);
            }
        }
        if (!hasMapping) {
            mappedCodePoints.push(codePoint);
        }
    }

    let normalizedCodePoints: number[] = mappedCodePoints;
    if (profile.normalize) {
        const mappedString = Punycode.ucs2.encode(mappedCodePoints);
        const normalizedString = mappedString.normalize('NFKC');
        normalizedCodePoints = Punycode.ucs2.decode(normalizedString);
    }

    let hasRandALCat = false;
    let hasLCat = false;
    for (const codePoint of normalizedCodePoints) {
        for (const prohibited of profile.prohibited) {
            if (prohibited.contains(codePoint)) {
                throw new Error('Prohibited code point: x' + codePoint.toString(16));
            }
        }
        if (!allowUnassigned && profile.unassigned.contains(codePoint)) {
            // istanbul ignore next
            throw new Error('Prohibited code point: x' + codePoint.toString(16));
        }
        if (profile.bidirectional) {
            hasRandALCat = hasRandALCat || D1.contains(codePoint);
            hasLCat = hasLCat || D2.contains(codePoint);
        }
    }

    if (profile.bidirectional) {
        if (hasRandALCat && hasLCat) {
            throw new Error('String contained both LCat and RandALCat code points');
        }
        if (
            hasRandALCat &&
            (!D1.contains(normalizedCodePoints[0]) ||
                !D1.contains(normalizedCodePoints[normalizedCodePoints.length - 1]))
        ) {
            throw new Error(
                'String containing RandALCat code points must start and end with RandALCat code points'
            );
        }
    }

    return Punycode.ucs2.encode(normalizedCodePoints);
}

const NamePrepProfile: StringPrepProfile = {
    bidirectional: true,
    mappings: [B1, B2],
    normalize: true,
    prohibited: [C12, C22, C3, C4, C5, C6, C7, C8, C9],
    unassigned: A1
};
export function nameprep(str?: string, allowUnassigned: boolean = true): string {
    return prepare(NamePrepProfile, allowUnassigned, str);
}

export const NodePrepProhibited = new Table('NodePrepProhibited', [
    0x22,
    0x26,
    0x27,
    0x2f,
    0x3a,
    0x3c,
    0x3e,
    0x40
]);
const NodePrepProfile: StringPrepProfile = {
    bidirectional: true,
    mappings: [B1, B2],
    normalize: true,
    prohibited: [C11, C12, C21, C22, C3, C4, C5, C6, C7, C8, C9, NodePrepProhibited],
    unassigned: A1
};
export function nodeprep(str?: string, allowUnassigned: boolean = true): string {
    return prepare(NodePrepProfile, allowUnassigned, str);
}

const ResourcePrepProfile: StringPrepProfile = {
    bidirectional: true,
    mappings: [B1],
    normalize: true,
    prohibited: [C12, C21, C22, C3, C4, C5, C6, C7, C8, C9],
    unassigned: A1
};
export function resourceprep(str?: string, allowUnassigned: boolean = true): string {
    return prepare(ResourcePrepProfile, allowUnassigned, str);
}

const SASLPrepProfile: StringPrepProfile = {
    bidirectional: true,
    mappings: [C12, B1],
    normalize: true,
    prohibited: [C12, C21, C22, C3, C4, C5, C6, C7, C8, C9],
    unassigned: A1
};
export function saslprep(str?: string, allowUnassigned: boolean = false): string {
    return prepare(SASLPrepProfile, allowUnassigned, str);
}
