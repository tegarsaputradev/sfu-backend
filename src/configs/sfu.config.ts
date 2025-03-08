import { RtpCodecCapability } from "mediasoup/node/lib/rtpParametersTypes";
import { TransportListenInfo, WorkerLogLevel } from "mediasoup/node/lib/types";

export const sfuConfig = {
  worker: {
    rtcMinPort: 6002,
    rtcMaxPort: 6202,
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
        parameters: { "x-google-start-bitrate": 300 },
      },
    ] as RtpCodecCapability[],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp: process.env.ANNOUNCED_IP ?? "192.168.0.109",
      },
    ] as TransportListenInfo[],
  },
};
