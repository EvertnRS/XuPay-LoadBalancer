import {
  createRequestSignature,
  normalizePath,
} from "@/@types/contracts/Request";
import type { Request, RequestHeaders } from "@/@types/contracts/Request";
import type { ClientServicePayload } from "@/@types/contracts/ClientServicePayload";
import type { DNSServicePayload } from "@/@types/contracts/DNSServicePayload";
import type { RegistryServicePayload } from "@/@types/contracts/RegistryServicePayload";
import type { ServiceInstance } from "@/@types/clients/ServiceInstance";
import type { JsonValue } from "@/@types/contracts/MessagePayload";
import { JsonCodec } from "./JsonCodec";
import type { JsonObject } from "./JsonCodec";
import { GatewayPayload } from "@/@types/contracts/GatewayPayload";

type ParsedPayload =
  | ClientServicePayload
  | DNSServicePayload
  | RegistryServicePayload
  | GatewayPayload;

type SerializableRequest = {
  method: string;
  path: string;
  headers?: RequestHeaders;
  body: JsonObject;
  service?: string;
  secret?: string;
};

export class ResponseParser {
  public static deserialize(rawRequest: string): Request {
    const request = rawRequest.trim();

    if (!this.isHttpRequest(request)) {
      throw new Error("Protocolo inválido. Esperado HTTP/1.1 ou HTTP/1.0");
    }

    return this.deserializeHttpRequest(request);
  }

  public static serialize(request: SerializableRequest): string {
    const method = request.method.toUpperCase();
    const path = normalizePath(request.path);
    const rawBody = JsonCodec.stringify(request.body);
    const headers: RequestHeaders = {
      host: "xupay-load-balancer",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(rawBody).toString(),
      ...this.normalizeHeaders(request.headers || {}),
    };

    if (request.service && request.secret) {
      headers["x-xupay-service"] = request.service;
      headers["x-xupay-signature"] = createRequestSignature(
        method,
        path,
        rawBody,
        request.secret
      );
    }

    const headerLines = Object.entries(headers).map(
      ([key, value]) => `${this.toHttpHeaderName(key)}: ${value}`
    );

    return `${method} /${path} HTTP/1.1\r\n${headerLines.join(
      "\r\n"
    )}\r\n\r\n${rawBody}`;
  }

  public static serializeResponse(statusCode: number, body: JsonObject): string {
    const statusText = statusCode >= 400 ? "Error" : "OK";
    const rawBody = JsonCodec.stringify(body);

    return `HTTP/1.1 ${statusCode} ${statusText}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(
      rawBody
    )}\r\n\r\n${rawBody}`;
  }

  private static isHttpRequest(request: string): boolean {
    return /^[A-Z]+ \S+ HTTP\/1\.[01]/.test(request);
  }

  private static deserializeHttpRequest(rawRequest: string): Request {
    const separator = rawRequest.indexOf("\r\n\r\n");

    if (separator === -1) {
      throw new Error("Requisição HTTP sem separador entre headers e body");
    }

    const headerPart = rawRequest.slice(0, separator);
    const rawBody = rawRequest.slice(separator + 4);
    const [requestLine, ...headerLines] = headerPart.split("\r\n");
    const [method, rawPath] = requestLine.split(" ");
    const headers = this.parseHeaders(headerLines);
    const parsedBody = this.parseJsonObject(rawBody);
    const path = normalizePath(rawPath);
    const body = this.parseMessageBody(path, parsedBody);

    return {
      method: method.toUpperCase(),
      path,
      headers,
      body,
      rawBody,
    };
  }

  private static parseMessageBody(
    path: string,
    body: JsonObject
  ): Request["body"] {
    return {
      payload: this.parsePayloadByPath(path, body)
    };
  }

