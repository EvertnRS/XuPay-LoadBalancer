import { PayloadBase } from "../PayloadBase";

export type MessagePayload = PayloadBase & {
  kind: "MESSAGE_PAYLOAD";
  queueMessageId: string;
  event: string;  
  apiPayload: string;
};