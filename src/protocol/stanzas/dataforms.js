import * as NS from '../namespaces';
import { JID } from 'xmpp-jid';

const SINGLE_FIELDS = ['text-single', 'text-private', 'list-single', 'jid-single'];

export default function(JXT) {
    const Utils = JXT.utils;

    const Field = JXT.define({
        element: 'field',
        fields: {
            desc: Utils.textSub(NS.DATAFORM, 'desc'),
            label: Utils.attribute('label'),
            name: Utils.attribute('var'),
            required: Utils.boolSub(NS.DATAFORM, 'required'),
            type: {
                get: function() {
                    return Utils.getAttribute(this.xml, 'type', 'text-single');
                },
                set: function(value) {
                    this._type = value;
                    Utils.setAttribute(this.xml, 'type', value);
                }
            },
            value: {
                get: function() {
                    const vals = Utils.getMultiSubText(this.xml, NS.DATAFORM, 'value');

                    if (this._type === 'boolean') {
                        return vals[0] === '1' || vals[0] === 'true';
                    }

                    if (vals.length > 1) {
                        if (this._type === 'text-multi') {
                            return vals.join('\n');
                        }

                        if (this._type === 'jid-multi') {
                            return vals.map(function(jid) {
                                return new JID(jid);
                            });
                        }

                        return vals;
                    }

                    if (SINGLE_FIELDS.indexOf(this._type) >= 0) {
                        if (this._type === 'jid-single') {
                            return new JID(vals[0]);
                        }

                        return vals[0];
                    }

                    return vals;
                },
                set: function(value) {
                    if (this._type === 'boolean' || value === true || value === false) {
                        const truthy = value === true || value === 'true' || value === '1';
                        const sub = Utils.createElement(NS.DATAFORM, 'value', NS.DATAFORM);
                        sub.textContent = truthy ? '1' : '0';
                        this.xml.appendChild(sub);
                    } else {
                        if (this._type === 'text-multi' && typeof value === 'string') {
                            value = value.split('\n');
                        }

                        Utils.setMultiSubText(
                            this.xml,
                            NS.DATAFORM,
                            'value',
                            value,
                            function(val) {
                                const sub = Utils.createElement(NS.DATAFORM, 'value', NS.DATAFORM);
                                sub.textContent = val;
                                this.xml.appendChild(sub);
                            }.bind(this)
                        );
                    }
                }
            }
        },
        init: function(data) {
            this._type = (data || {}).type || this.type;
        },
        name: '_field',
        namespace: NS.DATAFORM
    });

    const Option = JXT.define({
        element: 'option',
        fields: {
            label: Utils.attribute('label'),
            value: Utils.textSub(NS.DATAFORM, 'value')
        },
        name: '_formoption',
        namespace: NS.DATAFORM
    });

    const Item = JXT.define({
        element: 'item',
        name: '_formitem',
        namespace: NS.DATAFORM
    });

    const Media = JXT.define({
        element: 'media',
        fields: {
            height: Utils.numberAttribute('height'),
            width: Utils.numberAttribute('width')
        },
        name: 'media',
        namespace: NS.DATAFORM_MEDIA
    });

    const MediaURI = JXT.define({
        element: 'uri',
        fields: {
            type: Utils.attribute('type'),
            uri: Utils.text()
        },
        name: '_mediaURI',
        namespace: NS.DATAFORM_MEDIA
    });

    const Validation = JXT.define({
        element: 'validate',
        fields: {
            basic: Utils.boolSub(NS.DATAFORM_VALIDATION, 'basic'),
            dataType: Utils.attribute('datatype'),
            open: Utils.boolSub(NS.DATAFORM_VALIDATION, 'open'),
            regex: Utils.textSub(NS.DATAFORM_VALIDATION, 'regex')
        },
        name: 'validation',
        namespace: NS.DATAFORM_VALIDATION
    });

    const Range = JXT.define({
        element: 'range',
        fields: {
            max: Utils.attribute('max'),
            min: Utils.attribute('min')
        },
        name: 'range',
        namespace: NS.DATAFORM_VALIDATION
    });

    const ListRange = JXT.define({
        element: 'list-range',
        fields: {
            max: Utils.numberAttribute('max'),
            min: Utils.numberAttribute('min')
        },
        name: 'select',
        namespace: NS.DATAFORM_VALIDATION
    });

    const layoutContents = {
        get: function() {
            const result = [];
            for (let i = 0, len = this.xml.childNodes.length; i < len; i++) {
                const child = this.xml.childNodes[i];
                if (child.namespaceURI !== NS.DATAFORM_LAYOUT) {
                    continue;
                }

                switch (child.localName) {
                    case 'text':
                        result.push({
                            text: child.textContent
                        });
                        break;
                    case 'fieldref':
                        result.push({
                            field: child.getAttribute('var')
                        });
                        break;
                    case 'reportedref':
                        result.push({
                            reported: true
                        });
                        break;
                    case 'section':
                        result.push({
                            section: new Section(null, child, this).toJSON()
                        });
                        break;
                }
            }

            return result;
        },
        set: function(values) {
            for (let i = 0, len = values.length; i < len; i++) {
                const value = values[i];
                if (value.text) {
                    const text = Utils.createElement(
                        NS.DATAFORM_LAYOUT,
                        'text',
                        NS.DATAFORM_LAYOUT
                    );
                    text.textContent = value.text;
                    this.xml.appendChild(text);
                }
                if (value.field) {
                    const field = Utils.createElement(
                        NS.DATAFORM_LAYOUT,
                        'fieldref',
                        NS.DATAFORM_LAYOUT
                    );
                    field.setAttribute('var', value.field);
                    this.xml.appendChild(field);
                }
                if (value.reported) {
                    this.xml.appendChild(
                        Utils.createElement(NS.DATAFORM_LAYOUT, 'reportedref', NS.DATAFORM_LAYOUT)
                    );
                }
                if (value.section) {
                    const sectionXML = Utils.createElement(
                        NS.DATAFORM_LAYOUT,
                        'section',
                        NS.DATAFORM_LAYOUT
                    );
                    this.xml.appendChild(sectionXML);

                    const section = new Section(null, sectionXML);
                    section.label = value.section.label;
                    section.contents = value.section.contents;
                }
            }
        }
    };

    const Section = JXT.define({
        element: 'section',
        fields: {
            contents: layoutContents,
            label: Utils.attribute('label')
        },
        name: '_section',
        namespace: NS.DATAFORM_LAYOUT
    });

    const Page = JXT.define({
        element: 'page',
        fields: {
            contents: layoutContents,
            label: Utils.attribute('label')
        },
        name: '_page',
        namespace: NS.DATAFORM_LAYOUT
    });

    const DataForm = JXT.define({
        element: 'x',
        fields: {
            instructions: Utils.multiTextSub(NS.DATAFORM, 'instructions'),
            reportedFields: Utils.subMultiExtension(NS.DATAFORM, 'reported', Field),
            title: Utils.textSub(NS.DATAFORM, 'title'),
            type: Utils.attribute('type', 'form')
        },
        init: function() {
            // Propagate reported field types to items
            if (!this.reportedFields.length) {
                return;
            }

            const fieldTypes = {};

            for (const reported of this.reportedFields) {
                fieldTypes[reported.name] = reported.type;
            }

            for (const item of this.items) {
                for (const field of item.fields) {
                    field.type = field._type = fieldTypes[field.name];
                }
            }
        },
        name: 'form',
        namespace: NS.DATAFORM
    });

    JXT.extend(DataForm, Field, 'fields');
    JXT.extend(DataForm, Item, 'items');
    JXT.extend(DataForm, Page, 'layout');

    JXT.extend(Field, Media);
    JXT.extend(Field, Validation);
    JXT.extend(Field, Option, 'options');

    JXT.extend(Item, Field, 'fields');

    JXT.extend(Media, MediaURI, 'uris');
    JXT.extend(Validation, Range);
    JXT.extend(Validation, ListRange);

    JXT.extendMessage(DataForm);
}
