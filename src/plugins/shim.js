import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(Namespaces.SHIM);
    client.disco.addFeature(`${Namespaces.SHIM}#SubID`, Namespaces.SHIM);
}
