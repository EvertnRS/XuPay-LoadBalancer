import crypto from "crypto";
import { Socket } from "net";
import { MessageBody } from "./MessageBody";
import { ErrorHandler } from "../../infra/middleware/Error";

export type RequestHeaders = Record<string, string>;

export type RequestOrigin = {
  service: string;
  ip?: string;
};

export type Request = {
  method: string;
  path: string;
  headers: RequestHeaders;
  body: MessageBody;
  rawBody: string;
  origin?: RequestOrigin;
};

export function isValidRequest(request: Request, socket: Socket): Request | void {
  const trustedService = authenticateService(request);

  if (!trustedService) {
    return ErrorHandler.handle("Serviço de origem não autorizado", socket);
  }

  request.origin = {
    service: trustedService,
    ip: socket.remoteAddress,
  };

  if (
    request.body.timestamp &&
    !isValidIsoTimestampWithMilliseconds(request.body.timestamp)
  ) {
    return ErrorHandler.handle(
      "Timestamp inválido: " + request.body.timestamp,
      socket
    );
  }

  return request;
}

function authenticateService(request: Request): string | null {
  const service = request.headers["x-xupay-service"];
  const signature = request.headers["x-xupay-signature"];
  const serviceKeys = getTrustedServiceKeys();
  const secret = service ? serviceKeys[service] : undefined;

  if (!service || !signature || !secret) {
    return null;
  }

  const expectedSignature = createRequestSignature(
    request.method,
    request.path,
    request.rawBody,
    secret
  );

  console.log(`Authenticating service: ${service}`);
  console.log(`Received signature: ${signature}`);
  console.log(`Expected signature: ${expectedSignature}`);

  return timingSafeEquals(signature, expectedSignature) ? service : null;
}

function getTrustedServiceKeys(): Record<string, string> {
  const rawConfig = process.env.XUPAY_SERVICE_KEYS || "";
  const services: Record<string, string> = {};

  for (const entry of rawConfig.split(",")) {
    const separatorIndex = entry.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const service = entry.slice(0, separatorIndex).trim();
    const secret = entry.slice(separatorIndex + 1).trim();

    if (service && secret) {
      services[service] = secret;
    }
  }

  return services;
}

export function createRequestSignature(
  method: string,
  path: string,
  rawBody: string,
  secret: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${method.toUpperCase()}\n${normalizePath(path)}\n${rawBody}`)
    .digest("hex");
}

export function normalizePath(path: string): string {
  const trimmedPath = path.trim();
  return trimmedPath.startsWith("/") ? trimmedPath.slice(1) : trimmedPath;
}

function timingSafeEquals(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
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
