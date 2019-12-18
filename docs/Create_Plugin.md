# Creating a StanzaJS Plugin

```javascript
import { Agent, JXT } from 'stanza';


// 1. Declare our new custom stanza extension type
export interface MyStanza {
    type: string;
    value: string;
}

// 2. Begin injecting our plugin's type information into StanzaJS.
declare module 'stanza' {

    // 3. Declare a new method for the StanzaJS agent
    export interface Agent {
        sendMyStanza(jid: string, data: string): void;
    }

    // 4. Declare our event types. (Event names are the fields in AgentEvents.)
    export interface AgentEvents {
        mystanza: Message & { mystanza: MyStanza };
    }

    // 5. Stanza definitions MUST be placed in the Stanzas namespace
    namespace Stanzas {

        // 6. Attach our new definition to Message stanzas
        export interface Message {
            mystanza?: MyStanza;
        }
    }
}


// 7. Create a plugin function
export default function (client: Agent, stanzas: JXT.Registry) {

    // 8. Create and register our custom `mystanza` stanza definition
    stanzas.define({
        element: 'foo',
        fields: {
            type: JXT.attribute('type'),
            value: JXT.text()
        },
        namespace: 'http://example.com/p/foo',
        path: 'message.mystanza'
    });

    // 9. Add API to the StanzaJS agent for sending `mystanza` data
    client.sendMyStanza = (jid: string, data: string) {
        return client.sendMessage({
            to: jid,
            mystanza: {
                type: 'bar',
                value: data
            }
        });
    };

    // 10. Listen for incoming `mystanza` data and emit our own event
    client.on('message', msg => {
        if (msg.mystanza) {
            client.emit('mystanza', msg);
        }
    });
};
```

```javascript
// 11. Load our plugin
import MyStanzaPlugin from 'path/to/plugin';

client.use(MyStanzaPlugin);
```
