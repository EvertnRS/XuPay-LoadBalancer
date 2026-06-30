import { ServiceResponse } from "@/@types/clients/ServiceResponse";
import { TcpSocketClient } from "@/infra/client/TcpSocketClient";
import { JsonObject } from "@/infra/parser/JsonCodec";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { ErrorResponse } from "@/@types/contracts/Response";
import { ServicePayload } from "@/@types/contracts/payload/ServicePayload";

function parseRequiredPort(value: string | undefined, name: string): number {
  const parsedPort = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid or missing port for ${name}`);
  }

  return parsedPort;
}

export class TargetServiceClient {
  constructor(
    private readonly socketClient: TcpSocketClient
  ) {}

  public async send(params: {
    host: string;
    port: string;
    path: string;
    apiPayload: JsonObject;
  }): Promise<ServiceResponse> {
    const request = this.buildTargetRequest(params.path, params.apiPayload);

    const rawResponse = await this.socketClient.send(
      params.host,
      parseRequiredPort(params.port, "TARGET_SERVICE_PORT"),
      request
    );

    const parsed = ResponseParser.deserializeResponse<ServicePayload>(rawResponse);

    if (!parsed) {
      throw new Error("Resposta inválida do serviço alvo");
    }

    console.log("parsed.statusCode", parsed.statusCode);
    if (parsed.statusCode !== 200) {
      const error = parsed.body as ErrorResponse;
      throw new Error(error.error);
    }

    const body = parsed.body as ServicePayload;

    return {
      servicePayload: body.servicePayload
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