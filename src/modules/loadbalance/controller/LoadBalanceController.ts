import { Socket } from "net";
import type { Request } from "../../../@types/contracts/Request";
import { LoadBalanceService } from "../service/LoadBalanceService";
import { isValidRequest } from "../../../@types/contracts/Request";
import { ErrorHandler } from "@/infra/middleware/Error";
import { ClientServicePayload } from "@/@types/contracts/ClientServicePayload";

export class LoadBalanceController {
    constructor(
        private loadBalanceService: LoadBalanceService
    ) {}

    public redirect(request: Request, socket: Socket): void {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return ErrorHandler.handle("Corpo da requisição inválido", socket);      
        }

        const {queueMessageId, event, apiPayload} = validRequest.body.payload as ClientServicePayload;

        this.loadBalanceService.send(
            queueMessageId,
            event,
            apiPayload,
            socket
        );
    }
}