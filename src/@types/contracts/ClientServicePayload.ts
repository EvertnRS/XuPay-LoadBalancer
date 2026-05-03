import { PayloadBase } from "./PayloadBase";

export type ClientServicePayload = PayloadBase & {
  kind: "CLIENT_SERVICE_PAYLOAD";
  service: string;
  apiPayload: string;
};