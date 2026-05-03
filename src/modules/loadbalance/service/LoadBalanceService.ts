import { Socket } from "net";
import { MessageBody } from "@/@types/contracts/MessageBody";
import { ServiceInstance } from "@/@types/clients/ServiceInstance";
import { SocketClient } from "@/infra/client/SocketClient";
import { RegistryServiceClient } from "./RegistryServiceClient";
import { DNSServiceClient } from "./DNSServiceClient";
import { TargetServiceClient } from "./TargetServiceClient";
import { ErrorHandler } from "@/infra/middleware/Error";

type DispatchPayload = {
  target: string;
  payload: string;
};

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
        return ErrorHandler.handle(
          "Payload inválido para o LoadBalancer",
          socket
        );
      }

      const target = messageBody.payload.target;
      const originalPayload = messageBody.payload.payload;

      const instances = await this.serviceRegistryClient.discover(target);

      const selectedInstance = RoundRobinLoadBalancer.selectInstance(
        target,
        instances
      );

      const { ip } = await this.dnsServiceClient.resolve(
        selectedInstance.instanceName
      );

      const responseFromTarget = await this.targetServiceClient.send({
        ip,
        target,
        payload: originalPayload,
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
      typeof payload.target === "string" &&
      typeof payload.payload === "string"
    );
  }
}

class RoundRobinLoadBalancer {
  private static indexes = new Map<string, number>();

  public static selectInstance(
    target: string,
    instances: ServiceInstance[]
  ): ServiceInstance {
    const healthyInstances = instances.filter(
      (instance) => instance.status === "UP"
    );

    if (!healthyInstances.length) {
      throw new Error(`Nenhuma instância disponível para o target: ${target}`);
    }

    const currentIndex = this.indexes.get(target) ?? 0;

    const selected = healthyInstances[currentIndex % healthyInstances.length];

    this.indexes.set(target, currentIndex + 1);

    return selected;
  }
}