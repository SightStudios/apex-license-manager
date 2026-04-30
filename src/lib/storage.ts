export type LicenseDuration = "1d" | "lifetime";

export interface License {
  key: string;
  duration: LicenseDuration;
  createdAt: number;
  expiresAt: number | null; // null = lifetime
  revoked: boolean;
}

export interface UploadedFile {
  id: string;
  version: string;
  fileType: string;
  name: string;
  size: number;
  uploadedAt: number;
  dataUrl: string; // base64 (small files only)
}

const LICENSES_KEY = "apex.licenses";
const FILES_KEY = "apex.files";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const licenseStore = {
  list(): License[] {
    return read<License[]>(LICENSES_KEY, []);
  },
  save(list: License[]) {
    write(LICENSES_KEY, list);
  },
  add(items: License[]) {
    const all = [...items, ...this.list()];
    this.save(all);
    return all;
  },
  remove(key: string) {
    const next = this.list().filter((l) => l.key !== key);
    this.save(next);
    return next;
  },
  revoke(key: string) {
    const next = this.list().map((l) => (l.key === key ? { ...l, revoked: true } : l));
    this.save(next);
    return next;
  },
  find(key: string): License | undefined {
    return this.list().find((l) => l.key === key);
  },
};

export const fileStore = {
  list(): UploadedFile[] {
    return read<UploadedFile[]>(FILES_KEY, []);
  },
  save(list: UploadedFile[]) {
    write(FILES_KEY, list);
  },
  add(file: UploadedFile) {
    const next = [file, ...this.list()];
    this.save(next);
    return next;
  },
  remove(id: string) {
    const next = this.list().filter((f) => f.id !== id);
    this.save(next);
    return next;
  },
  latest(): UploadedFile | undefined {
    const list = this.list();
    if (!list.length) return undefined;
    return [...list].sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
  },
};

export function isLicenseActive(l: License): boolean {
  if (l.revoked) return false;
  if (l.expiresAt === null) return true;
  return l.expiresAt > Date.now();
}
