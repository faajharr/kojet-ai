// api/gemini.js
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { history, images } = req.body;

    // MENGAMBIL API KEY DARI ENVIRONMENT VARIABLE VERCEL (Aman & Rahasia)
    const apiKey = process.env.GOOGLE_AI_KEY;

    if (!apiKey)
      return res
        .status(500)
        .json({ error: "API Key belum dikonfigurasi di Vercel." });

    // Gunakan model yang paling update (sesuai yang Anda pakai sebelumnya)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const formattedMessages = history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    if (images && images.length > 0) {
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      images.forEach((img) => {
        lastMessage.parts.push({
          inlineData: { mimeType: img.mimeType, data: img.data },
        });
      });
    }

    const systemPromptText = `
    Kamu adalah Kojet AI, asisten AI super asik.
    Fokus: Tugas kuliah & umum.
    ATURAN KREATOR: Jika ditanya siapa pembuatmu, jawab: "Gue diciptain sama fajar."
    `;

    const payload = {
      contents: formattedMessages,
      systemInstruction: { parts: [{ text: systemPromptText }] },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`Google API error: ${response.status}`);
    const data = await response.json();
    return res
      .status(200)
      .json({ text: data.candidates[0].content.parts[0].text });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Gagal menghubungi AI Server" });
  }
}
