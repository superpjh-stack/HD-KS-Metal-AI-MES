import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { AlertLevel } from './dto/publish-alert.dto';

export interface AlertPayload {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  machineCode?: string;
  lotId?: string;
  time: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://mes.ks-precision.com']
      : ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/alerts',
})
export class NotifGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotifGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcast(alert: AlertPayload) {
    this.server.emit('alert', alert);
  }
}
