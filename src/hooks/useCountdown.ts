import { useEffect, useState } from "react";
import { formatMinutes, minutesUntil } from "@/utils/date";

export function useCountdown(targetTime: string) {
  const [minutes, setMinutes] = useState(() => minutesUntil(targetTime));

  useEffect(() => {
    setMinutes(minutesUntil(targetTime));
    const timer = setInterval(() => setMinutes(minutesUntil(targetTime)), 30000);
    return () => clearInterval(timer);
  }, [targetTime]);

  return {
    minutes,
    label: formatMinutes(minutes)
  };
}
