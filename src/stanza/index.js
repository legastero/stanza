var _ = require('underscore'),
    ltx = require('ltx');

var spec = {},
    lookup = {};

function getName(elName, namespace) {
    namespace = namespace || 'jabber:client';
    return lookup['{'+namespace+'}'+elName];
}

exports.define = function (name, elName, namespace, stanzaSpec) {
    if (typeof elName === 'string') {
        elName = [elName];
    }
    spec[name] = {
        el: elName[0],
        namespace: namespace,
        fields: stanzaSpec
    };
    _.forEach(elName, function (el) {
        exports.alias(name, elName, namespace);
    });
};

exports.extend = function (name, extension, stanzaSpec) {
    spec[name].fields[extension] = stanzaSpec;
};

exports.alias = function (name, elName, namespace) {
    lookup['{'+namespace+'}'+elName] = name;
};

exports.xml = function (json) {
    var contentType = json._;

    console.log('>>> JSON->XML: ' + contentType);

    var result = new ltx.Element(spec[contentType].el, {
        xmlns: spec[contentType].namespace
    });

    for (var key in spec[contentType].fields) {
        var value = json[key] || spec[contentType].fields[key].default;
        if (value) {
            if (spec[contentType].fields[key].xml) {
                result = spec[contentType].fields[key].xml(result, value);
            }
        }
    }

    return result;
};

exports.json = function (xml) {
    var contentType = getName(xml.name, xml.findNS());

    console.log('>>> XML->JSON: ' + contentType);

    var result = {
        _: contentType
    };

    if (!spec[contentType]) {
        return result;
    }

    for (var key in spec[contentType].fields) {
        if (spec[contentType].fields[key].json) {
            result = spec[contentType].fields[key].json(result, xml);
        }
        if (!result[key]) {
            var def = spec[contentType].fields[key].default;
            if (def) {
                result[key] = def;
            } else { 
                delete result[key];
            }
        }
    }
    return result;
};

// Include pre-defined stanzas
var message = require('./message').Message,
    presence = require('./presence').Presence,
    iq = require('./iq').Iq,
    error = require('./error').Error,
    roster = require('./roster').Roster;

message(exports);
presence(exports);
iq(exports);
error(exports);
roster(exports);
