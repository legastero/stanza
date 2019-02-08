import * as jid from './protocol/jid';

import Client from './client';
import Plugins from './plugins';
import * as JXT from './jxt';

export const VERSION = '__STANZAIO_VERSION__';
export const JID = jid.JID;

export { Client, JXT, jid };

export function createClient(opts) {
    const client = new Client(opts);
    client.use(Plugins);

    return client;
}
