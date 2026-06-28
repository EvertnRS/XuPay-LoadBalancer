import { ServiceResponse } from "@/@types/clients/ServiceResponse";
import { SocketClient } from "@/infra/client/SocketClient";
import { JsonObject } from "@/infra/parser/JsonCodec";
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
    apiPayload: JsonObject;
  }): Promise<ServiceResponse> {
    const request = this.buildTargetRequest(params.path, params.apiPayload);

    const rawResponse = await this.socketClient.send(
      params.host,
      this.targetServicePort,
      request
    );

    const parsed = ResponseParser.deserialize(rawResponse);

    if (!parsed) {
      throw new Error("Resposta inválida do serviço alvo");
    }

    const payload = parsed.body.payload;

    if (payload.kind !== "SERVICE_PAYLOAD") {
      throw new Error("Payload inválido retornado pelo serviço alvo");
    }

    return {
      servicePayload: payload.servicePayload
    };
  }

  private buildTargetRequest(path: string, apiPayload: JsonObject): string {
    return ResponseParser.serialize({
      method: "POST",
      path: path,
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        ...apiPayload
      },
    });
  }
}