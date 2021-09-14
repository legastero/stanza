import { Resolver, createResolver, fetch } from '../platform';
import { shuffle, promiseAny } from '../Utils';
import { Registry, parse } from '../jxt';
import XRDSchema, { XRD } from '../protocol/xrd';

export interface Candidate {
    host: string;
    port: number;
    secure?: boolean;
}

export interface DNSOptions {
    srvType?: string;
    srvTypeSecure?: string;
}

export interface SRVRecord {
    name: string;
    port: number;
    priority: number;
    weight: number;

    secure?: boolean;

    // These fields are used for sorting
    used?: boolean;
    runningSum?: number;
    id?: number;
}

export interface SRVResult {
    records: SRVRecord[];
    allowFallback: boolean;
}

export default class NetworkDiscovery {
    private resolver?: Resolver;
    private registry: Registry;
    private hostMetaCache: Map<string, { created: number; hostmeta: Promise<XRD> }> = new Map();
    private hostMetaTTL = 30000;

    constructor() {
        this.resolver = createResolver();

        this.registry = new Registry();
        this.registry.define(XRDSchema);
    }

    public async getHostMeta(domain: string): Promise<XRD> {
        const cached = this.hostMetaCache.get(domain);
        if (cached) {
            if (cached.created + this.hostMetaTTL < Date.now()) {
                return cached.hostmeta;
            } else {
                this.hostMetaCache.delete(domain);
            }
        }

        const hostmeta = promiseAny<XRD>([
            fetch(`https://${domain}/.well-known/host-meta.json`).then(async (res: Response) => {
                if (!res.ok) {
                    throw new Error('could-not-fetch-json');
                }

                return res.json() as Promise<XRD>;
            }),
            fetch(`https://${domain}/.well-known/host-meta`).then(async (res: Response) => {
                if (!res.ok) {
                    throw new Error('could-not-fetch-xml');
                }

                const data = await res.text();
                const xml = parse(data);
                if (xml) {
                    return this.registry.import(xml) as XRD;
                } else {
                    throw new Error('could-not-import-xml');
                }
            })
        ]);

        this.hostMetaCache.set(domain, { created: Date.now(), hostmeta });
        hostmeta.catch(() => {
            this.hostMetaCache.delete(domain);
        });

        return hostmeta;
    }

    public async resolveTXT(domain: string): Promise<string[][]> {
        return this.resolver?.resolveTxt(domain) ?? [];
    }

    public async resolve(
        domain: string,
        defaultPort: number,
        opts: DNSOptions = {}
    ): Promise<Candidate[]> {
        if (!this.resolver) {
            return [];
        }
        let candidates: Candidate[] = [];

        let allowFallback = true;

        if (opts.srvType) {
            const srvResults = await this.resolveWeightedSRV(
                domain,
                opts.srvType,
                opts.srvTypeSecure
            );
            allowFallback = srvResults.allowFallback;
            candidates = srvResults.records.map(record => ({
                host: record.name,
                port: record.port,
                secure: record.secure
            }));
        }

        if (allowFallback) {
            candidates.push({ host: domain, port: defaultPort });
        }
        return candidates;
    }

    public async resolveWeightedSRV(
        domain: string,
        srvType: string,
        srvTypeSecure?: string
    ): Promise<SRVResult> {
        let [records, secureRecords] = await Promise.all([
            this.resolveSRV(domain, srvType),
            srvTypeSecure
                ? this.resolveSRV(domain, srvTypeSecure, true)
                : Promise.resolve({ records: [], allowFallback: false })
        ]);

        const allRecords = [...records.records, ...secureRecords.records];

        const priorities = new Map<number, SRVRecord[]>();

        let id = 0;
        for (const record of allRecords) {
            record.id = id++;
            record.runningSum = 0;

            if (!priorities.has(record.priority)) {
                priorities.set(record.priority, []);
            }
            const priorityGroup = priorities.get(record.priority)!;

            priorityGroup.push(record);
        }

        const weightRecords = (unweightedRecords: SRVRecord[]) => {
            const sorted: SRVRecord[] = [];

            while (sorted.length < unweightedRecords.length) {
                const ordered = shuffle(
                    unweightedRecords.filter(record => record.weight === 0 && !record.used)
                );
                const unordered = shuffle(
                    unweightedRecords.filter(record => {
                        return record.weight !== 0 && !record.used;
                    })
                );

                let weightSum = 0;
                for (const record of unordered) {
                    weightSum += record.weight;

                    record.runningSum = weightSum;
                    ordered.push(record);
                }

                const selector = Math.floor(Math.random() * (weightSum + 1));

                for (const record of ordered) {
                    if (record.runningSum! >= selector) {
                        record.used = true;
                        sorted.push(record);
                        break;
                    }
                }
            }

            return sorted;
        };

        let sortedRecords: SRVRecord[] = [];
        for (const priority of Array.from(priorities.keys()).sort((a, b) =>
            a < b ? -1 : a > b ? 1 : 0
        )) {
            const priorityGroup = priorities.get(priority)!;
            sortedRecords = sortedRecords.concat(weightRecords(priorityGroup));
        }

        return {
            records: sortedRecords,
            allowFallback: records.allowFallback
        };
    }

    public async resolveSRV(domain: string, srvType: string, secure?: boolean): Promise<SRVResult> {
        try {
            const records = (await this.resolver?.resolveSrv(`${srvType}.${domain}`)) ?? [];
            if (records.length === 1 && (records[0].name === '.' || records[0].name === '')) {
                return { records: [], allowFallback: false };
            }
            return {
                records: records
                    .map(record => ({ secure, ...record }))
                    .filter(record => record.name !== '' && record.name !== '.'),
                allowFallback: false
            };
        } catch {
            return {
                records: [],
                allowFallback: true
            };
        }
    }
}