  private static parsePayloadByPath(
    path: string,
    body: JsonObject
  ): ParsedPayload {
    const payload = this.extractPayloadObject(body);

    if (path === "redirect") {
      return this.parseClientServicePayload(payload);
    }

    if (path === "instance") {
      return this.parseRegistryServicePayload(payload);
    }

    if (path === "resolve") {
      return this.parseDNSServicePayload(payload);
    }
  
    if (path === "gateway/redirect") {
      return this.parseGatewayPayload(payload);
    }

    return void 0 as never;
  }

  private static extractPayloadObject(body: JsonObject): JsonObject {
    const nestedPayload = body.payload;

    if (JsonCodec.isJsonObject(nestedPayload)) {
      return nestedPayload;
    }

    return body;
  }

  private static parseGatewayPayload(
    payload: JsonObject
  ): GatewayPayload {
    return {
      kind: "GATEWAY_PAYLOAD",
      event: this.requiredString(payload.event, "event"),
      apiPayload: this.requiredString(payload.apiPayload, "apiPayload"),
    };
  }

  private static parseClientServicePayload(
    payload: JsonObject
  ): ClientServicePayload {
    return {
      kind: "CLIENT_SERVICE_PAYLOAD",
      queueMessageId: this.requiredString(payload.queueMessageId, "queueMessageId"),
      event: this.requiredString(payload.event, "event"),
      apiPayload: this.requiredString(payload.apiPayload, "apiPayload"),
    };
  }

  private static parseDNSServicePayload(
    payload: JsonObject
  ): DNSServicePayload {
    return {
      kind: "DNS_SERVICE_PAYLOAD",
      instanceName: this.requiredString(payload.instanceName, "instanceName"),
      host: this.requiredString(payload.host, "host"),
    };
  }

  private static parseRegistryServicePayload(
    payload: JsonObject
  ): RegistryServicePayload {
    const instances = this.extractRegistryInstances(payload);

    return {
      kind: "REGISTRY_SERVICE_PAYLOAD",
      instances: instances.map((instance, index) =>
        this.parseRegistryInstance(instance, index)
      ),
    };
  }

  private static parseRegistryInstance(
    instance: JsonValue,
    index = 0
  ): ServiceInstance {
    if (!JsonCodec.isJsonObject(instance)) {
      throw new Error(
        `Payload Registry inválido. Instância ${index + 1} não é um objeto JSON.`
      );
    }

    return {
      id: this.requiredString(instance.id, "id"),
      event: this.requiredString(instance.event, "event"),
      instanceName: this.requiredString(instance.instanceName, "instanceName"),
      status: this.requiredString(instance.status, "status"),
      path: this.requiredString(instance.path, "path")
    };
  }

  private static extractRegistryInstances(payload: JsonObject): JsonValue[] {
    if (Array.isArray(payload.instances)) {
      return payload.instances;
    }

    if (this.isRegistryInstance(payload)) {
      return [payload];
    }

    throw new Error(
      "Payload Registry inválido. Esperado uma lista de instâncias ou um objeto de instância."
    );
  }

  private static isRegistryInstance(payload: JsonObject): boolean {
    return (
      typeof payload.id === "string" &&
      typeof payload.event === "string" &&
      typeof payload.instanceName === "string" &&
      typeof payload.status === "string"
    );
  }

  private static requiredString(
    value: JsonValue | undefined,
    fieldName: string
  ): string {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Payload inválido. Campo ${fieldName} ausente.`);
    }

    return value.trim();
  }

  private static parseHeaders(headerLines: string[]): RequestHeaders {
    const headers: RequestHeaders = {};

    for (const line of headerLines) {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();

      if (key) {
        headers[key] = value;
      }
    }

    return headers;
  }

  private static parseJsonObject(rawBody: string): JsonObject {
    return JsonCodec.parseObject(rawBody);
  }

  private static normalizeHeaders(headers: RequestHeaders): RequestHeaders {
    const normalizedHeaders: RequestHeaders = {};

    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }

    return normalizedHeaders;
  }

  private static toHttpHeaderName(header: string): string {
    return header
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("-");
  }
}
