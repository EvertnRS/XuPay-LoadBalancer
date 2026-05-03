import type { Request } from "../../@types/contracts/Request";
import { Socket } from "net";
import { ErrorHandler } from "../middleware/Error";

type PayloadObject = Record<string, string>;
type ParsedPayload = PayloadObject | PayloadObject[];

export class ResponseParser {
  public static deserialize(rawRequest: string, socket: Socket): Request | void {
    try {
      const parts = rawRequest.split("|");

      if (parts.length !== 3) {
        return ErrorHandler.handle(
          "Requisição com campos diferentes do esperado " + rawRequest,
          socket
        );
      }

      const [method, path, rawBody] = parts;
      const bodyParts = rawBody.split(";");

      if (bodyParts.length !== 4) {
        return ErrorHandler.handle(
          "Corpo da requisição com campos diferentes do esperado " + rawRequest,
          socket
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
          timestamp,
        },
      };
    } catch (error: any) {
      return ErrorHandler.handle(
        `Formato inválido de corpo: ${error.message}`,
        socket
      );
    }
  }

  private static parsePayload(rawPayload: string): ParsedPayload {
    if (!rawPayload || rawPayload.trim() === "") {
      throw new Error("Payload vazio");
    }

    const payload = rawPayload.trim();

    if (this.isDispatchPayload(payload)) {
      return this.parseDispatchPayload(payload);
    }

    if (payload.includes("&")) {
      return payload
        .split("&")
        .filter(Boolean)
        .map((item) => this.parsePayloadObject(item));
    }

    return this.parsePayloadObject(payload);
  }

  private static isDispatchPayload(rawPayload: string): boolean {
    return rawPayload.startsWith("target=") && rawPayload.includes(",payload=");
  }

  private static parseDispatchPayload(rawPayload: string): PayloadObject {
    const payloadMarker = ",payload=";
    const markerIndex = rawPayload.indexOf(payloadMarker);

    if (markerIndex === -1) {
      throw new Error("Payload de dispatch inválido: campo payload ausente");
    }

    const targetPart = rawPayload.slice(0, markerIndex);
    const originalPayload = rawPayload.slice(markerIndex + payloadMarker.length);

    const separatorIndex = targetPart.indexOf("=");

    if (separatorIndex === -1) {
      throw new Error("Campo target inválido");
    }

    const targetKey = targetPart.slice(0, separatorIndex).trim();
    const targetValue = targetPart.slice(separatorIndex + 1).trim();

    if (targetKey !== "target") {
      throw new Error(`Campo esperado target, recebido ${targetKey}`);
    }

    if (!targetValue) {
      throw new Error("Campo target vazio");
    }

    if (!originalPayload.trim()) {
      throw new Error("Payload original vazio");
    }

    return {
      target: targetValue,
      payload: originalPayload.trim(),
    };
  }

  private static parsePayloadObject(rawPayload: string): PayloadObject {
    const payload: PayloadObject = {};
    const fields = rawPayload.split(",");

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

      payload[key] = value;
    }

    return payload;
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