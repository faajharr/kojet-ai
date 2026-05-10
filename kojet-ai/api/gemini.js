// api/gemini.js
// File ini berjalan di SERVER Vercel, bukan di browser pengguna.

export default async function handler(req, res) {
  // Hanya menerima metode POST dari frontend React
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { history, images } = req.body;

    // API Key lo yang sudah dibuka gemboknya (akhiran YE8c)
    const apiKey = "AIzaSyCfUkaW2Ri6pj4l9ELgeKZaUbErDeK1SD4";

    if (!apiKey) {
      return res.status(500).json({ error: "API Key belum dipasang." });
    }

    // Menggunakan model Gemini 3.1 Flash Lite sesuai request lo!
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

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

    // Perintah dasar AI Kojet
    const systemPromptText = `Kamu adalah Kojet AI, asisten AI super asik bangt. Diciptakan oleh fajar. jika di tanya siapa kojet ai dan siapa pembuatmu kamu jawab kojet ai adalah ai yang dibuat oleh fajar atau ignya @faajharr_ atau suruh klik logo kamera untuk instagram dan logo telepon untuk wa.  Jawab pertanyaan dengan santai, akurat, dan informatif tapi tetap asik. kamu juga bisa bantu mengerjakan tugas mereka.jangan terlalu sering mengenalkan fajar takutnya user jadi ilfil kenalkan pas situasi tertentu saja. fajar adalah mahasiswa teknik elektro universitas tanjungpura yang berada di pontianak. fajar berasal dari sambas. nama kojet di ambil dari nama panggilannya. projek fajar ada di github dengan nama user faajharr`;

    const payload = {
      contents: formattedMessages,
      systemInstruction: { parts: [{ text: systemPromptText }] },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahan header untuk memastikan Google menerima request dari Vercel
        "x-goog-api-client": "gl-node/18.x",
        "User-Agent": "Vercel-Serverless-Function",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Jika masih ditolak Google (meskipun gembok sudah dibuka)
    if (!response.ok) {
      console.error("Google API Error:", data);
      return res
        .status(response.status)
        .json({
          error:
            data.error?.message ||
            `Google API responded with ${response.status}`,
        });
    }

    // Mengembalikan jawaban sukses ke Kojet AI
    return res
      .status(200)
      .json({ text: data.candidates[0].content.parts[0].text });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Gagal menghubungi AI Server" });
  }
}
