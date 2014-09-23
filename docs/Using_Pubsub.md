# Using PubSub

## 1. Create stanza definitions for our pubsub content

There are several existing payload formats that you can use, notably `json`, `tune`, `avatar`, and `geoloc`.

To create your own:

```javascript

var XMPP = require('stanza.io');

var MyContent = XMPP.jxt.define({
    name: 'mypubsubcontent',
    namespace: 'http://example.org/mypubsub',
    element: 'stuff',
    fields: {
        value: XMPP.jxt.text()
    }
});

// We want the content to be available for both publishing, and receiving update events.
XMPP.jxt.extend(XMPP.PubsubItem, MyContent);
XMPP.jxt.extend(XMPP.PubsubEvent, MyContent);
```

## 2. Publishing our new content

```javascript
client.publish('pubsub.example.com', 'ournode', {
    mypubsubcontent: {
        value: 'Away it goes!'
    }
}, cb);
```

If you wanted to go a simpler, built-in route, you could use:

```javascript
client.publish('pubsub.example.com', 'ournode', {
    json: {
        value: 'Any JSON content could go here'
    }
}, cb);
```

## 3. Receiving events

```javascript
client.on('pubsub:event', function (msg) {
    if (!msg.event.updated) {
        // Ignore node purge/deletion/etc events.
        return;
    }

    if (msg.event.updated.node !== 'ournode') {
        // We only want the event for a specific node.
        return;
    }

    // Extract the published item and emit a simpler event
    client.emit('mypubsubcontent', {
        jid: msg.from,
        mypubsubcontent: msg.event.updated.published[0].mypubsubcontent
    });
});
```
