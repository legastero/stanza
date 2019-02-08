# JXT: JSON/XML Translation

> Turn your XML into the JSON you always knew it could be.

Working with XML can be tedious, but many XML to JSON converters leave you with a DOM dump which is just as annoying to traverse and work with. JXT allows you to import XML into dev-friendly JSON that matches what you would have otherwise used, and then export that data back into XML when needed.

Works in both node and browsers.

## Basic Usage

```js
import * as JXT from 'jxt';
const registry = new JXT.Registry();

registry.define({
    namespace: 'jabber:client',
    element: 'message',
    path: 'message',
    fields: {
        to: JXT.attribute('to'),
        from: JXT.attribute('from'),
        subject: JXT.childText(null, 'subject'),
        body: JXT.childText(null, 'body')
    }
});

const xml = JXT.parse(`
  <message xmlns="jabber:client" to="foo@example.com">
    <body>giving a demo of jxt</body>
  </message>`);

const msg = registry.import(xml);
console.log(msg);
// {to: 'foo@example.com', body: 'giving a demo of jxt'}

const xml2 = registry.export('message', {
    to: 'foo@example.com',
    body: 'giving a demo of jxt'
});
console.log(xml2.toString());
// '<message xmlns="jabber:client" to="foo@example.com"><body>giving a demo of jxt</body></message>'
```

## Documentation

-   [Creating a Definition](docs/Creating.md)
-   [Extending an Existing Definition](docs/Extending.md)
-   [Importing to JSON](docs/Importing.md)
-   [Exporting to XML](docs/Exporting.md)
-   [Working with Languages](docs/Language.md)
-   [Field Definition Types](docs/FieldTypes.md)
