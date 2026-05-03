import { SocketClient } from "@/infra/client/SocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { DNSResolution } from "@/@types/clients/DNSResolution";

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

    const parsed = ResponseParser.deserialize(rawResponse);

    if (!parsed) {
      throw new Error("Resposta inválida do DNS Service");
    }

    const payload = parsed.body.payload;

    if (payload.kind !== "DNS_SERVICE_PAYLOAD") {
      throw new Error("Payload inválido retornado pelo DNS Service");
    }

    return {
      instanceName: payload.instanceName,
      ip: payload.ip,
    };
  }

  private buildResolveRequest(instanceName: string): string {
    const payload = `instanceName=${instanceName}`;

    return `GET|dns|LOAD_BALANCE;REQUEST;${payload};${new Date().toISOString()}`;
  }
}