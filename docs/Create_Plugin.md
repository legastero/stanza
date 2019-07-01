# Creating a StanzaJS Plugin

```javascript
import { Agent, jxt } from 'stanza';


// 1. Declare our new custom stanza type
export interface MyStanza {
    type: string;
    value: string;
}

// 2. Begin injecting our plugin's type information into stanza.
declare module 'stanza' {

    // 3. Declare a new method for the StanzaJS agent
    export interface Agent {
        sendMyStanza(jid: string, data: string): void;
    }

    // 4. Stanza definitions MUST be placed in the Stanzas namespace
    namespace Stanzas {

        // 5. Attach our new definition to Message stanzas
        export interface Message {
            mystanza?: MyStanza;
        }
    }
}


// 6. Create a plugin function
export default function (client: Agent, stanzas: jxt.Registry) {

    // 7. Create and register our custom `mystanza` stanza definition
    stanzas.define({
        element: 'foo',
        fields: {
            type: jxt.attribute('type'),
            value: jxt.text()
        },
        namespace: 'http://example.com/p/foo',
        path: 'message.mystanza'
    });

    // 8. Add API to the StanzaJS agent for sending `mystanza` data
    client.sendMyStanza = (jid: string, data: string): void {
        client.sendMessage({
            to: jid,
            mystanza: {
                type: 'bar',
                value: data
            }
        });
    };

    // 9. Listen for incoming `mystanza` data and emit our own event
    client.on('message', (msg: Message) => {
        if (msg.mystanza) {
            client.emit('mystanza', msg);
        }
    });
};
```

```javascript
// 10. Load our plugin
import MyStanzaPlugin from 'path/to/plugin';

client.use(MyStanzaPlugin);
```
