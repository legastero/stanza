# Using Stream Management

> AKA: Handling 'Message failed to send' situations

[XEP-0198: Stream Management](https://xmpp.org/extensions/xep-0198.html) can be used with StanzaJS, and it allows for detecting and recovering some situations where connection loss would prevent messages you _thought_ were sent actually failed.

## Configuring Stream Management

Stream management is enabled automatically if your server offers it during stream negotiation.

You can turn it off, if necessary, when configuring a client:

```typescript
import * as XMPP from 'stanza';

const client = XMPP.createClient({
    ...opts,
    useStreamManagement: false
});
```

Stream resumption is also enabled by default, if available. It can be disabled in the client configuration:

```typescript
import * as XMPP from 'stanza';

const client = XMPP.createClient({
    ...opts,
    allowResumption: false,
    useStreamManagement: true
});
```

## Caching State

In order for stream management to recover from a connection loss, the state of unacked stanzas must be
cached. StanzaJS does this automatically in memory, but that information can be lost on a page
navigation, or if an app gets suspended and unloaded.

The `client.sm` object provides two methods for persisting the stream management state:

-   `load()`
-   `cache()`

Before calling `client.connect()`, you can use `client.sm.load()` to restore the stream management state
from a previous session:

```typescript
import { Utils } from 'stanza';

const cachedSM = sessionStorage.cachedSM;
if (cachedSM) {
    client.sm.load(JSON.parse(cachedSM, Utils.reviveData));
}
```

The `Utils.reviveData()` helper function is available to restore `Date` and `Buffer` objects after they've been serialized with `JSON.stringify()`.

If you pass a function to `client.sm.cache()`, it will be called on every state change:

```typescript
client.sm.cache(state => {
    sessionStorage.cachedSM = JSON.stringify(state);
});
```

You can also return a promise if your caching process needs to be async.

## Detecting Message Failures

Detecting message loss requires having some sort of storage for tracking the messages
you know you have sent locally. How you do that, is up to you.

For now, we'll assume a basic `Map`:

```typescript
const messageStorage = new Map();
```

Then we need to track every message that we send:

```typescript
client.on('message:sent', (msg, viaCarbon) => {
    messageStorage.set(msg.id, {
        serverReceived: viaCarbon,
        mucReceived: false,
        failedToSend: false
    });
});
```

Now, there are several things that should be noted at this point.

First, we use the `message:sent` event to capture the `id` of outgoing messages instead of using the return value of `client.sendMessage()` or manually generating and passing `id` values to `sendMessage()`. Doing it this way ensures we capture _all_ outgoing messages, without worrying about where `sendMessage()` was called.

You might notice that the `message:sent` event gets fired _immediately_ when calling `sendMessage()`, even before the message actually gets written to a connection. This is by design: the moment you call `sendMessage()` you must treat the message as if it is in flight over the network.

Second, we are looking at the `viaCarbon` flag to distinguish if this was a message sent locally, or it came from a [XEP-0280 message carbon](https://xmpp.org/extensions/xep-0280.html). If it came from a carbon, then the server has clearly received the original message.

Third, we are storing three flags to represent multiple situations:

-   The server has received our message.
-   If we are sending a message to a MUC, the MUC service has received our message.
-   The message failed to send entirely.

Since MUCs are a very common use case, tracking that your message made it to the room, and not just
to your server, is a good practice. MUCs reflect the messages you send back to you, so that state
can be tracked regardless of if stream management is in use.

Let's start with the easier MUC tracking:

```typescript
client.on('groupchat', msg => {
    if (msg.from === yourInRoomNick && messageStorage.has(stanza.id)) {
        messageStorage.set(msg.id, {
            serverReceived: true,
            mucReceived: true
        });
    }
});
```

We can set multiple states to `true` here, since if the MUC has received your message, then your server must have as well.

To detect that your server has received your message, we use the `stanza:acked` event:

```typescript
client.on('stanza:acked', (stanza, kind) => {
    if (kind !== 'message') {
        return;
    }

    if (messageStorage.has(stanza.id)) {
        messageStorage.set(stanza.id, {
            serverReceived: true,
            mucReceived: false
        });
    }
});
```

The `stanza:acked` event fires for all stanza types, not just messages. So we filter to make sure we are only updating message state.

In the event that you lose connection, there are two possibilities:

1. Stream resumption works, and messages get resent as needed, automatically.
2. Stream resumption fails.

If stream resumption fails, then any still-pending messages _never_ made it to the server:

```typescript
client.on('stanza:failed', (stanza, kind) => {
    if (kind !== 'message') {
        return;
    }

    if (messageStorage.has(stanza.id)) {
        messageStorage.set(stanza.id, {
            failedToSend: true
        });
    }
});
```

The `stanza:failed` event will also be emitted if a stanza is attempted to be sent, but the client has disconnected and stream resumption was not enabled.

These messages will need to be resent. Probably via a direct user interaction to confirm resending, as the messages could be old and no longer needed.
