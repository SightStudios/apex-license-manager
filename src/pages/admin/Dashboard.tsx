import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, FileUp, Infinity as InfinityIcon, KeyRound, ShieldCheck, Timer } from "lucide-react";
import { fileStore, isLicenseActive, licenseStore, type License, type UploadedFile } from "@/lib/storage";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  delay = 0,
}: {
  icon: typeof KeyRound;
  label: string;
  value: string | number;
  hint?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-xl border border-border bg-gradient-surface p-5 overflow-hidden hover:border-neon/40 transition-colors"
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-neon/5 blur-2xl group-hover:bg-neon/10 transition-colors" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold font-mono">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className="h-10 w-10 rounded-lg bg-neon/10 border border-neon/30 flex items-center justify-center text-neon">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    setLicenses(licenseStore.list());
    setFiles(fileStore.list());
  }, []);

  const total = licenses.length;
  const active = licenses.filter(isLicenseActive).length;
  const lifetime = licenses.filter((l) => l.duration === "lifetime").length;
  const latest = files[0]
    ? [...files].sort((a, b) => b.uploadedAt - a.uploadedAt)[0]
    : null;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neon">
          <Activity className="h-3.5 w-3.5" /> Live
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Operational overview of licenses and distribution.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={KeyRound} label="Total Keys" value={total} delay={0} />
        <StatCard icon={ShieldCheck} label="Active" value={active} hint={`${total - active} expired/revoked`} delay={0.05} />
        <StatCard icon={InfinityIcon} label="Lifetime" value={lifetime} delay={0.1} />
        <StatCard icon={FileUp} label="Files" value={files.length} hint={latest ? `Latest ${latest.version}` : "No uploads"} delay={0.15} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        <div className="rounded-xl border border-border bg-gradient-surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Timer className="h-4 w-4 text-neon" /> Recent Licenses
          </div>
          <div className="mt-4 space-y-2">
            {licenses.slice(0, 5).map((l) => (
              <div key={l.key} className="flex items-center justify-between p-2 rounded-md bg-surface-2 text-xs">
                <span className="font-mono truncate">{l.key}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${isLicenseActive(l) ? "bg-neon/15 text-neon" : "bg-destructive/15 text-destructive"}`}>
                  {isLicenseActive(l) ? l.duration : "inactive"}
                </span>
              </div>
            ))}
            {licenses.length === 0 && (
              <div className="text-sm text-muted-foreground">No licenses generated yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-surface p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileUp className="h-4 w-4 text-neon" /> Latest Build
          </div>
          {latest ? (
            <div className="mt-4">
              <div className="text-2xl font-mono font-bold text-neon">{latest.version}</div>
              <div className="text-xs text-muted-foreground mt-1">{latest.name} · {(latest.size / 1024).toFixed(1)} KB</div>
              <div className="text-xs text-muted-foreground">Uploaded {new Date(latest.uploadedAt).toLocaleString()}</div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-muted-foreground">No file uploaded.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
