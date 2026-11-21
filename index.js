// Simpan di: api/sub2unlock.js
// Endpoint: https://domain-lo.vercel.app/api/sub2unlock?url=https://sub2unlock.io/xxx

const crypto = require('crypto');

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

module.exports = async (req, res) => {
    // --- CORS ---
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    // --- Ambil Target URL ---
    let targetUrl = req.query.url;
    if (req.method === "POST" && req.body) {
        targetUrl = req.body.url || targetUrl;
    }

    if (!targetUrl) {
        return res.status(400).json({ 
            status: "error", 
            message: "Parameter 'url' wajib diisi. Contoh: ?url=https://sub2unlock.io/1aFLf" 
        });
    }

    // --- Eksekusi ---
    try {
        const finalUrl = await bypassSubUnlock(targetUrl);
        return res.status(200).json({
            status: "success",
            original: targetUrl,
            bypass: finalUrl
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

// ==========================================
// LOGIC BYPASS SUB2UNLOCK (FIXED)
// ==========================================
async function bypassSubUnlock(inputUrl) {
    const response = await fetch(inputUrl, {
        headers: {
            "user-agent": UA,
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9",
        }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} saat fetch target`);
    
    const html = await response.text();
    
    // Daftar domain yang harus diabaikan (bukan link tujuan)
    const blacklist = [
        "fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com",
        "google.com", "googleapis.com", "gstatic.com", "cloudflare.com",
        "bootstrapcdn.com", "jquery.com", "w3.org", "schema.org",
        "sub2unlock", "sub4unlock", "link2unlock"
    ];

    const isClean = (url) => !blacklist.some(b => url.includes(b));

    // 1. Cari tag <a> dengan class "get-link"
    let matches = html.match(/<a[^>]+class=["'][^"']*get-link[^"']*["'][^>]+href=["']([^"']+)["']/gi);
    if (matches) {
        for (let m of matches) {
            let link = m.match(/href=["']([^"']+)["']/i);
            if (link && isClean(link[1])) return link[1].replace(/&amp;/g, '&');
        }
    }
    
    // 2. Cari tag <a> dengan href lalu class "get-link" (urutan terbalik)
    matches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*get-link[^"']*["']/gi);
    if (matches) {
        for (let m of matches) {
            let link = m.match(/href=["']([^"']+)["']/i);
            if (link && isClean(link[1])) return link[1].replace(/&amp;/g, '&');
        }
    }

    // 3. Fallback: Cari semua href http/https yang bukan blacklist
    matches = html.match(/href=["'](https?:\/\/[^"']+)["']/gi);
    if (matches) {
        for (let m of matches) {
            let link = m.match(/href=["']([^"']+)["']/i);
            if (link && isClean(link[1])) {
                return link[1].replace(/&amp;/g, '&');
            }
        }
    }

    // 4. Fallback terakhir: Cari di dalam script (kadang link disimpan di variable JS)
    const scriptRegex = /(?:var|let|const)\s+\w+\s*=\s*["'](https?:\/\/(?!sub2unlock|link2unlock|sub4unlock)[^"']+)["']/i;
    const scriptMatch = html.match(scriptRegex);
    if (scriptMatch) {
        return scriptMatch[1].replace(/&amp;/g, '&');
    }

    throw new Error("Link target asli tidak ditemukan di HTML statis. Kemungkinan target butuh eksekusi JavaScript/social action atau halaman dilindungi Cloudflare.");
}
