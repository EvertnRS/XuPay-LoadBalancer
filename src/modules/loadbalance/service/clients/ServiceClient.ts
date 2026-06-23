import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

function parseRequiredPort(value: string | undefined, name: string): number {
  const parsedPort = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid or missing port for ${name}`);
  }

  return parsedPort;
}

export class ServiceClient {
  private readonly targetServicePort = parseRequiredPort(
    process.env.SERVICE_CLIENT_PORT ?? process.env.SERVICE_CLIENTPORT,
    "SERVICE_CLIENT_PORT"
  );

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