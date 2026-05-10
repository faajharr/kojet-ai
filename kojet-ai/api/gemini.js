// api/gemini.js
// File ini berjalan di SERVER Vercel menggunakan Edge Runtime

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

  // Handle preflight request (PENTING untuk CORS)
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  // Hanya menerima metode POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Gunakan method POST bro" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Membaca body request (Cara Edge Runtime)
    const body = await req.json();
    const { history, images } = body;

    // --- PERBAIKAN DI SINI ---
    // Mengambil kunci rahasia dari brankas Vercel ke dalam variabel apiKey
    const apiKey = process.env.GOOGLE_AI_KEY;

    // Mengecek apakah apiKey ada (Kode yang lo tanyakan tadi)
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key Vercel belum dipasang" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Menggunakan model Gemini 3.1 Flash Lite sesuai request lo
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    // Format chat history
    const formattedMessages = history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    // Menyisipkan gambar jika ada lampiran
    if (images && images.length > 0) {
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      images.forEach((img) => {
        lastMessage.parts.push({
          inlineData: { mimeType: img.mimeType, data: img.data },
        });
      });
    }

    // Perintah dasar (Sifat) AI Kojet sesuai settingan lo
    const systemPromptText = `Kamu adalah Kojet AI, asisten AI super asik bangt. Diciptakan oleh fajar. jika di tanya siapa kojet ai dan siapa pembuatmu kamu jawab kojet ai adalah ai yang dibuat oleh fajar atau ignya @faajharr_ atau suruh klik logo kamera untuk instagram dan logo telepon untuk wa. Jawab pertanyaan dengan santai, akurat, dan informatif tapi tetap asik. kamu juga bisa bantu mengerjakan tugas mereka.jangan terlalu sering mengenalkan fajar takutnya user jadi ilfil kenalkan pas situasi tertentu saja. fajar adalah mahasiswa teknik elektro universitas tanjungpura yang berada di pontianak. fajar berasal dari sambas. nama kojet di ambil dari nama panggilannya. Kamu juga boleh menggunakan emoji agar kelihatan lebih asik`;

    const payload = {
      contents: formattedMessages,
      systemInstruction: { parts: [{ text: systemPromptText }] },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Header khusus agar API Google tahu ini dari Vercel
        "x-goog-api-client": "gl-node/18.x",
        "User-Agent": "Vercel-Serverless-Function",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Menangkap error dari Google (misal: 403 Forbidden / API Key terblokir)
    if (!response.ok) {
      console.error("Google API Error:", data);
      return new Response(
        JSON.stringify({
          error:
            data.error?.message ||
            `Google API responded with ${response.status}`,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Mengembalikan jawaban sukses ke frontend
    return new Response(
      JSON.stringify({ text: data.candidates[0].content.parts[0].text }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Server Error:", error);
    return new Response(
      JSON.stringify({ error: "Gagal menghubungi AI Server" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}
