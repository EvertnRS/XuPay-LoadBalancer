import dgram from "dgram";

export class UdpSocketClient {
  public send(host: string, port: number, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket("udp4");

      const timeout = setTimeout(() => {
        client.close();
        reject(new Error("Response timeout"));
      }, 3000);

      client.send(message, port, host, (err) => {
        if (err) {
          clearTimeout(timeout);
          client.close();
          reject(err);
        }
      });

      client.once("message", (msg) => {
        clearTimeout(timeout);
        client.close();
        resolve(msg.toString());
      });

      client.once("error", (err) => {
        clearTimeout(timeout);
        client.close();
        reject(err);
      });
    });
  }
}