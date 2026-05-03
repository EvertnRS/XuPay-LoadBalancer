import { Socket } from "net";
import type { Request } from "../../../@types/contracts/Request";
import { LoadBalanceService } from "../service/LoadBalanceService";
import { isValidBodyRequest } from "../../../@types/contracts/Request";
import { ErrorHandler } from "@/infra/middleware/Error";

export class LoadBalanceController {
    constructor(
        private loadBalanceService: LoadBalanceService
    ) {}

    public send(request: Request, socket: Socket): void {
        const messageBody = isValidBodyRequest(request.body, socket);

        if (!messageBody) {
            return ErrorHandler.handle("Corpo da requisição inválido", socket);      
        }

        this.loadBalanceService.send(request.body, socket);
    }
}