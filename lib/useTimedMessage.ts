"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useTimedMessage(timeoutMs = 3000) {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMessage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage("");
  }, []);

  const showMessage = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setMessage("");
        timeoutRef.current = null;
      }, timeoutMs);
    },
    [timeoutMs]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { message, showMessage, clearMessage };
}
