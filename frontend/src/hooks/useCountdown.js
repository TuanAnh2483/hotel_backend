import { useState, useEffect, useRef } from "react";

/**
 * Returns remaining seconds until the given ISO/LocalDateTime string expires.
 * Updates every second. Returns 0 once expired.
 */
export function useCountdown(expiresAt) {
  const getRemaining = () => {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [remaining, setRemaining] = useState(getRemaining);
  const ref = useRef(null);

  useEffect(() => {
    if (!expiresAt) return;
    setRemaining(getRemaining());

    ref.current = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r === 0) clearInterval(ref.current);
    }, 1000);

    return () => clearInterval(ref.current);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining === 0;
  const urgent  = remaining > 0 && remaining <= 120; // last 2 minutes

  return { remaining, minutes, seconds, expired, urgent };
}
