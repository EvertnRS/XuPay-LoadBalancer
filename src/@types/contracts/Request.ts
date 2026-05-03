import { MessageBody } from "./MessageBody";
import { Socket } from "net";
import { ErrorHandler } from "../../infra/middleware/Error";

export type Request = {
  method: string;
  path: string;
  body: MessageBody;
};

enum Source {
  REGISTRY_SERVICE = "REGISTRY_SERVICE",
  DNS_SERVICE = "DNS_SERVICE",
  SERVICE_CLIENT = "SERVICE_CLIENT"
}

enum Type {
  RESPONSE = "RESPONSE",
  REQUEST = "REQUEST"
}

export function isValidBodyRequest(
  messageBody: MessageBody,
  socket: Socket
): MessageBody | void {
  if (!Object.values(Source).includes(messageBody.source as Source)) {
    return  ErrorHandler.handle("Origem inválida: " + messageBody.source, socket);
  }

  if (!Object.values(Type).includes(messageBody.type as Type)) {
    return ErrorHandler.handle("Tipo inválido: " + messageBody.type, socket);
  }

  if (
    messageBody.timestamp &&
    !isValidIsoTimestampWithMilliseconds(messageBody.timestamp)
  ) {
    return ErrorHandler.handle("Timestamp inválido: " + messageBody.timestamp, socket);
  }

  return messageBody;
}

function isValidIsoTimestampWithMilliseconds(timestamp: string): boolean {
  const ISO_WITH_MILLISECONDS_REGEX =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  if (!ISO_WITH_MILLISECONDS_REGEX.test(timestamp)) {
    return false;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString() === timestamp;
}