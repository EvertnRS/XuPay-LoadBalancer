import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class TargetServiceClient {
  private readonly targetServicePort = parseInt(process.env.TARGET_SERVICE_PORT || " ")

  constructor(
    private readonly socketClient: SocketClient
  ) {}

  public async send(params: {
    host: string;
    path: string;
    apiPayload: string;
  }): Promise<void> {
    const request = this.buildTargetRequest(params.path, params.apiPayload);

    await this.socketClient.send(
      params.host,
      this.targetServicePort,
      request
    );
  }

  private buildTargetRequest(path: string, apiPayload: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: path,
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        payload: apiPayload,
        timestamp: new Date().toISOString(),
      },
    });
  }
}