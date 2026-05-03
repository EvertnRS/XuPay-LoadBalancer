import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class ServiceClient {
  private readonly targetServicePort = parseInt(process.env.SERVICE_CLIENTPORT || " ")

  constructor(
    private readonly socketClient: SocketClient
  ) {}

  public async send(params: {
    host: string;
    path:string;
    service: string;
    apiPayload: string;
    queueMessageId: string;
  }): Promise<void> {
    const request = this.buildTargetRequest(params.queueMessageId, params.path, params.service, params.apiPayload);

    await this.socketClient.send(
      params.host,
      this.targetServicePort,
      request
    );
  }

  private buildTargetRequest(queueMessageId: string, path: string, service: string, apiPayload: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: path,
      body: {
        source: "LOAD_BALANCE",
        type: "REQUEST",
        payload: {
            queueMessageId,
            service,
            apiPayload
        },
        timestamp: new Date().toISOString(),
      },
    });
  }
}