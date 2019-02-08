# Field Definitions

Field definitions in JXT are the entries in the `fields` section of a definition:

```ts
registry.define({
    namespace: 'test',
    element: 'x',
    path: 'example',
    fields: {
        // Field definitions are here
    }
});
```

Each field can include an `importer()` and `exporter()` function, where the `importer()` function is responsible for converting an XML object into JSON, and `exporter()` is used to convert JSON to XML:

```ts
type FieldImporter = (xml: XMLElement, context: TranslationContext) => any;
type FieldExporter = (xml: XMLElement, data: any, context: TranslationContext) => void;

interface FieldDefinition {
    importer: FieldImporter;
    exporter: FieldExporter;
}
```

The `importer()` is given the source XML element, and is expected to return whatever value should be assigned to the field name.

The `exporter()` object is given the XML element that is being expanded, the current value of the field. The `exporter()` does not return anything, it is expected to modify the given XML element in-place.

The `TranslationContext` can be used to access information such as the languages to accept, the current key path, the JXT registry being used, etc.

## Custom Field Definitions

In nearly all cases, you will use a function to create field definitions dynamically. Here is an example implementation of a field that gets/sets data from an attribute.

```ts
const attributeField = (attrName: string): FieldDefinition => ({
    importer(xml: XMLElement) {
        return xml.getAttribute(attrName);
    },
    exporter(xml: XMLElement, value: string) {
        xml.setAttribute(attrName, value);
    }
});
```

This `attributeField()` function can now be used in a JXT definition:

```ts
registry.define({
    namespace: 'test',
    element: 'x',
    path: 'example',
    fields: {
        attribute: attributeField('someAttrName')
    }
});
```

## Provided Field Definition Types

JXT comes bundled with a variety of pre-defined field definitions. These definitions come in several flavors:

-   `[type]Attribute()`

    Map and cast an attribute value to the given type (boolean, integer, etc).

-   `namespaced[Type]Attribute`

    Same as `[type]Attribute`, but the attribute also uses an XML namespace.

-   `child[Type]Attribute`

    The same as `[type]Attribute`, but the attribute is on a child XML element.

-   `child[Type]`

    Map a value from a child XML element, and cast to the given type.

-   `multipleChild[Type]`

    Similar to `child[Type]`, but maps an array of values.

-   `childLanguage[Type]`

    Similar to `child[Type]`, but the child element that is used is based on the current language.

    The language used when exporting can be found in the `lang` property of the `TranslationContext`, and the set of languages to consider when importing can be found in the `acceptLanguages` property.

-   `childAlternateLanguage[Type]`

    Alternate language definitions use a dictionary mapping language codes to desired values. This definition kind should be used along side `childLanguage[Type]` to capture all available language-based values in addition to the "default" provided by `childLanguage[Type]`.

Some of these definitions can accept a `defaultValue` parameter. When a default value is given, it is **only** applied when importing from XML to JSON. The default value will not be applied to any exported XML.

---

### Attribute

```ts
attribute(name: string, defaultValue?: string, emitEmpty?: boolean)
```

| Parameter    | Type                     | Description                                                                          |
| ------------ | ------------------------ | ------------------------------------------------------------------------------------ |
| name         | `string`                 | The name of the attribute                                                            |
| defaultValue | `string` \| `undefined`  | Default value to use if the attribute is not present, or is empty.                   |
| emitEmpty    | `boolean` \| `undefined` | In some cases, the attribute value `""` instead of eliding the attribute is desired. |

**Returns:** `string`

[See examples](../../test/jxt/examples/attribute.ts)

---

### Boolean Attribute

```ts
booleanAttribute(name: string)
```

| Parameter | Type     | Description               |
| --------- | -------- | ------------------------- |
| name      | `string` | The name of the attribute |

**Returns:** `boolean`

[See examples](../../test/jxt/examples/booleanAttribute.ts)

---

### Child Alternate Language RawElement

