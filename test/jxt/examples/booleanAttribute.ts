import test from 'tape';

import { booleanAttribute, parse, Registry } from '../../../src/jxt';

interface Example {
    foo?: boolean;
}

const registry = new Registry();
registry.define({
    element: 'x',
    fields: {
        foo: booleanAttribute('foo')
    },
    namespace: '',
    path: 'example'
});

export default function runTests() {
    test('[Type: booleanAttribute]: Import with "true"', t => {
        const ex = registry.import(parse('<x foo="true" />')) as Example;
        t.ok(ex, 'Imported version exists (using "true")');
        t.equal(ex.foo, true, 'Attribute is true');
        t.end();
    });

    test('[Type: booleanAttribute]: Import with "1"', t => {
        const ex = registry.import(parse('<x foo="1" />')) as Example;
        t.ok(ex, 'Imported version exists (using "1")');
        t.equal(ex.foo, true, 'Attribute is true');
        t.end();
    });

    test('[Type: booleanAttribute]: Import with "false"', t => {
        const ex = registry.import(parse('<x foo="false" />')) as Example;
        t.ok(ex, 'Imported version exists (using "false")');
        t.equal(ex.foo, false, 'Attribute is false');
        t.end();
    });

    test('[Type: booleanAttribute]: Import with "0"', t => {
        const ex = registry.import(parse('<x foo="0" />')) as Example;
        t.ok(ex, 'Imported version exists (using "0")');
        t.equal(ex.foo, false, 'Attribute is false');
        t.end();
    });

    test('[Type: booleanAttribute]: Import with anything not "true" or "1"', t => {
        const ex = registry.import(parse('<x foo="blah" />')) as Example;
        t.ok(ex, 'Imported version exists (using "blah")');
        t.equal(ex.foo, undefined, 'Attribute is falsey');
        t.end();
    });

    test('[Type: booleanAttribute]: Export true', t => {
        const ex = registry.export<Example>('example', { foo: true });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x foo="1"/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: booleanAttribute]: Export false', t => {
        const ex = registry.export<Example>('example', { foo: false });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x foo="0"/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: booleanAttribute]: Export not set', t => {
        const ex = registry.import(parse('<x />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.equal(ex!.foo, undefined, 'Attribute is falsey');
        t.end();
    });

    test('[Type: booleanAttribute]', t => {
        const ex = registry.export<Example>('example', {});
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x/>', 'Exported XML matches');
        t.end();
    });
}
