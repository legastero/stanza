# StanzaJS Hooks

Hooks are the eventual replacement for [Events](./Events.md). See [HookEmitter](./HookEmitter.md).

Unlike events, hooks are async, and handlers can be chained, running in a definable order.

<hr />

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

<h3 id="credentials:request">credentials:request</h3>

```
{ credentials: Credentials; expected: ExpectedCredentials }
```

<p></p>

<h3 id="credentials:update">credentials:update</h3>

```
CacheableCredentials
```

<p></p>

<h3 id="error">error</h3>

```
{ data: any; error: Error; hook: HookRegistration }
```

<p></p>

<h3 id="features">features</h3>

```
StreamFeatures
```

<p></p>

<h3 id="iq">iq</h3>

```
ReceivedIQ
```

<p></p>

<h3 id="message">message</h3>

```
ReceivedMessage
```

<p></p>

<h3 id="presence">presence</h3>

```
ReceivedPresence
```

<p></p>

<h3 id="stanza">stanza</h3>

```
Message | Presence | IQ
```

<p></p>
</tbody></table>
