import net from 'net';
import { ResponseParser } from './infra/parser/ResponseParser';
import { ErrorHandler } from './infra/middleware/Error';
import { Routes } from './routes/Routes';

const server = net.createServer((socket: net.Socket) => {
    console.log('Cliente conectado');

    socket.on('data', (data: Buffer) => {
        console.log('Recebido');
        
        const request = ResponseParser.deserialize(data.toString(), socket);

        if (!request) {
            return ErrorHandler.handle('Requisição com formato inválido ' + request, socket);
        }

        const routes = new Routes();
        routes.handle(request, socket);

    });

    socket.on('end', () => {
        console.log('Cliente desconectado');
    });
});

server.listen(4000, () => {
    console.log('Servidor de processamento rodando na porta 4000');
});