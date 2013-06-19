var _ = require('lodash'),
    stanza = require('./stanza'),
    Message = require('./message');


function DataForm(data, xml) {
    return stanza.init(this, xml, data);
}
DataForm.prototype = {
    constructor: {
        value: DataForm 
    },
    NS: 'jabber:x:data',
    EL: 'x',
    _name: 'form',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get title() {
        return stanza.getSubText(this.xml, this.NS, 'title');
    },
    set title(value) {
        stanza.setSubText(this.xml, this.NS, 'title', value);
    },
    get instructions() {
        return stanza.getMultiSubText(this.xml, this.NS, 'title').join('\n');
    },
    set instructions(value) {
        stanza.setMultiSubText(this.xml, this.NS, 'title', value.split('\n'));
    },
    get type() {
        return this.xml.getAttribute('type') || 'form';
    },
    set type(value) {
        this.xml.setAttribute('type', value);
    },
    get fields() {
        var fields = stanza.find(this.xml, this.NS, 'field'),
            results = [];
        _.forEach(fields, function (field) {
            results.push(new Field({}, field).toJSON());
        });
        return results;
    },
    set fields(value) {
        var self = this;
        _.forEach(value, function (field) {
            self.addField(field); 
        });
    },
    addField: function (opts) {
        var field = new Field(opts);
        this.xml.appendChild(field.xml);
    },
};


function Field(data, xml) {
    stanza.init(this, xml, data);
    this._type = data.type || this.type;
    return this;
}
Field.prototype = {
    constructor: {
        value: Field
    },
    NS: 'jabber:x:data',
    EL: 'field',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get type() {
        return this.xml.getAttribute('type') || 'text-single';
    },
    set type(value) {
        this._type = value;
        this.xml.setAttribute('type', value);
    },
    get name() {
        return this.xml.getAttribute('var') || '';
    },
    set name(value) {
        this.xml.setAttribute('var', value);
    },
    get desc() {
        return stanza.getSubText(this.xml, this.NS, 'desc');
    },
    set desc(value) {
        stanza.setSubText(this.xml, this.NS, 'desc', value);
    },
    get value() {
        var vals = stanza.getMultiSubText(this.xml, this.NS, 'value');
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
    set value(value) {
        if (this._type === 'boolean') {
            stanza.setSubText(this.xml, this.NS, 'value', value ? '1' : '0');
        } else {
            if (this._type === 'text-multi') {
                value = value.split('\n');
            }
            stanza.setMultiSubText(this.xml, this.NS, 'value', value);
        }
    },
    get required() {
        var req = stanza.find(this.xml, this.NS, 'required');
        return req.length > 0;
    },
    set required(value) {
        var reqs = stanza.find(this.xml, this.NS, 'required');
        if (value && reqs.length === 0) {
            var req = document.createElementNS(this.NS, 'required');
            this.xml.appendChild(req);
        } else if (!value && reqs.length > 0) {
            _.forEach(reqs, function (req) {
                this.xml.removeChild(req);
            });
        }
    },
    get label() {
        return this.xml.getAttribute('label') || '';
    },
    set label(value) {
        this.xml.setAttribute('label', value);
    },
    get options() {
        var self = this;
        return stanza.getMultiSubText(this.xml, this.NS, 'option', function (sub) {
            return stanza.getSubText(sub, self.NS, 'value');
        });
    },
    set options(value) {
        var self = this;
        stanza.setMultiSubText(this.xml, this.NS, 'option', value, function (val) {
            var opt = document.createElementNS(self.NS, 'option'),
                value = document.createElementNS(self.NS, 'value');
            opt.appendChild(value);
            value.textContent = val;
            self.xml.appendChild(opt);
        });
    }
};


stanza.extend(Message, DataForm);


exports.DataForm = DataForm;
exports.Field = Field;
