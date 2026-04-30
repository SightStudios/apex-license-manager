import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Code2, Copy, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apexApi } from "@/lib/api";
import { SIGNING_SECRET } from "@/lib/crypto";
import { toast } from "sonner";

type Lang = "python" | "cpp";

const BASE = apexApi.isMock ? "https://apexcheats.vercel.app" : apexApi.baseUrl;

const pythonSnippet = `"""
Apex API client — Python 3.9+
Requires: pip install requests
"""
import hmac, hashlib, secrets, time, json, base64
import requests

API_BASE       = "${BASE}"
SIGNING_SECRET = "${SIGNING_SECRET}"   # keep server-side in prod
SESSION_TOKEN  = "<paste-session-token>"  # from /login (admin only)


def _sign(method: str, path: str, body: str) -> dict:
    ts    = str(int(time.time() * 1000))
    nonce = secrets.token_hex(12)
    payload = f"{method.upper()}:{path}:{ts}:{nonce}:{body}"
    sig = hmac.new(
        SIGNING_SECRET.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "X-Apex-Timestamp": ts,
        "X-Apex-Nonce":     nonce,
        "X-Apex-Signature": sig,
    }


def _request(method: str, path: str, body: dict | None = None):
    body_str = json.dumps(body, separators=(",", ":")) if body is not None else ""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SESSION_TOKEN}",
        **_sign(method, path, body_str),
    }
    r = requests.request(
        method,
        f"{API_BASE}{path}",
        headers=headers,
        data=body_str if body_str else None,
        timeout=10,
    )
    return r.status_code, (r.json() if r.content else None)


# ------------------------------------------------------------
# 1. Validate a license key
# ------------------------------------------------------------
status, data = _request("POST", "/check-key", {"key": "PASTE-UUID-HERE"})
print("check-key →", status, data)
# → 200 {'valid': True, 'duration': 'lifetime', 'expires_at': None, ...}

# ------------------------------------------------------------
# 2. Lookup license metadata
# ------------------------------------------------------------
key = "PASTE-UUID-HERE"
status, data = _request("GET", f"/search-key/{key}")
print("search-key →", status, data)

# ------------------------------------------------------------
# 3. Get the latest published version
# ------------------------------------------------------------
status, data = _request("GET", "/version/latest")
print("version/latest →", status, data)
# → 200 {'version': 'v1.0.2', 'uploaded_at': 1730000000000}

# ------------------------------------------------------------
# 4. Download the latest build
# ------------------------------------------------------------
status, data = _request("GET", "/download/latest")
if status == 200 and data:
    # Mock returns base64 data URL; real backend can stream raw bytes.
    header, b64 = data["dataUrl"].split(",", 1)
    with open(data["name"], "wb") as f:
        f.write(base64.b64decode(b64))
    print(f"saved {data['name']} ({data['size']} bytes)")
`;

