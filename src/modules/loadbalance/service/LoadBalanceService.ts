import { Socket } from "net";
import { RoundRobinLoadBalancer } from "./RoundRobinBalancer";
import { TcpSocketClient } from "@/infra/client/TcpSocketClient";
import { RegistryServiceClient } from "./clients/RegistryServiceClient";
import { DNSServiceClient } from "./clients/DNSServiceClient";
import { TargetServiceClient } from "./clients/TargetServiceClient";
import { ErrorHandler } from "@/infra/middleware/Error";
import { MessageClient } from "./clients/MessageClient";
import { ResponseParser } from "../../../infra/parser/ResponseParser";
import { JsonCodec } from "@/infra/parser/JsonCodec";
import { UdpSocketClient } from "@/infra/client/UdpSocketClient";

function parseRequiredPort(value: string | undefined, name: string): number {
  const parsedPort = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
    throw new Error(`Invalid or missing port for ${name}`);
  }

  return parsedPort;
}

export class LoadBalanceService {
  private registryServiceClient: RegistryServiceClient;
  private dnsServiceClient: DNSServiceClient;
  private targetServiceClient: TargetServiceClient;
  private messageClient: MessageClient;

  constructor() {
    const tcpSocketClient = new TcpSocketClient();
    const udpSocketClient = new UdpSocketClient();

    this.registryServiceClient = new RegistryServiceClient(
      tcpSocketClient,
      process.env.REGISTRY_SERVICE_HOST || "localhost",
      parseRequiredPort(process.env.REGISTRY_SERVICE_PORT, "REGISTRY_SERVICE_PORT")
    );

    this.dnsServiceClient = new DNSServiceClient(
      udpSocketClient,
      process.env.DNS_SERVICE_HOST || "localhost",
      parseRequiredPort(process.env.DNS_SERVICE_PORT, "DNS_SERVICE_PORT")
    );

    this.targetServiceClient = new TargetServiceClient(tcpSocketClient);
    this.messageClient = new MessageClient(tcpSocketClient);
  }

  public async redirectMessage(queueMessageId: string, event: string, apiPayload: string, socket: Socket): Promise<void> {
    try {
      const instances = await this.registryServiceClient.discover(event);

      const selectedInstance = RoundRobinLoadBalancer.selectInstance(
        event,
        instances
      );

      const { ip, port } = await this.dnsServiceClient.resolve(
        selectedInstance.instanceName
      );
      
      const jsonPayload = JsonCodec.parseObject(apiPayload);
      
      await this.targetServiceClient.send({
        host: ip,
        port,
        path: selectedInstance.path,
        apiPayload: jsonPayload,
      });

      const response = ResponseParser.serializeResponse(200, {message: "Mensagem processada com sucesso"});

      socket.write(response); 
      socket.end();

    } catch (error: any) {

      return await this.sendToServiceClient(queueMessageId, socket);
    }
  }

  public async redirectRequest(event: string, apiPayload: string, socket: Socket): Promise<void> {
    try {
      const instances = await this.registryServiceClient.discover(event);

      const selectedInstance = RoundRobinLoadBalancer.selectInstance(
        event,
        instances
      );

      const { ip, port } = await this.dnsServiceClient.resolve(
        selectedInstance.instanceName
      );

      const jsonPayload = JsonCodec.parseObject(apiPayload);

      const response = await this.targetServiceClient.send({
        host: ip,
        port,
        path: selectedInstance.path,
        apiPayload: jsonPayload,
      });

      ResponseParser.serializeResponse(200, (response.servicePayload ?? {}) as Record<string, any>);
      socket.end();

    } catch (error: any) {
      return ErrorHandler.handle("Erro ao redirecionar para o serviço alvo",socket);
      
    }
  }

  private async sendToServiceClient(queueMessageId: string, socket: Socket): Promise<void> {
    try{
      await this.messageClient.send({
        host: process.env.MESSAGE_HOST || "localhost",
        queueMessageId
      });

      ResponseParser.serializeResponse(200, { message: "Mensagem enviada para reprocessamento por falha" });
      socket.end();

    } catch (error: any) {
        ErrorHandler.handle(
          "Falha ao processar a mensagem e a tentativa de reprocessamento também falhou.",
          socket
      );
    }
  }

}
