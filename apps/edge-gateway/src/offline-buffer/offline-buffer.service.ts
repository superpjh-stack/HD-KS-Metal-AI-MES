import { Injectable, Logger } from '@nestjs/common';

export interface BufferedMessage {
  topic: string;
  payload: string;
  timestamp: number;
}

const MAX_BUFFER_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class OfflineBufferService {
  private readonly logger = new Logger(OfflineBufferService.name);
  private readonly buffer: BufferedMessage[] = [];

  enqueue(topic: string, payload: string): void {
    const now = Date.now();
    this.buffer.push({ topic, payload, timestamp: now });

    // Drop messages older than 30 minutes to cap memory usage
    const cutoff = now - MAX_BUFFER_MS;
    let dropped = 0;
    while (this.buffer.length > 0 && this.buffer[0].timestamp < cutoff) {
      this.buffer.shift();
      dropped++;
    }
    if (dropped > 0) {
      this.logger.warn(`Dropped ${dropped} buffered messages (>30 min old)`);
    }
  }

  flush(): BufferedMessage[] {
    const messages = [...this.buffer];
    this.buffer.length = 0;
    return messages;
  }

  get size(): number {
    return this.buffer.length;
  }
}
