import { TcpSocketClient } from "@/infra/client/TcpSocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { ServiceInstance } from "@/@types/clients/ServiceInstance";
import { RegistryServicePayload } from "@/@types/contracts/payload/RegistryServicePayload";
import { ErrorResponse } from "@/@types/contracts/Response";

export class RegistryServiceClient {
  constructor(
    private readonly socketClient: TcpSocketClient,
    private readonly registryHost: string,
    private readonly registryPort: number
  ) {}

  public async discover(event: string): Promise<ServiceInstance[]> {
    const request = this.buildDiscoverRequest(event);
    
    const rawResponse = await this.socketClient.send(
      this.registryHost,
      this.registryPort,
      request
    );

    const parsed = ResponseParser.deserializeResponse<RegistryServicePayload>(rawResponse);

    if (!parsed) {
      throw new Error("Resposta inválida do Service Registry");
    }


    if (parsed.statusCode !== 200) {
      const error = parsed.body as ErrorResponse;
      throw new Error(error.error);
    }

    const payload = parsed.body as RegistryServicePayload;

    if (!Array.isArray(payload.instances)) {
      throw new Error("Resposta do Registry deveria ser uma lista de instâncias");
    }

    return payload.instances.map((item) => ({
      id: item.id,
      event: item.event,
      instanceName: item.instanceName,
      status: item.status,
      path: item.path
    }));
  }

  private buildDiscoverRequest(event: string): string {
    return ResponseParser.serialize({
      method: "GET",
      path: "discover",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        event
      },
    });
  }
}