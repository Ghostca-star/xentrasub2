// Simpan di: api/sub2unlock.js
// Endpoint: https://domain-lo.vercel.app/api/sub2unlock?url=https://sub2unlock.io/xxx

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
        const finalUrl = await bypassSub2Unlock(targetUrl);
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
// LOGIC BYPASS
// ==========================================
async function bypassSub2Unlock(inputUrl) {
    // 1. Fetch halaman
    const response = await fetch(inputUrl, {
        headers: {
            "user-agent": UA,
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.9",
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} saat fetch target`);
    }
    
    const html = await response.text();
    
    // 2. Ekstrak URL target (Regex)
    // Prioritas 1: <a class="get-link" href="...">
    let match = html.match(/<a[^>]+class=["'][^"']*get-link[^"']*["'][^>]+href=["']([^"']+)["']/i);
    
    // Prioritas 2: Posisi href sebelum class
    if (!match) {
        match = html.match(/<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*get-link[^"']*["']/i);
    }
    
    // Prioritas 3: Link luar (bukan sub2unlock)
    if (!match) {
        match = html.match(/href=["'](https?:\/\/(?!sub2unlock|link2unlock)[^"']+)["']/i);
    }
    
    // Prioritas 4: Meta Refresh
    if (!match) {
        match = html.match(/http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/i);
    }

    if (!match) {
        throw new Error("Gagal menemukan URL target di halaman sub2unlock");
    }
    
    // Decode HTML entity (kayak &amp; jadi &)
    return match[1].replace(/&amp;/g, '&');
}