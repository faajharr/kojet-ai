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
    // Pastikan lo udah bikin Environment Variable bernama GROK_API_KEY di setting Vercel
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key Grok (GROK_API_KEY) belum dipasang di Vercel bro!" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Endpoint Resmi Grok API
    const url = "https://api.x.ai/v1/chat/completions";

    // Sifat Kojet AI
    const systemPromptText = `Kamu adalah Kojet AI, sebuah kecerdasan buatan (AI) canggih yang berfungsi secara penuh layaknya asisten virtual serba bisa. Diciptakan oleh Fajar. Jika ditanya siapa Kojet AI dan siapa pembuatmu, jawab: Kojet AI adalah AI yang dibuat oleh Fajar (IG: @faajharr_). Arahkan pengguna untuk klik logo kamera untuk Instagram dan logo telepon untuk WhatsApp. Jawab pertanyaan dengan santai, akurat, informatif, tapi tetap asik. Kamu berfungsi sebagai AI serba bisa: menjawab pertanyaan kompleks, menganalisis data, coding, memecahkan masalah, hingga ngobrol santai. Jangan terlalu sering mengenalkan Fajar takutnya user jadi ilfil, kenalkan pas situasi tertentu saja atau jika ditanya. Fajar adalah mahasiswa teknik elektro Universitas Tanjungpura yang berada di Pontianak. Fajar berasal dari Sambas. Nama Kojet diambil dari nama panggilannya. Projek Fajar ada di Github dengan nama user faajharr`;

    // 1. Format pesan sistem (System Prompt)
    const formattedMessages = [
      { role: "system", content: systemPromptText }
    ];

    // --- PERBAIKAN BUG 400 (BAD REQUEST) ---
    // Grok Vision hanya mendukung gambar (JPG/PNG). Jika user mengirim PDF, Grok akan Error 400.
    // Jadi kita harus memisahkan mana yang gambar asli, dan mana yang PDF/dokumen lain.
    const validImages = (images || []).filter(img => img.mimeType && img.mimeType.startsWith("image/"));
    const invalidFiles = (images || []).filter(img => img.mimeType && !img.mimeType.startsWith("image/"));

    // 2. Format riwayat chat dari frontend ke format Grok/OpenAI
    history.forEach((m, index) => {
      // Grok menggunakan role 'assistant' (bukan 'model' seperti Gemini)
      let role = m.role === "model" ? "assistant" : "user";
      let textContent = m.text || "";

      // Jika user mencoba kirim PDF, kita selipkan instruksi rahasia ke Grok untuk ngasih tau user.
      if (index === history.length - 1 && role === "user" && invalidFiles.length > 0) {
        textContent += `\n\n[Sistem: Pengguna mencoba mengirim file PDF atau dokumen non-gambar. Ingatkan pengguna dengan ramah bahwa kamu (Grok) saat ini hanya bisa melihat gambar (JPG/PNG). Arahkan pengguna untuk memotret dokumen tersebut atau copy-paste isi teksnya secara manual.]`;
      }

      // Jika ini adalah pesan terakhir dari user DAN ada lampiran GAMBAR yang valid
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
        // Pesan teks biasa
        formattedMessages.push({ role, content: textContent });
      }
    });

    // 3. Menentukan Model Grok yang paling stabil
    // Gunakan grok-2-vision-1212 jika ada gambar, jika tidak gunakan grok-2-1212
    const modelName = validImages.length > 0 ? "grok-2-vision-1212" : "grok-2-1212";

    // 4. Menyusun Payload (Data yang dikirim ke Grok)
    const payload = {
      model: modelName,
      messages: formattedMessages,
      temperature: 0.7, // Tingkat kreativitas AI (0.0 kaku - 1.0 sangat kreatif)
    };

    // 5. Menembak Request ke Server Grok
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // 6. Tangkap Error jika Grok menolak (Misal kuota habis/salah key)
    if (!response.ok) {
      console.error("Grok API Error:", data);
      return new Response(
        JSON.stringify({
          error: data.error?.message || `Grok API Error ${response.status}`,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Mengambil jawaban Grok dan mengirimkannya balik ke Frontend
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
