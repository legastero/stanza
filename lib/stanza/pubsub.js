var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Iq = require('./iq');
var Message = require('./message');
var Form = require('./dataforms').DataForm;
var RSM = require('./rsm');
var JID = require('../jid');


function Pubsub(data, xml) {
    return stanza.init(this, xml, data);
}
Pubsub.prototype = {
    constructor: {
        value: Pubsub
    },
    _name: 'pubsub',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'pubsub',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get publishOptions() {
        var conf = stanza.find(this.xml, this.NS, 'publish-options');
        if (conf.length && conf[0].childNodes.length) {
            return new Form({}, conf[0].childNodes[0]);
        }
    },
    set publishOptions(value) {
        var conf = stanza.findOrCreate(this.xml, this.NS, 'publish-options');
        if (value) {
            var form = new Form(value);
            conf.appendChild(form.xml);
        }
    }
};


function PubsubOwner(data, xml) {
    return stanza.init(this, xml, data);
}
PubsubOwner.prototype = {
    constructor: {
        value: PubsubOwner
    },
    _name: 'pubsubOwner',
    NS: 'http://jabber.org/protocol/pubsub#owner',
    EL: 'pubsub',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get create() {
        return stanza.getSubAttribute(this.xml, this.NS, 'create', 'node');
    },
    set create(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'create', 'node', value);
    },
    get purge() {
        return stanza.getSubAttribute(this.xml, this.NS, 'purge', 'node');
    },
    set purge(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'purge', 'node', value);
    },
    get del() {
        return stanza.getSubAttribute(this.xml, this.NS, 'delete', 'node');
    },
    set del(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'delete', 'node', value);
    },
    get redirect() {
        var del = stanza.find(this.xml, this.NS, 'delete');
        if (del.length) {
            return stanza.getSubAttribute(del, this.NS, 'redirect', 'uri');
        }
        return '';
    },
    set redirect(value) {
        var del = stanza.findOrCreate(this.xml, this.NS, 'delete');
        stanza.setSubAttribute(del, this.NS, 'redirect', 'uri', value);
    }
};


function Configure(data, xml) {
    return stanza.init(this, xml, data);
}
Configure.prototype = {
    constructor: {
        value: Configure
    },
    _name: 'config',
    NS: 'http://jabber.org/protocol/pubsub#owner',
    EL: 'configure',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    }
};


function Event(data, xml) {
    return stanza.init(this, xml, data);
}
Event.prototype = {
    constructor: {
        value: Event
    },
    _name: 'event',
    NS: 'http://jabber.org/protocol/pubsub#event',
    EL: 'event',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Subscribe(data, xml) {
    return stanza.init(this, xml, data);
}
Subscribe.prototype = {
    constructor: {
        value: Subscribe
    },
    _name: 'subscribe',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'subscribe',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get jid() {
        return new JID(stanza.getAttribute(this.xml, 'jid'));
    },
    set jid(value) {
        stanza.setAttribute(this.xml, 'jid', value.toString());
    }
};


function Subscription(data, xml) {
    return stanza.init(this, xml, data);
}
Subscription.prototype = {
    constructor: {
        value: Subscription
    },
    _name: 'subscription',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'subscription',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get jid() {
        return new JID(stanza.getAttribute(this.xml, 'jid'));
    },
    set jid(value) {
        stanza.setAttribute(this.xml, 'jid', value.toString());
    },
    get subid() {
        return stanza.getAttribute(this.xml, 'subid');
    },
    set subid(value) {
        stanza.setAttribute(this.xml, 'subid', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'subscription');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'subscription', value);
    }
};


function Unsubscribe(data, xml) {
    return stanza.init(this, xml, data);
}
Unsubscribe.prototype = {
    constructor: {
        value: Unsubscribe
    },
    _name: 'unsubscribe',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'unsubscribe',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get jid() {
        return new JID(stanza.getAttribute(this.xml, 'jid'));
    },
    set jid(value) {
        stanza.setAttribute(this.xml, 'jid', value.toString());
    }
};


