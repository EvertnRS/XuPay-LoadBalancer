import net from "net";

export class TcpSocketClient {
  public send(host: string, port: number, message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      let response = "";

      client.setTimeout(5000);

      client.connect(port, host, () => {
        client.write(message);
      });

      client.on("data", (data) => {
        response += data.toString();
      });

      client.on("end", () => {
        resolve(response);
      });

      client.on("timeout", () => {
        client.destroy();
        reject(new Error(`Timeout ao conectar em ${host}:${port}`));
      });

      client.on("error", (err) => {
        reject(err);
      });

      client.on("close", () => {
        if (!response) {
          reject(new Error(`Conexão encerrada sem resposta de ${host}:${port}`));
        }
      });
    });
  }
}