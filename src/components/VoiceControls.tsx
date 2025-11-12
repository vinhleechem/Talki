import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceControlsProps {
  voiceMode: boolean;
  isRecording: boolean;
  isSpeaking: boolean;
  onToggleVoiceMode: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const VoiceControls = ({
  voiceMode,
  isRecording,
  isSpeaking,
  onToggleVoiceMode,
  onStartRecording,
  onStopRecording,
}: VoiceControlsProps) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Button
        variant={voiceMode ? "default" : "outline"}
        size="sm"
        onClick={onToggleVoiceMode}
        className="flex items-center gap-2"
      >
        {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        {voiceMode ? "Chế độ giọng nói" : "Chế độ văn bản"}
      </Button>

      {voiceMode && (
        <Button
          variant={isRecording ? "destructive" : "secondary"}
          size="sm"
          onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={isSpeaking}
          className="flex items-center gap-2"
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isRecording ? "Dừng ghi âm" : "Ghi âm"}
        </Button>
      )}

      {isSpeaking && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span>Boss đang nói...</span>
        </div>
      )}
    </div>
  );
};