```ts
childAlternateLanguageRawElement(namespace: string | null, element: string, sanitizer?: string)
```

| Parameter | Type               | Description                                                                                                                                                                                                                     |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used.                                                                                                                                               |
| element   | `string`           | The name of the child element                                                                                                                                                                                                   |
| sanitizer | `string`           | The name of a sanitizer function to remove any potentially harmful elements or attribute values (e.g. `<script/>` elements or `javascript:` URIs). Sanitizers SHOULD act as whitelists and only pass through approved elements. |

**Returns:** `Array<{ lang: string, value: JSONElement }>`

> **NOTE:** The named sanitizer **MUST** be present in the `sanitizers` property of the `TranslationContext` in order for any data to be returned.

A `JSONElement` value is defined as:

```ts
interface JSONElement {
    name: string;
    attributes: {
        [key: string]: string;
    };
    children: Array<JSONElement | string>;
}
```

This interface is _slightly_ different than the `XMLElement` type used when importing and exporting. It purposefully does not include the `parent` property so that there are no circular references, making the imported data usable with `JSON.stringify()`.

[See examples](../../test/jxt/examples/childAlternateLanguageRaw.ts)

---

### Child Alternate Language Text

```ts
childAlternateLanguageText(namespace: string | null, element: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |

**Returns:** `Array<{ lang: string, value: string }>`

[See examples](../../test/jxt/examples/childAlternateLanguageText.ts)

---

### Child Attribute

```ts
childAttribute(namespace: string | null, element: string, name: string, defaultValue?: string)
```

| Parameter    | Type                    | Description                                                                       |
| ------------ | ----------------------- | --------------------------------------------------------------------------------- |
| namespace    | `string` \| `null`      | The namespace of the child element. If `null`, the parent namespace will be used. |
| element      | `string`                | The name of the child element                                                     |
| name         | `string`                | The name of the attribute                                                         |
| defaultValue | `string` \| `undefined` | Default value to use if the attribute is empty or not present                     |

**Returns:** `string`

[See examples](../../test/jxt/examples/childAttribute.ts)

---

### Child Boolean

```ts
childBoolean(namespace: string | null, element: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |

**Returns:** `boolean`

[See examples](../../test/jxt/examples/childBoolean.ts)

---

### Child Boolean Attribute

```ts
childBooleanAttribute(namespace: string | null, element: string, name: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |
| name      | `string`           | The name of the attribute                                                         |

**Returns:** `boolean`

[See examples](../../test/jxt/examples/childBooleanAttribute.ts)

---

### Child Date

```ts
childDate(namespace: string | null, element: string, useCurrentDate: boolean = false)
```

| Parameter      | Type                     | Description                                                                                                        |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| namespace      | `string` \| `null`       | The namespace of the child element. If `null`, the parent namespace will be used.                                  |
| element        | `string`                 | The name of the child element                                                                                      |
| useCurrentDate | `boolean` \| `undefined` | If set to `true`, the current date will be used when importing if the child element does not contain a date value. |

**Returns:** `Date`

> **NOTE:** The date value in the XML MUST be parsable by the JavaScript `Date` constructor. The exported data value will be in ISO format.

[See examples](../../test/jxt/examples/childDate.ts)

---

### Child Date Attribute

```ts
childDateAttribute(namespace: string | null, element: string, name: string, useCurrentDate: boolean = false)
```

| Parameter      | Type                     | Description                                                                                                        |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| namespace      | `string` \| `null`       | The namespace of the child element. If `null`, the parent namespace will be used.                                  |
| element        | `string`                 | The name of the child element                                                                                      |
| name           | `string`                 | The name of the attribute                                                                                          |
| useCurrentDate | `boolean` \| `undefined` | If set to `true`, the current date will be used when importing if the child element does not contain a date value. |

**Returns:** `Date`

> **NOTE:** The child element's text value **MUST** be parsable by the JavaScript `Date` constructor. The exported data value will always be in ISO format.

[See examples](../../test/jxt/examples/childDateAttribute.ts)

---

### Child Enum

```ts
childEnum(namespace: string | null, elements: Array<string | [string, string]>, defaultValue?: string)
```

| Parameter    | Type                               | Description                                                                                                                               |
| ------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| namespace    | `string` \| `null`                 | The namespace of the child element. If `null`, the parent namespace will be used.                                                         |
| elements     | `Array<string | [string, string]>` | A set of child element names. If an enum value does not match the element name, its entry will be a tuple of `['value', 'element-name']`. |
| defaultValue | `string` \| `undefined`            | Default value to use if there are no child elements whose name is in `elements`                                                           |

**Returns:** `string`

[See examples](../../test/jxt/examples/childEnum.ts)

---

### Child Float

```ts
childFloat(namespace: string | null, element: string, defaultValue?: number)
```

| Parameter    | Type                    | Description                                                                       |
| ------------ | ----------------------- | --------------------------------------------------------------------------------- |
| namespace    | `string` \| `null`      | The namespace of the child element. If `null`, the parent namespace will be used. |
| element      | `string`                | The name of the child element                                                     |
| defaultValue | `number` \| `undefined` | Default value to use if the attribute is empty or not present                     |

**Returns:** `number`

[See examples](../../test/jxt/examples/childFloat.ts)

---

### Child Float Attribute

```ts
childFloatAttribute(namespace: string | null, element: string, name: string, defaultValue?: number)
```

| Parameter    | Type                    | Description                                                                       |
| ------------ | ----------------------- | --------------------------------------------------------------------------------- |
| namespace    | `string` \| `null`      | The namespace of the child element. If `null`, the parent namespace will be used. |
| element      | `string`                | The name of the child element                                                     |
| name         | `string`                | The name of the attribute                                                         |
| defaultValue | `number` \| `undefined` | Default value to use if the attribute is empty or not present                     |

**Returns:** `number`

[See examples](../../test/jxt/examples/childFloatAttribute.ts)

---

### Child Integer

```ts
childInteger(namespace: string | null, element: string, defaultValue?: number)
```

| Parameter    | Type                    | Description                                                                       |
| ------------ | ----------------------- | --------------------------------------------------------------------------------- |
| namespace    | `string` \| `null`      | The namespace of the child element. If `null`, the parent namespace will be used. |
| element      | `string`                | The name of the child element                                                     |
| defaultValue | `number` \| `undefined` | Default value to use if the attribute is empty or not present                     |

**Returns:** `number`

> **NOTE:** When importing, the child element text is parsed using `parseInt()` with a radix of `10`.

[See examples](../../test/jxt/examples/childInteger.ts)

---

### Child Integer Attribute

```ts
childIntegerAttribute(namespace: string | null, element: string, name: string, defaultValue?: number)
```

| Parameter    | Type                    | Description                                                                       |
| ------------ | ----------------------- | --------------------------------------------------------------------------------- |
| namespace    | `string` \| `null`      | The namespace of the child element. If `null`, the parent namespace will be used. |
| element      | `string`                | The name of the child element                                                     |
| name         | `string`                | The name of the attribute                                                         |
| defaultValue | `number` \| `undefined` | Default value to use if the attribute is empty or not present                     |

**Returns:** `number`

> **NOTE:** When importing, the child attribute text is parsed using `parseInt()` with a radix of `10`.

[See examples](../../test/jxt/examples/childIntegerAttribute.ts)

---

### Child JSON

```ts
childJSON(namespace: string | null, element: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |

**Returns:** `any`

The JSON object assigned to the field will be serialized and set as the child element's text content.

[See examples](../../test/jxt/examples/childJSON.ts)

---

### Child Language Attribute

```ts
childLanguageAttribute(namespace: string | null, element: string)
```

**Returns:** `string`

This definition is specifically for getting or setting the value of the `xml:lang` attribute of a child element.

If no `xml:lang` attribute is present on the child element when importing, it will search up the XML tree until an `xml:lang` is found. If none is found, the `lang` value provided in the `TranslationContext` will be used.

The current language when exporting data is normally controlled by defining a field named `lang` whose field type is [`languageAttribute()`](#language-attribute). You can assign the field type `childLanguageAttribute()` to the `lang` field instead if you wish to change the current language based on the child element's language:

```ts
registry.define({
    namespace: 'test',
    name: 'alt-lang-location',
    fields: {
        lang: childLanguageAttribute(null, 'child-with-lang')
    }
});
```

In most cases, you will want to use the field name `lang` so that the current language in the `TranslationContext` is correctly set during export. However, if you need to use a different field name, set the `languageField` property when creating the JXT definition to the alternate field name:

```ts
registry.define({
    namespace: 'test',
    name: 'alt-lang-location',
    languageField: 'theLanguageToUse',
    fields: {
        theLanguageToUse: childlanguageAttribute(null, 'child-with-lang')
    }
});
```

[See examples](../../test/jxt/examples/childLanguageAttribute.ts)

---

### Child Language RawElement

```ts
childLanguageRawElement(namespace: string | null, element: string, sanitizer?: string)
```

[See examples](../../test/jxt/examples/childLanguageRawElement.ts)

---

### Child RawElement

```ts
childRawElement(namespace: string | null, element: string, sanitizer?: string)
```

[See examples](../../test/jxt/examples/childRawElement.ts)

---

### Child Text

```ts
childText(namespace: string | null, element: string, defaultValue?: string)
```

| Parameter    | Type               | Description                                                                       |
| ------------ | ------------------ | --------------------------------------------------------------------------------- |
| namespace    | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element      | `string`           | The name of the child element                                                     |
| defaultValue | `string`           | The default value to use when there is no text content for the element            |

**Returns:** `string`

If there are multiple child elements with the given name, the following will be checked:

1. If the `acceptLanguages` property of the `TranslationContext` is set, the first child element whose language value appears earliest in the list will be used.
2. If there is no `acceptLanguages` set, or no child elements have a language matching `acceptLanguages`, the first child whose language matches the current language in the context (`lang` in `TranslationContext`) will be used.
3. If no child has a matching language, the first child will be used.
4. If there are no children, the default value will be used.

> **NOTE:** It is advisable to also use [`childAlternateLanguageText()`](#child-alternate-language-text) to capture all available language data.

[See examples](../../test/jxt/examples/childText.ts)

---

### Child Text Buffer

```ts
childTextBuffer(namespace: string | null, element: string, encoding: string = 'utf8')
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |
| encoding  | `string`           | The encoding to use for the buffer                                                |

**Returns:** `Buffer`

[See examples](../../test/jxt/examples/childTextBuffer.ts)

---

### Child Timezone Offset

```ts
childTimezoneOffset(namespace: string | null, element: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |

**Returns:** `number`

The timezone offset is the provided as the number of minutes (positive or negative) from UTC.

The child element text **MUST** be formatted as `+HH:MM` or `-HH:MM`.

[See examples](../../test/jxt/examples/childTimezoneOffset.ts)

---

### Date Attribute

```ts
dateAttribute(name: string, useCurrentDate: boolean = false)
```

| Parameter      | Type                     | Description                                                                                                        |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| name           | `string`                 | The name of the attribute                                                                                          |
| useCurrentDate | `boolean` \| `undefined` | If set to `true`, the current date will be used when importing if the child element does not contain a date value. |

**Returns:** `Date`

> **NOTE:** The date value in the XML MUST be parsable by the JavaScript `Date` constructor. The exported data value will be in ISO format.

[See examples](../../test/jxt/examples/dateAttribute.ts)

---

### Float Attribute

```ts
floatAttribute(name: string, defaultValue?: number)
```

| Parameter    | Type                    | Description                                                   |
| ------------ | ----------------------- | ------------------------------------------------------------- |
| name         | `string`                | The name of the attribute                                     |
| defaultValue | `number` \| `undefined` | Default value to use if the attribute is empty or not present |

**Returns:** `number`

[See examples](../../test/jxt/examples/floatAttribute.ts)

---

### Integer Attribute

```ts
integerAttribute(name: string, defaultValue?: number)
```

| Parameter    | Type                    | Description                                                   |
| ------------ | ----------------------- | ------------------------------------------------------------- |
| name         | `string`                | The name of the attribute                                     |
| defaultValue | `number` \| `undefined` | Default value to use if the attribute is empty or not present |

**Returns:** `number`

> **NOTE:** When importing, the attribute text is parsed using `parseInt()` with a radix of `10`.

[See examples](../../test/jxt/examples/integerAttribute.ts)

---

### Language Attribute

```ts
languageAttribute();
```

**Returns:** `string`

This definition is specifically for getting or setting the value of the `xml:lang` attribute.

If no `xml:lang` attribute is present when importing, it will search up the XML tree until an `xml:lang` is found. If none is found, the `lang` value provided in the `TranslationContext` will be used.

In most cases, you will want to use the field name `lang` with this definition type so that the current language in the `TranslationContext` is correctly set during export.

However, if you need to use a different field name for language, set the `languageField` property when creating the JXT definition to the alternate field name:

```ts
registry.define({
    namespace: 'test',
    name: 'alt-lang-location',
    languageField: 'theLanguageToUse',
    fields: {
        theLanguageToUse: languageAttribute()
    }
});
```

[See examples](../../test/jxt/examples/integerAttribute.ts)

---

### Multiple Child Alternate Language Text

```ts
multipleChildAlternateLanguageText(namespace: string | null, element: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |

**Returns:** `Array<{ lang: string, value: string[]}>`

[See examples](../../test/jxt/examples/multipleChildAlternateLanguageText.ts)

---

### Multiple Child Attribute

```ts
multipleChildAttribute(namespace: string | null, element: string, name: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |
| name      | `string`           | The name of the attribute                                                         |

**Returns:** `string[]`

[See examples](../../test/jxt/examples/multipleChildAttribute.ts)

---

### Multiple Child Enum

```ts
multipleChildEnum(namespace: string | null, elements: Array<string>)
```

| Parameter | Type                               | Description                                                                                                                               |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| namespace | `string` \| `null`                 | The namespace of the child element. If `null`, the parent namespace will be used.                                                         |
| elements  | `Array<string | [string, string]>` | A set of child element names. If an enum value does not match the element name, its entry will be a tuple of `['value', 'element-name']`. |

**Returns:** `string[]`

[See examples](../../test/jxt/examples/multipleChildEnum.ts)

---

### Multiple Child Text

```ts
multipleChildText(namespace: string | null, element: string)
```

| Parameter | Type               | Description                                                                       |
| --------- | ------------------ | --------------------------------------------------------------------------------- |
| namespace | `string` \| `null` | The namespace of the child element. If `null`, the parent namespace will be used. |
| element   | `string`           | The name of the child element                                                     |

**Returns:** `string[]`

If there are multiple child elements with the given name, but different languages, the following will be checked:

1. If the `acceptLanguages` property of the `TranslationContext` is set, the children whose language value appears earliest in the list will be used.
2. If there is no `acceptLanguages` set, or no child elements have a language matching `acceptLanguages`, the children whose language matches the current language in the context (`lang` in `TranslationContext`) will be used.
3. Otherwise, an empty list is returned.

> **NOTE:** It is advisable to also use [`multipleChildAlternateLanguageText()`](#multiple-child-alternate-language-text) to capture all available language data.

[See examples](../../test/jxt/examples/multipleChildText.ts)

---

### Namespaced Attribute

```ts
namespacedAttribute(prefix: string, namespace: string, name: string, defaultValue?: string)
```

| Parameter    | Type     | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| prefix       | `string` | The namespace prefix to use if the namespace has not already been declared |
| namespace    | `string` | The namespace of the attribute                                             |
| name         | `string` | The name of the attribute                                                  |
| defaultValue | `string` | The default value to use when there is no text content for the element     |

**Returns:** `string`

[See examples](../../test/jxt/examples/namespacedAttribute.ts)

---

### Namespaced Boolean Attribute

```ts
namespacedBooleanAttribute(prefix: string, namespace: string, name: string)
```

| Parameter | Type     | Description                                                                |
| --------- | -------- | -------------------------------------------------------------------------- |
| prefix    | `string` | The namespace prefix to use if the namespace has not already been declared |
| namespace | `string` | The namespace of the attribute                                             |
| name      | `string` | The name of the attribute                                                  |

**Returns:** `boolean`

[See examples](../../test/jxt/examples/namespacedBooleanAttribute.ts)

---

### Namespaced Date Attribute

```ts
namespacedDateAttribute(prefix: string, namespace: string, name: string, useCurrentDate: boolean = false)
```

| Parameter      | Type      | Description                                                                |
| -------------- | --------- | -------------------------------------------------------------------------- |
| prefix         | `string`  | The namespace prefix to use if the namespace has not already been declared |
| namespace      | `string`  | The namespace of the attribute                                             |
| name           | `string`  | The name of the attribute                                                  |
| useCurrentDate | `boolean` | The default value to use when there is no text content for the element     |

**Returns:** `Date`

> **NOTE:** The date value in the XML MUST be parsable by the JavaScript `Date` constructor. The exported data value will be in ISO format.

[See examples](../../test/jxt/examples/namespacedDateAttribute.ts)

---

### Namespaced Float Attribute

```ts
namespacedFloatAttribute(prefix: string, namespace: string, name: string, defaultValue?: number)
```

| Parameter    | Type     | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| prefix       | `string` | The namespace prefix to use if the namespace has not already been declared |
| namespace    | `string` | The namespace of the attribute                                             |
| name         | `string` | The name of the attribute                                                  |
| defaultValue | `number` | The default value to use when there is no text content for the element     |

**Returns:** `number`

[See examples](../../test/jxt/examples/namespacedFloatAttribute.ts)

---

### Namespaced Integer Attribute

```ts
namespacedIntegerAttribute(prefix: string, namespace: string, name: string, defaultValue?: number)
```

| Parameter    | Type     | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| prefix       | `string` | The namespace prefix to use if the namespace has not already been declared |
| namespace    | `string` | The namespace of the attribute                                             |
| name         | `string` | The name of the attribute                                                  |
| defaultValue | `number` | The default value to use when there is no text content for the element     |

**Returns:** `number`

> **NOTE:** When importing, the child element text is parsed using `parseInt()` with a radix of `10`.

[See examples](../../test/jxt/examples/namespacedIntegerAttribute.ts)

---

### Splice Path

```ts
splicePath(namespace: string | null, element: string, path: string, multiple?: boolean)
```

[See examples](../../test/jxt/examples/splicePath.ts)

---

### Static Value

```ts
staticValue(value: any)
```

| Parameter | Type  | Description                |
| --------- | ----- | -------------------------- |
| value     | `any` | The value to always return |

**Returns:** `string`

The `staticValue()` type is used to inject a value into the imported data, but has no effect when exporting.

[See examples](../../test/jxt/examples/staticValue.ts)

---

### Text

```ts
text(defaultValue?: string)
```

| Parameter    | Type     | Description                                                            |
| ------------ | -------- | ---------------------------------------------------------------------- |
| defaultValue | `string` | The default value to use when there is no text content for the element |

**Returns:** `string`

[See examples](../../test/jxt/examples/text.ts)

---

### Text Buffer

```ts
textBuffer(encoding: string = 'utf8')
```

| Parameter | Type     | Description                        |
| --------- | -------- | ---------------------------------- |
| encoding  | `string` | The encoding to use for the buffer |

**Returns:** `Buffer`

[See examples](../../test/jxt/examples/textBuffer.ts)
