import * as EntityCaps from './helpers/LegacyEntityCapabilities';
import { DataForm, DiscoInfo, DiscoInfoIdentity, DiscoItem, LegacyEntityCaps } from './protocol';

export interface DiscoNodeInfo {
    features: string[];
    identities: DiscoInfoIdentity[];
    extensions: DataForm[];
}

export default class Disco {
    public features: Map<string, Set<string>>;
    public identities: Map<string, DiscoInfoIdentity[]>;
    public extensions: Map<string, DataForm[]>;
    public items: Map<string, DiscoItem[]>;
    public caps?: LegacyEntityCaps;

    constructor() {
        this.features = new Map();
        this.identities = new Map();
        this.extensions = new Map();
        this.items = new Map();
        this.caps = undefined;

        this.features.set('', new Set());
        this.identities.set('', []);
        this.extensions.set('', []);
    }

    public getNodeInfo(node: string): DiscoNodeInfo {
        return {
            extensions: [...(this.extensions.get(node) || [])],
            features: [...(this.features.get(node) || [])],
            identities: [...(this.identities.get(node) || [])]
        };
    }

    public addFeature(feature: string, node: string = ''): void {
        if (!this.features.has(node)) {
            this.features.set(node, new Set());
        }
        this.features.get(node)!.add(feature);
    }

    public addIdentity(identity: DiscoInfoIdentity, node: string = ''): void {
        if (!this.identities.has(node)) {
            this.identities.set(node, []);
        }
        this.identities.get(node)!.push(identity);
    }

    public addItem(item: DiscoItem, node: string = ''): void {
        if (!this.items.has(node)) {
            this.items.set(node, []);
        }
        this.items.get(node)!.push(item);
    }

    public addExtension(form: DataForm, node: string = ''): void {
        if (!this.extensions.has(node)) {
            this.extensions.set(node, []);
        }
        this.extensions.get(node)!.push(form);
    }

    public updateCaps(node: string, algorithm: string = 'sha-1'): LegacyEntityCaps | undefined {
        const info: DiscoInfo = {
            extensions: [...this.extensions.get('')!],
            features: [...this.features.get('')!],
            identities: [...this.identities.get('')!],
            type: 'info'
        };

        const version = EntityCaps.generate(info, algorithm);
        if (!version) {
            this.caps = undefined;
            return;
        }

        this.caps = {
            algorithm,
            node,
            value: version
        };

        const hashedNode = `${node}#${version}`;
        for (const feature of info.features!) {
            this.addFeature(feature, hashedNode);
        }
        for (const identity of info.identities!) {
            this.addIdentity(identity, hashedNode);
        }
        for (const form of info.extensions!) {
            this.addExtension(form, hashedNode);
        }

        this.identities.set(hashedNode, info.identities!);
        this.features.set(hashedNode, new Set(info.features!));
        this.extensions.set(hashedNode, info.extensions!);

        return this.caps;
    }
}
