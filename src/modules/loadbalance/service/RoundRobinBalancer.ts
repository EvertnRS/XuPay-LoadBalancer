import { ServiceInstance } from "@/@types/clients/ServiceInstance";

export class RoundRobinLoadBalancer {
  private static indexes = new Map<string, number>();

  public static selectInstance(
    service: string,
    instances: ServiceInstance[]
  ): ServiceInstance {
    if (!instances.length) {
      throw new Error(`Nenhuma instância disponível para o service: ${service}`);
    }

    const currentIndex = this.indexes.get(service) ?? 0;

    const selected = instances[currentIndex % instances.length];

    this.indexes.set(service, currentIndex + 1);

    return selected;
  }
}