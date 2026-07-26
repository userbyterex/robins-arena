export class Network {
  constructor(roomCode, isHost, playerName) {
    this.peer = new Peer();
    this.roomCode = roomCode;
    this.isHost = isHost;
    this.playerName = playerName;
    this.connections = new Map();
    this.onStateUpdate = null;
    this.onPlayerJoined = null;
    this.onPlayerLeft = null;

    this.peer.on('open', (id) => {
      if (this.isHost) {
        this.hostRoom();
      } else {
        this.joinRoom();
      }
    });

    this.peer.on('connection', (conn) => {
      if (this.isHost) {
        this.handleNewConnection(conn);
      }
    });
  }

  hostRoom() {
    // Publicar el código en algún servicio (opcional)
    console.log(`Hosting room: ${this.roomCode}`);
  }

  joinRoom() {
    const conn = this.peer.connect(this.roomCode);
    conn.on('open', () => {
      this.connections.set(this.roomCode, conn);
      this.setupConnection(conn);
    });
  }

  setupConnection(conn) {
    conn.on('data', (data) => {
      // Manejar mensajes según tipo
      if (data.type === 'state' && this.onStateUpdate) {
        this.onStateUpdate(data.payload);
      } else if (data.type === 'join') {
        if (this.onPlayerJoined) this.onPlayerJoined(data.player);
      }
    });
    // Enviar mi presentación
    conn.send({ type: 'join', player: { name: this.playerName } });
  }

  send(data) {
    for (const [id, conn] of this.connections) {
      conn.send(data);
    }
  }

  // ... reconexión, ping, etc.
}
