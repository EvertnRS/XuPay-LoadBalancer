import { Payload } from "./Payload";

export type MessageBody = {
    source: string;
    type: string;
    payload: Payload;
    timestamp: string;
};