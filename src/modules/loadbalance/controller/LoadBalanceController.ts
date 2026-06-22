import { Socket } from "net";
import type { Request } from "../../../@types/contracts/Request";
import { LoadBalanceService } from "../service/LoadBalanceService";
import { isValidRequest } from "../../../@types/contracts/Request";
import { ErrorHandler } from "@/infra/middleware/Error";
import { ClientServicePayload } from "@/@types/contracts/ClientServicePayload";
import { GatewayPayload } from "@/@types/contracts/GatewayPayload";

export class LoadBalanceController {
    constructor(
        private loadBalanceService: LoadBalanceService
    ) {}

    public redirectMessage(request: Request, socket: Socket): void {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return ErrorHandler.handle("Corpo da requisição inválido", socket);      
        }

        const {queueMessageId, event, apiPayload} = validRequest.body.payload as ClientServicePayload;

        this.loadBalanceService.redirectMessage(
            queueMessageId,
            event,
            apiPayload,
            socket
        );
    }

    public redirectRequest(request: Request, socket: Socket): void {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return ErrorHandler.handle("Corpo da requisição inválido", socket);      
        }

        const {event, apiPayload} = validRequest.body.payload as GatewayPayload;

        this.loadBalanceService.redirectRequest(
            event,
            apiPayload,
            socket
        );
    }
}