import { Paging } from '../protocol/xep0059';

type RSMQuery<T> = (page: Paging) => Promise<{ results: T[]; paging: Paging }>;

interface RSMOptions<T> {
    pageSize?: number;
    direction?: 'forward' | 'backward';
    reverse?: boolean;
    before?: string;
    after?: string;
    max?: number;
    query: RSMQuery<T>;
}

export class ResultSetPager<T> {
    private query: RSMQuery<T>;
    private cursor: Paging;
    private direction: 'forward' | 'backward';
    private reverse: boolean;
    private pageSize: number;

    constructor(opts: RSMOptions<T>) {
        this.cursor = { first: opts.before, last: opts.after };
        this.query = opts.query;
        this.direction = opts.direction ?? 'forward';
        this.reverse = opts.reverse ?? this.direction === 'backward';
        this.pageSize = opts.pageSize ?? 20;
    }

    public async *[Symbol.asyncIterator](): AsyncGenerator<T> {
        let currentResults: T[] = [];
        do {
            currentResults = await this.fetchPage();
            for (const item of currentResults) {
                yield item;
            }
        } while (currentResults.length > 0);
    }

    public async size(): Promise<number | undefined> {
        const { paging } = await this.query({ max: 0 });
        return paging.count;
    }

    private async fetchPage(): Promise<T[]> {
        const { results, paging } = await this.query({
            before: this.direction === 'backward' ? this.cursor.first ?? '' : undefined,
            after: this.direction === 'forward' ? this.cursor.last : undefined,
            max: this.pageSize
        });
        this.cursor = paging;
        if (this.reverse) {
            results.reverse();
        }
        return results;
    }
}

export function createPager<T>(opts: RSMOptions<T>): ResultSetPager<T> {
    return new ResultSetPager(opts);
}
