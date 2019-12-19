import * as SASL from '../../src/lib/sasl';

test('Mech selection', () => {
    const factory = new SASL.Factory();
    factory.register('BASIC-PLAIN', SASL.PLAIN, 10);
    factory.register('PLAIN', SASL.PLAIN, 100);
    factory.register('SUPER-PLAIN', SASL.PLAIN, 200);

    const mech = factory.createMechanism(['SUPER-PLAIN'])!;

    expect(mech.name).toBe('SUPER-PLAIN');
});

test('Mech selection', () => {
    const factory = new SASL.Factory();
    factory.register('BASIC-PLAIN', SASL.PLAIN, 10);
    factory.register('PLAIN', SASL.PLAIN, 100);
    factory.register('SUPER-PLAIN', SASL.PLAIN, 200);

    const mech = factory.createMechanism(['SUPER-PLAIN', 'BASIC-PLAIN'])!;

    expect(mech.name).toBe('SUPER-PLAIN');
});

test('Mech selection', () => {
    const factory = new SASL.Factory();
    factory.register('BASIC-PLAIN', SASL.PLAIN, 10);
    factory.register('PLAIN', SASL.PLAIN, 100);
    factory.register('SUPER-PLAIN', SASL.PLAIN, 200);

    const mech = factory.createMechanism(['BASIC-PLAIN', 'SUPER-PLAIN'])!;

    expect(mech.name).toBe('SUPER-PLAIN');
});

test('Mech selection', () => {
    const factory = new SASL.Factory();
    factory.register('BASIC-PLAIN', SASL.PLAIN, 10);
    factory.register('PLAIN', SASL.PLAIN, 100);
    factory.register('SUPER-PLAIN', SASL.PLAIN, 200);

    const mech = factory.createMechanism(['UNKNOWN', 'SUPER-PLAIN'])!;

    expect(mech.name).toBe('SUPER-PLAIN');
});

test('Mech selection', () => {
    const factory = new SASL.Factory();
    factory.register('BASIC-PLAIN', SASL.PLAIN, 10);
    factory.register('PLAIN', SASL.PLAIN, 100);
    factory.register('SUPER-PLAIN', SASL.PLAIN, 200);

    const mech = factory.createMechanism(['UNKNOWN'])!;

    expect(mech).toBeNull();
});

test('Mech disabled', () => {
    const factory = new SASL.Factory();
    factory.register('BASIC-PLAIN', SASL.PLAIN, 10);
    factory.register('PLAIN', SASL.PLAIN, 100);
    factory.register('SUPER-PLAIN', SASL.PLAIN, 200);

    factory.disable('SUPER-PLAIN');

    const mech = factory.createMechanism(['BASIC-PLAIN', 'PLAIN', 'SUPER-PLAIN'])!;

    expect(mech.name).toBe('PLAIN');
});
