import { createServer } from "https";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { sfu_socket } from "./sockets/sfu-socket";
import { mesh_socket } from "./sockets/mesh-socket";
import fs from "fs";

dotenv.config();

const PORT = process.env.PORT || 3000;

const options = {
  key: fs.readFileSync("./src/key.pem"),
  cert: fs.readFileSync("./src/cert.pem"),
};

const httpServer = createServer(options);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONT_END_DOMAIN ?? "http://localhost:3000",
      "http://localhost:8144",
    ],
    methods: ["GET", "POST"],
  },
});

mesh_socket(io);
sfu_socket(io);

// setup(io);

httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});

export { io, httpServer };
