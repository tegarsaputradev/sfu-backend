import { Server } from "socket.io";
import {
  createWebRtcTransport,
  createWorker,
  getWorker,
  onModuleInit,
} from "@/services/sfu/sfu.service";
import { sfuConfig } from "@/configs/sfu.config";
import { Router } from "mediasoup/node/lib/RouterTypes";
import { WebRtcTransport } from "mediasoup/node/lib/WebRtcTransportTypes";

export const sfu_socket = (io: Server) => {
  let router: Router;
  const transports = new Map<string, WebRtcTransport>();
  const consumers = new Map();

  (async () => {
    await onModuleInit();

    const worker = getWorker();
    router = await worker.createRouter({
      mediaCodecs: sfuConfig.router.mediaCodecs,
    });

    console.log("Mediasoup worker and router created");
  })();

  const sfu = io.of("/sfu-socket");

  sfu.on("connection", (socket) => {
    console.log("SFU connected: ", socket.id);

    socket.on("getRtpCapabilities", (callback) => {
      const rtpCapabilities = router.rtpCapabilities;

      console.log("rtp Capabilities", rtpCapabilities);

      // call callback from the client and send back the rtpCapabilities
      callback({ rtpCapabilities });
    });

    socket.on("createWebRtcTransport", async ({ sender }, callback) => {
      console.log(`Is this a sender request? ${sender}`);

      const transport = await createWebRtcTransport(
        router,
        socket.id,
        sender ? "send" : "recv",
        callback
      );
      if (transport) {
        // Store the transport or handle it as needed
        transports.set(transport.id, transport);
        console.log(`Transport created with ID: ${transport.id}`);
      }

      // if (sender)
      //   producerTransport = await createWebRtcTransport(router, callback);
      // else consumerTransport = await createWebRtcTransport(router, callback);
    });

    // Transport Connect
    socket.on(
      "transport-connect",
      async ({ transportId, dtlsParameters }, callback) => {
        console.log("DTLS PARAMS... ", { dtlsParameters });
        const transport = transports.get(transportId);

        if (!transport) {
          return callback({ error: "Transport not found" });
        }
        try {
          console.log("try to connect");
          await transport.connect({ dtlsParameters });
          // callback({});
        } catch (err) {
          console.log({ err });
          callback({ error: (err as Error).message });
        }
      }
    );

    // Transport Produce
    socket.on(
      "transport-produce",
      async ({ transportId, kind, rtpParameters, appData }, callback) => {
        // call produce based on the prameters from the client
        const transport = transports.get(transportId);
        if (!transport) return;

        const producer = await transport.produce({
          kind,
          rtpParameters,
        });

        console.log("Producer ID: ", producer.id, producer.kind);

        producer.on("transportclose", () => {
          console.log("transport for this producer closed ");
          producer.close();
        });

        // Send back to the client the Producer's id
        callback({
          id: producer.id,
        });
      }
    );

    socket.on(
      "consume",
      async ({ producerId, transportId, rtpCapabilities }, callback) => {
        try {
          // check if the router can consume the specified producer

          if (
            router.canConsume({
              producerId,
              rtpCapabilities,
            })
          ) {
            console.log("can consume");
            const transport = transports.get(transportId);
            console.log({ transportId, producerId });

            if (!transport) return;
            // transport can now consume and return a consumer
            const consumer = await transport.consume({
              producerId,
              rtpCapabilities,
              paused: false,
            });

            consumer.on("transportclose", () => {
              console.log("transport close from consumer");
            });

            consumer.on("producerclose", () => {
              console.log("producer of consumer closed");
            });

            // from the consumer extract the following params
            // to send back to the Client
            const params = {
              id: consumer.id,
              producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters,
            };

            // send the parameters to the client
            consumers.set(consumer.id, consumer);
            callback({ params });
          }
        } catch (error) {
          const err = error as Error;
          console.log(err.message);
          callback({
            params: {
              error: error,
            },
          });
        }
      }
    );

    socket.on("consumer-resume", async ({ id }) => {
      const consumer = consumers.get(id);
      if (!consumer) {
        console.log("Consumer not found.");
        return;
      }
      // await consumer.resume();
      console.log("consumer resume");
    });
  });
};
