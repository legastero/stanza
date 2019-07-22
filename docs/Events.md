# StanzaJS Events

<h3 id="*">*</h3>

```
(args: any[]) => void
```

<p></p>

<h3 id="attention">attention</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="auth:failed">auth:failed</h3>

```
void
```

<p></p>

<h3 id="auth:success">auth:success</h3>

```
Credentials
```

<p></p>

<h3 id="available">available</h3>

```
ReceivedPresence
```

<p></p>

<h3 id="avatar">avatar</h3>

```
AvatarsEvent
```

<p></p>

<h3 id="block">block</h3>

```
{ jids: string[] }
```

<p></p>

<h3 id="bosh:terminate">bosh:terminate</h3>

```
any
```

<p></p>

<h3 id="carbon:received">carbon:received</h3>

```
ReceivedCarbon
```

<p></p>

<h3 id="carbon:sent">carbon:sent</h3>

```
SentCarbon
```

<p></p>

<h3 id="chat">chat</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="chat:state">chat:state</h3>

```
ChatStateMessage
```

<p></p>

<h3 id="connected">connected</h3>

```
void
```

<p></p>

<h3 id="credentials:update">credentials:update</h3>

```
Credentials
```

<p></p>

<h3 id="dataform">dataform</h3>

```
FormsMessage
```

<p></p>

<h3 id="disco:caps">disco:caps</h3>

```
{ caps: LegacyEntityCaps[]; jid: string }
```

<p></p>

<h3 id="disconnected">disconnected</h3>

```
Error
```

<p></p>

<h3 id="features">features</h3>

```
StreamFeatures
```

<p></p>

<h3 id="geoloc">geoloc</h3>

```
GeolocEvent
```

<p></p>

<h3 id="groupchat">groupchat</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="iq">iq</h3>

```
ReceivedIQ
```

<p></p>

<h3 id="iq:get:disco">iq:get:disco</h3>

```
ReceivedIQGet & { disco: Disco }
```

<p></p>

<h3 id="iq:get:ping">iq:get:ping</h3>

```
IQ & { ping: boolean }
```

<p></p>

<h3 id="iq:get:softwareVersion">iq:get:softwareVersion</h3>

```
ReceivedIQGet & { softwareVersion: SoftwareVersion }
```

<p></p>

<h3 id="iq:get:time">iq:get:time</h3>

```
IQ & { time: EntityTime }
```

<p></p>

<h3 id="iq:set:blockList">iq:set:blockList</h3>

```
ReceivedIQSet & { blockList: Blocking & { action: block | unblock } }
```

<p></p>

<h3 id="iq:set:jingle">iq:set:jingle</h3>

```
IQ & { jingle: JingleRequest }
```

<p></p>

<h3 id="iq:set:roster">iq:set:roster</h3>

```
IQ & { roster: Roster }
```

<p></p>

<h3 id="jingle:created">jingle:created</h3>

```
Jingle.Session
```

<p></p>

<h3 id="jingle:hold">jingle:hold</h3>

```
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:incoming">jingle:incoming</h3>

```
Jingle.Session
```

<p></p>

<h3 id="jingle:mute">jingle:mute</h3>

```
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:outgoing">jingle:outgoing</h3>

```
Jingle.Session
```

<p></p>

<h3 id="jingle:resumed">jingle:resumed</h3>

```
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:ringing">jingle:ringing</h3>

```
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:terminated">jingle:terminated</h3>

```
(session: Jingle.Session, reason: JingleReason) => void
```

<p></p>

<h3 id="jingle:unmute">jingle:unmute</h3>

