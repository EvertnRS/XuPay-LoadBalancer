import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class TargetServiceClient {
  private readonly targetServicePort = parseInt(process.env.TARGET_SERVICE_PORT || " ")

  constructor(
    private readonly socketClient: SocketClient
  ) {}

  public async send(params: {
    host: string;
    service: string;
    queueMessageId: string;
    apiPayload: string;
  }): Promise<void> {
    const request = this.buildTargetRequest(params.queueMessageId, params.service, params.apiPayload);

    await this.socketClient.send(
      params.host,
      this.targetServicePort,
      request
    );
  }

  private buildTargetRequest(queueMessageId: string, service: string, apiPayload: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: service,
      body: {
        source: "LOAD_BALANCE",
        type: "REQUEST",
        payload: {
          queueMessageId,
          service,
          apiPayload,
        },
        timestamp: new Date().toISOString(),
      },
    });
  }
}