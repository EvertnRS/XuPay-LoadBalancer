import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class ServiceClient {
  private readonly targetServicePort = parseInt(process.env.SERVICE_CLIENTPORT || " ")

  constructor(
    private readonly socketClient: SocketClient
  ) {}

  public async send(params: {
    host: string;
    event: string;
    apiPayload: string;
    queueMessageId: string;
  }): Promise<void> {
    const request = this.buildTargetRequest(params.queueMessageId, params.event, params.apiPayload);

    await this.socketClient.send(
      params.host,
      this.targetServicePort,
      request
    );
  }

  private buildTargetRequest(queueMessageId: string, event: string, apiPayload: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: "retry",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        payload: {
            queueMessageId,
            event,
            apiPayload
        },
        timestamp: new Date().toISOString(),
      },
    });
  }
}