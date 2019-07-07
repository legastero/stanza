# JXT: JSON/XML Translation

> Turn your XML into the JSON you always knew it could be.

Working with XML can be tedious, but many XML to JSON converters leave you with a DOM dump which is just as annoying to traverse and work with. JXT allows you to import XML into dev-friendly JSON that matches what you would have otherwise used, and then export that data back into XML when needed.

## Basic Usage

```js
import { JXT } from 'stanza';
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

-   [Creating a Definition](./Creating.md)
-   [Extending an Existing Definition](./Extending.md)
-   [Importing to JSON](./Importing.md)
-   [Exporting to XML](./Exporting.md)
-   [Working with Languages](./Language.md)
-   [Field Definition Types](./FieldTypes.md)
