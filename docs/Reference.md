# StanzaJS API Reference

<h3 id="acceptSubscription">acceptSubscription</h3>

```
(jid: string) => void
```

<p></p>

<h3 id="addBookmark">addBookmark</h3>

```
(bookmark: MUCBookmark) => Promise
```

<p></p>

<h3 id="ban">ban</h3>

```
(jid: string, occupant: string, reason: string) => Promise
```

<p></p>

<h3 id="block">block</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="changeNick">changeNick</h3>

```
(room: string, nick: string) => void
```

<p></p>

<h3 id="configureNode">configureNode</h3>

```
(jid: string, node: string, config: DataForm) => Promise
```

<p></p>

<h3 id="configureRoom">configureRoom</h3>

```
(room: string, form: Partial) => Promise
```

<p></p>

<h3 id="connect">connect</h3>

```
(opts: AgentConfig) => void
```

<p></p>

<h3 id="createNode">createNode</h3>

```
(jid: string, node: string, config: DataForm) => Promise
```

<p></p>

<h3 id="declineInvite">declineInvite</h3>

```
(room: string, sender: string, reason: string) => void
```

<p></p>

<h3 id="deleteAccount">deleteAccount</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="deleteNode">deleteNode</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="denySubscription">denySubscription</h3>

```
(jid: string) => void
```

<p></p>

<h3 id="destroyRoom">destroyRoom</h3>

```
(room: string, opts: MUCDestroy) => Promise
```

<p></p>

<h3 id="directInvite">directInvite</h3>

```
(room: string, to: string, opts: Partial) => void
```

<p></p>

<h3 id="disableCarbons">disableCarbons</h3>

```
() => Promise
```

<p></p>

<h3 id="disableKeepAlive">disableKeepAlive</h3>

```
() => void
```

<p></p>

<h3 id="disableNotifications">disableNotifications</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="disconnect">disconnect</h3>

```
() => void
```

<p></p>

<h3 id="discoverBindings">discoverBindings</h3>

```
(server: string) => Promise
```

<p></p>

<h3 id="discoverICEServers">discoverICEServers</h3>

```
() => Promise
```

<p></p>

<h3 id="emitCompat">emitCompat</h3>

```
(name: <T>, data: undefined) => Promise
```

<p></p>

<h3 id="enableCarbons">enableCarbons</h3>

```
() => Promise
```

<p></p>

<h3 id="enableKeepAlive">enableKeepAlive</h3>

```
(opts: KeepAliveOptions) => void
```

<p></p>

<h3 id="enableNotifications">enableNotifications</h3>

```
(jid: string, node: string, fieldList: DataFormField[]) => Promise
```

<p></p>

<h3 id="getAccountInfo">getAccountInfo</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getAffiliations">getAffiliations</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="getAttention">getAttention</h3>

```
(jid: string, opts: Partial) => void
```

<p></p>

<h3 id="getAvatar">getAvatar</h3>

```
(jid: string, id: string) => Promise
```

<p></p>

<h3 id="getBits">getBits</h3>

```
(jid: string, cid: string) => Promise
```

<p></p>

<h3 id="getBlocked">getBlocked</h3>

```
() => Promise
```

<p></p>

<h3 id="getBookmarks">getBookmarks</h3>

```
() => Promise
```

<p></p>

<h3 id="getCommands">getCommands</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getCredentials">getCredentials</h3>

```
(expected: ExpectedCredentials) => Promise
```

<p></p>

<h3 id="getCurrentCaps">getCurrentCaps</h3>

```
() => { info: DiscoNodeInfo; legacyCapabilities: LegacyEntityCaps[] }
```

<p></p>

<h3 id="getDefaultNodeConfig">getDefaultNodeConfig</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getDefaultSubscriptionOptions">getDefaultSubscriptionOptions</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getDiscoInfo">getDiscoInfo</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="getDiscoItems">getDiscoItems</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="getHistoryPreferences">getHistoryPreferences</h3>

```
() => Promise
```

<p></p>

<h3 id="getHistorySearchForm">getHistorySearchForm</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getItem">getItem</h3>

```
(jid: string, node: string, id: string) => Promise
```

<p></p>

<h3 id="getItems">getItems</h3>

```
(jid: string, node: string, opts: Paging) => Promise
```

<p></p>

