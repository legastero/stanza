function JID(jid) {
    this.jid = jid;
    this.parts = {};
}

JID.prototype = {
    constructor: {
        value: JID
    },
    toString: function () {
        return this.jid;
    },
    get full() {
        return this.jid;
    },
    get bare() {
        if (this.parts.bare) {
            return this.parts.bare;
        }

        var split = this.jid.indexOf('/');
        if (split > 0) {
            this.parts.bare = this.jid.slice(0, split);
        } else {
            this.parts.bare = this.jid;
        }
        return this.parts.bare;
    },
    get resource() {
        if (this.parts.resource) {
            return this.parts.resource;
        }

        var split = this.jid.indexOf('/');
        if (split > 0) {
            this.parts.resource = this.jid.slice(split + 1);
        } else {
            this.parts.resource = '';
        }
        return this.parts.resource;
    },
    get local() {
        if (this.parts.local) {
            return this.parts.local;
        }

        var bare = this.bare;
        var split = bare.indexOf('@');
        if (split > 0) {
            this.parts.local = bare.slice(0, split);
        } else {
            this.parts.local = bare;
        }

        return this.parts.local;
    },
    get domain() {
        if (this.parts.domain) {
            return this.parts.domain;
        }

        var bare = this.bare;
        var split = bare.indexOf('@');
        if (split > 0) {
            this.parts.domain = bare.slice(split + 1);
        } else {
            this.parts.domain = bare;
        }

        return this.parts.domain;
    }
};


module.exports = JID;
