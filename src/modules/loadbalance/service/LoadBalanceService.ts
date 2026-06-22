import { Socket } from "net";
import { RoundRobinLoadBalancer } from "./RoundRobinBalancer";
import { SocketClient } from "@/infra/client/SocketClient";
import { RegistryServiceClient } from "./clients/RegistryServiceClient";
import { DNSServiceClient } from "./clients/DNSServiceClient";
import { TargetServiceClient } from "./clients/TargetServiceClient";
import { ErrorHandler } from "@/infra/middleware/Error";
import { ServiceClient } from "./clients/ServiceClient";

export class LoadBalanceService {
  private registryServiceClient: RegistryServiceClient;
  private dnsServiceClient: DNSServiceClient;
  private targetServiceClient: TargetServiceClient;
  private serviceClient: ServiceClient;

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
    this.serviceClient = new ServiceClient(socketClient);
  }

  public async send(queueMessageId: string, event: string, apiPayload: string, socket: Socket): Promise<void> {
    try {
      const instances = await this.registryServiceClient.discover(event);

      const selectedInstance = RoundRobinLoadBalancer.selectInstance(
        event,
        instances
      );

      const { host } = await this.dnsServiceClient.resolve(
        selectedInstance.instanceName
      );

      await this.targetServiceClient.send({
        host,
        path: selectedInstance.path,
        apiPayload,
      });


    } catch (error: any) {
    
      await this.serviceClient.send({
        host: process.env.SERVICE_CLIENT_HOST || '',
        event,
        apiPayload,
        queueMessageId
      });

      return ErrorHandler.handle(
        error.message ?? "Erro ao executar balanceamento",
        socket
      );
    }
  }
}
