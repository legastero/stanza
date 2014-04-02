"use strict";

var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Message = require('./message');

var NS = 'jabber:x:data';

exports.DataForm = stanza.define({
    name: 'form',
    namespace: NS,
    element: 'x',
    fields: {
        title: stanza.subText(NS, 'title'),
        instructions: stanza.multiSubText(NS, 'instructions'),
        type: stanza.attribute('type', 'form')
    }
});

exports.Field = stanza.define({
    name: '_field',
    namespace: NS,
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
        desc: stanza.subText(NS, 'desc'),
        required: stanza.boolSub(NS, 'required'),
        label: stanza.attribute('label'),
        value: {
            get: function () {
                var vals = stanza.getMultiSubText(this.xml, this._NS, 'value');
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
                    stanza.setSubText(this.xml, this._NS, 'value', value ? '1' : '0');
                } else {
                    if (this._type === 'text-multi') {
                        value = value.split('\n');
                    }
                    stanza.setMultiSubText(this.xml, this._NS, 'value', value);
                }
            }
        },
        options: {
            get: function () {
                var self = this;
                return stanza.getMultiSubText(this.xml, this._NS, 'option', function (sub) {
                    return stanza.getSubText(sub, self._NS, 'value');
                });
            },
            set: function (value) {
                var self = this;
                stanza.setMultiSubText(this.xml, this._NS, 'option', value, function (val) {
                    var opt = stanza.createElement(self._NS, 'option', self._NS);
                    var value = stanza.createElement(self._NS, 'value', self._NS);

                    opt.appendChild(value);
                    value.textContent = val;
                    self.xml.appendChild(opt);
                });
            }
        }
    }
});


stanza.extend(Message, exports.DataForm);
stanza.extend(exports.DataForm, exports.Field, 'fields');
