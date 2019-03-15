# XMPP JIDs

In XMPP, addresses are refered to as JIDs (ostensibly Jabber IDs, based on the old Jabber name).

A JID often looks a lot like an email address with a `user@host` form, but there's more to it:

```
        full JID
/                       \
[local@]domain[/resource]
\            /
   bare JID
```

A JID can be composed of a local part, a domain part, and a resource part. The domain part is
mandatory for all JIDs, and can even stand alone (e.g., as the address for a server).

The combination of a local (user) part and a domain is called a "bare JID", and it is used
to identitfy a particular account at a server.

A JID that includes a resource is called a "full JID", and it is used to identify a particular
client connection (i.e., a specific connection for the associated "bare JID" account).

## Usage

```javascript
const jid = require('stanza').jid;
const res = new jid.JID('user@example.com');
// or jid.create('user@example.com');

// res == {
//     local: 'user',
//     domain: 'example.com',
//     resource: 'res',
//     bare: 'user@example.com',
//     full: 'user@example.com/res',
//     unescapedLocal: 'user',
//     unescapedBare: 'user@example.com',
//     unescapedFull: 'user@example.com/res',
//     prepped: true
// }
```

## StringPrep

Correctly working with JIDs can be slightly tricky thanks to Unicode, which requires us
to use StringPrep to normalize the individual parts of a JID so that we can safely use
them in comparisons. Unfortunately, we don't have always have access to StringPrep, so
all `JID` objects are marked with a `prepped` attribute indicating if StringPrep has
been applied.

To enable full StringPrep application, also add the `node-stringprep` module to your
dependcies:

```sh
npm i node-stringprep
```

Comparisons between JIDs should only be trusted if both JIDs have `prepped` set to `true`.

The provided `equal` function can be used to reliably check that two JIDs are equivalent,
with an optional parameter to disable the `prepped` flag check.

```javascript
jid.equal('user@example.com/res', 'USER@EXAMPLE.COM/res');
// true, if StringPrep is available

jid.equal('user@example.com/res', 'USER@EXAMPLE.COM/res', false);
// true

jid.equal('user@example.com/res1', 'user@example.com/res2');
// false, full JIDs don't match
```

The same applies for the provided `equalBare` function, which checks that two
JIDs have the same "bare JID" form (i.e., it ignores differences in resources).

```javascript
jid.equal('user@example.com/resource1', 'USER@EXAMPLE.COM/resource2');
// true, if StringPrep is available

jid.equal('user@example.com/resource1', 'USER@EXAMPLE.COM/resource2', false);
// true

jid.equal('user@example.com/resource1', 'otheruser@EXAMPLE.COM/resource2', false);
// false, bare JIDs don't match
```

Even in the browser, there are ways to ensure that StringPrep is applied by getting
your XMPP server to do the prepping for you. This is already done for the standard
stanza routing attributes (`"to"` and `"from"`), and other places where the server
can reliably ensure that the JIDs are prepped (e.g., roster entries).

In other cases, you may need to use [XEP-0328: JID Prep](http://xmpp.org/extensions/xep-0328.html)
to explicity ask your server to prep a given JID.

## JID Escaping

[XEP-0106: JID Escaping](http://xmpp.org/extensions/xep-0106.html) allows you to create JIDs
using characters typically prohibited in the local part: `"' <:>&@`

When creating a new JID by specifying the local part separately (e.g. `new JID('localpart', 'domain')`),
the local part will be automatically escaped where necessary.

(Using `new JID('local@domain')` will **not**
escape the local part, as that is assumed to already be the escaped form.)

These fields on the resulting `JID` object yield the human-presentable, unescaped forms:

-   `unescapedLocal`
-   `unescapedBare`
-   `unescapedFull`

If you show the unescaped forms _anywhere_ to a user, you should do so _everywhere_ to be consistent and
prevent potential security issues related to JID spoofing.
