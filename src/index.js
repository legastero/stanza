import * as jid from './protocol/jid';

import Client from './client';
import Plugins from './plugins';

export const VERSION = '__STANZAJS_VERSION__';
export const JID = jid.JID;

export { Client, jid };

export function createClient(opts) {
    const client = new Client(opts);
    client.use(Plugins);

    return client;
}
