import { ClientServicePayload } from "./ClientServicePayload";
import { DNSServicePayload } from "./DNSServicePayload";
import { RegistryServicePayload } from "./RegistryServicePayload";

export type Payload = ClientServicePayload | DNSServicePayload | RegistryServicePayload;

export type MessageBody = {
    payload: Payload;
    timestamp: string;
};