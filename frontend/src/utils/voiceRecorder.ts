export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting voice recorder:', error);
      throw error;
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

export class VoiceSynthesis {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    if (this.voices.length === 0) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }
  }

  speak(text: string, options: { lang?: string; rate?: number; pitch?: number } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!text) {
        reject(new Error('No text provided'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || 'vi-VN';
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;

      const voice = this.voices.find(v => v.lang.startsWith(utterance.lang));
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synth.speak(utterance);
    });
  }

  stop(): void {
    this.synth.cancel();
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }
}

export class VoiceRecognition {
  private recognition: any;
  private isListening: boolean = false;

  constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }
    
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'vi-VN';
  }

  startListening(onResult: (transcript: string) => void, onError?: (error: any) => void): void {
    if (this.isListening) return;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      this.isListening = false;
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (onError) onError(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();
    this.isListening = true;
  }

  stopListening(): void {
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isActive(): boolean {
    return this.isListening;
  }
}

// ─── VoiceActivityDetector ────────────────────────────────────────────────────
// Auto-detects when user starts and stops speaking using AudioContext analysis.
// No manual button needed — fires onSpeechEnd(blob) after SILENCE_DURATION ms
// of silence following detected speech.

const SILENCE_THRESHOLD = 0.012; // RMS below this = silence
const SILENCE_DURATION = 1500;   // ms of silence before considering speech done
const MIN_SPEECH_MS = 400;       // minimum speech length to be considered valid

export class VoiceActivityDetector {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private speechStartTime: number | null = null;
  private _active = false;
  private onSpeechEnd: ((blob: Blob, transcript?: string) => void) | null = null;
  private onSpeechStart: (() => void) | null = null;
  private onSpeechUpdate: ((text: string) => void) | null = null;
  private rafId: number | null = null;
  private recognition: any = null;
  private localTranscript = "";

  async start(
    onSpeechEnd: (blob: Blob, transcript?: string) => void,
    onSpeechStart?: () => void,
    onSpeechUpdate?: (text: string) => void,
  ): Promise<void> {
    if (this._active) return;
    this.onSpeechEnd = onSpeechEnd;
    this.onSpeechStart = onSpeechStart ?? null;
    this.onSpeechUpdate = onSpeechUpdate ?? null;

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;

    const source = this.audioContext.createMediaStreamSource(this.stream);
    source.connect(this.analyser);

    this.mediaRecorder = new MediaRecorder(this.stream);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(100); // get chunks every 100ms

    // Try starting Web Speech API for local quick transcription
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      if (!this.recognition) {
        this.recognition = new SpeechRec();
        this.recognition.lang = "vi-VN";
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.onresult = (event: any) => {
          let text = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
             text += event.results[i][0].transcript;
          }
          this.localTranscript = text.trim();
          this.onSpeechUpdate?.(this.localTranscript);
        };
      }
      this.localTranscript = "";
      try { this.recognition.start(); } catch (e) { /* ignore if already started */ }
    }

    this._active = true;
    this._poll();
  }

  private _getRms(): number {
    if (!this.analyser) return 0;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += v * v;
    return Math.sqrt(sum / data.length);
  }

  private _poll() {
    if (!this._active) return;
    const rms = this._getRms();
    const isSpeaking = rms > SILENCE_THRESHOLD;

    if (isSpeaking) {
      if (!this.speechStartTime) {
        this.speechStartTime = Date.now();
        this.onSpeechStart?.();
      }
      // Cancel any pending silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.speechStartTime) {
      // User may have stopped — start silence timer
      if (!this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          const speechDuration = Date.now() - (this.speechStartTime ?? 0);
          if (speechDuration >= MIN_SPEECH_MS) {
            this._commitBlob();
          } else {
            // Too short — ignore and reset
            this.speechStartTime = null;
          }
        }, SILENCE_DURATION);
      }
    }

    this.rafId = requestAnimationFrame(() => this._poll());
  }

  private _commitBlob() {
    if (!this.mediaRecorder || !this.onSpeechEnd) return;
    this.mediaRecorder.stop();
    try { this.recognition?.stop(); } catch (e) { /* ignore */ }

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: "audio/webm" });
      this.onSpeechEnd?.(blob, this.localTranscript);
      // Restart recording for next turn
      this.chunks = [];
      this.speechStartTime = null;
      this.silenceTimer = null;
      this.localTranscript = "";
      if (this._active && this.stream) {
        this.mediaRecorder = new MediaRecorder(this.stream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.chunks.push(e.data);
        };
        this.mediaRecorder.start(100);
        try { this.recognition?.start(); } catch (e) { /* ignore */ }
      }
    };
  }

  stop(): void {
    this._active = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.mediaRecorder?.state !== "inactive" && this.mediaRecorder?.stop();
    try { this.recognition?.stop(); } catch (e) { /* ignore */ }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.speechStartTime = null;
    this.silenceTimer = null;
    this.localTranscript = "";
  }

  isActive(): boolean {
    return this._active;
  }

  /** Temporarily pause VAD (while boss is playing audio) */
  pause(): void {
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.speechStartTime = null;
    try { this.recognition?.stop(); } catch (e) { /* ignore */ }
  }

  /** Resume VAD after boss audio finishes */
  resume(): void {
    if (this._active) {
      this.localTranscript = "";
      try { this.recognition?.start(); } catch(e) { /* ignore */ }
      this._poll();
    }
  }
}
