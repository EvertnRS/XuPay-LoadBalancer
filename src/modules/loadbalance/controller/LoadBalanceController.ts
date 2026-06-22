import { Socket } from "net";
import type { Request } from "../../../@types/contracts/Request";
import { LoadBalanceService } from "../service/LoadBalanceService";
import { isValidRequest } from "../../../@types/contracts/Request";
import { ErrorHandler } from "@/infra/middleware/Error";

export class LoadBalanceController {
    constructor(
        private loadBalanceService: LoadBalanceService
    ) {}

    public redirect(request: Request, socket: Socket): void {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return ErrorHandler.handle("Corpo da requisição inválido", socket);      
        }

        const messageBody = validRequest.body;

        if (messageBody.payload.kind !== "CLIENT_SERVICE_PAYLOAD") {
            return ErrorHandler.handle("Requisição inválida para esta rota", socket);
        }

        this.loadBalanceService.send(
            messageBody.payload.queueMessageId,
            messageBody.payload.event,
            messageBody.payload.apiPayload,
            socket
        );
    }
}