const cppSnippet = `// Apex API client — C++17
// Deps: libcurl, OpenSSL, nlohmann/json
//   Linux:   sudo apt install libcurl4-openssl-dev libssl-dev nlohmann-json3-dev
//   vcpkg:   vcpkg install curl openssl nlohmann-json
//   Compile: g++ -std=c++17 apex.cpp -lcurl -lcrypto -o apex

#include <curl/curl.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>

using json = nlohmann::json;

static const std::string API_BASE       = "${BASE}";
static const std::string SIGNING_SECRET = "${SIGNING_SECRET}";
static const std::string SESSION_TOKEN  = "<paste-session-token>";

static std::string to_hex(const unsigned char* data, size_t len) {
    std::ostringstream oss;
    oss << std::hex << std::setfill('0');
    for (size_t i = 0; i < len; ++i) oss << std::setw(2) << (int)data[i];
    return oss.str();
}

static std::string hmac_sha256(const std::string& key, const std::string& msg) {
    unsigned char out[EVP_MAX_MD_SIZE];
    unsigned int len = 0;
    HMAC(EVP_sha256(),
         key.data(), (int)key.size(),
         (const unsigned char*)msg.data(), msg.size(),
         out, &len);
    return to_hex(out, len);
}

static std::string nonce_hex(size_t bytes = 12) {
    std::vector<unsigned char> buf(bytes);
    RAND_bytes(buf.data(), (int)bytes);
    return to_hex(buf.data(), buf.size());
}

static std::string now_ms() {
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                  std::chrono::system_clock::now().time_since_epoch()).count();
    return std::to_string(ms);
}

static size_t write_cb(void* ptr, size_t sz, size_t nm, void* ud) {
    static_cast<std::string*>(ud)->append((char*)ptr, sz * nm);
    return sz * nm;
}

struct Response { long status; std::string body; };

Response apex_request(const std::string& method,
                      const std::string& path,
                      const std::string& body = "") {
    std::string ts    = now_ms();
    std::string nonce = nonce_hex();
    std::string payload = method + ":" + path + ":" + ts + ":" + nonce + ":" + body;
    std::string sig = hmac_sha256(SIGNING_SECRET, payload);

    CURL* c = curl_easy_init();
    Response res{0, ""};
    if (!c) return res;

    struct curl_slist* h = nullptr;
    h = curl_slist_append(h, "Content-Type: application/json");
    h = curl_slist_append(h, ("Authorization: Bearer " + SESSION_TOKEN).c_str());
    h = curl_slist_append(h, ("X-Apex-Timestamp: " + ts).c_str());
    h = curl_slist_append(h, ("X-Apex-Nonce: "     + nonce).c_str());
    h = curl_slist_append(h, ("X-Apex-Signature: " + sig).c_str());

    std::string url = API_BASE + path;
    curl_easy_setopt(c, CURLOPT_URL, url.c_str());
    curl_easy_setopt(c, CURLOPT_HTTPHEADER, h);
    curl_easy_setopt(c, CURLOPT_CUSTOMREQUEST, method.c_str());
    curl_easy_setopt(c, CURLOPT_WRITEFUNCTION, write_cb);
    curl_easy_setopt(c, CURLOPT_WRITEDATA, &res.body);
    if (!body.empty()) {
        curl_easy_setopt(c, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(c, CURLOPT_POSTFIELDSIZE, (long)body.size());
    }
    curl_easy_perform(c);
    curl_easy_getinfo(c, CURLINFO_RESPONSE_CODE, &res.status);
    curl_slist_free_all(h);
    curl_easy_cleanup(c);
    return res;
}

int main() {
    curl_global_init(CURL_GLOBAL_DEFAULT);

    // 1. Validate a license key
    {
        json body = {{"key", "PASTE-UUID-HERE"}};
        auto r = apex_request("POST", "/check-key", body.dump());
        std::cout << "check-key  " << r.status << "  " << r.body << "\\n";
    }

    // 2. Lookup license metadata
    {
        std::string key = "PASTE-UUID-HERE";
        auto r = apex_request("GET", "/search-key/" + key);
        std::cout << "search-key " << r.status << "  " << r.body << "\\n";
    }

    // 3. Get latest version string
    {
        auto r = apex_request("GET", "/version/latest");
        std::cout << "version    " << r.status << "  " << r.body << "\\n";
    }

    // 4. Download latest build
    {
        auto r = apex_request("GET", "/download/latest");
        std::cout << "download   " << r.status << "  " << r.body.size() << " bytes\\n";
        // Parse JSON, base64-decode "dataUrl", write to disk.
    }

    curl_global_cleanup();
    return 0;
}
`;

export default function Integration() {
  const [lang, setLang] = useState<Lang>("python");
  const [copied, setCopied] = useState(false);
  const code = lang === "python" ? pythonSnippet : cppSnippet;

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(`${lang === "python" ? "Python" : "C++"} snippet copied`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neon">
          <Code2 className="h-3.5 w-3.5" /> Integration
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Client Examples</h1>
        <p className="text-muted-foreground mt-1">
          Drop-in clients for the Apex signed protocol. Replace <span className="font-mono text-neon">SIGNING_SECRET</span> and <span className="font-mono text-neon">SESSION_TOKEN</span> with your own values.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="inline-flex p-1 rounded-lg bg-surface-2 border border-border">
          {(["python", "cpp"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`relative px-4 py-1.5 text-xs uppercase tracking-wider rounded-md transition-colors ${
                lang === l ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === l && (
                <motion.span
                  layoutId="lang-active"
                  className="absolute inset-0 bg-gradient-neon rounded-md shadow-neon"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{l === "python" ? "Python" : "C++"}</span>
            </button>
          ))}
        </div>

        <Button variant="ghostNeon" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy snippet"}
        </Button>
      </div>

      <motion.div
        key={lang}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-border bg-gradient-surface overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-2/60">
          <div className="flex items-center gap-2 text-xs">
            <FileCode2 className="h-3.5 w-3.5 text-neon" />
            <span className="font-mono text-muted-foreground">
              {lang === "python" ? "apex_client.py" : "apex_client.cpp"}
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-neon/60" />
          </div>
        </div>
        <pre className="p-5 text-xs font-mono leading-relaxed overflow-auto max-h-[640px] bg-background/40">
          <code>{code}</code>
        </pre>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "Sign every request", body: "HMAC-SHA256 over METHOD:PATH:TIMESTAMP:NONCE:BODY using your shared secret." },
          { title: "Send 3 headers", body: "X-Apex-Timestamp, X-Apex-Nonce, X-Apex-Signature — plus your bearer token." },
          { title: "Server verifies", body: "Reject if timestamp drift > 5 min, nonce reused, or signature mismatches." },
        ].map((c) => (
          <div key={c.title} className="rounded-lg border border-border bg-surface p-4">
            <div className="text-sm font-semibold text-neon">{c.title}</div>
            <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
