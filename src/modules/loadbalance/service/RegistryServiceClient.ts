import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";

export type ServiceInstance = {
  id: string;
  target: string;
  instanceName: string;
  status: string;
};

export class RegistryServiceClient {
  constructor(
    private readonly socketClient: SocketClient,
    private readonly registryHost: string,
    private readonly registryPort: number
  ) {}

  public async discover(target: string): Promise<ServiceInstance[]> {
    const request = this.buildDiscoverRequest(target);

    const rawResponse = await this.socketClient.send(
      this.registryHost,
      this.registryPort,
      request
    );

    /**
     * Atenção:
     * Seu ResponseParser atual exige Socket para ErrorHandler.
     * Para client interno, o ideal é ter um parser que lance erro,
     * não que escreva em socket.
     */
    const parsed = ResponseParser.deserialize(rawResponse, {
      write: () => {},
      end: () => {},
    } as any);

    if (!parsed) {
      throw new Error("Resposta inválida do Service Registry");
    }

    const payload = parsed.body.payload;

    if (!Array.isArray(payload)) {
      throw new Error("Resposta do Registry deveria ser uma lista de instâncias");
    }

    return payload.map((item) => ({
      id: item.id,
      target: item.target,
      instanceName: item.instanceName,
      status: item.status
    }));
  }

  private buildDiscoverRequest(target: string): string {
    const payload = `target=${target}`;

    return `GET|/service|LOAD_BALANCER;DISCOVER;${payload};${new Date().toISOString()}`;
  }
}