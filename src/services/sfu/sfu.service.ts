import { sfuConfig } from "@/configs/sfu.config";
import * as mediasoup from "mediasoup";
import { Router } from "mediasoup/node/lib/RouterTypes";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
} from "mediasoup/node/lib/WebRtcTransportTypes";
import { Worker } from "mediasoup/node/lib/WorkerTypes";
import * as os from "os";
export interface IWorker {
  worker: Worker;
  routers: Map<string, Router>;
}

let nextWorkerIndex = 0;
let workers: IWorker[] = [];

export async function onModuleInit() {
  const numWorkers = os.cpus().length;

  for (let i = 0; i < numWorkers; i++) {
    await createWorker();
  }
}

export const createWorker = async () => {
  const worker = await mediasoup.createWorker({
    // logLevel: sfuConfig.worker.logLevel,
    rtcMinPort: sfuConfig.worker.rtcMinPort,
    rtcMaxPort: sfuConfig.worker.rtcMaxPort,
  });

  worker.on("died", () => {
    console.error("Mediasoup worker died, exiting...");
    process.exit(1);
  });

  console.log(`Worker created with pid ${worker.pid}`);
  workers.push({ worker, routers: new Map() });
  return worker;
};

export function getWorker() {
  const worker = workers[nextWorkerIndex].worker;
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}

export const createWebRtcTransport = async (
  router: Router,
  peerId: string,
  direction: "send" | "recv",
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
  let transport = await router.createWebRtcTransport({
    ...webRtcTransport_options,
    appData: {
      // peerId,
      clientDirection: direction,
    },
  });
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
