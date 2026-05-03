import { ClientServicePayload } from "./ClientServicePayload";
import { DNSServicePayload } from "./DNSServicePayload";
import { RegistryServicePayload } from "./RegistryServicePayload";

export type Payload = ClientServicePayload | DNSServicePayload | RegistryServicePayload;

export type MessageBody = {
    source: string;
    type: string;
    payload: Payload;
    timestamp: string;
};