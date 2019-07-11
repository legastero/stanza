# StanzaJS Events

<h3 id="*">*</h3>
```typescript
(args: any[]) => void
```

<p></p>

<h3 id="attention">attention</h3>
```typescript
ReceivedMessage
```

<p></p>

<h3 id="auth:failed">auth:failed</h3>
```typescript
void
```

<p></p>

<h3 id="auth:success">auth:success</h3>
```typescript
Credentials
```

<p></p>

<h3 id="available">available</h3>
```typescript
Stanzas.ReceivedPresence
```

<p></p>

<h3 id="avatar">avatar</h3>
```typescript
AvatarsEvent
```

<p></p>

<h3 id="block">block</h3>
```typescript
{ jids: string[] }
```

<p></p>

<h3 id="bosh:terminate">bosh:terminate</h3>
```typescript
any
```

<p></p>

<h3 id="carbon:received">carbon:received</h3>
```typescript
ReceivedCarbon
```

<p></p>

<h3 id="carbon:sent">carbon:sent</h3>
```typescript
SentCarbon
```

<p></p>

<h3 id="chat">chat</h3>
```typescript
Stanzas.ReceivedMessage
```

<p></p>

<h3 id="chat:state">chat:state</h3>
```typescript
ChatStateMessage
```

<p></p>

<h3 id="connected">connected</h3>
```typescript
void
```

<p></p>

<h3 id="credentials:update">credentials:update</h3>
```typescript
Credentials
```

<p></p>

<h3 id="dataform">dataform</h3>
```typescript
FormsMessage
```

<p></p>

<h3 id="disco:caps">disco:caps</h3>
```typescript
{ caps: LegacyEntityCaps[]; jid: string }
```

<p></p>

<h3 id="disconnected">disconnected</h3>
```typescript
Error
```

<p></p>

<h3 id="features">features</h3>
```typescript
Stanzas.StreamFeatures
```

<p></p>

<h3 id="geoloc">geoloc</h3>
```typescript
GeolocEvent
```

<p></p>

<h3 id="groupchat">groupchat</h3>
```typescript
Stanzas.ReceivedMessage
```

<p></p>

<h3 id="iq">iq</h3>
```typescript
Stanzas.ReceivedIQ
```

<p></p>

<h3 id="iq:get:disco">iq:get:disco</h3>
```typescript
ReceivedIQGet & { disco: Disco }
```

<p></p>

<h3 id="iq:get:ping">iq:get:ping</h3>
```typescript
IQ & { ping: boolean }
```

<p></p>

<h3 id="iq:get:softwareVersion">iq:get:softwareVersion</h3>
```typescript
ReceivedIQGet & { softwareVersion: SoftwareVersion }
```

<p></p>

<h3 id="iq:get:time">iq:get:time</h3>
```typescript
IQ & { time: EntityTime }
```

<p></p>

<h3 id="iq:set:blockList">iq:set:blockList</h3>
```typescript
ReceivedIQSet & { blockList: Blocking & { action: block | unblock } }
```

<p></p>

<h3 id="iq:set:jingle">iq:set:jingle</h3>
```typescript
IQ & { jingle: JingleRequest }
```

<p></p>

<h3 id="iq:set:roster">iq:set:roster</h3>
```typescript
IQ & { roster: Roster }
```

<p></p>

<h3 id="jingle:created">jingle:created</h3>
```typescript
Jingle.Session
```

<p></p>

<h3 id="jingle:hold">jingle:hold</h3>
```typescript
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:incoming">jingle:incoming</h3>
```typescript
Jingle.Session
```

<p></p>

<h3 id="jingle:mute">jingle:mute</h3>
```typescript
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:outgoing">jingle:outgoing</h3>
```typescript
Jingle.Session
```

<p></p>

<h3 id="jingle:resumed">jingle:resumed</h3>
```typescript
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:ringing">jingle:ringing</h3>
```typescript
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="jingle:terminated">jingle:terminated</h3>
```typescript
(session: Jingle.Session, reason: JingleReason) => void
```

<p></p>

<h3 id="jingle:unmute">jingle:unmute</h3>
```typescript
(session: Jingle.Session, info: JingleInfo) => void
```

<p></p>

<h3 id="mam:item">mam:item</h3>
```typescript
ReceivedMessage
```

<p></p>

<h3 id="marker:acknowledged">marker:acknowledged</h3>
```typescript
ReceivedMessage
```

<p></p>

<h3 id="marker:displayed">marker:displayed</h3>
```typescript
ReceivedMessage
```

<p></p>

<h3 id="marker:received">marker:received</h3>
```typescript
ReceivedMessage
```

<p></p>

<h3 id="message">message</h3>
```typescript
Stanzas.ReceivedMessage
```

<p></p>

<h3 id="message:error">message:error</h3>
```typescript
Stanzas.Message
```

<p></p>

<h3 id="message:sent">message:sent</h3>
```typescript
(msg: Stanzas.Message, viaCarbon: boolean) => void
```

<p></p>

<h3 id="mood">mood</h3>
```typescript
UserMoodEvent
```

<p></p>

<h3 id="muc:available">muc:available</h3>
```typescript
ReceivedMUCPresence
```

<p></p>

<h3 id="muc:declined">muc:declined</h3>
```typescript
MUCDeclinedEvent
```

<p></p>

<h3 id="muc:destroyed">muc:destroyed</h3>
```typescript
MUCDestroyedEvent
```

<p></p>

