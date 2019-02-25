import fetch from 'cross-fetch';

import { Agent } from '../Definitions';
import * as JXT from '../jxt';
import { NS_ALT_CONNECTIONS_WEBSOCKET, NS_ALT_CONNECTIONS_XBOSH } from '../protocol';

declare module '../Definitions' {
    export interface Agent {
        discoverBindings(server: string): Promise<{ [key: string]: string[] }>;
    }
}

async function promiseAny(promises: Array<Promise<any>>) {
    try {
        const errors = await Promise.all(
            promises.map(p => {
                return p.then(val => Promise.reject(val), err => Promise.resolve(err));
            })
        );
        return Promise.reject(errors);
    } catch (val) {
        return Promise.resolve(val);
    }
}

export async function getHostMeta(
    registry: JXT.Registry,
    opts: string | { host?: string; json?: boolean; ssl?: boolean; xrd?: boolean }
) {
    if (typeof opts === 'string') {
        opts = { host: opts };
    }

    const config = {
        json: true,
        ssl: true,
        xrd: true,
        ...opts
    };

    const scheme = config.ssl ? 'https://' : 'http://';

    return promiseAny([
        fetch(`${scheme}${config.host}/.well-known/host-meta.json`).then(async res => {
            if (!res.ok) {
                throw new Error('could-not-fetch-json');
            }

            return res.json();
        }),
        fetch(`${scheme}${config.host}/.well-known/host-meta`).then(async res => {
            if (!res.ok) {
                throw new Error('could-not-fetch-xml');
            }

            const data = await res.text();
            const xml = JXT.parse(data);
            if (xml) {
                return registry.import(xml);
            }
        })
    ]);
}

export default function(client: Agent, stanzas: JXT.Registry) {
    client.discoverBindings = async (server: string) => {
        try {
            const data = await getHostMeta(stanzas, server);
            const results: { [key: string]: string[] } = {
                bosh: [],
                websocket: []
            };
            const links = data.links || [];

            for (const link of links) {
                if (link.href && link.rel === NS_ALT_CONNECTIONS_WEBSOCKET) {
                    results.websocket.push(link.href);
                }
                if (link.href && link.rel === NS_ALT_CONNECTIONS_XBOSH) {
                    results.bosh.push(link.href);
                }
            }

            return results;
        } catch (err) {
            return {};
        }
    };
}
