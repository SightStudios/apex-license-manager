import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { Download, FileUp, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileStore, type UploadedFile } from "@/lib/storage";
import { toast } from "sonner";

const FILE_TYPES = ["installer", "update", "patch", "asset"] as const;
const VERSION_RE = /^v\d+\.\d+\.\d+$/;
const MAX_SIZE = 4 * 1024 * 1024; // 4MB cap for localStorage demo

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export default function Files() {
  const [files, setFiles] = useState<UploadedFile[]>(() => fileStore.list());
  const [version, setVersion] = useState("v1.0.0");
  const [fileType, setFileType] = useState<typeof FILE_TYPES[number]>("installer");
  const [picked, setPicked] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPicked(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setPicked(f);
  };

  const submit = async () => {
    if (!picked) return toast.error("Pick a file first");
    if (!VERSION_RE.test(version)) return toast.error("Version must be vX.Y.Z");
    if (picked.size > MAX_SIZE) return toast.error("File too large for demo store (max 4MB)");
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(picked);
      const item: UploadedFile = {
        id: uuidv4(),
        version,
        fileType,
        name: picked.name,
        size: picked.size,
        uploadedAt: Date.now(),
        dataUrl,
      };
      const next = fileStore.add(item);
      setFiles(next);
      setPicked(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success(`Uploaded ${item.version}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const remove = (id: string) => {
    const next = fileStore.remove(id);
    setFiles(next);
  };

  const download = (f: UploadedFile) => {
    const a = document.createElement("a");
    a.href = f.dataUrl;
    a.download = f.name;
    a.click();
  };

  const sorted = [...files].sort((a, b) => b.uploadedAt - a.uploadedAt);
  const latestId = sorted[0]?.id;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neon">
          <FileUp className="h-3.5 w-3.5" /> Distribution
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Files</h1>
        <p className="text-muted-foreground mt-1">Upload versioned binaries and serve the latest build.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
        <div className="rounded-xl border border-border bg-gradient-surface p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors overflow-hidden ${dragOver ? "border-neon bg-neon/10" : "border-border hover:border-neon/50 bg-surface-2/40"}`}
          >
            <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
            <Upload className="mx-auto h-8 w-8 text-neon mb-3" />
            <div className="text-sm font-medium">{picked ? picked.name : "Drop file here or click to browse"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {picked ? `${(picked.size / 1024).toFixed(1)} KB` : "Max 4 MB (demo store)"}
            </div>
            {dragOver && <div className="absolute inset-x-0 top-0 h-1 bg-neon animate-scan" />}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Version</Label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.0.2" className="font-mono bg-input/50" />
            </div>
            <div className="space-y-1.5">
              <Label>File type</Label>
              <Select value={fileType} onValueChange={(v) => setFileType(v as typeof fileType)}>
                <SelectTrigger className="bg-input/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="neon" className="w-full mt-5" onClick={submit} disabled={uploading}>
            <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-gradient-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            Versions ({files.length})
          </div>
          <div className="max-h-[480px] overflow-auto">
            <AnimatePresence initial={false}>
              {sorted.map((f) => (
                <motion.div
                  key={f.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-3 px-5 py-3 border-b border-border/60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-neon">{f.version}</span>
                      {f.id === latestId && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-neon/15 text-neon">
                          <Star className="h-3 w-3" /> latest
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.fileType}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {f.name} · {(f.size / 1024).toFixed(1)} KB · {new Date(f.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => download(f)}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </motion.div>
              ))}
            </AnimatePresence>
            {files.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No uploads yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
