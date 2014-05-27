# 5.3.x API Reference

- [`XMPP.Client`](#xmppclient)
    - [`new Client(options)`](#new-clientoptions)
    - [`createClient(options)`](#createclientoptions)
    - [`Client` Methods](#client-methods)
        - [`client.use(plugin)`](#clientuseplugin)
        - [`client.connect([opts])`](#clientconnectops)
        - [`client.disconnect()`](#clientdisconnect)
        - [`client.sendIq(opts)`](#clientsendiqopts)
        - [`client.sendMessage(opts)`](#clientsendmessageopts)
        - [`client.sendPresence(opts)`](#clientsendpresenceopts)
        - [`client.sendStreamError(opts)`](#clientsendstreamerroropts)
        - [Keepalive](#keepalive)
            - [`client.enableKeepAlive(opts)`](#clientenablekeepaliveopts)
            - [`client.disableKeepAlive()`](#clientdisablekeepalive)
            - [`client.ping(jid, [cb])`](#clientpingjid-cb)
        - [Roster Management](#roster-management)
            - [`client.acceptSubscription(jid)`](#clientacceptsubscriptionjid)
            - [`client.block(jid, [cb])`](#clientblockjid-cb)
            - [`client.denySubscription(jid)`](#clientdenysubscriptionjid)
            - [`client.getBlocked([cb])`](#clientgetblockedcb)
            - [`client.removeRosterItem(jid, [cb])`](#clientremoverosteritemjid-cb)
            - [`client.subscribe(jid)`](#clientsubscribejid)
            - [`client.getRoster([cb])`](#clientgetrostercb)
            - [`client.unblock(jid, [cb])`](#clientunblockjid-cb)
            - [`client.unsubscribe(jid)`](#clientunsubscribejid)
            - [`client.updateRosterItem(item, [cb])`](#clientupdaterosteritemitem-cb)
        - [Service Discovery](#service-discovery)
            - [`client.discoverICEServers([cb])`](#clientdiscovericeserverscb)
            - [`client.getCurrentCaps()`](#clientgetcurrentcaps)
            - [`client.getDiscoInfo(jid, node, [cb])`](#clientgetdiscoinfojid-node-cb)
            - [`client.getDiscoItems(jid, node, [cb])`](#clientgetdiscoitemsjid-node-cb)
            - [`client.getServiceCredentials(jid, host, [cb])`](#clientgetservicecredentialsjid-host-cb)
            - [`client.getServices(jid, type, [cb])`](#clientgetservicesjid-type-cb)
            - [`client.updateCaps()`](#clientupdatecaps)
        - [Pubsub](#pubsub)
            - [`client.createNode(jid, node, [cb])`](#clientcreatenodejid-node-cb)
            - [`client.deleteNode(jid, node, [cb])`](#clientdeletenodejid-node-cb)
            - [`client.getItem(jid, node, id, [cb])`](#clientgetitemjid-node-id-cb)
            - [`client.getItems(jid, node, opts, [cb])`](#clientgetitemsjid-node-opts-cb)
            - [`client.publish(jid, node, item, [cb])`](#clientpublishjid-node-item-cb)
            - [`client.purgeNode(jid, node, [cb])`](#clientpurgenodejid-node-cb)
            - [`client.retract(jid, node, id, notify, [cb])`](#clientretractjid-node-id-notify-cb)
            - [`client.subscribeToNode(jid, opts, [cb])`](#clientsubscribetonodejid-opts-cb)
            - [`client.unsubscribeFromNode(jid, opts, [cb])`](#clientunsubscribefromnodejid-opts-cb)
        - [Multi-User Chat](#multi-user-chat)
            - [`client.ban(room, jid, reason, [cb])`](#clientbanroom-jid-reason-cb)
            - [`client.changeNick(room, nick)`](#clientchangenickroom-nick)
            - [`client.directInvite(room, sender, reason)`](#clientdirectinviteroom-sender-reason)
            - [`client.discoverReservedNick(room, [cb])`](#clientdiscoverreservednickroom-cb)
            - [`client.getRoomConfig(jid, [cb])`](#clientgetroomconfigjid-cb)
            - [`client.getRoomMembers(room, opts, [cb])`](#clientgetroommembersroom-opts-cb)
            - [`client.invite(room, opts)`](#clientinviteroom-opts)
            - [`client.joinRoom(room, nick, opts)`](#clientjoinroomroom-nick-opts)
            - [`client.kick(room, nick, reason, [cb])`](#clientkickroom-nick-reason-cb)
            - [`client.leaveRoom(room, nick, opts)`](#clientleaveroomroom-nick-opts)
            - [`client.requestRoomVoice(room)`](#clientrequestroomvoiceroom)
            - [`client.setRoomAffiliation(room, jid, affiliation, reason, [cb])`](#clientsetroomaffiliationroom-jid-affiliation-reason-cb)
            - [`client.setRoomRole(room, nick, role, reason, [cb])`](#clientsetroomroleroom-nick-role-reason-cb)
            - [`client.setSubject(room, subject)`](#clientsetsubjectroom-subject)
            - [`client.addBookmark(bookmark, [cb])`](#clientaddbookmarkbookmark-cb)
            - [`client.getBookmarks([cb])`](#clientgetbookmarks-cb)
            - [`client.removeBookmark(jid, [cb])`](#clientremovebookmarkjid-cb)
            - [`client.setBookmarks(opts, [cb])`](#clientsetbookmarksopts-cb)
        - [Message Syncing](#message-syncing)
            - [`client.enableCarbons([cb])`]
            - [`client.disableCarbons([cb])`]
            - [`client.getHistory(opts, [cb])`]
            - [`client.getHistoryPreferences([cb])`]
            - [`client.setHistoryPreferences(opts, [cb])`]
        - [Other](#other)
            - [`client.getAttention(jid, [opts])`](#clientgetattentionjid-opts)
            - [`client.getAvatar(jid, id, [cb])`](#clientgetavatarjid-id-cb)
            - [`client.getCommands(jid, [cb])`](#clientgetcommandsjid-cb)
            - [`client.getPrivateData(opts, [cb])`](#clientgetprivatedataopts-cb)
            - [`client.getSoftwareVersion(jid, [cb])`](#clientgetsoftwareversionjid-cb)
            - [`client.getTime(jid, [cb])`](#clientgettimejid-cb)
            - [`client.getVCard(jid, [cb])`](#clientgetvcardjid-cb)
            - [`client.goInvisible([cb])`](#clientgoinvisiblecb)
            - [`client.goVisible([cb])`](#clientgovisiblecb)
            - [`client.publishAvatar(id, data, [cb])`](#clientpublishavatarid-data-cb)
            - [`client.publishGeoLoc(data, [cb])`](#clientpublishgeolocdata-cb)
            - [`client.publishNick(nick, [cb])`](#clientpublishnicknick-cb)
            - [`client.publishReachability(data, [cb])`](#clientpublishreachabilitydata-cb)
            - [`client.publishVCard(vcard, [cb])`](#clientpublishvcardvcard-cb)
            - [`client.setPrivateData(opts, [cb])`](#clientsetprivatedataopts-cb)
            - [`client.useAvatars(data, [cb])`](#clientuseavatarsdata-cb)

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

- <a name="config-jid"></a> `jid` - (required) the requested bare JID for the client.
- `password` - shortcut for setting [`credentials.password`](#config-credentials-password)
- `server` - specify the hostname of the server to initially connect to, if different from [`jid.domain`](#config-jid).
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
- `transports` - a strings array of transport methods that may be used.
- `wsURL` - URL for the XMPP over WebSocket connection endpoint.
- `boshURL` - URL for the BOSH connection endpoint.
- `sasl` - a list of the SASL mechanisms that are acceptable for use by the client.
- `useStreamManagement` - set to `true` to enable resuming the session after a disconnect.
- `rosterVer` - version ID of cached roster data given by the server, typically saved from a previous session.
- `capsNode` - a URL for identifying the client app.
- `softwareVersion`
    - `name` - the name of the client software using stanza.io
    - `version` - the version of the client software using stanza.io
    - `os` - the operating system that the client is running on
- `timeout` - number of seconds that IQ requests will wait for a response before generating a timeout error.
- `lang` - preferred language used by the client, such as `'en'` or `'de'`.

### `Client` Properties
### `Client` Methods
#### `client.use(plugin)`
#### `client.connect([opts])`
#### `client.disconnect()`
#### `client.sendIq(opts)`
#### `client.sendMessage(opts)`
#### `client.sendPresence(opts)`
#### `client.sendStreamError(opts)`
#### Keepalive
##### `client.enableKeepAlive(opts)`
##### `client.disableKeepAlive()`
##### `client.ping(jid, [cb])`
#### Roster Management
##### `client.acceptSubscription(jid)`
##### `client.block(jid, [cb])`
##### `client.denySubscription(jid)`
##### `client.getBlocked([cb])`
##### `client.removeRosterItem(jid, [cb])`
##### `client.subscribe(jid)`
##### `client.getRoster([cb])`
##### `client.unblock(jid, [cb])`
##### `client.unsubscribe(jid)`
##### `client.updateRosterItem(item, [cb])`
#### Service Discovery
##### `client.discoverICEServers([cb])`
##### `client.getCurrentCaps()`
##### `client.getDiscoInfo(jid, node, [cb])`
##### `client.getDiscoItems(jid, node, [cb])`
##### `client.getServiceCredentials(jid, host, [cb])`
##### `client.getServices(jid, type, [cb])`
##### `client.updateCaps()`
#### Pubsub
##### `client.createNode(jid, node, [cb])`
##### `client.deleteNode(jid, node, [cb])`
##### `client.getItem(jid, node, id, [cb])`
##### `client.getItems(jid, node, opts, [cb])`
##### `client.publish(jid, node, item, [cb])`
##### `client.purgeNode(jid, node, [cb])`
##### `client.retract(jid, node, id, notify, [cb])`
##### `client.subscribeToNode(jid, opts, [cb])`
##### `client.unsubscribeFromNode(jid, opts, [cb])`
#### Multi-User Chat
##### `client.ban(room, jid, reason, [cb])`
##### `client.changeNick(room, nick)`
##### `client.directInvite(room, sender, reason)`
##### `client.discoverReservedNick(room, [cb])`
##### `client.getRoomConfig(jid, [cb])`
##### `client.getRoomMembers(room, opts, [cb])`
##### `client.invite(room, opts)`
##### `client.joinRoom(room, nick, opts)`
##### `client.kick(room, nick, reason, [cb])`
##### `client.leaveRoom(room, nick, opts)`
##### `client.requestRoomVoice(room)`
##### `client.setRoomAffiliation(room, jid, affiliation, reason, [cb])`
##### `client.setRoomRole(room, nick, role, reason, [cb])`
##### `client.setSubject(room, subject)`
##### `client.addBookmark(bookmark, [cb])`
##### `client.getBookmarks([cb])`
##### `client.removeBookmark(jid, [cb])`
##### `client.setBookmarks(opts, [cb])`
#### Message Syncing
##### `client.enableCarbons([cb])`
##### `client.disableCarbons([cb])`
##### `client.getHistory(opts, [cb])`
##### `client.getHistoryPreferences([cb])`
##### `client.setHistoryPreferences(opts, [cb])`
#### Other
##### `client.getAttention(jid, [opts])`
##### `client.getAvatar(jid, id, [cb])`
##### `client.getCommands(jid, [cb])`
##### `client.getPrivateData(opts, [cb])`
##### `client.getSoftwareVersion(jid, [cb])`
##### `client.getTime(jid, [cb])`
##### `client.getVCard(jid, [cb])`
##### `client.goInvisible([cb])`
##### `client.goVisible([cb])`
##### `client.publishAvatar(id, data, [cb])`
##### `client.publishGeoLoc(data, [cb])`
##### `client.publishNick(nick, [cb])`
##### `client.publishReachability(data, [cb])`
##### `client.publishVCard(vcard, [cb])`
##### `client.setPrivateData(opts, [cb])`
##### `client.useAvatars(info, [cb])`

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
