import { useEffect, useState } from "react";

interface Props {
  message: string | null;
  type?: "info" | "error" | "success";
}

export function Toast({ message, type = "info" }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, [message]);

  if (!visible || !message) return null;

  const bg =
    type === "error" ? "bg-red-500" :
    type === "success" ? "bg-emerald-500" :
    "bg-indigo-500";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl text-white font-semibold text-sm ${bg}`}
    >
      {message}
    </div>
  );
}