<h3 id="muc:error">muc:error</h3>
```typescript
Presence
```

<p></p>

<h3 id="muc:failed">muc:failed</h3>
```typescript
Presence
```

<p></p>

<h3 id="muc:invite">muc:invite</h3>
```typescript
MUCInviteEvent
```

<p></p>

<h3 id="muc:join">muc:join</h3>
```typescript
ReceivedMUCPresence
```

<p></p>

<h3 id="muc:leave">muc:leave</h3>
```typescript
ReceivedMUCPresence
```

<p></p>

<h3 id="muc:other">muc:other</h3>
```typescript
ReceivedMessage
```

<p></p>

<h3 id="muc:topic">muc:topic</h3>
```typescript
MUCTopicEvent
```

<p></p>

<h3 id="muc:unavailable">muc:unavailable</h3>
```typescript
ReceivedMUCPresence
```

<p></p>

<h3 id="nick">nick</h3>
```typescript
UserNickEvent
```

<p></p>

<h3 id="presence">presence</h3>
```typescript
Stanzas.ReceivedPresence
```

<p></p>

<h3 id="pubsub:affiliations">pubsub:affiliations</h3>
```typescript
PubsubMessage & { pubsub: PubsubAffiliationChange }
```

<p></p>

<h3 id="pubsub:config">pubsub:config</h3>
```typescript
PubsubEventMessage & { pubsub: PubsubEventConfiguration }
```

<p></p>

<h3 id="pubsub:deleted">pubsub:deleted</h3>
```typescript
PubsubEventMessage & { pubsub: PubsubEventDelete }
```

<p></p>

<h3 id="pubsub:event">pubsub:event</h3>
```typescript
PubsubEventMessage
```

<p></p>

<h3 id="pubsub:published">pubsub:published</h3>
```typescript
PubsubPublish
```

<p></p>

<h3 id="pubsub:purged">pubsub:purged</h3>
```typescript
PubsubEventMessage & { pubsub: PubsubEventPurge }
```

<p></p>

<h3 id="pubsub:retracted">pubsub:retracted</h3>
```typescript
PubsubRetract
```

<p></p>

<h3 id="pubsub:subscription">pubsub:subscription</h3>
```typescript
PubsubEventMessage & { pubsub: PubsubEventSubscription }
```

<p></p>

<h3 id="raw">raw</h3>
```typescript
(direction: incoming | outgoing, data: string) => void
```

<p></p>

<h3 id="raw:*">raw:*</h3>
```typescript
(direction: incoming | outgoing, data: string) => void
```

<p></p>

<h3 id="raw:incoming">raw:incoming</h3>
```typescript
string
```

<p></p>

<h3 id="raw:outgoing">raw:outgoing</h3>
```typescript
string
```

<p></p>

<h3 id="receipt">receipt</h3>
```typescript
ReceiptMessage
```

<p></p>

<h3 id="replace">replace</h3>
```typescript
CorrectionMessage
```

<p></p>

<h3 id="roster:update">roster:update</h3>
```typescript
IQ & { roster: Roster }
```

<p></p>

<h3 id="roster:ver">roster:ver</h3>
```typescript
string
```

<p></p>

<h3 id="rtt">rtt</h3>
```typescript
RTTMessage
```

<p></p>

<h3 id="sasl">sasl</h3>
```typescript
SASL
```

<p></p>

<h3 id="session:bound">session:bound</h3>
```typescript
string
```

<p></p>

<h3 id="session:end">session:end</h3>
```typescript
undefined
```

<p></p>

<h3 id="session:prebind">session:prebind</h3>
```typescript
string
```

<p></p>

<h3 id="session:started">session:started</h3>
```typescript
string | void
```

<p></p>

<h3 id="sm">sm</h3>
```typescript
StreamManagement
```

<p></p>

<h3 id="stanza">stanza</h3>
```typescript
Stanzas.Message | Stanzas.Presence | Stanzas.IQ
```

<p></p>

<h3 id="stanza:acked">stanza:acked</h3>
```typescript
{ kind: message; stanza: Stanzas.Message } | { kind: presence; stanza: Stanzas.Presence } | { kind: iq; stanza: Stanzas.IQ }
```

<p></p>

<h3 id="stanza:failed">stanza:failed</h3>
```typescript
{ kind: message; stanza: Stanzas.Message } | { kind: presence; stanza: Stanzas.Presence } | { kind: iq; stanza: Stanzas.IQ }
```

<p></p>

<h3 id="stream:data">stream:data</h3>
```typescript
(json: any, kind: string) => void
```

<p></p>

<h3 id="stream:end">stream:end</h3>
```typescript
void
```

<p></p>

<h3 id="stream:error">stream:error</h3>
```typescript
(streamError: Stanzas.StreamError, error: Error) => void
```

<p></p>

<h3 id="stream:management:ack">stream:management:ack</h3>
```typescript
StreamManagementAck
```

<p></p>

<h3 id="stream:management:resumed">stream:management:resumed</h3>
```typescript
StreamManagementResume
```

<p></p>

<h3 id="stream:start">stream:start</h3>
```typescript
Stanzas.Stream
```

<p></p>

<h3 id="tune">tune</h3>
```typescript
TuneEvent
```

<p></p>

<h3 id="unavailable">unavailable</h3>
```typescript
Stanzas.ReceivedPresence
```

<p></p>

<h3 id="unblock">unblock</h3>
```typescript
{ jids: string[] }
```

<p></p>
</tbody></table>
