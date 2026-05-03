import { Socket } from "net";
import { MessageBody } from "@/@types/contracts/MessageBody";
import { RoundRobinLoadBalancer } from "./RoundRobinBalancer";
import { SocketClient } from "@/infra/client/SocketClient";
import { RegistryServiceClient } from "./clients/RegistryServiceClient";
import { DNSServiceClient } from "./clients/DNSServiceClient";
import { TargetServiceClient } from "./clients/TargetServiceClient";
import { ErrorHandler } from "@/infra/middleware/Error";

export class LoadBalanceService {
  private registryServiceClient: RegistryServiceClient;
  private dnsServiceClient: DNSServiceClient;
  private targetServiceClient: TargetServiceClient;

  constructor() {
    const socketClient = new SocketClient();

    this.registryServiceClient = new RegistryServiceClient(
      socketClient,
      process.env.REGISTRY_SERVICE_HOST || " ",
      parseInt(process.env.REGISTRY_SERVICE_PORT || " ")
    );

    this.dnsServiceClient = new DNSServiceClient(
      socketClient,
      process.env.DNS_SERVICE_HOST || " ",
      parseInt(process.env.DNS_SERVICE_PORT || " ")
      );

    this.targetServiceClient = new TargetServiceClient(socketClient);
  }

  public async send(messageBody: MessageBody, socket: Socket): Promise<void> {
    try {
      if (messageBody.payload.kind !== "CLIENT_SERVICE_PAYLOAD") {
        throw new Error("Payload inválido para o LoadBalancer");
      }

      const service = messageBody.payload.service;
      const apiPayload = messageBody.payload.apiPayload;

      const instances = await this.registryServiceClient.discover(service);

      const selectedInstance = RoundRobinLoadBalancer.selectInstance(
        service,
        instances
      );

      const { ip } = await this.dnsServiceClient.resolve(
        selectedInstance.instanceName
      );

      await this.targetServiceClient.send({
        ip,
        service,
        apiPayload,
      });


    } catch (error: any) {
      return ErrorHandler.handle(
        error.message ?? "Erro ao executar balanceamento",
        socket
      );
    }
  }
}
