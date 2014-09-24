'use strict';

var stanza = require('jxt');
var Message = require('./message');
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


exports.Field = stanza.define({
    name: '_field',
    namespace: FORM_NS,
    element: 'field',
    init: function (data) {
        this._type = (data || {}).type || this.type;
    },
    fields: {
        type: {
            get: function () {
                return stanza.getAttribute(this.xml, 'type', 'text-single');
            },
            set: function (value) {
                this._type = value;
                stanza.setAttribute(this.xml, 'type', value);
            }
        },
        name: stanza.attribute('var'),
        desc: stanza.subText(FORM_NS, 'desc'),
        required: stanza.boolSub(FORM_NS, 'required'),
        label: stanza.attribute('label'),
        value: {
            get: function () {
                var vals = stanza.getMultiSubText(this.xml, FORM_NS, 'value');
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
                    stanza.setSubText(this.xml, FORM_NS, 'value', truthy ? '1' : '0');
                } else {
                    if (this._type === 'text-multi' && typeof(value) === 'string') {
                        value = value.split('\n');
                    }
                    stanza.setMultiSubText(this.xml, FORM_NS, 'value', value);
                }
            }
        }
    }
});

exports.Option = stanza.define({
    name: '_formoption',
    namespace: FORM_NS,
    element: 'option',
    fields: {
        label: stanza.attribute('label'),
        value: stanza.subText(FORM_NS, 'value')
    }
});

exports.Item = stanza.define({
    name: '_formitem',
    namespace: FORM_NS,
    element: 'item'
});

exports.Media = stanza.define({
    name: 'media',
    element: 'media',
    namespace: MEDIA_NS,
    fields: {
        height: stanza.numberAttribute('height'),
        width: stanza.numberAttribute('width')
    }
});

exports.MediaURI = stanza.define({
    name: '_mediaURI',
    element: 'uri',
    namespace: MEDIA_NS,
    fields: {
        uri: stanza.text(),
        type: stanza.attribute('type')
    }
});

exports.Validation = stanza.define({
    name: 'validation',
    element: 'validate',
    namespace: VALIDATE_NS,
    fields: {
        dataType: stanza.attribute('datatype'),
        basic: stanza.boolSub(VALIDATE_NS, 'basic'),
        open: stanza.boolSub(VALIDATE_NS, 'open'),
        regex: stanza.subText(VALIDATE_NS, 'regex')
    }
});

exports.Range = stanza.define({
    name: 'range',
    element: 'range',
    namespace: VALIDATE_NS,
    fields: {
        min: stanza.attribute('min'),
        max: stanza.attribute('max')
    }
});

exports.ListRange = stanza.define({
    name: 'select',
    element: 'list-range',
    namespace: VALIDATE_NS,
    fields: {
        min: stanza.numberAttribute('min'),
        max: stanza.numberAttribute('max')
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
                        section: new exports.Section(null, child, this).toJSON()
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

                var section = new exports.Section(null, sectionXML);
                section.label = value.section.label;
                section.contents = value.section.contents;
            }
        }
    }
};

exports.Section = stanza.define({
    name: '_section',
    element: 'section',
    namespace: LAYOUT_NS,
    fields: {
        label: stanza.attribute('label'),
        contents: layoutContents
    }
});

exports.Page = stanza.define({
    name: '_page',
    element: 'page',
    namespace: LAYOUT_NS,
    fields: {
        label: stanza.attribute('label'),
        contents: layoutContents
    }
});
 
exports.DataForm = stanza.define({
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
        title: stanza.subText(FORM_NS, 'title'),
        instructions: stanza.multiSubText(FORM_NS, 'instructions'),
        type: stanza.attribute('type', 'form'),
        reportedFields: stanza.subMultiExtension(FORM_NS, 'reported', exports.Field)
    }
});


stanza.extend(Message, exports.DataForm);
stanza.extend(exports.DataForm, exports.Field, 'fields');
stanza.extend(exports.DataForm, exports.Item, 'items');
stanza.extend(exports.DataForm, exports.Page, 'layout');

stanza.extend(exports.Field, exports.Media);
stanza.extend(exports.Field, exports.Validation);
stanza.extend(exports.Field, exports.Option, 'options');

stanza.extend(exports.Item, exports.Field, 'fields');

stanza.extend(exports.Media, exports.MediaURI, 'uris');
stanza.extend(exports.Validation, exports.Range);
stanza.extend(exports.Validation, exports.ListRange);
