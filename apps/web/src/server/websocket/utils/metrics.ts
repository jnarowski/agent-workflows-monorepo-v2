/**
 * WebSocket metrics tracking
 */
export class WebSocketMetrics {
  private activeConnections = 0;
  private totalMessagesSent = 0;
  private totalMessagesReceived = 0;
  private totalErrors = 0;

  recordConnection(): void {
    this.activeConnections++;
  }

  recordDisconnection(): void {
    this.activeConnections--;
  }

  recordMessageSent(): void {
    this.totalMessagesSent++;
  }

  recordMessageReceived(): void {
    this.totalMessagesReceived++;
  }

  recordError(): void {
    this.totalErrors++;
  }

  getMetrics() {
    return {
      activeConnections: this.activeConnections,
      totalMessagesSent: this.totalMessagesSent,
      totalMessagesReceived: this.totalMessagesReceived,
      totalErrors: this.totalErrors,
    };
  }
}

export const wsMetrics = new WebSocketMetrics();
