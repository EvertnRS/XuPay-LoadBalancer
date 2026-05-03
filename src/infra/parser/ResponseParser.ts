import type { Response }  from "../../@types/contracts/Response";
import type { Request }  from "../../@types/contracts/Request";
import { Socket } from "net";
import { ErrorHandler } from "../middleware/Error";

export class ResponseParser {
    // POST|publish|jdnfns;sdfhgsdh;sdfghsdfh;sfbgdfsbgsdzfhb
    public static deserialize(request: string, socket:Socket): Request | void {
        const parts = request.split('|');
        const bodyParts = parts[2].split(';');
        try {
            if (parts.length != 3) {
                return ErrorHandler.handle('Requisição com campos diferentes do esperado '+ request, socket);
            }

            if (bodyParts.length != 4) {
                console.log(bodyParts);
                return ErrorHandler.handle('Corpo da requisição com campos diferentes do esperado ' + request, socket);
            }
            
        } catch (error: any) {
            ErrorHandler.handle(`Formato inválido de corpo `  + request, socket);
        }
        
        const [method, path] = parts;
        const [source, type, payload, timestamp] = bodyParts;

        return {
                method,
                path,
                body:{
                    source,
                    type,
                    payload,
                    timestamp
                }
            };
    }   

    public static serialize(response: Response): string {
        return `${response.id}|${response.type}|${response.payload}`;
    }
}
