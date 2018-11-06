import { JID } from 'xmpp-jid';

import Client from './client';
import Plugins from './plugins';


export const VERSION = '__STANZAIO_VERSION__';

export {
    Client,
    JID
};

export function createClient (opts) {
    var client = new Client(opts);
    client.use(Plugins);

    return client;
}
