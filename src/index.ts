import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { setup } from "./sockets/setup";

dotenv.config();

const PORT = process.env.PORT || 3000;
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ["https://sfu.ggwpdev.my.id"],
    methods: ["GET", "POST"],
  },
});

setup(io);

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export { io, httpServer };
