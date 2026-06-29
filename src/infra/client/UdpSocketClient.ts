import dgram from "dgram";

export class UdpSocketClient {
  public send(host: string, port: number, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket("udp4");

      client.send(message, port, host, (err) => {
        if (err) {
          client.close();
          return reject(err);
        }
      });

      client.once("message", (msg) => {
        client.close();
        resolve(msg.toString());
      });

      client.once("error", (err) => {
        client.close();
        reject(err);
      });
    });
  }
}