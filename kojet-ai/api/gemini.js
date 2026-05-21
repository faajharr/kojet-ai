// api/gemini.js
// File ini berjalan di SERVER Vercel menggunakan Edge Runtime
// SEKARANG MENGGUNAKAN OTAK GROK AI (xAI) 🔥

export const config = {
  runtime: "edge", // Mantra ajaib biar gak kena limit 10 detik Vercel
};

export default async function handler(req) {
  // Mengatur CORS agar request dari browser diizinkan
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Gunakan method POST bro" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { history, images } = body;

    // --- MENGAMBIL API KEY GROK DARI BRANKAS VERCEL ---
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ text: "🚨 **Error:** API Key Grok (GROK_API_KEY) belum dipasang di Vercel bro!" }),
        {
          status: 200, // Sengaja 200 biar errornya masuk ke layar chatbox
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validImages = (images || []).filter(img => img.mimeType && img.mimeType.startsWith("image/"));
    const invalidFiles = (images || []).filter(img => img.mimeType && !img.mimeType.startsWith("image/"));

    // --- MENGGUNAKAN MODEL YANG LEBIH STABIL ---
    // Grok-2 dan Grok-2-vision adalah alias resmi yang paling stabil saat ini
    const modelName = validImages.length > 0 ? "grok-2-vision" : "grok-2"; 

    // Endpoint Resmi Grok API Chat
    const url = "https://api.x.ai/v1/chat/completions";

    const systemPromptText = `Kamu adalah Kojet AI, sebuah kecerdasan buatan (AI) canggih yang berfungsi secara penuh layaknya asisten virtual serba bisa. Diciptakan oleh Fajar. Jika ditanya siapa Kojet AI dan siapa pembuatmu, jawab: Kojet AI adalah AI yang dibuat oleh Fajar (IG: @faajharr_). Arahkan pengguna untuk klik logo kamera untuk Instagram dan logo telepon untuk WhatsApp. Jawab pertanyaan dengan santai, akurat, informatif, tapi tetap asik. Kamu berfungsi sebagai AI serba bisa: menjawab pertanyaan kompleks, menganalisis data, coding, memecahkan masalah, hingga ngobrol santai. Jangan terlalu sering mengenalkan Fajar takutnya user jadi ilfil, kenalkan pas situasi tertentu saja atau jika ditanya. Fajar adalah mahasiswa teknik elektro Universitas Tanjungpura yang berada di Pontianak. Fajar berasal dari Sambas. Nama Kojet diambil dari nama panggilannya. Projek Fajar ada di Github dengan nama user faajharr`;

    const formattedMessages = [
      { role: "system", content: systemPromptText }
    ];

    history.forEach((m, index) => {
      let role = m.role === "model" ? "assistant" : "user";
      let textContent = m.text || "";

      // Mencegah teks kosong yang ditolak oleh API
      if (!textContent.trim() && role === "user") {
        textContent = "[Mengirim Lampiran]";
      }

      // Jika ada file PDF, sisipkan pesan ke AI bahwa dia hanya bisa baca gambar
      if (index === history.length - 1 && role === "user" && invalidFiles.length > 0) {
        textContent += `\n\n[Sistem: Pengguna mencoba mengirim file PDF atau dokumen non-gambar. Ingatkan pengguna dengan ramah bahwa kamu (Grok) saat ini hanya bisa melihat gambar (JPG/PNG). Arahkan pengguna untuk memotret dokumen tersebut atau copy-paste isi teksnya secara manual.]`;
      }

      // Jika pesan terakhir dan ada lampiran gambar
      if (index === history.length - 1 && role === "user" && validImages.length > 0) {
        let content = [{ type: "text", text: textContent }];
        validImages.forEach((img) => {
          content.push({
            type: "image_url",
            image_url: { url: `data:${img.mimeType};base64,${img.data}` }
          });
        });
        formattedMessages.push({ role, content });
      } else {
        formattedMessages.push({ role, content: textContent });
      }
    });

    const payload = {
      model: modelName,
      messages: formattedMessages,
      temperature: 0.7,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data);
      const debugText = `🚨 **Grok API Error (${response.status}):**\n\nModel terpilih: \`${modelName}\`\n\n**Pesan dari Grok:**\n\`${errorMsg}\`\n\n*Pesan ini sengaja dimunculkan biar lo tau persis masalahnya apa.*`;
      
      return new Response(
        JSON.stringify({ text: debugText }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponseText = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ text: aiResponseText }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Server Error:", error);
    return new Response(
      JSON.stringify({ error: "Gagal menghubungi AI Server Grok" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
