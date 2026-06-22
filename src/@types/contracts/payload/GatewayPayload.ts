import { PayloadBase } from "../PayloadBase";

export type GatewayPayload = PayloadBase & {
  kind: "GATEWAY_PAYLOAD";
  event: string;
  apiPayload: string;
};