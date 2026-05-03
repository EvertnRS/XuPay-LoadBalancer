import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export class TargetServiceClient {
  private readonly targetServicePort = 3000;

  constructor(
    private readonly socketClient: SocketClient
  ) {}

  public async send(params: {
    ip: string;
    target: string;
    payload: string;
  }): Promise<string> {
    const request = this.buildTargetRequest(params.target, params.payload);

    return this.socketClient.send(
      params.ip,
      this.targetServicePort,
      request
    );
  }

  private buildTargetRequest(target: string, payload: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: "/" + target,
      body: {
        source: "LOAD_BALANCER",
        type: "REQUEST",
        payload,
        timestamp: new Date().toISOString(),
      },
    });
  }
}