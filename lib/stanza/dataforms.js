'use strict';

var JID = require('xmpp-jid').JID;

var FORM_NS = 'jabber:x:data';
var MEDIA_NS = 'urn:xmpp:media-element';
var VALIDATE_NS = 'http://jabber.org/protocol/xdata-validate';
var LAYOUT_NS = 'http://jabber.org/protocol/xdata-layout';

var SINGLE_FIELDS = [
    'text-single',
    'text-private',
    'list-single',
    'jid-single'
];


module.exports = function (stanza) {
    var types = stanza.utils;

    var Field = stanza.define({
        name: '_field',
        namespace: FORM_NS,
        element: 'field',
        init: function (data) {
            this._type = (data || {}).type || this.type;
        },
        fields: {
            type: {
                get: function () {
                    return types.getAttribute(this.xml, 'type', 'text-single');
                },
                set: function (value) {
                    this._type = value;
                    types.setAttribute(this.xml, 'type', value);
                }
            },
            name: types.attribute('var'),
            desc: types.textSub(FORM_NS, 'desc'),
            required: types.boolSub(FORM_NS, 'required'),
            label: types.attribute('label'),
            value: {
                get: function () {
                    var vals = types.getMultiSubText(this.xml, FORM_NS, 'value');
                    if (this._type === 'boolean') {
                        return vals[0] === '1' || vals[0] === 'true';
                    }
                    if (vals.length > 1) {
                        if (this._type === 'text-multi') {
                            return vals.join('\n');
                        }
    
                        if (this._type === 'jid-multi') {
                            return vals.map(function (jid) {
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
                set: function (value) {
                    if (this._type === 'boolean') {
                        var truthy = value === true || value === 'true' || value === '1';
                        types.setSubText(this.xml, FORM_NS, 'value', truthy ? '1' : '0');
                    } else {
                        if (this._type === 'text-multi' && typeof(value) === 'string') {
                            value = value.split('\n');
                        }
                        types.setMultiSubText(this.xml, FORM_NS, 'value', value);
                    }
                }
            }
        }
    });
    
    var Option = stanza.define({
        name: '_formoption',
        namespace: FORM_NS,
        element: 'option',
        fields: {
            label: types.attribute('label'),
            value: types.textSub(FORM_NS, 'value')
        }
    });
    
    var Item = stanza.define({
        name: '_formitem',
        namespace: FORM_NS,
        element: 'item'
    });
    
    var Media = stanza.define({
        name: 'media',
        element: 'media',
        namespace: MEDIA_NS,
        fields: {
            height: types.numberAttribute('height'),
            width: types.numberAttribute('width')
        }
    });
    
    var MediaURI = stanza.define({
        name: '_mediaURI',
        element: 'uri',
        namespace: MEDIA_NS,
        fields: {
            uri: types.text(),
            type: types.attribute('type')
        }
    });
    
    var Validation = stanza.define({
        name: 'validation',
        element: 'validate',
        namespace: VALIDATE_NS,
        fields: {
            dataType: types.attribute('datatype'),
            basic: types.boolSub(VALIDATE_NS, 'basic'),
            open: types.boolSub(VALIDATE_NS, 'open'),
            regex: types.textSub(VALIDATE_NS, 'regex')
        }
    });
    
    var Range = stanza.define({
        name: 'range',
        element: 'range',
        namespace: VALIDATE_NS,
        fields: {
            min: types.attribute('min'),
            max: types.attribute('max')
        }
    });
    
    var ListRange = stanza.define({
        name: 'select',
        element: 'list-range',
        namespace: VALIDATE_NS,
        fields: {
            min: types.numberAttribute('min'),
            max: types.numberAttribute('max')
        }
    });
    
    var layoutContents = {
        get: function () {
            var result = [];
            for (var i = 0, len = this.xml.childNodes.length; i < len; i++) {
                var child = this.xml.childNodes[i];
                if (child.namespaceURI !== LAYOUT_NS) {
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
        set: function (values) {
            for (var i = 0, len = values.length; i < len; i++) {
                var value = values[i];
                if (value.text) {
                    var text = stanza.createElement(LAYOUT_NS, 'text', LAYOUT_NS);
                    text.textContent = value.text;
                    this.xml.appendChild(text);
                }
                if (value.field) {
                    var field = stanza.createElement(LAYOUT_NS, 'fieldref', LAYOUT_NS);
                    field.setAttribute('var', value.field);
                    this.xml.appendChild(field);
                }
                if (value.reported) {
                    this.xml.appendChild(stanza.createElement(LAYOUT_NS, 'reportedref', LAYOUT_NS));
                }
                if (value.section) {
                    var sectionXML = stanza.createElement(LAYOUT_NS, 'section', LAYOUT_NS);
                    this.xml.appendChild(sectionXML);
    
                    var section = new Section(null, sectionXML);
                    section.label = value.section.label;
                    section.contents = value.section.contents;
                }
            }
        }
    };
    
    var Section = stanza.define({
        name: '_section',
        element: 'section',
        namespace: LAYOUT_NS,
        fields: {
            label: types.attribute('label'),
            contents: layoutContents
        }
    });
    
    var Page = stanza.define({
        name: '_page',
        element: 'page',
        namespace: LAYOUT_NS,
        fields: {
            label: types.attribute('label'),
            contents: layoutContents
        }
    });
 
    var DataForm = stanza.define({
        name: 'form',
        namespace: FORM_NS,
        element: 'x',
        init: function () {
            // Propagate reported field types to items
    
            if (!this.reportedFields.length) {
                return;
            }
    
            var fieldTypes = {};
            this.reportedFields.forEach(function (reported) {
                fieldTypes[reported.name] = reported.type;
            });
            this.items.forEach(function (item) {
                item.fields.forEach(function (field) {
                    field.type = field._type = fieldTypes[field.name];
                });
            });
        },
        fields: {
            title: types.textSub(FORM_NS, 'title'),
            instructions: types.multiTextSub(FORM_NS, 'instructions'),
            type: types.attribute('type', 'form'),
            reportedFields: types.subMultiExtension(FORM_NS, 'reported', Field)
        }
    });
    
    
    stanza.extend(DataForm, Field, 'fields');
    stanza.extend(DataForm, Item, 'items');
    stanza.extend(DataForm, Page, 'layout');

    stanza.extend(Field, Media);
    stanza.extend(Field, Validation);
    stanza.extend(Field, Option, 'options');
    
    stanza.extend(Item, Field, 'fields');
    
    stanza.extend(Media, MediaURI, 'uris');
    stanza.extend(Validation, Range);
    stanza.extend(Validation, ListRange);

    stanza.withMessage(function (Message) {
        stanza.extend(Message, DataForm);
    });
};
