import { Agent } from '../';

export * from './account';
export * from './avatar';
export * from './bind';
export * from './command';
export * from './connection';
export * from './dataforms';
export * from './disco';
export * from './entity';
export * from './features';
export * from './hostmeta';
export * from './invisible';
export * from './jingle';
export * from './mam';
export * from './messaging';
export * from './muc';
export * from './pep';
export * from './pubsub';
export * from './roster';
export * from './sasl';
export * from './sharing';

import Account from './account';
import Avatar from './avatar';
import Bind from './bind';
import Command from './command';
import Connection from './connection';
import DataForms from './dataforms';
import Disco from './disco';
import Entity from './entity';
import Features from './features';
import HostMeta from './hostmeta';
import Invisible from './invisible';
import Jingle from './jingle';
import MAM from './mam';
import Messaging from './messaging';
import MUC from './muc';
import PEP from './pep';
import PubSub from './pubsub';
import Roster from './roster';
import SASL from './sasl';
import Sharing from './sharing';

export function core(client: Agent) {
    client.use(Features);
    client.use(Disco);

    client.use(Bind);
    client.use(Connection);
    client.use(HostMeta);
    client.use(SASL);
}

export default function(client: Agent) {
    client.use(Account);
    client.use(Messaging);
    client.use(Avatar);
    client.use(Command);
    client.use(DataForms);
    client.use(Entity);
    client.use(Invisible);
    client.use(Jingle);
    client.use(MAM);
    client.use(MUC);
    client.use(PEP);
    client.use(PubSub);
    client.use(Roster);
    client.use(Sharing);
}
