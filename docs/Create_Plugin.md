# Creating a Stanza.io Plugin


```javascript
module.exports = function (client, stanzas) {
    // 1. Create and register our custom `mystanza` stanza type

    var types = stanzas.utils;

    var Foo = stanzas.define({
        name: 'mystanza',
        element: 'foo',
        namespace: 'http://example.com/p/foo',
        fields: {
            type: types.attribute('type'),
            value: types.text()
        }
    });

    stanzas.withMessage(function (Message) {
        stanzas.extend(Message, Foo);
    });


    // 2. Add API to the stanza.io client for sending `mystanza` data

    client.sendMyStanza = function (jid, foo) {
        client.sendMessage({
            to: jid,
            mystanza: {
                type: 'bar',
                value: foo
            }
        });
    };


    // 3. Listen for incoming `mystanza` data and emit our own event

    client.on('message', function (msg) {
        if (msg.mystanza) {
            client.emit('foo', msg);
        }
    });
};
```

```javascript
// 4. Load our plugin

client.use(require('path/to/plugin'));
```
