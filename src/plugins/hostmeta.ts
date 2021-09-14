import { Agent } from '../';
import { NS_ALT_CONNECTIONS_WEBSOCKET, NS_ALT_CONNECTIONS_XBOSH } from '../Namespaces';


declare module '../' {
    export interface Agent {
        discoverBindings(server: string): Promise<{ [key: string]: any[] }>;
    }
}

export default function (client: Agent): void {
    client.discoverBindings = async (server: string) => {
        const bosh = new Set<string>();
        const websocket = new Set<string>();

        const discoverHostMeta = client.resolver.getHostMeta(server).then(xrd => {
            for (const link of xrd.links ?? []) {
                if (link.href && link.rel === NS_ALT_CONNECTIONS_WEBSOCKET) {
                    websocket.add(link.href);
                }
                if (link.href && link.rel === NS_ALT_CONNECTIONS_XBOSH) {
                    bosh.add(link.href);
                }
            }
        }).catch(() => {});

        const discoverDNS = client.resolver.resolveTXT(`_xmppconnect.${server}`).then(txtRecords => {
            for (const group of txtRecords) {
                for (const value of group) {
                    if (value.startsWith('_xmpp-client-websocket=')) {
                        const url = value.substr(value.indexOf('=') + 1)
                        if (url) {
                            websocket.add(url);
                        }
                    }
                    if (value.startsWith('_xmpp-client-xbosh=')) {
                        const url = value.substr(value.indexOf('=') + 1)
                        if (url) {
                            bosh.add(url);
                        }
                    }
                }
            }
        }).catch(() => {});

        await Promise.all([discoverHostMeta, discoverDNS]).catch(() => {});

        return {
            bosh: [...bosh].filter(url => url.startsWith('https://')),
            websocket: [...websocket].filter(url => url.startsWith('wss://'))
        };
    };
}
