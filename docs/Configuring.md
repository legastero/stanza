# StanzaJS Configuration

Configuring a StanzaJS client is done when calling `createClient()`:

```typescript
import * as XMPP from 'stanza';

const client = XMPP.createClient({
    // Configuration Settings
});
```

It is possible to inspect the configuration later by using `client.config`.

## Available Settings

<ul><li><a href="#acceptLanguages">acceptLanguages</a></li><li><a href="#allowResumption">allowResumption</a></li><li><a href="#capsNode">capsNode</a></li><li><a href="#chatMarkers">chatMarkers</a></li><li><a href="#credentials">credentials</a></li><li><a href="#jid">jid</a></li><li><a href="#lang">lang</a></li><li><a href="#password">password</a></li><li><a href="#resource">resource</a></li><li><a href="#rosterVer">rosterVer</a></li><li><a href="#sendReceipts">sendReceipts</a></li><li><a href="#server">server</a></li><li><a href="#softwareVersion">softwareVersion</a></li><li><a href="#timeout">timeout</a></li><li><a href="#transports">transports</a></li><li><a href="#useStreamManagement">useStreamManagement</a></li></ul>
<h3 id="acceptLanguages">Accepted Languages</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>acceptLanguages</code></td>
     <td><code>string[]</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p>A list of language codes acceptable to the user.</p>

<h3 id="allowResumption">Allow Stream Management Resumption</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>allowResumption</code></td>
     <td><code>false</code> | <code>true</code></td>
     <td><code>true</code></td>
  </tr>
</table>
<p>When true (along with useStreamManagement), the session will be resumable after a disconnect.</p><p>However, this means that the session will still appear as alive for a few minutes after a connection loss.</p>

<h3 id="capsNode">Entity Caps Disco Node</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>capsNode</code></td>
     <td><code>string</code></td>
     <td><code>"https://stanzajs.org"</code></td>
  </tr>
</table>
<p>The disco info node prefix to use for entity capability advertisements.</p>

<h3 id="chatMarkers">Send Chat Markers</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>chatMarkers</code></td>
     <td><code>false</code> | <code>true</code></td>
     <td><code>true</code></td>
  </tr>
</table>
<p>When enabled, message display markers will automatically be sent when requested.</p>

<h3 id="credentials">Account Credentials</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>credentials</code></td>
     <td><code>Credentials</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p>The <code>credentials</code> object is used to pass multiple credential values (not just a password). These are primarily values that have been previously cached.</p><p>If you only need to set a password, then the <code>password</code> config field can be used instead.</p>

<h3 id="jid">User JID</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>jid</code></td>
     <td><code>string</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p></p>

<h3 id="lang">User Language</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>lang</code></td>
     <td><code>string</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p>The associated language code for content created by the user.</p>

<h3 id="password">Account Password</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>password</code></td>
     <td><code>string</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p>Equivalent to using <code>credentials: { password: '*****' }</code>.</p>

<h3 id="resource">Connection Resource</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>resource</code></td>
     <td><code>string</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p>Optionally request for the server to bind a specific resource for the connection.</p><p>Note that the server is allowed ignore the request.</p>

<h3 id="rosterVer">Roster Version</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>rosterVer</code></td>
     <td><code>string</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p>The latest known version of the user's roster.</p><p>If the version matches the version on the server, roster data does not need to be sent to the client.</p>

<h3 id="sendReceipts">Send Message Delivery Receipts</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>sendReceipts</code></td>
     <td><code>false</code> | <code>true</code></td>
     <td><code>true</code></td>
  </tr>
</table>
<p>When enabled, message receipts will automatically be sent when requested.</p>

<h3 id="server">Server Domain Name</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>server</code></td>
     <td><code>string</code></td>
     <td><code>undefined</code></td>
  </tr>
</table>
<p>Set the expected name of the server instead of using domain in the provided JID.</p>

<h3 id="softwareVersion">Software Version Info</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>softwareVersion</code></td>
     <td><code>SoftwareVersion</code></td>
     <td><code>{ name: "stanzajs.org" }</code></td>
  </tr>
</table>
<p></p>

<h3 id="timeout">IQ Timeout</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>timeout</code></td>
     <td><code>number</code></td>
     <td><code>15</code></td>
  </tr>
</table>
<p>The number of seconds to wait before timing out IQ requests.</p>

<h3 id="transports">Transport Configurations</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>transports</code></td>
     <td></td>
     <td><code>{ websocket: true, bosh: true }</code></td>
  </tr>
</table>
<p>Limit the transport types that will be used, or specify connection URLs to use without needing to use auto-discovery.</p><p>If a transport is set to <code>false</code>, it will be disabled.</p><p>If a transport is set to a string, that will be used as the connection URL.</p><p>If a transport is set to an object, it MUST include a <code>url</code> value for the connection URL.</p>

<h3 id="useStreamManagement">Use Stream Management</h3>
<table>
  <tr><th>Name</th><th>Type</th><th>Default Value</th></tr>
  <tr>
     <td><code>useStreamManagement</code></td>
     <td><code>false</code> | <code>true</code></td>
     <td><code>true</code></td>
  </tr>
</table>
<p>Controls if <a href="https://xmpp.org/extensions/xep-0198.html">XEP-0198: Stream Management</a> is enabled for the session.</p><p>Disabling stream management is <i>not</i> recommended.</p>
