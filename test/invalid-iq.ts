import { parse, Registry } from '../src/jxt';
import XMPP, { IQ } from '../src/protocol';

const registry = new Registry();
registry.define(XMPP);

test('Invalid IQ - too many children', () => {
    const xml = parse(`
      <iq xmlns="jabber:client" type="get">
        <query xmlns="http://jabber.org/protocol/disco#info" />
        <child xmlns="test2" />
      </iq>
    `);

    const iq = registry.import(xml)! as IQ;
    expect(iq.payloadType).toBe('invalid-payload-count');
});

test('Invalid IQ - no children', () => {
    const xml = parse(`
      <iq xmlns="jabber:client" type="get">
      </iq>
    `);

    const iq = registry.import(xml)! as IQ;
    expect(iq.payloadType).toBe('invalid-payload-count');
});

test('Invalid IQ - unknown payload', () => {
    const xml = parse(`
      <iq xmlns="jabber:client" type="get">
        <child xmlns="test-dne" />
      </iq>
    `);

    const iq = registry.import(xml)! as IQ;
    expect(iq.payloadType).toBe('unknown-payload');
});
