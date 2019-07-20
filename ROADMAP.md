# StanzaJS Roadmap

-   [x] Fully convert to TypeScript, with full protocol definitions for supported XEPs.
-   [x] Upgrade JXT system
-   [ ] Switch from using synchronous events to async hooks
-   [ ] Support changing default plugin loading
-   [ ] Upgrade Jingle engine
-   [ ] Support direct TCP/TLS connections
-   [ ] Support server component connections

All of these items have already been completed in R&D, but getting the changes integrated and rolled into the main release of StanzaJS (in an incremental, upgradeable way) takes more time, planning, and testing.

Fully finishing this plan will result in one or two major version bumps.

## Switch from using synchronous events to async hooks

There are three goals for this change:

1. Support waiting for async events to process.
2. Support controlling the order in which multiple event handlers run for a single event.
3. Support returning result data back from a processed event.

Because this will make event processing async, this is a major breaking change.

The code for the new event system already exists for review: https://github.com/legastero/stanza/blob/hook-emitter/src/HookEmitter.ts

The end goal is that things like the following will be possible:

```typescript
// --------------------------------------------------------------------
// Using this API:
// --------------------------------------------------------------------

// Dispatch an event to gather user credentials for this session.
const fetchedCreds = await this.requestSelfCredentials(session.accountId, mechanism.getExpectedCredentials());
// Use the gathered credentials
const resp = mechanism.createResponse(fetchedCreds.credentials)


// --------------------------------------------------------------------
// Doing the dispatching:
// --------------------------------------------------------------------
public requestSelfCredentials(identityId: string, expected: SASL.ExpectedCredentials): Promise<RequestSelfCredentialsEvent> {
    return this.emit<RequestSelfCredentialsEvent>('credentials:self:request', {
        credentials: {},
        expected,
        identityId
    });
}

// --------------------------------------------------------------------
// Hooking the events and injecting data to return:
// --------------------------------------------------------------------
// Being async, this handler could just as easily read from an external
// password storage service, or render a GUI and wait for user input.
this.on<RequestSelfCredentialsEvent>('credentials:self:request', async event => {
    const identity = event.data.identityId;
    const config = this.configs.get(identity);

    if (!config) {
        return;
    }

    const server = JID.domain(config.jid);
    const defaultCredentials = {
        password: config.password,
        username: JID.local(config.jid),
        server,
        realm: server,
        serviceName: server,
        serviceType: 'xmpp'
    }

    const knownCredentials = {
        ...defaultCredentials,
        ...(config.credentials || {})
    }
    const credentials = [...event.data.expected.required, ...event.data.expected.optional];

    for (const credential of credentials) {
        if (!event.data.credentials[credential] && knownCredentials[credential]) {
            event.data.credentials[credential] = knownCredentials[credential];
        }
    }
});
```

## Support Changing Default Plugin Loading

The current plugin system monkey patches the main StanzaJS agent object to add new methods. By default, StanzaJS loads all available plugins to ensure that methods are available. Some users choose to instantiate a client agent directly instead of using the `createClient()` helper, to avoid the plugin loading to save on final bundle sizes.

The goal for this change is to adjust the plugin system such that:

1. Plugins do not monkey-patch the main agent object.
2. Plugins can check that other, required, plugins have been loaded.
3. While StanzaJS will provide a large number of available plugins, only a core subset will be loaded by default.

## Upgrade Jingle Engine

The goal for this change is to use a more advanced Jingle engine.

## Support Direct TCP/TLS Connections

The goal for this change is to support XMPP over TCP connections, along side the current BOSH and WebSocket transports.

## Support Server Component Connections

The goal for this change is to allow StanzaJS to operate as a server component, and not just a client, when running in node.

Depends on first supporting TCP connections.

Will require review and possible breaking changes in plugin APIs, to allow control of sender `from` JIDs.
