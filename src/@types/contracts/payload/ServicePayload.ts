import { PayloadBase } from "../PayloadBase";
import { JsonValue } from "../JsonValue";

export type ServicePayload = PayloadBase & {
  kind: "SERVICE_PAYLOAD";
  servicePayload: JsonValue;
}