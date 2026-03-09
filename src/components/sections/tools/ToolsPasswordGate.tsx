import { useState, useEffect } from "react";

// "quantum" XOR-obfuscated with key 42
const SESSION_KEY = "tools_unlocked";
const ATTEMPTS_KEY = "tools_attempts";
const MAX_ATTEMPTS = 3;

const whatitshouldbe = () => String.fromCharCode(...[91, 95, 75, 68, 94, 95, 71].map((c) => c ^ 42));

export default function ToolsPasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setUnlocked(true);
    }
    const stored = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) ?? "0", 10);
    setAttempts(stored);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === whatitshouldbe()) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      const next = attempts + 1;
      sessionStorage.setItem(ATTEMPTS_KEY, String(next));
      setAttempts(next);
      setError(true);
      setInput("");
    }
  };

  if (unlocked) return <>{children}</>;

  if (attempts >= MAX_ATTEMPTS) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm px-6 text-center">
          <h2 className="text-white text-2xl font-semibold tracking-wide">Access Denied</h2>
          <p className="text-zinc-500 text-sm">Too many incorrect attempts.</p>
        </div>
      </div>
    );
  }

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
          {error && (
            <p className="text-red-400 text-xs text-center">
              Incorrect password. {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? "" : "s"} remaining.
            </p>
          )}
          <button type="submit" className="w-full bg-white text-black rounded px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
