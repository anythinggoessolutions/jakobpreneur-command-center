/**
 * ElevenLabs Text-to-Speech for GodText AI commentator voiceover.
 *
 * Uses Daniel — a steady British broadcaster voice — styled as a
 * documentary narrator commentating on texting conversations.
 */

import { promises as fs } from "fs";

// Daniel - Steady Broadcaster (British, middle-aged, documentary feel)
const VOICE_ID = "onwK4e9ZLuTAKqWW03F9";
const MODEL_ID = "eleven_multilingual_v2";
const API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Voice settings tuned for Attenborough-style narration:
// - stability 0.6 = natural variation without going off-script
// - similarity_boost 0.85 = stays close to Daniel's natural voice
// - style 0.4 = some expressiveness but still composed
const VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.85,
  style: 0.4,
};

/**
 * Generate speech audio from text using the GodText commentator voice.
 * Returns the path to the generated MP3 file.
 */
export async function generateCommentaryAudio(
  text: string,
  outputPath: string,
): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY not set — cannot generate voiceover");
  }

  const res = await fetch(`${API_URL}/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
}
