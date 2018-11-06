import BOSHConnection from '../transports/bosh';


export default function (client) {

    client.transports.bosh = BOSHConnection;
}