function Publish(data, xml) {
    return stanza.init(this, xml, data);
}
Publish.prototype = {
    constructor: {
        value: Publish
    },
    _name: 'publish',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'publish',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get item() {
        var items = this.items;
        if (items.length) {
            return items[0];
        }
    },
    set item(value) {
        this.items = [value];
    }
};


function Retract(data, xml) {
    return stanza.init(this, xml, data);
}
Retract.prototype = {
    constructor: {
        value: Retract 
    },
    _name: 'retract',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'retract',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get notify() {
        var notify = stanza.getAttribute(this.xml, 'notify');
        return notify === 'true' || notify === '1';
    },
    set notify(value) {
        if (value) {
            value = '1';
        }
        stanza.setAttribute(this.xml, 'notify', value);
    },
    get id() {
        return stanza.getSubAttribute(this.xml, this.NS, 'item', 'id');
    },
    set id(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'item', 'id', value);
    }
};


function Retrieve(data, xml) {
    return stanza.init(this, xml, data);
}
Retrieve.prototype = {
    constructor: {
        value: Retrieve
    },
    _name: 'retrieve',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'items',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get max() {
        return stanza.getAttribute(this.xml, 'max_items');
    },
    set max(value) {
        stanza.setAttribute(this.xml, 'max_items', value);
    }
};


function Item(data, xml) {
    return stanza.init(this, xml, data);
}
Item.prototype = {
    constructor: {
        value: Item 
    },
    _name: 'item',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'item',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


function EventItems(data, xml) {
    return stanza.init(this, xml, data);
}
EventItems.prototype = {
    constructor: {
        value: EventItems
    },
    _name: 'updated',
    NS: 'http://jabber.org/protocol/pubsub#event',
    EL: 'items',
    toString: stanza.toString,
    toJSON: function () {
        var json = stanza.toJSON.apply(this);
        var items = [];
        _.forEach(json.published, function (item) {
            items.push(item.toJSON());
        });
        json.published = items;
        return json;
    },
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get published() {
        var results = [];
        var items = stanza.find(this.xml, this.NS, 'item');

        _.forEach(items, function (xml) {
            results.push(new EventItem({}, xml));
        });
        return results;
    },
    set published(value) {
        var self = this;
        _.forEach(value, function (data) {
            var item = new EventItem(data);
            this.xml.appendChild(item.xml);
        });
    },
    get retracted() {
        var results = [];
        var retracted = stanza.find(this.xml, this.NS, 'retract');

        _.forEach(retracted, function (xml) {
            results.push(xml.getAttribute('id'));
        });
        return results;
    },
    set retracted(value) {
        var self = this;
        _.forEach(value, function (id) {
            var retracted = document.createElementNS(self.NS, 'retract');
            retracted.setAttribute('id', id);
            this.xml.appendChild(retracted);
        });
    }
};


function EventItem(data, xml) {
    return stanza.init(this, xml, data);
}
EventItem.prototype = {
    constructor: {
        value: EventItem
    },
    _name: 'eventItem',
    NS: 'http://jabber.org/protocol/pubsub#event',
    EL: 'item',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get publisher() {
        return stanza.getAttribute(this.xml, 'publisher');
    },
    set publisher(value) {
        stanza.setAttribute(this.xml, 'publisher', value);
    }
};


stanza.extend(Pubsub, Subscribe);
stanza.extend(Pubsub, Unsubscribe);
stanza.extend(Pubsub, Publish);
stanza.extend(Pubsub, Retrieve);
stanza.extend(Pubsub, Subscription);
stanza.extend(PubsubOwner, Configure);
stanza.extend(Publish, Item);
stanza.extend(Configure, Form);
stanza.extend(Pubsub, RSM);
stanza.extend(Event, EventItems);
stanza.extend(Message, Event);
stanza.extend(Iq, Pubsub);
stanza.extend(Iq, PubsubOwner);

exports.Pubsub = Pubsub;
exports.Item = Item;
exports.EventItem = EventItem;
