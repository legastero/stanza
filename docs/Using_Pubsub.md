# Using PubSub

## 1. Create stanza definitions for our pubsub content

There are several existing payload formats that you can use, notably `json`, `tune`, `avatar`, and `geoloc`.

To create your own, the first step is to make a plugin for JXT to register the new stanza content:

```javascript
var MyContentPlugin = function (client, stanza) {
    var types = stanza.utils;

    var MyContent = stanza.define({
        name: 'mypubsubcontent',
        namespace: 'http://example.org/mypubsub',
        element: 'stuff',
        fields: {
            value: types.text()
        }
    });

    // We want the content to be available for both publishing, and receiving update events.
    stanza.withPubsubItem(function (Item) {
        stanza.extend(Item, MyContent);
    });
});
```

We can then load the plugin with:

```javascript
client.use(MyContentPlugin);
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

## 3. Subscribing to our content

```javascript
client.subscribeToNode('pubsub.example.com', 'ournode', function (err) {
   if (!err) {
      console.log('subscribed');
   }
});
```

## 4. Receiving events

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

## 5. Unsubscribing

```javascript
client.unsubscribeFromNode('pubsub.example.com', 'ournode', function (err) {
   if (!err) {
      console.log('unsubscribed');
   }
});
```
