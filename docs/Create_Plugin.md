# Creating a Stanza.io Plugin


```javascript
module.exports = function (client, stanzas) {
    // 1. Create and register our custom Foo stanza type

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


    // 2. Add API to the stanza.io client for sending Foo data

    client.sendFoo = function (jid, foo, cb) {
        client.sendMessage({
            to: jid,
            foo: {
                type: 'bar',
                value: foo
            }
        });
    };


    // 3. Listen for incoming Foo data and emit our own event

    client.on('message', function (msg) {
        if (msg.foo) {
            client.emit('foo', msg);
        }
    });
};vi
```