<h3 id="getLastActivity">getLastActivity</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getNodeAffiliations">getNodeAffiliations</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="getNodeConfig">getNodeConfig</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="getNodeSubscribers">getNodeSubscribers</h3>

```
(jid: string, node: string | PubsubSubscriptions, opts: PubsubSubscriptions) => Promise
```

<p></p>

<h3 id="getPrivateData">getPrivateData</h3>

```
(key: <T>) => Promise
```

<p></p>

<h3 id="getReservedNick">getReservedNick</h3>

```
(room: string) => Promise
```

<p></p>

<h3 id="getRoomConfig">getRoomConfig</h3>

```
(room: string) => Promise
```

<p></p>

<h3 id="getRoomMembers">getRoomMembers</h3>

```
(room: string, opts: MUCUserItem) => Promise
```

<p></p>

<h3 id="getRoster">getRoster</h3>

```
() => Promise
```

<p></p>

<h3 id="getServiceCredentials">getServiceCredentials</h3>

```
(jid: string, host: string, type: string, port: number) => Promise
```

<p></p>

<h3 id="getServices">getServices</h3>

```
(jid: string, type: string) => Promise
```

<p></p>

<h3 id="getSoftwareVersion">getSoftwareVersion</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getSubscriptions">getSubscriptions</h3>

```
(jid: string, opts: PubsubSubscriptions) => Promise
```

<p></p>

<h3 id="getTime">getTime</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="getUniqueRoomName">getUniqueRoomName</h3>

```
(mucHost: string) => Promise
```

<p></p>

<h3 id="getUploadService">getUploadService</h3>

```
(domain: string) => Promise
```

<p></p>

<h3 id="getUploadSlot">getUploadSlot</h3>

```
(jid: string, request: HTTPUploadRequest) => Promise
```

<p></p>

<h3 id="getVCard">getVCard</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="goInvisible">goInvisible</h3>

```
(probe: false | true) => Promise
```

<p></p>

<h3 id="goVisible">goVisible</h3>

```
() => Promise
```

<p></p>

<h3 id="invite">invite</h3>

```
(room: string, invites: MUCInvite | MUCInvite[]) => void
```

<p></p>

<h3 id="joinRoom">joinRoom</h3>

```
(jid: string, nick: string, opts: Presence) => void
```

<p></p>

<h3 id="kick">kick</h3>

```
(jid: string, nick: string, reason: string) => Promise
```

<p></p>

<h3 id="leaveRoom">leaveRoom</h3>

```
(jid: string, nick: string, opts: Presence) => void
```

<p></p>

<h3 id="log">log</h3>

```
(level: string, format: string, args: any[]) => void
```

<p></p>

<h3 id="markAcknowledged">markAcknowledged</h3>

```
(msg: Message) => void
```

<p></p>

<h3 id="markActive">markActive</h3>

```
() => void
```

<p></p>

<h3 id="markDisplayed">markDisplayed</h3>

```
(msg: Message) => void
```

<p></p>

<h3 id="markInactive">markInactive</h3>

```
() => void
```

<p></p>

<h3 id="markReceived">markReceived</h3>

```
(msg: Message) => void
```

<p></p>

<h3 id="nextId">nextId</h3>

```
() => string
```

<p></p>

<h3 id="ping">ping</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="publish">publish</h3>

```
(jid: string, node: string, item: <T>, id: string) => Promise
```

<p></p>

<h3 id="publishActivity">publishActivity</h3>

```
(data: UserActivity) => Promise
```

<p></p>

<h3 id="publishAvatar">publishAvatar</h3>

```
(id: string, data: Buffer) => Promise
```

<p></p>

<h3 id="publishGeoLoc">publishGeoLoc</h3>

```
(data: Geolocation) => Promise
```

<p></p>

<h3 id="publishMood">publishMood</h3>

```
(mood: UserMood) => Promise
```

<p></p>

<h3 id="publishNick">publishNick</h3>

```
(nick: string) => Promise
```

<p></p>

<h3 id="publishTune">publishTune</h3>

```
(tune: UserTune) => Promise
```

<p></p>

<h3 id="publishVCard">publishVCard</h3>

```
(vcard: VCardTemp) => Promise
```

<p></p>

<h3 id="purgeNode">purgeNode</h3>

```
(jid: string, node: string) => Promise
```

