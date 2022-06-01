export interface Entry<D> {
    data: D;
    next: Entry<D> | null;
}

export class BufferList<D extends Buffer = Buffer> {
    head: Entry<D>;
    tail: Entry<D>;
    length: number;

    push(v: D): void;
    unshift(v: D): void;
    shift(): D;
    clear(): void;
    join(s: any): string;
    concat(n: number): D;
}
