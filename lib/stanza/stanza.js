var _ = require('lodash'),
    serializer = new XMLSerializer(),
    XML_NS = 'http://www.w3.org/XML/1998/namespace',
    TOP_LEVEL_LOOKUP = {},
    LOOKUP = {},
    LOOKUP_EXT = {};


var find = exports.find = function (xml, NS, selector) {
    var children = xml.querySelectorAll(selector);
    return _.filter(children, function (child) {
        return child.namespaceURI === NS && child.parentNode == xml;
    });
};

exports.init = function (self, xml, data) {
    self.xml = xml || document.createElementNS(self.NS, self.EL);
    self.xml.setAttribute('xmlns', self.NS);

    self._extensions = {};
    _.each(self.xml.childNodes, function (child) {
        var childName = child.namespaceURI + '|' + child.localName;
        var ChildStanza = LOOKUP[childName];
        if (ChildStanza !== undefined) {
            var name = ChildStanza.prototype._name;
            self._extensions[name] = new ChildStanza(null, child);
            self._extensions[name].parent = self;
        }
    });

    _.extend(self, data);
    return self;
};

exports.getSubText = function (xml, NS, element) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return '';
    }

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            return subs[i].textContent || '';
        }
    }
    
    return '';
};

exports.getMultiSubText = function (xml, NS, element, extractor) {
    var subs = find(xml, NS, element),
        results = [],
        extractor = extractor || function (sub) {
            return sub.textContent || '';
        };

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            results.push(extractor(subs[i]));
        }
    }
    
    return results;
};

exports.getSubLangText = function (xml, NS, element, defaultLang) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return {};
    }

    var results = {},
        langs = [],
        lang,
        sub;

    for (var i = 0; i < subs.length; i++) {
        sub = subs[i];
        if (sub.namespaceURI === NS) {
            lang = sub.getAttributeNS(XML_NS, 'lang') || defaultLang;
            langs.push(lang);
            results[lang] = sub.textContent || '';
        }
    }
    
    return results;
};


exports.setSubText = function (xml, NS, element, value) {
    var subs = find(xml, NS, element);
    if (!subs.length) {
        if (value) {
            var sub = document.createElementNS(NS, element);
            sub.textContent = value;
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].textContent = value;
                    return;
                } else {
                    xml.removeChild(subs[i]);
                }
            }
        }
    }
};

exports.setMultiSubText = function (xml, NS, element, value, builder) {
    var subs = find(xml, NS, element),
        values = [],
        builder = builder || function (value) {
            var sub = document.createElementNS(NS, element);
            sub.textContent = value;
            xml.appendChild(sub);
        }
    if (typeof value === 'string') {
        values = (value || '').split('\n');
    } else {
        values = value;
    }
    _.forEach(subs, function (sub) {
        xml.removeChild(sub);
    });
    _.forEach(values, function (val) {
        if (val) {
            builder(val);
        }
    });
};

exports.setSubLangText = function (xml, NS, element, value, defaultLang) {
    var subs = find(xml, NS, element),
        sub,
        lang;
    if (subs.length) {
        for (var i = 0; i < subs.length; i++) {
            sub = subs[i];
            if (sub.namespaceURI === NS) {
                xml.removeChild(sub);
            }
        }
    }

    if (typeof value === 'string') {
        sub = document.createElementNS(NS, element);
        sub.textContent = value;
        xml.appendChild(sub);
    } else if (typeof value === 'object') {
        for (lang in value) {
            if (value.hasOwnProperty(lang)) {
                sub = document.createElementNS(NS, element);
                if (lang !== defaultLang) {
                    sub.setAttributeNS(XML_NS, 'lang', lang);
                }
                sub.textContent = value[lang];
                xml.appendChild(sub);
            }
        }
    }
};

exports.getAttribute = function (xml, attr, defaultVal) {
    return xml.getAttribute(attr) || defaultVal || '';
};

exports.setAttribute = function (xml, attr, value) {
    if (value) {
        xml.setAttribute(attr, value);
    } else {
        xml.removeAttribute(attr);
    }
};

exports.getSubAttribute = function (xml, NS, sub, attr, defaultVal) {
    var subs = find(xml, NS, sub);
    if (!subs) {
        return '';
    }

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            return subs[i].getAttribute(attr) || defaultVal || '';
        }
    }
    
    return '';
};

exports.setSubAttribute = function (xml, NS, sub, attr, value) {
    var subs = find(xml, NS, sub);
    if (!subs.length) {
        if (value) {
            var sub = document.createElementNS(NS, sub);
            sub.setAttribute(attr, value);
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].setAttribute(attr, value);
                    return;
                } else {
                    subs[i].removeAttribute(attr);
                }
            }
        }
    }

    if (value) {
        xml.setAttribute(attr, value);
    } else {
        xml.removeAttribute(attr);
    }
};

exports.toString = function () {
    return serializer.serializeToString(this.xml);
};

exports.toJSON = function () {
    var result = {},
        exclude = {
            constructor: true,
            NS: true,
            EL: true,
            toString: true,
            toJSON: true,
            _extensions: true,
            prototype: true,
            xml: true,
            parent: true,
            _name: true
        },
        prop;
    for (prop in this._extensions) {
        if (this._extensions[prop].toJSON) {
            result[prop] = this._extensions[prop].toJSON();
        }
    }
    for (prop in this) {
        if (!exclude[prop] && !LOOKUP_EXT[prop] && !this._extensions[prop] && prop[0] !== '_') {
            var val = this[prop];
            if (typeof val != 'function' && ((typeof val == 'object' && Object.keys(val).length > 0) || !!val)) {
                result[prop] = val;
            }
        }
    }
    return result;
};

exports.extend = function (ParentStanza, ChildStanza) {
    var name = ChildStanza.prototype._name,
        qName = ChildStanza.prototype.NS + '|' + ChildStanza.prototype.EL;
    LOOKUP[qName] = ChildStanza;
    LOOKUP_EXT[name] = ChildStanza;

    ParentStanza.prototype.__defineGetter__(name, function () {
        if (!this._extensions[name]) {
            var existing = exports.find(this.xml, ChildStanza.prototype.NS, ChildStanza.prototype.EL);
            if (!existing.length) {
                this._extensions[name] = new ChildStanza();
                this.xml.appendChild(this._extensions[name].xml);
            } else {
                this._extensions[name] = new ChildStanza(null, existing[0]);
            }
            this._extensions[name].parent = this;
        }
        return this._extensions[name];
    });
    ParentStanza.prototype.__defineSetter__(name, function (value) {
        var child = this[name];
        _.extend(child, value);
    });
};

exports.topLevel = function (Stanza) {
    var name = Stanza.prototype.NS + '|' + Stanza.prototype.EL;
    LOOKUP[name] = Stanza;
    TOP_LEVEL_LOOKUP[name] = Stanza;
};

exports.build = function (xml) {
    var Stanza = TOP_LEVEL_LOOKUP[xml.namespaceURI + '|' + xml.localName];
    if (Stanza) {
        return new Stanza(null, xml);
    }
};

exports.XML_NS = XML_NS;
exports.TOP_LEVEL_LOOKUP = TOP_LEVEL_LOOKUP;
exports.LOOKUP_EXT = LOOKUP_EXT;
exports.LOOKUP = LOOKUP;
