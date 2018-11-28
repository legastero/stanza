import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Tune = JXT.define({
        element: 'tune',
        fields: {
            artist: Utils.textSub(NS.TUNE, 'artist'),
            length: Utils.numberSub(NS.TUNE, 'length'),
            rating: Utils.numberSub(NS.TUNE, 'rating'),
            source: Utils.textSub(NS.TUNE, 'source'),
            title: Utils.textSub(NS.TUNE, 'title'),
            track: Utils.textSub(NS.TUNE, 'track'),
            uri: Utils.textSub(NS.TUNE, 'uri')
        },
        name: 'tune',
        namespace: NS.TUNE
    });

    JXT.extendPubsubItem(Tune);
    JXT.extendMessage(Tune);
}
