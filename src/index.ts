import * as JID from './protocol/JID';

import Client from './Client';
import { AgentConfig } from './Definitions';
import * as JXT from './jxt';
import Plugins from './plugins';

export const VERSION = '__STANZAJS_VERSION__';

export { Client, JXT, JID };

export function createClient(opts: AgentConfig) {
    const client = new Client(opts);
    client.use(Plugins);

    return client;
}
