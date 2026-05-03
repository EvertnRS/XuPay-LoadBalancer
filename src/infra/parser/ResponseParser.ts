import type { Request } from "../../@types/contracts/Request";
import { Payload } from "@/@types/contracts/MessageBody";
import { ClientServicePayload } from "@/@types/contracts/ClientServicePayload";
import { DNSServicePayload } from "@/@types/contracts/DNSServicePayload";
import { RegistryServicePayload } from "@/@types/contracts/RegistryServicePayload";
import { ServiceInstance } from "@/@types/clients/ServiceInstance";

export class ResponseParser {
  public static deserialize(rawRequest: string): Request {
    try {
      const request = rawRequest.trim();

      const parts = request.split("|");

      if (parts.length !== 3) {
        throw new Error(
          "Requisição com campos diferentes do esperado " + request
        );
      }

      const [method, path, rawBody] = parts;

      const bodyParts = rawBody.split(";").map((part) => part.trim());

      if (bodyParts.length !== 4) {
        throw new Error(
          "Corpo da requisição com campos diferentes do esperado " + rawBody
        );
      }

      const [source, type, rawPayload, timestamp] = bodyParts;

      const payload = this.parsePayload(rawPayload);

      return {
        method,
        path,
        body: {
          source,
          type,
          payload,
          timestamp: timestamp.trim(),
        },
      };
    } catch (error: any) {
      throw new Error(`Formato inválido de corpo: ${error.message}`);
    }
  }

  private static parsePayload(rawPayload: string): Payload {
    const payload = rawPayload.trim();

    if (!payload) {
      throw new Error("Payload vazio");
    }

    if (this.isClientServicePayload(payload)) {
      return this.parseClientServicePayload(payload);
    }

    if (this.isRegistryServicePayload(payload)) {
      return this.parseRegistryServicePayload(payload);
    }

    if (this.isDNSServicePayload(payload)) {
      return this.parseDNSServicePayload(payload);
    }

    throw new Error("Tipo de payload não reconhecido: " + rawPayload);
  }

  private static isClientServicePayload(rawPayload: string): boolean {
    return (
      rawPayload.startsWith("service=") &&
      rawPayload.includes(",apiPayload=")
    );
  }

  private static isDNSServicePayload(rawPayload: string): boolean {
    return (
      rawPayload.includes("instanceName=") &&
      rawPayload.includes("ip=")
    );
  }

  private static isRegistryServicePayload(rawPayload: string): boolean {
    return (
      rawPayload.includes("id=") &&
      rawPayload.includes("target=") &&
      rawPayload.includes("instanceName=") &&
      rawPayload.includes("status=")
    );
  }

  private static parseClientServicePayload(
    rawPayload: string
  ): ClientServicePayload {
    const apiPayloadMarker = ",apiPayload=";
    const markerIndex = rawPayload.indexOf(apiPayloadMarker);

    if (markerIndex === -1) {
      throw new Error(
        "Payload inválido. Esperado: service=xxx,apiPayload=yyy"
      );
    }

    const metadataPart = rawPayload.slice(0, markerIndex);
    const apiPayload = rawPayload.slice(markerIndex + apiPayloadMarker.length);

    const metadata = this.parseKeyValueList(metadataPart);

    if (!metadata.service) {
      throw new Error("Payload inválido. Campo service ausente.");
    }

    if (!apiPayload.trim()) {
      throw new Error("Payload inválido. Campo apiPayload vazio.");
    }

    return {
      kind: "CLIENT_SERVICE_PAYLOAD",
      service: metadata.service,
      apiPayload: apiPayload.trim(),
    };
  }

  private static parseDNSServicePayload(rawPayload: string): DNSServicePayload {
    const payload = this.parseKeyValueList(rawPayload);

    if (!payload.instanceName) {
      throw new Error("Payload DNS inválido. Campo instanceName ausente.");
    }

    if (!payload.ip) {
      throw new Error("Payload DNS inválido. Campo ip ausente.");
    }

    return {
      kind: "DNS_SERVICE_PAYLOAD",
      instanceName: payload.instanceName,
      ip: payload.ip,
    };
  }

  private static parseRegistryServicePayload(
    rawPayload: string
  ): RegistryServicePayload {
    const rawInstances = rawPayload.includes("&")
      ? rawPayload.split("&").filter(Boolean)
      : [rawPayload];

    const instances: ServiceInstance[] = rawInstances.map((rawInstance) => {
      const payload = this.parseKeyValueList(rawInstance);

      if (!payload.id) {
        throw new Error("Payload Registry inválido. Campo id ausente.");
      }

      if (!payload.target) {
        throw new Error("Payload Registry inválido. Campo target ausente.");
      }

      if (!payload.instanceName) {
        throw new Error(
          "Payload Registry inválido. Campo instanceName ausente."
        );
      }

      if (!payload.status) {
        throw new Error("Payload Registry inválido. Campo status ausente.");
      }

      return {
        id: payload.id,
        target: payload.target,
        instanceName: payload.instanceName,
        status: payload.status,
      };
    });

    return {
      kind: "REGISTRY_SERVICE_PAYLOAD",
      instances,
    };
  }

  private static parseKeyValueList(raw: string): Record<string, string> {
    const result: Record<string, string> = {};

    const fields = raw.split(",");

    for (const field of fields) {
      const separatorIndex = field.indexOf("=");

      if (separatorIndex === -1) {
        throw new Error(`Campo de payload sem "=": ${field}`);
      }

      const key = field.slice(0, separatorIndex).trim();
      const value = field.slice(separatorIndex + 1).trim();

      if (!key || !value) {
        throw new Error(`Campo de payload inválido: ${field}`);
      }

      result[key] = value;
    }

    return result;
  }

  public static serialize(response: {
    method: string;
    path: string;
    body: {
      source: string;
      type: string;
      payload: string;
      timestamp: string;
    };
  }): string {
    return `${response.method}|${response.path}|${response.body.source};${response.body.type};${response.body.payload};${response.body.timestamp}`;
  }
}