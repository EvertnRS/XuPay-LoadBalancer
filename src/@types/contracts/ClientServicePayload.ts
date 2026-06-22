import { PayloadBase } from "./PayloadBase";

export type ClientServicePayload = PayloadBase & {
  kind: "CLIENT_SERVICE_PAYLOAD";
  queueMessageId: string;
  event: string;  
  apiPayload: string;
};