import OldWSConnection from '../transports/old-websocket';

export default function(client) {
    client.transports['old-websocket'] = OldWSConnection;
}
