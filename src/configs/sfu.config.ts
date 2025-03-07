import { RtpCodecCapability } from "mediasoup/node/lib/rtpParametersTypes";
import { TransportListenInfo, WorkerLogLevel } from "mediasoup/node/lib/types";

export const sfuConfig = {
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: "debug" as WorkerLogLevel,
  },

  router: {
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: "video",
        mimeType: "video/VP8",
        clockRate: 90000,
        parameters: { "x-google-start-bitrate": 1000 },
      },
    ] as RtpCodecCapability[],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedAddress: "socket-io-sfu.ggwpdev.my.id",
        // ip: "127.0.0.1", // replace with relevant IP address
        // announcedIp: "localhost",
        // announcedIp: "localhost",
        // announcedAddress: "localhost",
        // announcedAddress: "http://localhost:5000",
        // announcedIp: process.env.ANNOUNCED_IP ?? "127.0.0.1",
      },
    ] as TransportListenInfo[],
  },
};
