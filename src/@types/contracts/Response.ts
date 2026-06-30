import { JsonObject } from "@/infra/parser/JsonCodec";
import type { RequestHeaders } from "./Request";

export type Response<T = JsonObject> = {
  statusCode: number;
  headers: RequestHeaders;
  body: T | ErrorResponse;
};

export type ErrorResponse = {
  error: string;
};
