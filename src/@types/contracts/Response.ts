import type { JsonValue } from "./JsonValue";
import type { RequestHeaders } from "./Request";

export type Response = {
  statusCode: number;
  headers: RequestHeaders;
  body: {
    [key: string]: JsonValue;
  };
};
