import { Namespaces } from '../protocol';


export default function (client) {

    client.disco.addFeature(Namespaces.FORWARD_0);
}
