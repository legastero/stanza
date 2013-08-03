var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;


function getAvatarData() {
    return stanza.getSubText(this.xml, 'urn:xmpp:avatar:data', 'data');
}

function setAvatarData(value) {
    stanza.setSubText(this.xml, 'urn:xmpp:avatar:data', 'data', value);
    stanza.setSubAttribute(this.xml, 'urn:xmpp:avatar:data', 'data', 'xmlns', 'urn:xmpp:avatar:data');
}

function getAvatars() {
    var metadata = stanza.find(this.xml, 'urn:xmpp:avatar:metadata', 'metadata'); 
    var results = [];
    if (metadata.length) {
        var avatars = stanza.find(metadata[0], 'urn:xmpp:avatar:metadata', 'info');
        _.forEach(avatars, function (info) {
            results.push(new Avatar({}, info));
        });
    }
    return results;
}

function setAvatars(value) {
    var metadata = stanza.findOrCreate(this.xml, 'urn:xmpp:avatar:metadata', 'metadata');
    stanza.setAttribute(metadata, 'xmlns', 'urn:xmpp:avatar:metadata');
    _.forEach(value, function (info) {
        var avatar = new Avatar(info);
        metadata.appendChild(avatar.xml);
    });
}


Item.prototype.__defineGetter__('avatarData', getAvatarData);
Item.prototype.__defineSetter__('avatarData', setAvatarData);
EventItem.prototype.__defineGetter__('avatarData', getAvatarData);
EventItem.prototype.__defineSetter__('avatarData', setAvatarData);

Item.prototype.__defineGetter__('avatars', getAvatars);
Item.prototype.__defineSetter__('avatars', setAvatars);
EventItem.prototype.__defineGetter__('avatars', getAvatars);
EventItem.prototype.__defineSetter__('avatars', setAvatars);



function Avatar(data, xml) {
    return stanza.init(this, xml, data);
}
Avatar.prototype = {
    constructor: {
        value: Avatar
    },
    _name: 'avatars',
    NS: 'urn:xmpp:avatar:metadata',
    EL: 'info',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get bytes() {
        return stanza.getAttribute(this.xml, 'bytes');
    },
    set bytes(value) {
        stanza.setAttribute(this.xml, 'bytes', value);
    },
    get height() {
        return stanza.getAttribute(this.xml, 'height');
    },
    set height(value) {
        stanza.setAttribute(this.xml, 'height', value);
    },
    get width() {
        return stanza.getAttribute(this.xml, 'width');
    },
    set width(value) {
        stanza.setAttribute(this.xml, 'width', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'image/png');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get url() {
        return stanza.getAttribute(this.xml, 'url');
    },
    set url(value) {
        stanza.setAttribute(this.xml, 'url', value);
    }
};


module.exports = Avatar;
