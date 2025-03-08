import { Router } from "mediasoup/node/lib/RouterTypes";
import { Worker } from "mediasoup/node/lib/WorkerTypes";

import * as mediasoup from "mediasoup";

import * as os from "os";
import { sfuConfig } from "@/configs/sfu.config";
import {
  DtlsParameters,
  IceCandidate,
  IceParameters,
  WebRtcTransport,
} from "mediasoup/node/lib/WebRtcTransportTypes";
import { Producer } from "mediasoup/node/lib/ProducerTypes";
import { Consumer } from "mediasoup/node/lib/ConsumerTypes";
import {
  RtpCapabilities,
  RtpParameters,
} from "mediasoup/node/lib/rtpParametersTypes";

export const webRtcTransport_options: mediasoup.types.WebRtcTransportOptions = {
  listenIps: [
    {
      ip: process.env.WEBRTC_LISTEN_IP || "127.0.0.1",
      announcedIp: process.env.WEBRTC_ANNOUNCED_IP || "127.0.0.1",
    },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
};

export interface IConsumeParams {
  roomId: string;
  peerId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
  transportId: string;
}

export interface ITransportOptions {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export interface IWorker {
  worker: Worker;
  routers: Map<string, Router>;
}

export interface IRouter {
  router: Router;
}

export interface ITransport {
  transport: WebRtcTransport;
}

export interface IProducer {
  producer: Producer;
}

export interface IConsumer {
  consumer: Consumer;
}

export interface Peer {
  id: string;
  transports: Map<string, ITransport>;
  producers: Map<string, IProducer>;
  consumers: Map<string, IConsumer>;
}

export interface IRoom {
  id: string;
  router: IRouter;
  peers: Map<string, Peer>;
}

export interface IProduceParams {
  roomId: string;
  peerId: string;
  kind: "audio" | "video";
  rtpParameters: RtpParameters;
  transportId: string;
}

let nextWorkerIndex = 0;
let workers: IWorker[] = [];
let rooms: Map<string, IRoom> = new Map();

export async function createConsumer(params: IConsumeParams): Promise<any> {
  const { roomId, peerId, producerId, rtpCapabilities, transportId } = params;
  const room = getRoom(roomId);

  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  if (!room.router.router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error(`Cannot consume producer ${producerId}`);
  }

  const peer = room.peers.get(peerId)!;

  const transportData = peer.transports.get(transportId);
  if (!transportData) {
    throw new Error("Transport not found");
  }

  const consumer: Consumer = await transportData.transport.consume({
    producerId,
    rtpCapabilities,
    paused: false,
  });

  peer.consumers.set(consumer.id, { consumer });

  return {
    id: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

export async function createProducer(params: IProduceParams): Promise<string> {
  const { roomId, peerId, kind, rtpParameters, transportId } = params;
  const room = getRoom(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  const peer = room.peers.get(peerId);
  if (!peer) {
    throw new Error(`Peer ${peerId} not found`);
  }
  const transportData = peer.transports.get(transportId);
  if (!transportData) {
    throw new Error("Transport not found");
  }

  const producer = await transportData.transport.produce({
    kind,
    rtpParameters,
  });

  peer.producers.set(producer.id, { producer });

  return producer.id;
}

export function addPeerToRoom(roomId: string, peerId: string) {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  if (!room.peers.has(peerId)) {
    room.peers.set(peerId, {
      id: peerId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    });
  }
}

export async function createWebRtcTransport(
  roomId: string,
  peerId: string,
  direction: "send" | "recv"
): Promise<ITransportOptions> {
  const room = getRoom(roomId);
  if (!room) {
    throw new Error(`Room ${roomId} not found`);
  }

  const transport: WebRtcTransport =
    await room.router.router.createWebRtcTransport({
      ...webRtcTransport_options,
      appData: {
        peerId,
        clientDirection: direction,
      },
    });

  addPeerToRoom(roomId, peerId);

  const peer = room.peers.get(peerId)!;
  peer.transports.set(transport.id, { transport });

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

export async function createRoom(roomId: string): Promise<IRoom> {
  const existingRoom = rooms.get(roomId);
  console.log({ existingRoom });
  if (existingRoom) return existingRoom;

  const worker = getWorker();
  const router = await worker.createRouter({
    mediaCodecs: sfuConfig.router.mediaCodecs,
  });

  const newRoom: IRoom = {
    id: roomId,
    router: { router },
    peers: new Map(),
  };
  rooms.set(roomId, newRoom);

  console.log(`>> router created for room ${roomId}`);
  return newRoom;
}

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

export function getRoom(roomId: string): IRoom | undefined {
  return rooms.get(roomId);
}
