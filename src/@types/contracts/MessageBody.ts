import { MessagePayload } from "./payload/MessagePayload";
import { DNSServicePayload } from "./payload/DNSServicePayload";
import { GatewayPayload } from "./payload/GatewayPayload";
import { RegistryServicePayload } from "./payload/RegistryServicePayload";
import { ServicePayload } from "./payload/ServicePayload";

export type Payload = MessagePayload | DNSServicePayload | RegistryServicePayload | GatewayPayload | ServicePayload;

export type MessageBody = {
    payload: Payload;
};