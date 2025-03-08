import {
  createConsumer,
  createProducer,
  createRoom,
  createWebRtcTransport,
  getRoom,
  onModuleInit,
} from "@/services/test/test.service";
import { Server } from "socket.io";

export const test_socket = (io: Server) => {
  (async () => {
    await onModuleInit();
    console.log("Mediasoup worker created");
  })();

  const test = io.of("/test-socket");

  test.on("connection", (socket) => {
    console.log("SFU connected: ", socket.id);

    socket.on("join-room", async ({ roomId, peerId }, callback) => {
      try {
        const newRoom = await createRoom(roomId);
        const sendTransportOptions = await createWebRtcTransport(
          roomId,
          peerId,
          "send"
        );

        const recvTransportOptions = await createWebRtcTransport(
          roomId,
          peerId,
          "recv"
        );

        socket.join(roomId); // Socket.io 룸에 참가

        // 방의 현재 참여자 목록 전송
        const room = getRoom(roomId);

        if (!room) return;
        const peerIds = Array.from(room.peers.keys());

        // 기존 Producer들의 정보 수집
        const existingProducers = [];
        for (const [otherPeerId, peer] of room.peers) {
          if (otherPeerId !== peerId) {
            for (const producer of peer.producers.values()) {
              existingProducers.push({
                producerId: producer.producer.id,
                peerId: otherPeerId,
                kind: producer.producer.kind,
              });
            }
          }
        }

        socket.emit("update-peer-list", { peerIds });

        // 다른 클라이언트들에게 새로운 유저 알림
        socket.to(roomId).emit("new-peer", { peerId });

        callback({
          sendTransportOptions,
          recvTransportOptions,
          rtpCapabilities: newRoom.router.router.rtpCapabilities,
          peerIds,
          existingProducers,
        });
      } catch (error) {
        console.error(error);
        const err = error as Error;
        socket.emit("join-room-error", { error: err.message });
      }
    });

    // Connect transport
    socket.on(
      "connect-transport",
      async ({ roomId, peerId, dtlsParameters, transportId }) => {
        const room = getRoom(roomId);
        const peer = room?.peers.get(peerId);
        if (!peer) {
          return { error: "Peer not found" };
        }
        const transportData = peer.transports.get(transportId);
        if (!transportData) {
          return { error: "Transport not found" };
        }
        await transportData.transport.connect({ dtlsParameters });
        console.log(">> transport connected");

        return { connected: true };
      }
    );

    // Produce
    socket.on(
      "produce",
      async ({ roomId, peerId, kind, transportId, rtpParameters }, calback) => {
        try {
          const producerId = await createProducer({
            roomId,
            peerId,
            transportId,
            kind,
            rtpParameters,
          });

          // 다른 클라이언트에게 새로운 Producer 알림
          socket.to(roomId).emit("new-producer", { producerId, peerId, kind });

          calback(producerId);
          //   return { producerId };
        } catch (error) {
          console.error(error);
          const err = error as Error;
          socket.emit("produce-error", { error: err.message });
        }
      }
    );

    //Consume
    socket.on(
      "consume",
      async (
        { roomId, peerId, transportId, rtpCapabilities, producerId },
        callback
      ) => {
        try {
          const consumerData = await createConsumer({
            roomId,
            peerId,
            transportId,
            producerId,
            rtpCapabilities,
          });

          callback({
            consumerData,
          });
        } catch (error) {
          console.error(error);
          const err = error as Error;
          socket.emit("consume-error", { error: err.message });
        }
      }
    );
  });
};
