# JXT Definition Tests for XMPP

Test cases for JXT definitions are grouped into directory suites.

Each suite can contain multiple pairs of JSON and XML files, which
must share the same name prefix:

-   `./suite/testcase-1.json`
-   `./suite/testcase-1.xml`
-   `./suite/testcase-2.json`
-   `./suite/testcase-2.xml`

## `[suite]/[testcase].xml`

The XML file should be the (namespaced!) XML you expect, for both
reading and writing. If a namespace is not provided, it will be
treated as if it had `xmlns="jabber:client"`, since this is intended
for testing an XMPP library.

There should only be a single top-level element in the file.

```xml
<x xmlns="testing" />
```

### Example:

```xml
<message xmlns="jabber:client">
  <mood xmlns='http://jabber.org/protocol/mood'>
    <text>I am particularly peeved.</text>
    <annoyed />
  </mood>
</message>
```

## `[suite]/[testcase].json`

The JSON file should contain an array of two or three items:

-   The JXT key path that the JSON data should be processed as.
-   The JSON data, as you would typically write.
-   Optionally, the JSON data, but in the form you would typically read.

Since importing XML to JSON can result in a lot of default values inserted
that you wouldn't need to include when writing, using the second JSON object
is available for testing those cases.

```json
[
    "keypath", // Context for how the JSON data processed.
    // Usually message, presence, or iq.
    // But you can scope deeper, e.g.: iq.pubsub
    {
        // JSON data that gets exported to XML and compared with the
        // case XML data.
        // This is the version that will look like what you would
        // typically write and _send_.
    },
    {
        // Optional, JSON version that gets imported from the XML.
        // Useful when there are a lot of default values injected.
        // This is the version that will look like what you would
        // typically _receive_ and consume.
    }
]
```

### Example:

```json
[
    "message",
    {
        "mood": {
            "text": "I am particularly peeved.",
            "value": "annoyed"
        }
    },
    {
        "lang": "",
        "mood": {
            "text": "I am particularly peeved.",
            "alternateLanguageText": [{ "lang": "", "value": "I am particularly peeved." }],
            "value": "annoyed"
        }
    }
]
```
