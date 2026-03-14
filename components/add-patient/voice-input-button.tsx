"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInputButton({
  onTranscript,
  className,
}: VoiceInputButtonProps) {
  const { isListening, isSupported, start, stop } =
    useSpeechRecognition(onTranscript);

  if (!isSupported) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          className={cn("h-8 w-8 shrink-0", className)}
          onClick={isListening ? stop : start}
        >
          {isListening ? (
            <MicrophoneSlash size={16} className="animate-pulse" />
          ) : (
            <Microphone size={16} />
          )}
          <span className="sr-only">
            {isListening ? "Stop recording" : "Start voice input"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isListening ? "Stop recording" : "Voice input"}
      </TooltipContent>
    </Tooltip>
  );
}

