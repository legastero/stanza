import { mergeFields } from '../../src/helpers/DataForms';
import { DataForm } from '../../src/protocol';

test('DataForm merge distinct fields', () => {
    const form1: DataForm = {
        fields: [
            {
                name: 'test-1',
                value: 'a'
            }
        ]
    };
    const form2: DataForm = {
        fields: [
            {
                name: 'test-2',
                value: 'b'
            }
        ]
    };
    const form3: DataForm = {
        fields: mergeFields(form1.fields!, form2.fields!)
    };

    expect(form3).toStrictEqual({
        fields: [
            {
                name: 'test-1',
                value: 'a'
            },
            {
                name: 'test-2',
                value: 'b'
            }
        ]
    });
});

test('DataForm merge fields with same name', () => {
    const form1: DataForm = {
        fields: [
            {
                name: 'test-1',
                value: 'a'
            }
        ]
    };
    const form2: DataForm = {
        fields: [
            {
                name: 'test-1',
                value: 'b'
            }
        ]
    };
    const form3: DataForm = {
        fields: mergeFields(form1.fields!, form2.fields!)
    };

    expect(form3).toStrictEqual({
        fields: [
            {
                name: 'test-1',
                value: 'b'
            }
        ]
    });
});
