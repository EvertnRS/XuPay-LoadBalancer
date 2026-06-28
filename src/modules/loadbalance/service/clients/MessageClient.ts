import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

function parseRequiredPort(value: string | undefined, name: string): number {
  const parsedPort = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid or missing port for ${name}`);
  }

  return parsedPort;
}

export class MessageClient {
  private readonly targetServicePort = parseRequiredPort(
    process.env.MESSAGE_PORT ?? process.env.SERVICE_CLIENTPORT,
    "MESSAGE_PORT"
  );

  constructor(
    private readonly socketClient: SocketClient
  ) {}

  public async send(params: {
    host: string;
    queueMessageId: string;
  }): Promise<void> {
    const request = this.buildTargetRequest(params.queueMessageId);

    await this.socketClient.send(
      params.host,
      this.targetServicePort,
      request
    );
  }

  private buildTargetRequest(queueMessageId: string): string {
    return ResponseParser.serialize({
      method: "POST",
      path: "retry",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        payload: {
            queueMessageId
        },
        timestamp: new Date().toISOString(),
      },
    });
  }
}