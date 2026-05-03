import { Socket } from "net";
import { MessageBody } from "@/@types/contracts/MessageBody";
import { RoundRobinLoadBalancer } from "./RoundRobinBalancer";
import { SocketClient } from "@/infra/client/SocketClient";
import { RegistryServiceClient } from "./clients/RegistryServiceClient";
import { DNSServiceClient } from "./clients/DNSServiceClient";
import { TargetServiceClient } from "./clients/TargetServiceClient";
import { ErrorHandler } from "@/infra/middleware/Error";
import { DispatchPayload } from "@/@types/contracts/DispatchPayload";

export class LoadBalanceService {
  private serviceRegistryClient: RegistryServiceClient;
  private dnsServiceClient: DNSServiceClient;
  private targetServiceClient: TargetServiceClient;

  constructor() {
    const socketClient = new SocketClient();

    // TODO: Configurar host e port via variáveis de ambiente
    this.serviceRegistryClient = new RegistryServiceClient(
      socketClient,
      "localhost",
      5000
    );

    this.dnsServiceClient = new DNSServiceClient(
      socketClient,
      "localhost",
      4500
    );

    this.targetServiceClient = new TargetServiceClient(socketClient);
  }

  public async send(messageBody: MessageBody, socket: Socket): Promise<void> {
    try {
      if (!this.isDispatchPayload(messageBody.payload)) {
        throw new Error("Payload inválido para o LoadBalancer");
      }

      const service = messageBody.payload.service;
      const apiPayload = messageBody.payload.payload;

      const instances = await this.serviceRegistryClient.discover(service);

      const selectedInstance = RoundRobinLoadBalancer.selectInstance(
        service,
        instances
      );

      const { ip } = await this.dnsServiceClient.resolve(
        selectedInstance.instanceName
      );

      const responseFromTarget = await this.targetServiceClient.send({
        ip,
        service,
        payload: apiPayload,
      });

      socket.write(responseFromTarget);
      socket.end();
    } catch (error: any) {
      return ErrorHandler.handle(
        error.message ?? "Erro ao executar balanceamento",
        socket
      );
    }
  }

  private isDispatchPayload(
    payload: MessageBody["payload"]
  ): payload is DispatchPayload {
    return (
      typeof payload === "object" &&
      payload !== null &&
      !Array.isArray(payload) &&
      typeof payload.service === "string" &&
      typeof payload.payload === "string"
    );
  }
}
