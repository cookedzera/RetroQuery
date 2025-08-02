import { useCallback } from "react";
import { SoundEffects } from "@/lib/sound-effects";

export function useSound(enabled: boolean) {
  const playTypingSound = useCallback(() => {
    if (!enabled) return;
    SoundEffects.playTyping();
  }, [enabled]);

  const playBeep = useCallback(() => {
    if (!enabled) return;
    SoundEffects.playBeep();
  }, [enabled]);

  const playStartup = useCallback(() => {
    if (!enabled) return;
    SoundEffects.playStartup();
  }, [enabled]);

  const playError = useCallback(() => {
    if (!enabled) return;
    SoundEffects.playError();
  }, [enabled]);

  return {
    playTypingSound,
    playBeep,
    playStartup,
    playError
  };
}
