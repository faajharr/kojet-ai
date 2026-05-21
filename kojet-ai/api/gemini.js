// api/gemini.js
// Perbaikan: Menggunakan daftar model statis resmi untuk menghindari error deteksi dinamis

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response("OK", { headers: headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method salah" }), { status: 405, headers: corsHeaders });

  try {
    const { history } = await req.json();
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) return new Response(JSON.stringify({ text: "🚨 API Key tidak ditemukan." }), { status: 200, headers: corsHeaders });

    // Daftar model resmi yang diakui xAI saat ini
    // Kita gunakan 'grok-beta' sebagai cadangan jika 'grok-2' tidak ditemukan di akun tertentu
    const modelName = "grok-beta"; 

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

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        text: `🚨 **Grok API Error (${response.status})**\n\nModel yang dicoba: \`${modelName}\`\n\nPesan Grok: \`${data.error?.message || JSON.stringify(data)}\`` 
      }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ text: data.choices[0].message.content }), { status: 200, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ text: `🚨 Server Error: ${error.message}` }), { status: 200, headers: corsHeaders });
  }
}
