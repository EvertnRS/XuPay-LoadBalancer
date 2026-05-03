import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { DNSResolution } from "@/@types/clients/DNSResolution";

type DNSPayload = {
  instanceName: string;
  ip: string;
};

export class DNSServiceClient {
  constructor(
    private readonly socketClient: SocketClient,
    private readonly dnsHost: string,
    private readonly dnsPort: number
  ) {}

  public async resolve(instanceName: string): Promise<DNSResolution> {
    const request = this.buildResolveRequest(instanceName);

    const rawResponse = await this.socketClient.send(
      this.dnsHost,
      this.dnsPort,
      request
    );

    const parsed = ResponseParser.deserialize(rawResponse, {
      write: () => {},
      end: () => {},
    } as any);

    if (!parsed) {
      throw new Error("Resposta inválida do DNS Service");
    }

    const payload = parsed.body.payload;

    if (!this.isDNSPayload(payload)) {
      throw new Error("Payload inválido retornado pelo DNS Service");
    }

    return {
      instanceName: payload.instanceName,
      ip: payload.ip,
    };
  }

  private isDNSPayload(payload: unknown): payload is DNSPayload {
    return (
      typeof payload === "object" &&
      payload !== null &&
      !Array.isArray(payload) &&
      typeof (payload as Record<string, unknown>).instanceName === "string" &&
      typeof (payload as Record<string, unknown>).ip === "string"
    );
  }

  private buildResolveRequest(instanceName: string): string {
    const payload = `instanceName=${instanceName}`;

    return `GET|/|LOAD_BALANCER;RESOLVE;${payload};${new Date().toISOString()}`;
  }
}