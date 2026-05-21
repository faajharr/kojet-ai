// api/gemini.js
// Perbaikan: Menambahkan mekanisme fallback otomatis untuk model xAI

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

    if (!apiKey) return new Response(JSON.stringify({ text: "🚨 API Key tidak ditemukan." }), { status: 200, headers: corsHeaders });

    // Daftar model yang akan dicoba satu per satu jika gagal
    const modelsToTry = ["grok-2", "grok-2-latest", "grok-beta", "grok-1"];
    let lastError = "";
    let data = null;
    let success = false;

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
          "Authorization": `Bearer ${apiKey}` 
        },
        body: JSON.stringify(payload),
      });

      data = await response.json();

      if (response.ok) {
        success = true;
        return new Response(JSON.stringify({ text: data.choices[0].message.content }), { status: 200, headers: corsHeaders });
      } else {
        lastError = data.error?.message || "Unknown error";
      }
    }

    // Jika semua model gagal
    return new Response(JSON.stringify({ 
      text: `🚨 **Grok API Error**\n\nSemua model percobaan gagal. \n\nPesan terakhir: \`${lastError}\`\n\nPastikan API Key lo punya akses ke model-model xAI.` 
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ text: `🚨 Server Error: ${error.message}` }), { status: 200, headers: corsHeaders });
  }
}
