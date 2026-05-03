import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class TargetServiceClient {
  private readonly targetServicePort = 3000;

  constructor(
    private readonly socketClient: SocketClient
  ) {}

  public async send(params: {
    ip: string;
    service: string;
    payload: string;
  }): Promise<string> {
    const request = this.buildTargetRequest(params.service, params.payload);

    return this.socketClient.send(
      params.ip,
      this.targetServicePort,
      request
    );
  }

  private buildTargetRequest(service: string, payload: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: service,
      body: {
        source: "LOAD_BALANCE",
        type: "REQUEST",
        payload,
        timestamp: new Date().toISOString(),
      },
    });
  }
}