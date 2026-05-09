// api/gemini.js

export default async function handler(req, res) {
  // Hanya izinkan request POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan. Harus POST.' });
  }

  try {
    const { history, images } = req.body;

    // Masukkan API Key Google Lo di sini (Gue pakein yang sempet lo kirim kemaren)
    const apiKey = "AIzaSyB2kTofVskr3PThEQfgo8i67jIGF0iYE8c"; 
    
    // Panggil model Gemini yang terbaru dan cepat
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    // Format riwayat pesan dari React biar dimengerti oleh Google
    const formattedMessages = history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    // Sisipkan gambar kalau ada
    if (images && images.length > 0) {
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      images.forEach((img) => {
        lastMessage.parts.push({
          inlineData: { mimeType: img.mimeType, data: img.data },
        });
      });
    }

    // Perintah dasar AI-nya
    const systemInstructionText = "Kamu adalah Kojet AI, asisten AI super asik khusus mahasiswa. Diciptakan oleh faajharr_. Jawab pertanyaan dengan santai tapi informatif.";

    const payload = {
      contents: formattedMessages,
      systemInstruction: { parts: [{ text: systemInstructionText }] }
    };

    // Tembak ke server Google
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Kalau Google nolak (misal API key expired)
    if (!response.ok) {
      console.error("Error Google API:", data);
      return res.status(response.status).json({ error: data.error?.message || 'Error dari Google' });
    }

    // Ambil teks balasannya dan kirim ke Frontend (App.jsx) lo
    const textResponse = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ text: textResponse });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ error: 'Server backend Kojet AI lagi ngadat.' });
  }
}
