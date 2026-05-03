import { Socket } from "net";
import type { Request } from "../../../@types/contracts/Request";
import { LoadBalanceService } from "../service/LoadBalanceService";
import { isValidBodyRequest } from "../../../@types/contracts/Request";
import { ErrorHandler } from "@/infra/middleware/Error";

export class LoadBalanceController {
    constructor(
        private loadBalanceService: LoadBalanceService
    ) {}

    public redirect(request: Request, socket: Socket): void {
        const messageBody = isValidBodyRequest(request.body, socket);

        if (!messageBody) {
            return ErrorHandler.handle("Corpo da requisição inválido", socket);      
        }

        if (messageBody.payload.kind !== "CLIENT_SERVICE_PAYLOAD") {
            return ErrorHandler.handle("Tipo de mensagem inválido para esta rota: " + messageBody.type, socket);
        }

        this.loadBalanceService.send(
            messageBody.payload.queueMessageId,
            messageBody.payload.service,
            messageBody.payload.apiPayload,
            socket
        );
    }
}