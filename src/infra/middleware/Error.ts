import { Socket } from "net";
import { JsonCodec } from "../parser/JsonCodec";

export class ErrorHandler {
    
    public static handle(err: string, socket: Socket): void {
        const body = JsonCodec.stringify({ error: err });
        socket.write(
            `HTTP/1.1 400 Error\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`
        );
        socket.end();
        return;
    }
}
