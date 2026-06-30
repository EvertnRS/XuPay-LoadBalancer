import { UdpSocketClient } from "@/infra/client/UdpSocketClient";
import { ResponseParser } from "@/infra/parser/ResponseParser";
import { DNSResolution } from "@/@types/clients/DNSResolution";
import { ErrorResponse } from "@/@types/contracts/Response";

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


    const parsed = ResponseParser.deserializeResponse<DNSResolution>(rawResponse);

    if (!parsed) {
      throw new Error("Resposta inválida do DNS Service");
    }

    if (parsed.statusCode !== 200) {
      const error = parsed.body as ErrorResponse;
      throw new Error(error.error);
    }

    const body = parsed.body as DNSResolution;

    return {
      domain: body.domain,
      ip: body.ip,
      port: body.port
    };
  }

  private buildResolveRequest(instanceName: string): string {
    return ResponseParser.serialize({
      method: "GET",
      path: "resolve",
      service: process.env.XUPAY_SERVICE_NAME || "xupay-load-balancer",
      secret: process.env.XUPAY_SERVICE_SECRET,
      body: {
        domain: instanceName
      },
    });
  }
}