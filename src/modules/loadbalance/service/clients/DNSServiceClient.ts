import { UdpSocketClient } from "@/infra/client/UdpSocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { DNSResolution } from "@/@types/clients/DNSResolution";

export class DNSServiceClient {
  constructor(
    private readonly socketClient: UdpSocketClient,
    private readonly dnsHost: string,
    private readonly dnsPort: number
  ) {}

  public async resolve(instanceName: string): Promise<DNSResolution> {
    const request = this.buildResolveRequest(instanceName);

    console.log(`Enviando requisição para criar registro DNS: ${request}`);

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
      host: payload.host,
      port: payload.port
    };
  }

  private buildResolveRequest(instanceName: string): string {
    return ResponseParser.serialize({
      method: "GET",
      path: "resolve",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        instanceName
      },
    });
  }
}