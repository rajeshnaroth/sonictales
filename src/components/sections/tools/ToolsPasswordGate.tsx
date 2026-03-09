import { useState, useEffect } from "react";

// "quantum" stored as ASCII char codes
const PASSWORD_CODES = [113, 117, 97, 110, 116, 117, 109];
const SESSION_KEY = "tools_unlocked";

function decode(): string {
  return String.fromCharCode(...PASSWORD_CODES);
}

export default function ToolsPasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === decode()) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm px-6">
        <h2 className="text-white text-2xl font-semibold tracking-wide">Tools</h2>
        <p className="text-zinc-400 text-sm text-center">This area is password protected.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <input
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            placeholder="Enter password"
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded px-4 py-2 text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-600"
          />
          {error && <p className="text-red-400 text-xs text-center">Incorrect password.</p>}
          <button type="submit" className="w-full bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
