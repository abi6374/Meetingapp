import { create } from 'zustand';

let mediaRecorder: MediaRecorder | null = null;
let streamInstance: MediaStream | null = null;
let audioChunks: Blob[] = [];
let timerInterval: NodeJS.Timeout | null = null;

interface RecordingStore {
    isRecording: boolean;
    audioBlob: Blob | null;
    error: string | null;
    sourceLabel: string | null;
    duration: number;
    startTime: number | null;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    clearRecording: () => void;
    updateDuration: () => void;
}

export const useRecordingStore = create<RecordingStore>((set, get) => ({
    isRecording: false,
    audioBlob: null,
    error: null,
    sourceLabel: null,
    duration: 0,
    startTime: null,

    updateDuration: () => {
        const { startTime } = get();
        if (startTime) {
            set({ duration: Math.floor((Date.now() - startTime) / 1000) });
        }
    },

    startRecording: async () => {
        set({ error: null, audioBlob: null, duration: 0, isRecording: false });
        audioChunks = [];

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            streamInstance = stream;
            
            const audioTracks = stream.getAudioTracks();
            const videoTracks = stream.getVideoTracks();

            if (audioTracks.length === 0) {
                stream.getTracks().forEach(t => t.stop());
                set({ error: 'No audio track found. Please ensure "Share tab audio" is checked.' });
                return;
            }

            const label = videoTracks.length > 0 ? videoTracks[0].label : 'System Audio';
            set({ sourceLabel: label });

            if (videoTracks.length > 0) {
                videoTracks[0].onended = () => {
                    get().stopRecording();
                };
            }

            const audioStream = new MediaStream(audioTracks);
            mediaRecorder = new MediaRecorder(audioStream);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                streamInstance?.getTracks().forEach(t => t.stop());
                if (timerInterval) clearInterval(timerInterval);
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                set({ audioBlob: blob, isRecording: false });
            };

            mediaRecorder.start(1000);
            const now = Date.now();
            set({ isRecording: true, startTime: now });
            
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                get().updateDuration();
            }, 1000);

        } catch (err: any) {
            set({ error: err.message || 'Failed to start recording' });
        }
    },

    stopRecording: () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    },

    clearRecording: () => {
        set({ audioBlob: null, duration: 0, startTime: null, sourceLabel: null, error: null });
        audioChunks = [];
    }
}));
