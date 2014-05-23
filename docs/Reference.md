# 5.3.x API Reference

- [`XMPP.Client`](#xmppclient)
    - [`new Client(options)`](#new-clientoptions)
    - [`createClient(options)`](#createclientoptions)
- [`XMPP.JID`](#xmppjid)
- [`XMPP.Iq`](#xmppiq)
- [`XMPP.Message`](#xmppmessage)
- [`XMPP.Presence`](#xmpppresence)
- [`XMPP.PubsubEvent`](#xmpppubsubevent)
- [`XMPP.PubsubItem`](#xmpppubsubitemt)
- [`XMPP.jxt`](#jxt)
- [Message Stanzas](#message-stanzas)
- [Presence Stanzas](#presence-stanzas)
- [IQ Stanzas](#iq-stanzas)
- [Events](#events)

## `XMPP.Client`

### `new Client(options)`

Creates a new XMPP client instance, with no plugins loaded.

- `options` - An object with the client configuration as described in [client options](#client-options).

```javascript
var XMPP = require('stanza.io');
var client = new XMPP.Client({
    jid: 'test@example.com',
    password: 'hunter2'
});
```

### `createClient(options)`

An alternative method for creating a client instance. 

*Instantiating a client via this function will load all built-in plugins.*

- `options` - An object with the client configuration as described in [client options](#client-options).

```javascript
var XMPP = require('stanza.io');
var client = XMPP.createClient({
    jid: 'test@example.com',
    password: 'hunter2'
});
```

### `Client` Options

When creating a client instance, the following settings will configure its behaviour:

- `jid` - (required) the requested bare JID for the client. 
- `password` - shortcut for setting [`credentials.password`](#config-credentials-password)
- `server`
- `resource` - suggest a specific resource for this session.
- `credentials`
    - `username`
    - <a name="config-credentials-password"></a>`password`
    - `host`
    - `serverKey`
    - `clientKey`
    - `saltedPassword`
    - `serviceType`
    - `serviceName`
    - `realm`
    - `authzid`
- `transports`
- `wsURL`
- `boshURL`
- `sasl`
- `useStreamManagement` - set to `true` d
- `rosterVer` - version ID of cached roster data given by the server, typically saved from a previous session
- `capsNode`
- `softwareVersion`
    - `name`
    - `version`
    - `os`
- `timeout` - number of seconds that IQ requests will wait for a response before generating a timeout error.
- `lang` - preferred language used by the client, such as `'en'` or `'de'`.

### `Client` Properties
### `Client` Methods

## `XMPP.JID`
## `XMPP.Iq`
## `XMPP.Message`
## `XMPP.Presence`
## `XMPP.PubsubEvent`
## `XMPP.PubsubItem`
## `XMPP.jxt`

## Message Stanzas
## Presence Stanzas
## IQ Stanzas
## Events
