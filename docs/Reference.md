# 7.0.x API Reference

- [`XMPP.Client`](#xmppclient)
    - [`new Client(options)`](#new-clientoptions)
    - [`createClient(options)`](#createclientoptions)
    - [`Client` Methods](#client-methods)
        - [`client.use(plugin)`](#clientuseplugin)
        - [`client.on(event, [group], handler)`](#clientonevent-group-handler)
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
            - [`client.getCurrentCaps()`](#clientgetcurrentcaps)
            - [`client.getDiscoInfo(jid, node, [cb])`](#clientgetdiscoinfojid-node-cb)
            - [`client.getDiscoItems(jid, node, [cb])`](#clientgetdiscoitemsjid-node-cb)
            - [`client.updateCaps()`](#clientupdatecaps)
        - [Jingle](#jingle)
            - [`client.call(jid)`](#clientcalljid)
            - [`client.discoverICEServers([cb])`](#clientdiscovericeserverscb)
            - [`client.getServiceCredentials(jid, host, [cb])`](#clientgetservicecredentialsjid-host-cb)
            - [`client.getServices(jid, type, [cb])`](#clientgetservicesjid-type-cb)
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
            - [`client.configureRoom(room, form, [cb])`](#clientconfigureroomroom-form-cb)
            - [`client.directInvite(room, sender, reason)`](#clientdirectinviteroom-sender-reason)
            - [`client.discoverReservedNick(room, [cb])`](#clientdiscoverreservednickroom-cb)
            - [`client.getRoomConfig(jid, [cb])`](#clientgetroomconfigjid-cb)
            - [`client.getRoomMembers(room, opts, [cb])`](#clientgetroommembersroom-opts-cb)
            - [`client.getUniqueRoomName(jid, [cb])`](#clientgetuniqueroomnamejid-cb)
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
            - [`client.enableCarbons([cb])`](#clientenablecarbonscb)
            - [`client.disableCarbons([cb])`](#clientdisablecarbonscb)
            - [`client.getHistorySearchForm(jid, [cb])`](#clientgethistoryopts-cb)
            - [`client.getHistoryPreferences([cb])`](#clientgethistorypreferencescb)
            - [`client.setHistoryPreferences(opts, [cb])`](#clientsethistorypreferencesopts-cb)
            - [`client.searchHistory(opts, [cb])`](#clientsearchhistoryopts-cb)
        - [Other](#other)
            - [`client.deleteAccount([jid, cb])`](#clientdeleteaccountjid-cb)
            - [`client.getAccountInfo([jid, cb])`](#clientgetaccountinfojid-cb)
            - [`client.getAttention(jid, [opts])`](#clientgetattentionjid-opts)
            - [`client.getAvatar(jid, id, [cb])`](#clientgetavatarjid-id-cb)
            - [`client.getCommands(jid, [cb])`](#clientgetcommandsjid-cb)
            - [`client.getPrivateData(opts, [cb])`](#clientgetprivatedataopts-cb)
            - [`client.getSoftwareVersion(jid, [cb])`](#clientgetsoftwareversionjid-cb)
            - [`client.getTime(jid, [cb])`](#clientgettimejid-cb)
            - [`client.getVCard(jid, [cb])`](#clientgetvcardjid-cb)
            - [`client.goInvisible([cb])`](#clientgoinvisiblecb)
            - [`client.goVisible([cb])`](#clientgovisiblecb)
            - [`client.markActive()`](#clientmarkactive)
            - [`client.markInactive()`](#clientmarkinactive)
            - [`client.publishAvatar(id, data, [cb])`](#clientpublishavatarid-data-cb)
            - [`client.publishGeoLoc(data, [cb])`](#clientpublishgeolocdata-cb)
            - [`client.publishMood(mood, text, [cb])`](#clientpublishmoodmood-text-cb)
            - [`client.publishNick(nick, [cb])`](#clientpublishnicknick-cb)
            - [`client.publishReachability(data, [cb])`](#clientpublishreachabilitydata-cb)
            - [`client.publishTune(data, [cb])`](#clientpublishtunedata-cb)
            - [`client.publishVCard(vcard, [cb])`](#clientpublishvcardvcard-cb)
            - [`client.sendLog(jid, opts)`](#clientsendlogjid-opts)
            - [`client.setPrivateData(opts, [cb])`](#clientsetprivatedataopts-cb)
            - [`client.updateAccount(jid, data, [cb])`](#clientupdateaccountjid-data-cb)
            - [`client.useAvatars(data, [cb])`](#clientuseavatarsdata-cb)
- [`XMPP.JID`](#xmppjid)
    - [`new JID(jid)`](#new-jidjid)

- [Message Stanzas](#message-stanzas)
- [Presence Stanzas](#presence-stanzas)
- [IQ Stanzas](#iq-stanzas)
- [Events](#events)
    - [`attention`](#attention)
    - [`auth:failed`](#authfailed)
    - [`auth:success`](#authsuccess)
    - [`available`](#available)
    - [`avatar`](#avatar)
    - [`block`](#block)
    - [`bosh:terminate`](#boshterminate)
    - [`carbon:received`](#carbonreceived)
    - [`carbon:sent`](#carbonsent)
    - [`chat:state`](#chatstate)
    - [`chat`](#chat)
    - [`connected`](#connected)
    - [`credentials:update`](#credentialsupdate)
    - [`dataform`](#dataform)
    - [`disco:caps`](#discocaps)
    - [`disconnected`](#disconnected)
    - [`geoloc`](#geoloc)
    - [`groupchat`](#groupchat)
    - [`id:ID`](#idID)
    - [`iq:get:NAME`](#iqgetNAME)
    - [`iq:set:NAME`](#iqsetNAME)
    - [`jingle:accepted`](#jingleaccepted)
    - [`jingle:hold`](#jinglehold)
    - [`jingle:incoming`](#jingleincoming)
    - [`jingle:localstream:added`](#jinglelocalstreamadded)
    - [`jingle:localstream:removed`](#jinglelocalstreamremoved)
    - [`jingle:mute`](#jinglemute)
    - [`jingle:outgoing`](#jingleoutgoing)
    - [`jingle:remotestream:added`](#jingleremotestreamadded)
    - [`jingle:remotestream:removed`](#jingleremotestreamremoved)
    - [`jingle:resumed`](#jingleresumed)
    - [`jingle:ringing`](#jingleringing)
    - [`jingle:terminated`](#jingleterminated)
    - [`jingle:unmute`](#jingleunmute)
    - [`message:error`](#messageerror)
    - [`message:sent`](#messagesent)
    - [`message`](#message)
    - [`muc:available`](#mucavailable)
    - [`muc:declined`](#mucdeclined)
    - [`muc:destroyed`](#mucdestroyed)
    - [`muc:error`](#mucerror)
    - [`muc:invite`](#mucinvite)
    - [`muc:join`](#mucjoin)
    - [`muc:leave`](#mucleave)
    - [`muc:subject`](#mucsubject)
    - [`muc:unavailable`](#mucunavailable)
    - [`nick`](#nick)
    - [`presence:error`](#presenceerror)
    - [`presence`](#presence)
    - [`pubsub:event`](#pubsubevent)
    - [`raw:incoming`](#rawincoming)
    - [`raw:outgoing`](#rawoutgoing)
    - [`reachability`](#reachability)
    - [`receipt[:ID]`](#receiptID)
    - [`replace[:ID]`](#replaceID)
    - [`roster:update`](#rosterupdate)
    - [`roster:ver`](#rosterver)
    - [`sasl:abort`](#saslabort)
    - [`sasl:challenge`](#saslchallenge)
    - [`sasl:failure`](#saslfailure)
    - [`sasl:success`](#saslsuccess)
    - [`session:bound`](#sessionbound)
    - [`session:end`](#sessionend)
    - [`session:error`](#sessionerror)
    - [`session:started`](#sessionstarted)
    - [`stanza`](#stanza)
    - [`stream:data`](#streamdata)
    - [`stream:end`](#streamend)
    - [`stream:error`](#streamerror)
    - [`stream:management:enabled`](#streammanagementenabled)
    - [`stream:management:failed`](#streammanagementfailed)
    - [`stream:management:resumed`](#streammanagementresumed)
    - [`subscribe`](#subscribe)
    - [`subscribed`](#subscribed)
    - [`unavailable`](#unavailable)
    - [`unblock`](#unblock)
    - [`unsubscribe`](#unsubscribe)
    - [`unsubscribed`](#unsubscribed)


## `XMPP.Client`

### `new Client(options)`

Creates a new XMPP client instance.

*Instantiating a client via this function will not load any built-in plugins.*

- `options` - An object with the client configuration as described in [client options](#client-options).

```javascript
var XMPP = require('stanza.io');
var client = new XMPP.Client({
    jid: 'test@example.com',
    password: 'hunter2'
});
// Loading plugins
var plugins = require('stanza.io/lib/plugins');
client.use(plugins)
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
    - `username` - username you're presenting for auth. Typically the local portion of the JID, but could be different
    - <a name="config-credentials-password"></a>`password` - just like it sounds
    - `host` - the domain of the service
    - `serverKey` - cached credential created by `SCRAM-SHA-1`, that can be used without needing to know the password
    - `clientKey` - cached credential created by `SCRAM-SHA-1`, that can be used without needing to know the password
    - `saltedPassword` - cached credential created by `SCRAM-SHA-1`, that can be used without needing to know the password
    - `serviceType` - for most cases should be `'XMPP'`, the default
    - `serviceName` - for most cases should be the same as the `'host'`, the default
    - `realm` - for most cases should be the same as the `'host'`, the default
    - `authzid` -
- `sendReceipts` - boolean value to determine whether or not client automatically sends acknowledgements if they are requested (XEP-0184). Default value is true, set to false if you want to send acknowledgements yourself.
- `transports` - a strings array of transport methods that may be used.
- `wsURL` - URL for the XMPP over WebSocket connection endpoint.
- `wsOptions` - additional options passed to WebSocket constructor (optional and not supported by all WebSocket clients)
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
Load a plugin.

Example:
```js
client.use(myAwesomePlugin);
```
#### `client.on(event, [group], handler)`
Listen for an event.

Example:
```js

client.on('chat', chat => {
  // chat event handler
});

```
#### `client.connect([opts])`
#### `client.disconnect()`
#### `client.sendIq(opts)`
#### `client.sendMessage(opts)`
Send a message.

Example:
```js

client.sendMessage({
  to: JID,
  body: "Hello!"
});

```
#### `client.sendPresence(opts)`
Send presence to the server.
```js
client.on('session:started', () => {
    client.getRoster(() => {
        client.sendPresence();
    })
});
```
Note the `session:started`. You'll need to send your presence immediately to get presence from rosters.

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
##### `client.getCurrentCaps()`
##### `client.getDiscoInfo(jid, node, [cb])`
##### `client.getDiscoItems(jid, node, [cb])`
Fetch the jids of all available rooms

Example:
```js
client.getDiscoItems('conference.xxx.yyy.zz','', (err, data) => {
            //Get list of available rooms
        }
```
##### `client.updateCaps()`
#### Jingle
##### `client.call(jid)`
##### `client.discoverICEServers([cb])`
##### `client.getServiceCredentials(jid, host, [cb])`
##### `client.getServices(jid, type, [cb])`
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
##### `client.configureRoom(room, form, [cb])`
##### `client.destroyRoom(room, opts, [cb])`
##### `client.directInvite(room, sender, [reason])`
##### `client.discoverReservedNick(room, [cb])`
##### `client.getRoomConfig(jid, [cb])`
##### `client.getRoomMembers(room, opts, [cb])`
##### `client.getUniqueRoomName(jid, [cb])`
##### `client.invite(room, opts)`
##### `client.joinRoom(room, nick, opts)`

Request to join a Multi-User Chat room.

- `room` - The bare JID of the room to join
- `nick` - The requested nickname to use in the room. *Note:* You are not guaranteed to be assigned this nick.
- `options` - Additional presence information to attach to the join request, in particular:
  - `joinMuc` - A dictionary of options for how to join the room:
    - `password` - Optional password for entering the room
    - `history` - May be `true` to receive the room's default history replay, or may specify `maxstanzas`, `seconds`, or `since` to specify a history replay range in terms of number of messages, a given time range, or since a particular time.

Example:
```js
client.joinRoom('room@muc.example.com', 'User', {
    status: 'This will be my status in the MUC',
    joinMuc: {
        password: 'hunter2',
        history: {
            maxstanzas: 20
        }
    }
});
```

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
Enable carbon messages. This is useful if you want to receive a copy of a message that you sent from one device, and receive on all other logged devices.

Example:
```js
 client.on('session:started', () => {
        client.sendPresence();
        client.enableCarbons();
    });
```
##### `client.disableCarbons([cb])`
##### `client.getHistorySearchForm(jid, [cb])`
##### `client.getHistoryPreferences([cb])`
##### `client.setHistoryPreferences(opts, [cb])`
##### `client.searchHistory(opts, [cb])`
Fetch chat history for the specified jid. By default, you will receive all the messages.
Optionally you can pass an object to get max number of messages.

Example:
```js
client.searchHistory({
            with: jid,
            rsm: {max: 50, before: true},  --
            complete: false
        }
```
#### Avatars
##### `client.getAvatar(jid, id, [cb])`
##### `client.publishAvatar(id, data, [cb])`
##### `client.useAvatars(info, [cb])`
#### Other
##### `client.deleteAccount([jid, cb])`
##### `client.getAccountInfo([jid, cb])`
##### `client.getAttention(jid, [opts])`
##### `client.getCommands(jid, [cb])`
##### `client.getPrivateData(opts, [cb])`
##### `client.getSoftwareVersion(jid, [cb])`
##### `client.getTime(jid, [cb])`
##### `client.getVCard(jid, [cb])`
##### `client.goInvisible([cb])`
##### `client.goVisible([cb])`
##### `client.markActive()`
##### `client.markInactive()`
##### `client.publishGeoLoc(data, [cb])`
##### `client.publishNick(nick, [cb])`
##### `client.publishReachability(data, [cb])`
##### `client.publishTune(data, [cb])`
##### `client.publishVCard(vcard, [cb])`
##### `client.sendLog(jid, opts)`
##### `client.setPrivateData(opts, [cb])`
##### `client.updateAccount(jid, data, [cb])`

## `XMPP.JID`
### `new JID(jid)`

Creates a new `JID` (Jabber IDentifier) object, which represents an address in the XMPP network.

- `jid` - a string of the form `[username@]domain[/resource]` (or an existing `JID` object)

```javascript
var someServer = new JID('somedomain.example.com');
var friendAddress = new JID('friend@example.com');
var addressOfParticularConnection = new JID('me@example.com/laptopclient');
```

### `JID` Properties

All `JID` objects expose the following properties:

- `local` - If the `JID` is of the form `'user@example.com'`, then the `local` value would be the `'user'` portion
- `domain` -  If the `JID` is of the form `'user@example.com'` (or `'example.com'`), then the `domain` value would be `'example.com'`
- `resource` - If the `JID` is of the form `'user@example.com/res'` (or even `'example.com/res'`), then the `resource` value would be `'res'`
- `bare` - The bare `JID` contains only the local and domain sections, eg `'user@example.com'`
- `full` - The full `JID` contains the local, domain, and resource sections, eg `'user@example.com/res'`

## Message Stanzas
## Presence Stanzas
## IQ Stanzas
## Events
### attention
### auth:failed
### auth:success
### avatar
### available
### block
### bosh:terminate
### carbon:received
### carbon:sent
### chat

Example:
```js
{
    type: 'chat',
    to: JID,
    from: JID,
    body: 'this is a chat'
}
```

### chat:state

Example:
```js
{
    type: 'chat',
    to: JID,
    from: JID,
    chatState: 'composing'
}
```

### connected
### credentials:update
### dataform
### disco:caps

Example:
```js
{
    to: JID,
    from: JID,
    caps: {
        hash: 'sha-1',
        node: 'https://stanza.io',
        ver: 'rs/tl9NCfXBpKoOYUy+JdBbPGDg='
    }
}
```

### disconnected
### geoloc
### groupchat
### id:ID
### iq:get:NAME
### iq:set:NAME
### jingle:accepted
### jingle:hold
### jingle:incoming
### jingle:localstream:added
### jingle:localstream:removed
### jingle:mute
### jingle:outgoing
### jingle:remotestream:added
### jingle:remotestream:removed
### jingle:resumed
### jingle:ringing
### jingle:terminated
### jingle:unmute
### message

Example:
```js
client.on('message', (message) => {
  /*
  {
      from: JID,
      to: JID,
      body: 'Message',
  }
  */
})
```
### message:error
### message:sent
### muc:available
### muc:declined
### muc:error
### muc:invite
### muc:join
### muc:leave
### muc:subject
### muc:unavailable
### muc:destroyed
### nick
### presence
In order to get presence, you have to send your presence first when session starts.

Example:
```javascript
client.on('session:started', () => {
        client.sendPresence();
});

client.on('presence', (presence) => {
  /*
  {   lang:"en",
      id:"12345",
      to: JID,
      from: JID,
      priority:0,
      type:"available" // Type
    }
  */
});
```
### presence:error
### pubsub:event
### raw:incoming
You will get pretty much any data going through your client as raw XML. Great for debugging.

Example:
```js
client.on('raw:incoming', (xml) => {
/*
 <presence xmlns="jabber:client" to="jid@example.com" type="chat" id="id" from="jid2@example.com" />

 <message xmlns="jabber:client" to="jid@example.com" type="chat" id="id" from="jid2@example.com">
    <body>Hi!</body>
 </message>

*/
});
```
### raw:outgoing
Same as raw:incoming, only for outgoing.

Example:
```js
client.on('raw:outgoing', (xml) => {
/*
 <presence xmlns="jabber:client" to="jid@example.com" type="chat" id="id" from="jid2@example.com" />

 <message xmlns="jabber:client" to="jid@example.com" type="chat" id="id" from="jid2@example.com">
    <body>Hi!</body>
 </message>  

*/
});
```
### reachability
### receipt[:ID]
### replace[:ID]
### roster:update
### roster:ver
### sasl:abort
### sasl:challenge
### sasl:failure
### sasl:success
### session:bound
### session:end
### session:error
### session:started
### stanza
### stanza:acked
### stream:data
### stream:end
### stream:error
### stream:management:enabled
### stream:management:failed
### stream:management:resumed
### stream:management:ack
### subscribe
### subscribed
### tune
### unavailable
### unblock
### unsubscribe

Example:
```js
{
    type: 'subscribe',
    to: JID,
    from: JID
}
```

### unsubscribed

Example:
```js
{
    type: 'unsubscribed',
    to: JID,
    from: JID
}
```
