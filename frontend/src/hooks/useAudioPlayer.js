/**
 * Custom hook for playing audio responses
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(null);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audioRef.current.ontimeupdate = () => {
      setCurrentTime(audioRef.current.currentTime);
    };
    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current.duration);
    };
    audioRef.current.onerror = (e) => {
      setError('Failed to play audio');
      setIsPlaying(false);
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const playBase64Audio = useCallback(async (base64Audio) => {
    if (!base64Audio) {
      setError('No audio data provided');
      return;
    }

    try {
      setError(null);
      
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Convert base64 to blob URL
      const audioBlob = base64ToBlob(base64Audio, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
      
    } catch (err) {
      console.error('Playback error:', err);
      setError(err.message || 'Failed to play audio');
    }
  }, []);

  const playAudioUrl = useCallback(async (url) => {
    try {
      setError(null);
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(async () => {
    if (audioRef.current && audioRef.current.src) {
      try {
        await audioRef.current.play();
      } catch (err) {
        setError(err.message);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, []);

  const setVolume = useCallback((volume) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  return {
    isPlaying,
    duration,
    currentTime,
    error,
    playBase64Audio,
    playAudioUrl,
    pause,
    resume,
    stop,
    setVolume
  };
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default useAudioPlayer;