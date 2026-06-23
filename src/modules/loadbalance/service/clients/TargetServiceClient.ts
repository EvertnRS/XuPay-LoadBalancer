import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

function parseRequiredPort(value: string | undefined, name: string): number {
  const parsedPort = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid or missing port for ${name}`);
  }

  return parsedPort;
}

export class TargetServiceClient {
  private readonly targetServicePort = parseRequiredPort(
    process.env.TARGET_SERVICE_PORT,
    "TARGET_SERVICE_PORT"
  );

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