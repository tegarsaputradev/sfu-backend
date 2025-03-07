import { sfuConfig } from "@/configs/sfu.config";
import * as mediasoup from "mediasoup";
import { Router } from "mediasoup/node/lib/RouterTypes";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
} from "mediasoup/node/lib/WebRtcTransportTypes";

export const createWorker = async () => {
  let worker;

  worker = await mediasoup.createWorker({
    logLevel: sfuConfig.worker.logLevel,
    rtcMinPort: sfuConfig.worker.rtcMinPort,
    rtcMaxPort: sfuConfig.worker.rtcMaxPort,
  });

  worker.on("died", () => {
    console.error("Mediasoup worker died, exiting...");
    process.exit(1);
  });

  console.log(`Worker created with pid ${worker.pid}`);
  return worker;
};

export const createWebRtcTransport = async (
  router: Router,
  callback: (
    response:
      | {
          params: {
            id: string;
            iceParameters: IceParameters;
            iceCandidates: IceCandidate[];
            dtlsParameters: DtlsParameters;
          };
        }
      | { error: string }
  ) => void
) => {
  if (!router) {
    return callback({ error: "Router not initialized" });
  }
  // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
  const webRtcTransport_options = {
    listenIps: sfuConfig.webRtcTransport.listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  };

  // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
  let transport = await router.createWebRtcTransport(webRtcTransport_options);
  console.log(`transport id: ${transport.id}`);

  transport.on("dtlsstatechange", (dtlsState) => {
    if (dtlsState === "closed") {
      transport.close();
    }
  });

  transport.on("@close", () => {
    console.log("transport closed");
  });

  // send back to the client the following prameters
  callback({
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  });

  return transport;
};
