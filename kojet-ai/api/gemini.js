// api/gemini.js
// Perbaikan: Menambahkan logging dan penyesuaian header agar lebih stabil

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response("OK", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method salah" }), { status: 405, headers: corsHeaders });

  try {
    const { history } = await req.json();
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) return new Response(JSON.stringify({ text: "🚨 API Key tidak ditemukan di Vercel." }), { status: 200, headers: corsHeaders });

    // Daftar model yang dicoba
    const modelsToTry = ["grok-2", "grok-2-latest", "grok-beta", "grok-1"];
    let lastError = "";

    for (const modelName of modelsToTry) {
      const payload = {
        model: modelName,
        messages: [
          { role: "system", content: "Kamu adalah Kojet AI, asisten cerdas yang dibuat oleh Fajar." },
          ...history.map(m => ({ role: m.role === "model" ? "assistant" : "user", content: m.text }))
        ]
      };

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "KojetAI-Backend" 
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify({ text: data.choices[0].message.content }), { status: 200, headers: corsHeaders });
      } else {
        const errorData = await response.json().catch(() => ({}));
        lastError = errorData.error?.message || `Status ${response.status}`;
        console.error(`Gagal menggunakan model ${modelName}:`, lastError);
      }
    }

    return new Response(JSON.stringify({ 
      text: `🚨 **Grok API Error**\n\nSemua model percobaan gagal.\nPesan terakhir: \`${lastError}\`\n\nPastikan API Key Anda aktif dan memiliki saldo/akses di portal xAI.` 
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ text: `🚨 Server Error: ${error.message}` }), { status: 200, headers: corsHeaders });
  }
}
