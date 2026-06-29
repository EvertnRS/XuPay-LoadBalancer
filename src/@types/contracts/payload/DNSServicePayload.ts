import { PayloadBase } from "../PayloadBase";

export type DNSServicePayload = PayloadBase & {
  kind: "DNS_SERVICE_PAYLOAD";
  instanceName: string;
  host: string;
  port: string;
}