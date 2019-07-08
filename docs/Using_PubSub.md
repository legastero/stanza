# Using PubSub

## 1. Create stanza definitions for our pubsub content

There are several existing payload formats that you can use, notably `json`, `tune`, `avatar`, and `geoloc`.

To create your own, the first step is to make a plugin for JXT to register the new stanza content:

```javascript
// mycontentplugin.ts

import { Agent, jxt } from 'stanza';

export const NS_MY_PUBSUB = 'http://example.com/p/mypubsub';

export interface MyPubSubContent {
    // The itemType field is what is used to distinguish pubsub
    // item content types. It MUST be present when exporting,
    // but we're going to mark it as optional to be easier to
    // work with.
    itemType?: typeof NS_MY_PUBSUB;
    value: string;
}

export default function(client: Agent, stanzas: jxt.Registry) {
    stanzas.define({
        // Inject our definition into all pubsub item content slots.
        // These slots are already registered with `itemType` as the
        // type field.
        aliases: jxt.pubsubItemContentAliases(),
        element: 'stuff',
        fields: {
            value: jxt.text()
        },
        namespace: NS_MY_PUBSUB,
        // Specify the `itemType` value for our content.
        type: NS_MY_PUBSUB
    });
}
```

We can then load the plugin with:

```javascript
import MyContentPlugin from 'mycontentplugin';

client.use(MyContentPlugin);
```

## 2. Publishing our new content

```javascript
client.publish('pubsub.example.com', 'ournode', {
    itemType: NS_MY_PUBSUB, // Again, `itemType` is required
    value: 'Away it goes!'
});
```

## 3. Subscribing to our content

```javascript
client.subscribeToNode('pubsub.example.com', 'ournode');
```

If you want to subscribe using your bare JID, you can use:

```javascript
client.subscribeToNode('pubsub.example.com', {
    node: 'ournode',
    useBareJID: true
});
```

## 4. Receiving publish events

```javascript
    client.on('pubsub:published', msg => {
        const { node, published } = msg.pubsub.items;

        // Only process publishes for the node we care about
        if (node !== 'ournode') {
            return;
        }

        // We can check that we got the expected data type
        // by checking the itemType:
        const itemType = published[0]!.content.itemType;
        if (itemType !== NS_MY_PUBSUB) {
            return;
        }

        // Extract our content. Unfortunately, we have to assert the type here.
        const data = published[0]!.content as MyPubSubContent;

        // ...process the pubsub data
    });
```

## 5. Unsubscribing

```javascript
client.unsubscribeFromNode('pubsub.example.com', 'ournode');
```

Or, if you subscribed with a bare JID:

```javascript
client.unsubscribeFromNode('pubsub.example.com', {
    node: 'ournode',
    useBareJID: true
});
```
