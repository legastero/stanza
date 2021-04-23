import { Agent } from '../';
import Disco, { DiscoNodeInfo } from '../helpers/DiscoManager';
import * as JID from '../JID';
import { NS_DISCO_INFO, NS_DISCO_ITEMS } from '../Namespaces';
import {
    DiscoInfo,
    DiscoInfoResult,
    DiscoItems,
    DiscoItemsResult,
    LegacyEntityCaps,
    ReceivedIQGet
} from '../protocol';

declare module '../' {
    export interface Agent {
        disco: Disco;
        getDiscoInfo(jid?: string, node?: string): Promise<DiscoInfoResult>;
        getDiscoItems(jid?: string, node?: string): Promise<DiscoItemsResult>;
        updateCaps(): LegacyEntityCaps[] | undefined;
        getCurrentCaps():
            | {
                  legacyCapabilities: LegacyEntityCaps[];
                  info: DiscoNodeInfo;
              }
            | undefined;
    }

    export interface AgentConfig {
        /**
         * Entity Caps Disco Node
         *
         * The disco info node prefix to use for entity capability advertisements.
         *
         * @default "https://stanzajs.org"
         */
        capsNode?: string;
    }

    export interface AgentEvents {
        'disco:caps': {
            caps: LegacyEntityCaps[];
            jid: string;
        };
        'iq:get:disco': ReceivedIQGet & { disco: Disco };
    }
}

export default function (client: Agent): void {
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
            caps: features.legacyCapabilities || [],
            jid: domain!
        });
        client.features.negotiated.caps = true;
        done();
    });

    client.getDiscoInfo = async (jid: string, node?: string) => {
        const resp = await client.sendIQ({
            disco: {
                node,
                type: 'info'
            } as DiscoInfo,
            to: jid,
            type: 'get'
        });

        return {
            extensions: [],
            features: [],
            identities: [],
            ...resp.disco
        };
    };

    client.getDiscoItems = async (jid: string, node?: string) => {
        const resp = await client.sendIQ({
            disco: {
                node,
                type: 'items'
            } as DiscoItems,
            to: jid,
            type: 'get'
        });

        return {
            items: [],
            ...resp.disco
        };
    };

    client.updateCaps = () => {
        const node = client.config.capsNode || 'https://stanzajs.org';
        return client.disco.updateCaps(node);
    };

    client.getCurrentCaps = () => {
        const caps = client.disco.getCaps();
        if (!caps) {
            return;
        }
        const node = `${caps[0].node}#${caps[0].value}`;
        return {
            info: client.disco.getNodeInfo(node),
            legacyCapabilities: caps
        };
    };

    client.on('presence', pres => {
        if (pres.legacyCapabilities) {
            client.emit('disco:caps', {
                caps: pres.legacyCapabilities,
                jid: pres.from
            });
        }
    });

    client.on('iq:get:disco', iq => {
        const { type, node } = iq.disco;
        if (type === 'info') {
            client.sendIQResult(iq, {
                disco: {
                    ...client.disco.getNodeInfo(node || ''),
                    node,
                    type: 'info'
                }
            });
        }
        if (type === 'items') {
            client.sendIQResult(iq, {
                disco: {
                    items: client.disco.items.get(node || '') || [],
                    type: 'items'
                }
            });
        }
    });
}
