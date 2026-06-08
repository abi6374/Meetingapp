import { useState, useRef, useCallback } from 'react';

export interface UseMediaRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioBlob: Blob | null;
  error: string | null;
  sourceLabel: string | null;
  duration: number;
  analyserRef: React.RefObject<AnalyserNode | null>;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } as any,
      });

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();

      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('No audio track found. Please ensure "Share tab audio" is checked.');
      }

      // Set up Audio Analyser for Visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(new MediaStream([audioTracks[0]]));
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const label = videoTracks.length > 0 ? videoTracks[0].label : 'System Audio';
      setSourceLabel(label);

      // Stop recording if the user stops sharing via the browser UI
      stream.getTracks().forEach(track => {
        track.onended = () => {
          stopRecording();
        };
      });

      // We only need the audio track for recording
      const audioStream = new MediaStream(audioTracks);
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop()); 
        clearInterval(timerIntervalRef.current!);
        
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setIsRecording(false);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      timerIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
      console.error('Recording error:', err);
    }
  }, [stopRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    error,
    sourceLabel,
    duration,
    analyserRef
  };
}
