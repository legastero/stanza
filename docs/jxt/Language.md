# Use of Language and `xml:lang`

JXT is designed to be aware of `xml:lang` to aid with i18n and l10n.

## Language Matching

Language matching is performed based on [Section 3.4 of BCP47](https://tools.ietf.org/html/rfc4647#section-3.4).

The default implementation is basic, so if you need to use more advanced language resolution, you can register your preferred method using `setLanguageResolver()`:

```ts
registry.setLanguageResolver(
    (availableLangs: string[], acceptLangs: string[], currentLang: string) => {
        // return the best match
    }
);
```

Your resolver will be given the list of languages offered by the XML content, the list of preferred languages that was passed via the `acceptLanguages` property of the `TranslationContext`, and the current language in the XML scope.

Language resolution can be changed for a single import by setting the `resolveLanguage` property of the `TranslationContext` to the desired function.

## Set Preferred Languages for Importing

When importing XML, you can declare which languages you prefer to accept (and in which order) by setting the `acceptLanguages` property of the `TranslationContext`:

```ts
const imported = registry.import(xmlData, {
    acceptLanguages: ['de', 'sv', 'en-gb']
});
```

The field types provided by JXT which use element text are language aware, and they will attempt to import data in the following order:

1. Data with a language that appears earliest in `acceptLanguages`.
2. Data with a language that matches the current context language.
3. If returning a single result, the first data found.

Additionally, there are some field types that will return all data found, but grouped by language. See the definitions with the name `childAlternateLanguage[Type]` in [Field Types](./FieldTypes.md#provided-field-definition-types).

When creating your JXT definitions, it is recommended to provide both a field that returns data for a single language and a field that returns all available language data.

## Set the Ambient, Initial Language for Exporting

During export, `xml:lang` declarations are emitted whenever the current language changes. That includes the very first element if the language changes from the default of `""`:

```ts
registry.export(path, enUSData).toString();

// <example xml:lang="en-us"/>
```

In some cases, you might be working in a scope that has an ambient language and you would prefer to omit redundant `xml:lang` declarations. In those cases, you may specify the language of the initial context by setting the `lang` property of the `TranslationContext`:

```ts
registry
    .export(path, enUSData, {
        lang: 'en-us'
    })
    .toString();

// <example/>
```

## Controlling the Current Language during Exporting

Because exporting starts with arbitrary JSON, it is important to know what the current language is supposed to be at each stage. To do this, JXT will look for a language when moving to a new context.

By default, the field `lang` is inspected for the current language. A JXT definition can change the name of the field that provides the current language by setting the `languageField` property:

```ts
registry.define({
    // ...
    languageField: 'theLanguageToUse',
    fields: {
        theLanguageToUse: languageAttribute()
    }
});
```
