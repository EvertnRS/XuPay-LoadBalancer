import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { ServiceInstance } from "@/@types/clients/ServiceInstance";

export class RegistryServiceClient {
  constructor(
    private readonly socketClient: SocketClient,
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

    const parsed = ResponseParser.deserialize(rawResponse);

    if (!parsed) {
      throw new Error("Resposta inválida do Service Registry");
    }

    const payload = parsed.body.payload;

    if (payload.kind !== "REGISTRY_SERVICE_PAYLOAD") {
      throw new Error("Payload inválido retornado pelo Service Registry");
    }

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

  private buildDiscoverRequest(target: string): string {
    return ResponseParser.serialize({
      method: "GET",
      path: "instance",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        target
      },
    });
  }
}