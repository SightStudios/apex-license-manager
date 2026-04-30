import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Send, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apexApi } from "@/lib/api";

type Endpoint = "check-key" | "search-key" | "version-latest" | "download-latest";

const endpoints: { id: Endpoint; method: string; path: string; label: string }[] = [
  { id: "check-key", method: "POST", path: "/check-key", label: "Validate license" },
  { id: "search-key", method: "GET", path: "/search-key/{key}", label: "Lookup license metadata" },
  { id: "version-latest", method: "GET", path: "/version/latest", label: "Get latest version" },
  { id: "download-latest", method: "GET", path: "/download/latest", label: "Download latest file" },
];

export default function ApiTester() {
  const [active, setActive] = useState<Endpoint>("check-key");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<unknown>(null);
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  const run = async () => {
    setLoading(true);
    setResponse(null);
    try {
      let res;
      if (active === "check-key") res = await apexApi.checkKey(key);
      else if (active === "search-key") res = await apexApi.searchKey(key);
      else if (active === "version-latest") res = await apexApi.versionLatest();
      else res = await apexApi.downloadLatest();
      setResponse(res.data ?? { error: res.error });
      setHeaders(res.signedHeaders);
      setStatus(res.status);
    } finally {
      setLoading(false);
    }
  };

  const needsKey = active === "check-key" || active === "search-key";

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neon">
          <Terminal className="h-3.5 w-3.5" /> Protocol
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">API Tester</h1>
        <p className="text-muted-foreground mt-1">
          Signed requests via <span className="font-mono text-neon">X-Apex-Signature</span> (HMAC-SHA256). Base URL: <span className="font-mono text-foreground">{apexApi.baseUrl}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-xl border border-border bg-gradient-surface p-3 space-y-1 h-fit">
          {endpoints.map((e) => (
            <button
              key={e.id}
              onClick={() => setActive(e.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${active === e.id ? "bg-neon/10 text-neon" : "hover:bg-surface-2 text-muted-foreground hover:text-foreground"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${e.method === "POST" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>{e.method}</span>
                <span className="font-mono text-xs truncate">{e.path}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{e.label}</div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-gradient-surface p-5">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <span className="font-mono text-neon">{endpoints.find((e) => e.id === active)?.method}</span>
              <span className="font-mono">{endpoints.find((e) => e.id === active)?.path}</span>
            </div>
            {needsKey && (
              <div className="space-y-1.5 mb-4">
                <Label>License key</Label>
                <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="paste UUID…" className="font-mono bg-input/50" />
              </div>
            )}
            <Button variant="neon" onClick={run} disabled={loading || (needsKey && !key)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
            </Button>
          </div>

          {status !== null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-gradient-surface overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Response</div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${status >= 200 && status < 300 ? "bg-neon/15 text-neon" : "bg-destructive/15 text-destructive"}`}>
                  {status}
                </span>
              </div>
              <pre className="p-5 text-xs font-mono overflow-auto max-h-72 bg-background/40">{JSON.stringify(response, null, 2)}</pre>
              {headers && (
                <div className="border-t border-border p-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Signed headers</div>
                  <pre className="text-xs font-mono text-muted-foreground overflow-auto">{JSON.stringify(headers, null, 2)}</pre>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
