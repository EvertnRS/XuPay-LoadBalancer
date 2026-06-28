import { Socket } from "net";
import type { Request } from "../../../@types/contracts/Request";
import { LoadBalanceService } from "../service/LoadBalanceService";
import { isValidRequest } from "../../../@types/contracts/Request";
import { MessagePayload } from "@/@types/contracts/payload/MessagePayload";
import { GatewayPayload } from "@/@types/contracts/payload/GatewayPayload";

export class LoadBalanceController {
    constructor(
        private loadBalanceService: LoadBalanceService
    ) {}

    public redirectMessage(request: Request, socket: Socket): void {
        const validRequest = isValidRequest(request, socket);

        if (!validRequest) {
            return;      
        }

        const {queueMessageId, event, apiPayload} = validRequest.body.payload as MessagePayload;

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
            return;      
        }

        const {event, apiPayload} = validRequest.body.payload as GatewayPayload;

        this.loadBalanceService.redirectRequest(
            event,
            apiPayload,
            socket
        );
    }
}