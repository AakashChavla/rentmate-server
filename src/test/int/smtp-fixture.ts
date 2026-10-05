import { createServer, type Server, type Socket } from 'node:net';
export class LocalSmtpFixture {
  public readonly messages: string[] = [];
  private readonly sockets = new Set<Socket>();
  private readonly server: Server = createServer((socket) => {
    this.sockets.add(socket);
    socket.on('close', () => {
      this.sockets.delete(socket);
    });
    this.accept(socket);
  });
  public async start(): Promise<number> {
    await new Promise<void>((resolve) => {
      this.server.listen(0, '127.0.0.1', resolve);
    });
    const address = this.server.address();
    if (!address || typeof address === 'string') throw new Error('SMTP fixture address missing');
    return address.port;
  }
  private accept(socket: Socket): void {
    let buffer = '';
    let data = false;
    socket.setEncoding('utf8');
    socket.write('220 localhost fixture\r\n');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        if (data) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end < 0) return;
          this.messages.push(buffer.slice(0, end));
          buffer = buffer.slice(end + 5);
          data = false;
          socket.write('250 accepted\r\n');
          continue;
        }
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (line.startsWith('DATA')) {
          data = true;
          socket.write('354 send data\r\n');
        } else if (line.startsWith('QUIT')) {
          socket.end('221 bye\r\n');
        } else socket.write('250 localhost\r\n');
      }
    });
  }
  public async close(): Promise<void> {
    for (const socket of this.sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
