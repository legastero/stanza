'use strict';

import WSConnection from '../transports/websocket';


export default function (client) {

    client.transports.websocket = WSConnection;
}
