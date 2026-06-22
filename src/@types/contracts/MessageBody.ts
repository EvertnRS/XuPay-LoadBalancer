import { ClientServicePayload } from "./ClientServicePayload";
import { DNSServicePayload } from "./DNSServicePayload";
import { GatewayPayload } from "./GatewayPayload";
import { RegistryServicePayload } from "./RegistryServicePayload";

export type Payload = ClientServicePayload | DNSServicePayload | RegistryServicePayload | GatewayPayload;

export type MessageBody = {
    payload: Payload;
};