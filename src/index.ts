import Client from './Client';
import { Agent, AgentConfig } from './Definitions';
import * as JID from './JID';
import * as JXT from './jxt';
import Plugins from './plugins';
import * as Stanzas from './protocol';

export const VERSION = '__STANZAJS_VERSION__';

export { Agent, Client, JXT, JID, Stanzas };

export function createClient(opts: AgentConfig): Client & Agent {
    const client = new Client(opts);
    client.use(Plugins);

    return client as Client & Agent;
}
