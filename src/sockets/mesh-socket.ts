import { Server } from "socket.io";

export const mesh_socket = (io: Server) => {
  const mesh = io.of("/mesh-socket");

  mesh.on("connection", (socket) => {
    console.log("User connected: ", socket.id);

    socket.on("request", ({ roomId, user }) => {});

    socket.on("offer", (offer) => {
      console.log({ offer });
      socket.broadcast.emit("offer", offer);
    });

    socket.on("answer", (answer) => {
      socket.broadcast.emit("answer", answer);
    });

    socket.on("ice-candidate", (candidate) => {
      socket.broadcast.emit("ice-candidate", candidate);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected: ", socket.id);
      // Notify all other clients that a user has disconnected
      socket.broadcast.emit("user-disconnected", socket.id);
    });
  });
};
