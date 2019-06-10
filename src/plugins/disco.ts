import { Agent } from '../';
import Disco, { DiscoNodeInfo } from '../DiscoManager';
import * as JID from '../JID';
import {
    DiscoInfo,
    DiscoInfoResult,
    DiscoItems,
    DiscoItemsResult,
    IQ,
    LegacyEntityCaps,
    NS_DISCO_INFO,
    NS_DISCO_ITEMS,
    Presence
} from '../protocol';

declare module '../' {
    export interface Agent {
        disco: Disco;
        getDiscoInfo(
            jid?: string,
            node?: string
        ): Promise<
            IQ & {
                disco: DiscoInfoResult;
            }
        >;
        getDiscoItems(
            jid?: string,
            node?: string
        ): Promise<
            IQ & {
                disco: DiscoItemsResult;
            }
        >;
        updateCaps(): LegacyEntityCaps | undefined;
        getCurrentCaps():
            | {
                  legacyEntityCaps: LegacyEntityCaps;
                  info: DiscoNodeInfo;
              }
            | undefined;
    }

    export interface AgentConfig {
        capsNode?: string;
    }
}

export default function(client: Agent) {
    client.disco = new Disco();

    client.disco.addFeature(NS_DISCO_INFO);
    client.disco.addFeature(NS_DISCO_ITEMS);
    client.disco.addIdentity({
        category: 'client',
        type: 'web'
    });

    client.registerFeature('caps', 100, (features, done) => {
        const domain = JID.getDomain(client.jid) || client.config.server;

        client.emit('disco:caps', {
            caps: features.legacyCapabilities,
            from: domain
        });
        client.features.negotiated.caps = true;
        done();
    });

    client.getDiscoInfo = async (jid: string, node?: string) => {
        const result = await client.sendIQ<{ disco: DiscoInfo }, { disco: DiscoInfoResult }>({
            disco: {
                node,
                type: 'info'
            },
            to: jid,
            type: 'get'
        });

        return {
            extensions: [],
            features: [],
            identities: [],
            ...result
        };
    };

    client.getDiscoItems = async (jid: string, node?: string) => {
        const result = await client.sendIQ<{ disco: DiscoItems }, { disco: DiscoItemsResult }>({
            disco: {
                node,
                type: 'items'
            },
            to: jid,
            type: 'get'
        });

        return {
            items: [],
            ...result
        };
    };

    client.updateCaps = () => {
        const node = client.config.capsNode || 'https://stanzajs.org';
        return client.disco.updateCaps(node, 'sha-1');
    };

    client.getCurrentCaps = () => {
        const caps = client.disco.caps;
        if (!caps) {
            return;
        }
        const node = `${caps.node}#${caps.value}`;
        return {
            info: client.disco.getNodeInfo(node),
            legacyEntityCaps: caps
        };
    };

    client.on('presence', (pres: Presence) => {
        if (pres.legacyCapabilities) {
            client.emit('disco:caps', pres);
        }
    });

    client.on('iq:get:disco', (iq: IQ) => {
        const disco = iq.disco!;
        if (disco.type === 'info') {
            const node = disco.node || '';
            client.sendIQResult(iq, {
                disco: {
                    ...client.disco.getNodeInfo(node),
                    node,
                    type: 'info'
                }
            });
        }
        if (disco.type === 'items') {
            const node = disco.node || '';
            client.sendIQResult(iq, {
                disco: {
                    items: client.disco.items.get(node) || [],
                    type: 'items'
                }
            });
        }
    });
}
