// Parsed from every MPEG-1 Layer III frame in each supplied AAK MP3 file.
// Values describe the existing encoded files; downloads are not transcoded.
export const audioQualityByTrackId: Record<string, { averageBitrateKbps: number; variableBitrate: boolean; sampleRateHz: number }> = {
  t1: { averageBitrateKbps: 127.8, variableBitrate: true, sampleRateHz: 44100 },
  t2: { averageBitrateKbps: 192, variableBitrate: false, sampleRateHz: 44100 },
  t3: { averageBitrateKbps: 125.4, variableBitrate: true, sampleRateHz: 44100 },
  t4: { averageBitrateKbps: 110.6, variableBitrate: true, sampleRateHz: 44100 },
  t5: { averageBitrateKbps: 129.9, variableBitrate: true, sampleRateHz: 44100 },
  t6: { averageBitrateKbps: 117.7, variableBitrate: true, sampleRateHz: 44100 },
  t7: { averageBitrateKbps: 129.6, variableBitrate: true, sampleRateHz: 44100 },
};
