// api/gemini.js
// Menggunakan teknik penemuan model otomatis agar tidak kena error "Model not found"

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
    const { history, images } = await req.json();
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) return new Response(JSON.stringify({ text: "🚨 API Key tidak ditemukan." }), { status: 200, headers: corsHeaders });

    // 1. Coba ambil daftar model yang tersedia di akun lo
    let modelName = "grok-2"; // Fallback default
    try {
      const modelRes = await fetch("https://api.x.ai/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const modelData = await modelRes.json();
      
      if (modelData.data && modelData.data.length > 0) {
        // Ambil model pertama yang tersedia yang mengandung kata "grok"
        const foundModel = modelData.data.find(m => m.id.includes("grok"));
        if (foundModel) modelName = foundModel.id;
      }
    } catch (e) {
      console.log("Gagal deteksi model otomatis, pakai fallback.");
    }

    // 2. Kirim chat ke model yang didapat
    const payload = {
      model: modelName,
      messages: [
        { role: "system", content: "Kamu adalah Kojet AI, asisten cerdas yang dibuat oleh Fajar." },
        ...history.map(m => ({ role: m.role === "model" ? "assistant" : "user", content: m.text }))
      ]
    };

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        text: `🚨 **Grok API Error (${response.status})**\n\nModel yang dicoba: \`${modelName}\`\n\nPesan Grok: \`${data.error?.message || "Unknown error"}\`` 
      }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ text: data.choices[0].message.content }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Server Error" }), { status: 500, headers: corsHeaders });
  }
}
