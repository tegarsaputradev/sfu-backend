import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { setup } from "./sockets/setup";

dotenv.config();

const PORT = process.env.PORT || 3000;
const httpServer = createServer();
console.log(process.env.FRONT_END_DOMAIN);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONT_END_DOMAIN ?? "http://localhost:3000",
      "http://localhost:8144",
    ],
    methods: ["GET", "POST"],
  },
});

setup(io);

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export { io, httpServer };
