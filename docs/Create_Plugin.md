# Creating a StanzaJS Plugin

```javascript
import { Agent, jxt } from 'stanza';


// 1. Declare our new custom stanza type
export interface MyStanza {
    type: string;
    value: string;
}

// 2. Declare a new method for the StanzaJS agent
declare module 'stanza' {
    export interface Agent {
        sendMyStanza(jid: string, data: string): void;
    }
}

// 3. Attach our new definition to message stanzas
declare module 'stanza/protocol' {
    export interface Message {
        mystanza?: MyStanza;
    }
}


// 4. Create a plugin function
export default function (client: Agent, stanzas: jxt.Registry) {

    // 5. Create and register our custom `mystanza` stanza definition
    stanzas.define({
        element: 'foo',
        fields: {
            type: jxt.attribute('type'),
            value: jxt.text()
        },
        namespace: 'http://example.com/p/foo',
        path: 'message.mystanza'
    });

    // 6. Add API to the StanzaJS agent for sending `mystanza` data
    client.sendMyStanza = (jid: string, data: string): void {
        client.sendMessage({
            to: jid,
            mystanza: {
                type: 'bar',
                value: data
            }
        });
    };

    // 7. Listen for incoming `mystanza` data and emit our own event
    client.on('message', (msg: Message) => {
        if (msg.mystanza) {
            client.emit('mystanza', msg);
        }
    });
};
```

```javascript
// 8. Load our plugin
import MyStanzaPlugin from 'path/to/plugin';

client.use(MyStanzaPlugin);
```
