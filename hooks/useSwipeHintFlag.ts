import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

const STORAGE_KEY = 'swipe_hint_seen';

function getStoredFlag(): boolean {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
  return false;
}

function setStoredFlag() {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // storage unavailable
    }
  }
}

export function useSwipeHintFlag() {
  const [showHint, setShowHint] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const seen = getStoredFlag();
    if (!seen) {
      setShowHint(true);
    }
    setLoaded(true);
  }, []);

  const markHintSeen = useCallback(() => {
    setShowHint(false);
    setStoredFlag();
  }, []);

  return { showHint: loaded && showHint, markHintSeen };
}
