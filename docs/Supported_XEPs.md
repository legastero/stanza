# Supported XEPs

- [XEP-0004: Data Forms](http://xmpp.org/extensions/xep-0004.html)
- [XEP-0030: Service Discovery](http://xmpp.org/extensions/xep-0030.html)
- [XEP-0045: Multi-User Chat](http://xmpp.org/extensions/xep-0045.html)
- [XEP-0048: Bookmarks](http://xmpp.org/extensions/xep-0048.html)

    Using private XML storage.

- [XEP-0049: Private XML Storage](http://xmpp.org/extensions/xep-0049.html)
- [XEP-0050: Ad-Hoc Commands](http://xmpp.org/extensions/xep-0050.html)

    Partial support, for discovering available commands.

- [XEP-0054: vcard-temp](http://xmpp.org/extensions/xep-0054.html)

    Partial support, for the most common vCard fields.

- [XEP-0059: Result Set Management](http://xmpp.org/extensions/xep-0059.html)
- [XEP-0060: Publish-Subscribe](http://xmpp.org/extensions/xep-0060.html)
- [XEP-0066: Out of Band Data](http://xmpp.org/extensions/xep-0066.html)
- [XEP-0077: In-Band Registration](http://xmpp.org/extensions/xep-0077.html)

    Support for registering/unregistering with services, and retrieving/updating your XMPP account information. Does **NOT** support in-band registration for new XMPP accounts.

- [XEP-0080: User Location](http://xmpp.org/extensions/xep-0080.html)
- [XEP-0082: XMPP Date and Time Profiles](http://xmpp.org/extensions/xep-0082.html)
- [XEP-0084: User Avatar](http://xmpp.org/extensions/xep-0084.html)
- [XEP-0085: Chat State Notifications](http://xmpp.org/extensions/xep-0085.html)
- [XEP-0092: Software Version](http://xmpp.org/extensions/xep-0092.html)
- [XEP-0106: JID Escaping](http://xmpp.org/extensions/xep-0106.html)
- [XEP-0107: User Mood](http://xmpp.org/extensions/xep-0107.html)
- [XEP-0115: Entity Capabilities](http://xmpp.org/extensions/xep-0115.html)
- [XEP-0118: User Tune](http://xmpp.org/extensions/xep-0118.html)
- [XEP-0122: Data Forms Validation](http://xmpp.org/extensions/xep-0122.html)
- [XEP-0124: Bidirectional-streams Over Synchronous HTTP (BOSH)](http://xmpp.org/extensions/xep-0124.html)
- [XEP-0128: Service Discovery Extensions](http://xmpp.org/extensions/xep-0128.html)
- [XEP-0131: Stanza Headers and Internet Metadata](http://xmpp.org/extensions/xep-0131.html)
- [XEP-0141: Data Forms Layout](http://xmpp.org/extensions/xep-0141.html)
- [XEP-0152: Reachability Addresses](http://xmpp.org/extensions/xep-0152.html)
- [XEP-0153: vCard-Based Avatars](http://xmpp.org/extensions/xep-0153.html)

    Read only support. Use XEP-0084 instead for setting user avatars.

- [XEP-0156: Discovering Alternative XMPP Connection Methods](http://xmpp.org/extensions/xep-0156.html)

    Support for the HTTP discovery method.

- [XEP-0163: Personal Eventing Protocol](http://xmpp.org/extensions/xep-0163.html)
- [XEP-0166: Jingle](http://xmpp.org/extensions/xep-0166.html)
- [XEP-0167: Jingle RTP Sesssions](http://xmpp.org/extensions/xep-0167.html)
- [XEP-0172: User Nickname](http://xmpp.org/extensions/xep-0172.html)
- [XEP-0176: Jingle ICE-UDP Transport Method](http://xmpp.org/extensions/xep-0176.html)
- [XEP-0184: Message Delivery Receipts](http://xmpp.org/extensions/xep-0184.html)
- [XEP-0186: Invisible Command](http://xmpp.org/extensions/xep-0186.html)
- [XEP-0191: Blocking Command](http://xmpp.org/extensions/xep-0191.html)
- [XEP-0198: Stream Management](http://xmpp.org/extensions/xep-0198.html)
- [XEP-0199: XMPP Ping](http://xmpp.org/extensions/xep-0199.html)
- [XEP-0202: Entity Time](http://xmpp.org/extensions/xep-0202.html)
- [XEP-0203: Delayed Delivery](http://xmpp.org/extensions/xep-0203.html)
- [XEP-0206: XMPP Over BOSH](http://xmpp.org/extensions/xep-0206.html)
- [XEP-0215: External Service Discovery](http://xmpp.org/extensions/xep-0215.html)
- [XEP-0221: Data Forms Media Element](http://xmpp.org/extensions/xep-0221.html)
- [XEP-0224: Attention](http://xmpp.org/extensions/xep-0224.html)
- [XEP-0231: Bits of Binary](http://xmpp.org/extensions/xep-0231.html)

    Support for requesting bits. Responding to requests for bits is left to the application using stanza.io by listening to the `iq:get:bob` event.

- [XEP-0234: Jingle File Transfer](http://xmpp.org/extensions/xep-0234.html)
- [XEP-0249: Direct MUC Invitations](http://xmpp.org/extensions/xep-0249.html)
- [XEP-0264: File Transfer Thumbnails](http://xmpp.org/extensions/xep-0264.html)
- [XEP-0276: Presence Decloaking](http://xmpp.org/extensions/xep-0276.html)
- [XEP-0280: Message Carbons](http://xmpp.org/extensions/xep-0280.html)
- [XEP-0293: Jingle RTP Feedback Negotiation](http://xmpp.org/extensions/xep-0293.html)
- [XEP-0294: Jingle RTP Header Extensions Negotiation](http://xmpp.org/extensions/xep-0294.html)
- [XEP-0297: Stanza Forwarding](http://xmpp.org/extensions/xep-0297.html)
- [XEP-0300: Use of Cryptographic Hash Functions in XMPP](http://xmpp.org/extensions/xep-0300.html)
- [XEP-0301: In-Band Real Time Text](http://xmpp.org/extensions/xep-0301.html)

    Support for the RTT protocol only. Processing the RTT information for UI display is left to the user & other modules such as [rtt-buffer](https://github.com/otalk/rtt-buffer).

- [XEP-0307: Unique Room Names for Multi-User Chat](http://xmpp.org/extensions/xep-0307.html)
- [XEP-0308: Last Message Correction](http://xmpp.org/extensions/xep-0308.html)
- [XEP-0310: Presence State Annotations](http://xmpp.org/extensions/xep-0310.html)
- [XEP-0313: Message Archive Management](http://xmpp.org/extensions/xep-0313.html)
- [XEP-0317: Hats](http://xmpp.org/extensions/xep-0317.html)
- [XEP-0319: Last User Interaction in Presence](http://xmpp.org/extensions/xep-0319.html)
- [XEP-0320: Use of DTLS-SRTP in Jingle Sessions](http://xmpp.org/extensions/xep-0320.html)
- [XEP-0328: JID Prep](http://xmpp.org/extensions/xep-0328.html)
- [XEP-0335: JSON Containers](http://xmpp.org/extensions/xep-0335.html)
- [XEP-0337: Event Logging over XMPP](http://xmpp.org/extensions/xep-0337.html)
- [XEP-0338: Jingle Grouping Framework](http://xmpp.org/extensions/xep-0338.html)
- [XEP-0339: Source-Specific Media Attributes in Jingle](http://xmpp.org/extensions/xep-0339.html)
- [XEP-0343: Use of DTLS/SCTP in Jingle ICE-UDP](http://xmpp.org/extensions/xep-0343.html)
- [XEP-0352: Client State Indication](http://xmpp.org/extensions/xep-0352.html)