```
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="mam:item">mam:item</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="marker:acknowledged">marker:acknowledged</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="marker:displayed">marker:displayed</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="marker:received">marker:received</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="message">message</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="message:error">message:error</h3>

```
Message
```

<p></p>

<h3 id="message:sent">message:sent</h3>

```
(msg: Message, viaCarbon: boolean) => void
```

<p></p>

<h3 id="mood">mood</h3>

```
UserMoodEvent
```

<p></p>

<h3 id="muc:available">muc:available</h3>

```
ReceivedMUCPresence
```

<p></p>

<h3 id="muc:declined">muc:declined</h3>

```
MUCDeclinedEvent
```

<p></p>

<h3 id="muc:destroyed">muc:destroyed</h3>

```
MUCDestroyedEvent
```

<p></p>

<h3 id="muc:error">muc:error</h3>

```
Presence
```

<p></p>

<h3 id="muc:failed">muc:failed</h3>

```
Presence
```

<p></p>

<h3 id="muc:invite">muc:invite</h3>

```
MUCInviteEvent
```

<p></p>

<h3 id="muc:join">muc:join</h3>

```
ReceivedMUCPresence
```

<p></p>

<h3 id="muc:leave">muc:leave</h3>

```
ReceivedMUCPresence
```

<p></p>

<h3 id="muc:other">muc:other</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="muc:topic">muc:topic</h3>

```
MUCTopicEvent
```

<p></p>

<h3 id="muc:unavailable">muc:unavailable</h3>

```
ReceivedMUCPresence
```

<p></p>

<h3 id="nick">nick</h3>

```
UserNickEvent
```

<p></p>

<h3 id="presence">presence</h3>

```
ReceivedPresence
```

<p></p>

<h3 id="pubsub:affiliations">pubsub:affiliations</h3>

```
PubsubMessage & { pubsub: PubsubAffiliationChange }
```

<p></p>

<h3 id="pubsub:config">pubsub:config</h3>

```
PubsubEventMessage & { pubsub: PubsubEventConfiguration }
```

<p></p>

<h3 id="pubsub:deleted">pubsub:deleted</h3>

```
PubsubEventMessage & { pubsub: PubsubEventDelete }
```

<p></p>

<h3 id="pubsub:event">pubsub:event</h3>

```
PubsubEventMessage
```

<p></p>

<h3 id="pubsub:published">pubsub:published</h3>

```
PubsubPublish
```

<p></p>

<h3 id="pubsub:purged">pubsub:purged</h3>

```
PubsubEventMessage & { pubsub: PubsubEventPurge }
```

<p></p>

<h3 id="pubsub:retracted">pubsub:retracted</h3>

```
PubsubRetract
```

<p></p>

<h3 id="pubsub:subscription">pubsub:subscription</h3>

```
PubsubEventMessage & { pubsub: PubsubEventSubscription }
```

<p></p>

<h3 id="raw">raw</h3>

```
(direction: incoming | outgoing, data: string) => void
```

<p></p>

<h3 id="raw:*">raw:*</h3>

```
(direction: incoming | outgoing, data: string) => void
```

<p></p>

<h3 id="raw:incoming">raw:incoming</h3>

```
string
```

<p></p>

<h3 id="raw:outgoing">raw:outgoing</h3>

```
string
```

<p></p>

<h3 id="receipt">receipt</h3>

```
ReceiptMessage
```

<p></p>

<h3 id="replace">replace</h3>

```
CorrectionMessage
```

<p></p>

<h3 id="roster:update">roster:update</h3>

```
IQ & { roster: Roster }
```

<p></p>

<h3 id="roster:ver">roster:ver</h3>

```
string
```

<p></p>

<h3 id="rtt">rtt</h3>

```
RTTMessage
```

<p></p>

<h3 id="sasl">sasl</h3>

```
SASL
```

<p></p>

<h3 id="session:bound">session:bound</h3>

```
string
```

<p></p>

<h3 id="session:end">session:end</h3>

```
undefined
```

<p></p>

<h3 id="session:prebind">session:prebind</h3>

```
string
```

<p></p>

<h3 id="session:started">session:started</h3>

```
string | void
```

<p></p>

<h3 id="sm">sm</h3>

```
StreamManagement
```

<p></p>

<h3 id="stanza">stanza</h3>

```
Message | Presence | IQ
```

<p></p>

<h3 id="stanza:acked">stanza:acked</h3>

```
{ kind: message; stanza: Message } | { kind: presence; stanza: Presence } | { kind: iq; stanza: IQ }
```

<p></p>

<h3 id="stanza:failed">stanza:failed</h3>

```
{ kind: message; stanza: Message } | { kind: presence; stanza: Presence } | { kind: iq; stanza: IQ }
```

<p></p>

<h3 id="stream:data">stream:data</h3>

```
(json: any, kind: string) => void
```

<p></p>

<h3 id="stream:end">stream:end</h3>

```
void
```

<p></p>

<h3 id="stream:error">stream:error</h3>

```
(streamError: StreamError, error: Error) => void
```

<p></p>

<h3 id="stream:management:ack">stream:management:ack</h3>

```
StreamManagementAck
```

<p></p>

<h3 id="stream:management:resumed">stream:management:resumed</h3>

```
StreamManagementResume
```

<p></p>

<h3 id="stream:start">stream:start</h3>

```
Stream
```

<p></p>

<h3 id="tune">tune</h3>

```
TuneEvent
```

<p></p>

<h3 id="unavailable">unavailable</h3>

```
ReceivedPresence
```

<p></p>

<h3 id="unblock">unblock</h3>

```
{ jids: string[] }
```

<p></p>
</tbody></table>
