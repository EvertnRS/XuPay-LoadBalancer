import { ClientServicePayload } from "./payload/ClientServicePayload";
import { DNSServicePayload } from "./payload/DNSServicePayload";
import { GatewayPayload } from "./payload/GatewayPayload";
import { RegistryServicePayload } from "./payload/RegistryServicePayload";

export type Payload = ClientServicePayload | DNSServicePayload | RegistryServicePayload | GatewayPayload;

export type MessageBody = {
    payload: Payload;
};