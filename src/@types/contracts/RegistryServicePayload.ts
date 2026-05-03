import { PayloadBase } from "./PayloadBase";
import { ServiceInstance } from "../clients/ServiceInstance";

export type RegistryServicePayload = PayloadBase & {
  kind: "REGISTRY_SERVICE_PAYLOAD";
  instances: ServiceInstance[];
}