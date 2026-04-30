import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Download, Infinity as InfinityIcon, KeyRound, Plus, Search, Sparkles, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { isLicenseActive, licenseStore, type License, type LicenseDuration } from "@/lib/storage";
import { toast } from "sonner";

function expiryFor(d: LicenseDuration): number | null {
  if (d === "lifetime") return null;
  return Date.now() + 24 * 60 * 60 * 1000;
}

function makeLicense(d: LicenseDuration): License {
  return {
    key: uuidv4(),
    duration: d,
    createdAt: Date.now(),
    expiresAt: expiryFor(d),
    revoked: false,
  };
}

export default function Licenses() {
  const [list, setList] = useState<License[]>(() => licenseStore.list());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [durationFilter, setDurationFilter] = useState<"all" | LicenseDuration>("all");

  // Single-generate
  const [genDuration, setGenDuration] = useState<LicenseDuration>("1d");

  // Bulk
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkDuration, setBulkDuration] = useState<LicenseDuration>("1d");
  const [bulkResult, setBulkResult] = useState<License[] | null>(null);

  const generateOne = () => {
    const lic = makeLicense(genDuration);
    const next = licenseStore.add([lic]);
    setList(next);
    navigator.clipboard.writeText(lic.key).catch(() => undefined);
    toast.success("Key generated & copied", { description: lic.key });
  };

  const generateBulk = () => {
    const n = Math.max(1, Math.min(50, Number(bulkCount) || 1));
    const items: License[] = Array.from({ length: n }, () => makeLicense(bulkDuration));
    const next = licenseStore.add(items);
    setList(next);
    setBulkResult(items);
    toast.success(`${n} keys generated`);
  };

  const copyText = async (text: string, msg = "Copied") => {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const exportTxt = (items: License[]) => {
    const txt = items.map((l) => `${l.key}\t${l.duration}\t${l.expiresAt ? new Date(l.expiresAt).toISOString() : "lifetime"}`).join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apex-keys-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const revoke = (key: string) => {
    const next = licenseStore.revoke(key);
    setList(next);
    toast("Key revoked");
  };

  const remove = (key: string) => {
    const next = licenseStore.remove(key);
    setList(next);
    toast("Key deleted");
  };

  const filtered = useMemo(() => {
    return list.filter((l) => {
      if (query && !l.key.toLowerCase().includes(query.toLowerCase())) return false;
      if (statusFilter === "active" && !isLicenseActive(l)) return false;
      if (statusFilter === "inactive" && isLicenseActive(l)) return false;
      if (durationFilter !== "all" && l.duration !== durationFilter) return false;
      return true;
    });
  }, [list, query, statusFilter, durationFilter]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neon">
            <KeyRound className="h-3.5 w-3.5" /> License Manager
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Licenses</h1>
          <p className="text-muted-foreground mt-1">Generate, search, and manage UUIDv4 license keys.</p>
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</Label>
            <Select value={genDuration} onValueChange={(v) => setGenDuration(v as LicenseDuration)}>
              <SelectTrigger className="h-10 w-36 bg-input/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">1 Day</SelectItem>
                <SelectItem value="lifetime">Lifetime</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="neon" onClick={generateOne}>
            <Plus className="h-4 w-4" /> Generate
          </Button>

          <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) setBulkResult(null); }}>
            <DialogTrigger asChild>
              <Button variant="ghostNeon"><Sparkles className="h-4 w-4" /> Bulk</Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-surface border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-neon" /> Bulk Generate</DialogTitle>
              </DialogHeader>

              {!bulkResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Count (1–50)</Label>
                      <Input type="number" min={1} max={50} value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duration</Label>
                      <Select value={bulkDuration} onValueChange={(v) => setBulkDuration(v as LicenseDuration)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1d">1 Day</SelectItem>
                          <SelectItem value="lifetime">Lifetime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="neon" onClick={generateBulk}><Zap className="h-4 w-4" /> Generate {bulkCount}</Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">{bulkResult.length} keys generated.</div>
                  <div className="max-h-72 overflow-auto rounded-md border border-border bg-background/40 p-3 font-mono text-xs space-y-1">
                    {bulkResult.map((l) => <div key={l.key}>{l.key}</div>)}
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="ghostNeon" onClick={() => copyText(bulkResult.map((l) => l.key).join("\n"), "All keys copied")}>
                      <Copy className="h-4 w-4" /> Copy all
                    </Button>
                    <Button variant="neon" onClick={() => exportTxt(bulkResult)}>
                      <Download className="h-4 w-4" /> Export .txt
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by key…" className="pl-9 bg-input/50 font-mono" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36 bg-input/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={durationFilter} onValueChange={(v) => setDurationFilter(v as typeof durationFilter)}>
          <SelectTrigger className="w-36 bg-input/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All durations</SelectItem>
            <SelectItem value="1d">1 Day</SelectItem>
            <SelectItem value="lifetime">Lifetime</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghostNeon" size="sm" onClick={() => exportTxt(filtered)} disabled={filtered.length === 0}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-gradient-surface overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_140px_110px_140px] gap-2 px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-2/60">
          <div>Key</div><div>Duration</div><div>Expires</div><div>Status</div><div className="text-right">Actions</div>
        </div>
        <AnimatePresence initial={false}>
          {filtered.map((l) => {
            const active = isLicenseActive(l);
            return (
              <motion.div
                key={l.key}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-[1fr_110px_140px_110px_140px] gap-2 px-4 py-3 items-center border-b border-border/60 hover:bg-neon/[0.03] transition-colors"
              >
                <div className="font-mono text-xs truncate text-foreground">{l.key}</div>
                <div className="flex items-center gap-1 text-xs">
                  {l.duration === "lifetime" ? <><InfinityIcon className="h-3 w-3 text-neon" /> Lifetime</> : "1 Day"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {l.expiresAt ? new Date(l.expiresAt).toLocaleString() : "Never"}
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${active ? "bg-neon/15 text-neon" : "bg-destructive/15 text-destructive"}`}>
                    {active ? "active" : l.revoked ? "revoked" : "expired"}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => copyText(l.key, "Key copied")} title="Copy">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {active && (
                    <Button size="icon" variant="ghost" onClick={() => revoke(l.key)} title="Revoke">
                      <Check className="h-4 w-4 text-neon rotate-45" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(l.key)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">No keys match your filters.</div>
        )}
      </div>
    </div>
  );
}
