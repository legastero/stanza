'use strict';

var stanza = require('jxt');
var Message = require('./message');

var FORM_NS = 'jabber:x:data';
var MEDIA_NS = 'urn:xmpp:media-element';


exports.DataForm = stanza.define({
    name: 'form',
    namespace: FORM_NS,
    element: 'x',
    fields: {
        title: stanza.subText(FORM_NS, 'title'),
        instructions: stanza.multiSubText(FORM_NS, 'instructions'),
        type: stanza.attribute('type', 'form')
    }
});

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
                    return vals;
                }
                return vals[0];
            },
            set: function (value) {
                if (this._type === 'boolean') {
                    stanza.setSubText(this.xml, FORM_NS, 'value', value ? '1' : '0');
                } else {
                    if (this._type === 'text-multi') {
                        value = value.split('\n');
                    }
                    stanza.setMultiSubText(this.xml, FORM_NS, 'value', value);
                }
            }
        },
        options: {
            get: function () {
                return stanza.getMultiSubText(this.xml, FORM_NS, 'option', function (sub) {
                    return stanza.getSubText(sub, FORM_NS, 'value');
                });
            },
            set: function (value) {
                var self = this;
                stanza.setMultiSubText(this.xml, FORM_NS, 'option', value, function (val) {
                    var opt = stanza.createElement(FORM_NS, 'option', FORM_NS);
                    var value = stanza.createElement(FORM_NS, 'value', FORM_NS);

                    opt.appendChild(value);
                    value.textContent = val;
                    self.xml.appendChild(opt);
                });
            }
        }
    }
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


stanza.extend(Message, exports.DataForm);
stanza.extend(exports.DataForm, exports.Field, 'fields');
stanza.extend(exports.Field, exports.Media);
stanza.extend(exports.Media, exports.MediaURI, 'uris');