<p></p>

<h3 id="registerFeature">registerFeature</h3>

```
(name: string, priority: number, handler: FeatureHandler) => void
```

<p></p>

<h3 id="registerLogger">registerLogger</h3>

```
(logger: Logger) => void
```

<p></p>

<h3 id="removeBookmark">removeBookmark</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="removeRosterItem">removeRosterItem</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="requestRoomVoice">requestRoomVoice</h3>

```
(room: string) => void
```

<p></p>

<h3 id="retract">retract</h3>

```
(jid: string, node: string, id: string, notify: boolean) => Promise
```

<p></p>

<h3 id="searchHistory">searchHistory</h3>

```
(opts: Partial) => Promise
(jid: string, opts: MAMQuery) => Promise
```

<p></p>

<h3 id="send">send</h3>

```
(path: <T>, data: TopLevelElements[T]) => Promise
```

<p></p>

<h3 id="sendIQ">sendIQ</h3>

```
(iq: <T> & IQ) => Promise
```

<p></p>

<h3 id="sendIQError">sendIQError</h3>

```
(orig: IQ, err: Partial) => void
```

<p></p>

<h3 id="sendIQResult">sendIQResult</h3>

```
(orig: IQ, result: Partial) => void
```

<p></p>

<h3 id="sendMessage">sendMessage</h3>

```
(msg: Message) => string
```

<p></p>

<h3 id="sendPresence">sendPresence</h3>

```
(pres: Presence) => string
```

<p></p>

<h3 id="sendStreamError">sendStreamError</h3>

```
(err: StreamError) => void
```

<p></p>

<h3 id="setBookmarks">setBookmarks</h3>

```
(bookmarks: MUCBookmark[]) => Promise
```

<p></p>

<h3 id="setHistoryPreferences">setHistoryPreferences</h3>

```
(opts: Partial) => Promise
```

<p></p>

<h3 id="setPrivateData">setPrivateData</h3>

```
(key: <T>, data: PrivateStorage[T]) => Promise
```

<p></p>

<h3 id="setRoomAffiliation">setRoomAffiliation</h3>

```
(room: string, jid: string, affiliation: MUCAffiliation, reason: string) => Promise
```

<p></p>

<h3 id="setRoomRole">setRoomRole</h3>

```
(room: string, nick: string, role: MUCRole, reason: string) => Promise
```

<p></p>

<h3 id="setSubject">setSubject</h3>

```
(room: string, subject: string) => void
```

<p></p>

<h3 id="subscribe">subscribe</h3>

```
(jid: string) => void
```

<p></p>

<h3 id="subscribeToNode">subscribeToNode</h3>

```
(jid: string, opts: string | PubsubSubscribeWithOptions) => Promise
```

<p></p>

<h3 id="unblock">unblock</h3>

```
(jid: string) => Promise
```

<p></p>

<h3 id="unsubscribe">unsubscribe</h3>

```
(jid: string) => void
```

<p></p>

<h3 id="unsubscribeFromNode">unsubscribeFromNode</h3>

```
(jid: string, opts: string | PubsubUnsubscribeOptions) => Promise
```

<p></p>

<h3 id="updateAccount">updateAccount</h3>

```
(jid: string, data: AccountManagement) => Promise
```

<p></p>

<h3 id="updateCaps">updateCaps</h3>

```
() => LegacyEntityCaps[]
```

<p></p>

<h3 id="updateConfig">updateConfig</h3>

```
(opts: AgentConfig) => void
```

<p></p>

<h3 id="updateNodeAffiliations">updateNodeAffiliations</h3>

```
(jid: string, node: string, items: PubsubAffiliation[]) => Promise
```

<p></p>

<h3 id="updateNodeSubscriptions">updateNodeSubscriptions</h3>

```
(jid: string, node: string, delta: PubsubSubscription[]) => Promise
```

<p></p>

<h3 id="updateRosterItem">updateRosterItem</h3>

```
(item: RosterItem) => Promise
```

<p></p>

<h3 id="use">use</h3>

```
(plugin: (agent: Agent, registry: Registry, config: AgentConfig) => void) => void
```

<p></p>

<h3 id="useAvatars">useAvatars</h3>

```
(versions: AvatarVersion[], pointers: AvatarPointer[]) => Promise
```

<p></p>
</tbody></table>
