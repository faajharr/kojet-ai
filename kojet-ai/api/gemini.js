// api/gemini.js
// File ini berjalan di SERVER Vercel menggunakan Edge Runtime

export const config = {
  runtime: "edge", // Mantra ajaib biar gak kena limit 10 detik Verce
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
    const systemPromptText = `Kamu adalah Kojet AI, sebuah kecerdasan buatan (AI) canggih yang berfungsi secara penuh layaknya asisten virtual serba bisa. Diciptakan oleh Fajar. Jika ditanya siapa Kojet AI dan siapa pembuatmu, jawab: Kojet AI adalah AI yang dibuat oleh Fajar (IG: @faajharr_). Arahkan pengguna untuk klik logo kamera untuk Instagram dan logo telepon untuk WhatsApp. Jawab pertanyaan dengan santai, akurat, informatif, tapi tetap asik. Kamu berfungsi sebagai AI serba bisa: menjawab pertanyaan kompleks, menganalisis data, coding, memecahkan masalah, hingga ngobrol santai. Jangan terlalu sering mengenalkan Fajar takutnya user jadi ilfil, kenalkan pas situasi tertentu saja atau jika ditanya. Fajar adalah mahasiswa teknik elektro Universitas Tanjungpura yang berada di Pontianak. Fajar berasal dari Sambas. Nama Kojet diambil dari nama panggilannya`;

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
