import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import * as Lucide from "lucide-react";

// KODE RAHASIA UNTUK MASUK ADMIN PANEL
const ADMIN_SECRET_COMMAND = "/admin-faajharr";

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyDIN1hm-OrQFoiu8mZF_5nGxkwLf7v2Hjw",
  authDomain: "kojet-ai.firebaseapp.com",
  projectId: "kojet-ai",
  storageBucket: "kojet-ai.firebasestorage.app",
  messagingSenderId: "5893049511",
  appId: "1:5893049511:web:2f4c53360f284351fddf82",
  measurementId: "G-X7C0HXJ4XZ",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kojet-ai-v1";

const generateId = () => {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// --- Komponen CodeBlock Premium ---
const CodeBlock = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("code");
  const isHtml =
    lang?.toLowerCase() === "html" ||
    code.trim().toLowerCase().startsWith("<!doctype html>") ||
    code.trim().toLowerCase().startsWith("<html");

  const handleCopy = () => {
    const textarea = document.createElement("textarea");
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal", err);
    }
    document.body.removeChild(textarea);
  };

  return (
    <div className="my-5 rounded-xl overflow-hidden bg-[#1e1e2e] border border-gray-700/60 shadow-lg shadow-black/20 w-full max-w-full">
      <div className="flex justify-between items-center px-4 py-3 bg-[#181825] border-b border-gray-800 overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex gap-1.5 items-center hidden sm:flex">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          {isHtml ? (
            <div className="flex bg-black/40 rounded p-1 shadow-inner shrink-0">
              <button
                onClick={() => setTab("code")}
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded transition-all duration-200 ${tab === "code" ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
              >
                <Lucide.Code size={14} /> Kode
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded transition-all duration-200 ${tab === "preview" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
              >
                <Lucide.Play size={14} /> Preview Website
              </button>
            </div>
          ) : (
            <span className="text-xs font-mono text-blue-400 select-none bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
              {lang || "code"}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors bg-white/5 px-2 py-1.5 rounded-md hover:bg-white/10 shrink-0 ml-2"
        >
          {copied ? (
            <Lucide.Check size={14} className="text-green-400" />
          ) : (
            <Lucide.Copy size={14} />
          )}
          <span className="hidden sm:inline">
            {copied ? "Tersalin" : "Salin"}
          </span>
        </button>
      </div>
      {tab === "code" ? (
        <pre className="p-4 overflow-x-auto text-sm font-mono text-[#cdd6f4] custom-scrollbar w-full">
          <code>{code}</code>
        </pre>
      ) : (
        <div className="bg-white w-full h-[300px] sm:h-[500px] relative">
          <iframe
            srcDoc={code}
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            title="Preview"
          />
        </div>
      )}
    </div>
  );
};

// --- Format Pesan ---
const MessageFormatter = ({ text }) => {
  const blocks = text.split(/(```[\w]*\n[\s\S]*?```)/g);
  const formatText = (content) => {
    let formatted = content
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="text-white font-bold">$1</strong>',
      )
      .replace(
        /`([^`\n]+)`/g,
        '<code class="bg-gray-800 text-pink-300 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono border border-gray-700/50 break-words">$1</code>',
      )
      .replace(/\n/g, "<br>");
    return { __html: formatted };
  };

  return (
    <div className="space-y-4 text-[14px] sm:text-[15px] md:text-base leading-relaxed text-gray-300 break-words w-full">
      {blocks.map((block, index) => {
        if (block.startsWith("```")) {
          const match = block.match(/```([\w]*)\n([\s\S]*?)```/);
          if (!match) return <span key={index}>{block}</span>;
          return <CodeBlock key={index} lang={match[1]} code={match[2]} />;
        }
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={formatText(block)}
            className="overflow-hidden"
          />
        );
      })}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeUid, setActiveUid] = useState(
    localStorage.getItem("kojet_active_uid") || null,
  );
  const [userName, setUserName] = useState(
    localStorage.getItem("kojet_user_name") || "",
  );
  const [isRegistered, setIsRegistered] = useState(
    localStorage.getItem("kojet_active_uid") ? true : false,
  );
  const [viewMode, setViewMode] = useState("chat");

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("kojet_messages_cache");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentChatId, setCurrentChatId] = useState(() => {
    return localStorage.getItem("kojet_current_chat_id") || generateId();
  });

  const [appSettings, setAppSettings] = useState({
    ig: "faajharr_",
    wa: "083153437501",
  });

  const [conversations, setConversations] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [imageAttachments, setImageAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [allUsersStats, setAllUsersStats] = useState([]);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("kojet_current_chat_id", currentChatId);
  }, [currentChatId]);

  useEffect(() => {
    localStorage.setItem("kojet_messages_cache", JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, imageAttachments, viewMode]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const targetUid = activeUid || user.uid;
    const profileRef = doc(db, "artifacts", appId, "user_profiles", targetUid);

    const unsubProfile = onSnapshot(
      profileRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserName(docSnap.data().name);
          setActiveUid(targetUid);
          setIsRegistered(true);
          localStorage.setItem("kojet_active_uid", targetUid);
          localStorage.setItem("kojet_user_name", docSnap.data().name);
        } else {
          if (!activeUid) {
            setIsRegistered(false);
            localStorage.removeItem("kojet_active_uid");
            localStorage.removeItem("kojet_user_name");
            localStorage.removeItem("kojet_messages_cache");
            setMessages([]);
          }
        }
      },
      (err) => console.error("Gagal ambil profil:", err),
    );

    return () => unsubProfile();
  }, [user, activeUid]);

  useEffect(() => {
    if (!activeUid) return;

    const convRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      activeUid,
      "conversations",
    );
    const unsubConv = onSnapshot(convRef, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => data.push(doc.data()));
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setConversations(data);

      const currentConv = data.find((c) => c.id === currentChatId);
      if (currentConv && currentConv.messages.length > 0 && !isLoading) {
        setMessages(currentConv.messages);
      }
    });

    return () => unsubConv();
  }, [activeUid, currentChatId, isLoading]);

  useEffect(() => {
    const settingsRef = doc(db, "artifacts", appId, "public", "settings");
    const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data());
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (viewMode !== "admin_dashboard") return;
    const allUsersRef = collection(db, "artifacts", appId, "user_profiles");
    const unsubAdmin = onSnapshot(allUsersRef, (snapshot) => {
      const stats = [];
      snapshot.forEach((doc) => stats.push(doc.data()));
      stats.sort((a, b) => b.lastActive - a.lastActive);
      setAllUsersStats(stats);
    });
    return () => unsubAdmin();
  }, [viewMode]);

  const handleRegisterName = async (nameInput) => {
    let currentUser = user || auth.currentUser;
    if (!currentUser) {
      alert("Menyiapkan koneksi, coba ketik ulang ya!");
      setIsLoading(false);
      return;
    }

    try {
      const profilesRef = collection(db, "artifacts", appId, "user_profiles");
      const snapshot = await getDocs(profilesRef);

      let existingProfile = null;
      snapshot.forEach((docSnap) => {
        if (docSnap.data().name.toLowerCase() === nameInput.toLowerCase()) {
          existingProfile = docSnap.data();
        }
      });

      let targetUid = currentUser.uid;

      if (existingProfile) {
        targetUid = existingProfile.uid;
        await setDoc(
          doc(db, "artifacts", appId, "user_profiles", targetUid),
          { lastActive: Date.now() },
          { merge: true },
        );

        const convRef = collection(
          db,
          "artifacts",
          appId,
          "users",
          targetUid,
          "conversations",
        );
        const convSnap = await getDocs(convRef);
        const allConvs = [];
        convSnap.forEach((d) => allConvs.push(d.data()));

        if (allConvs.length > 0) {
          allConvs.sort((a, b) => b.updatedAt - a.updatedAt);
          const latestChat = allConvs[0];
          setCurrentChatId(latestChat.id);
          setMessages(latestChat.messages || []);
        } else {
          setMessages([
            {
              role: "model",
              text: `Welcome back, ${existingProfile.name}! Mau dibantu nugas apa hari ini?`,
            },
          ]);
        }
      } else {
        await setDoc(doc(db, "artifacts", appId, "user_profiles", targetUid), {
          uid: targetUid,
          name: nameInput,
          createdAt: Date.now(),
          lastActive: Date.now(),
          totalChats: 0,
          totalMessages: 0,
        });
        setMessages([
          {
            role: "model",
            text: `Salam kenal, ${nameInput}! Gue Kojet AI. Coba ketik soal tugas lu di bawah, biar gue bantu kerjain!`,
          },
        ]);
      }

      setActiveUid(targetUid);
      setUserName(existingProfile ? existingProfile.name : nameInput);
      setIsRegistered(true);

      localStorage.setItem("kojet_active_uid", targetUid);
      localStorage.setItem(
        "kojet_user_name",
        existingProfile ? existingProfile.name : nameInput,
      );
    } catch (error) {
      console.error("Gagal login/register:", error);
      alert("Gagal terhubung ke database. Pastikan koneksi internet aktif.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Yakin mau ganti akun/nama? Riwayat chat lo aman tersimpan kok.")) {
      localStorage.removeItem("kojet_active_uid");
      localStorage.removeItem("kojet_user_name");
      localStorage.removeItem("kojet_messages_cache");
      localStorage.removeItem("kojet_current_chat_id");

      setActiveUid(null);
      setUserName("");
      setIsRegistered(false);
      setMessages([]);
      setConversations([]);
      setCurrentChatId(generateId());
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Beneran mau hapus percakapan ini secara permanen?")) return;

    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "users", activeUid, "conversations", chatId),
      );
      if (currentChatId === chatId) {
        setMessages([]);
        setCurrentChatId(generateId());
      }
    } catch (err) {
      console.error("Gagal hapus chat:", err);
      alert("Gagal menghapus percakapan.");
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const ig = e.target.ig.value.trim();
    const wa = e.target.wa.value.trim();
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "settings"),
        { ig, wa },
        { merge: true },
      );
      alert("Pengaturan kontak berhasil disimpan!");
    } catch (err) {
      alert("Gagal menyimpan pengaturan.");
    }
  };

  const saveConversation = async (chatId, msgs) => {
    if (!activeUid || msgs.length === 0) return;
    let title = "Tugas Baru";
    const firstUserMsg = msgs.find((m) => m.role === "user");
    if (firstUserMsg) {
      title = firstUserMsg.text
        .replace(/\[Mengirim \d+ gambar\]/g, "")
        .substring(0, 30);
      if (title.length >= 30) title += "...";
    }

    try {
      const userMessageCount = msgs.filter((m) => m.role === "user").length;

      await setDoc(
        doc(db, "artifacts", appId, "users", activeUid, "conversations", chatId),
        {
          id: chatId,
          title,
          messages: msgs,
          updatedAt: Date.now(),
        },
      );
      await setDoc(
        doc(db, "artifacts", appId, "user_profiles", activeUid),
        {
          lastActive: Date.now(),
          totalChats:
            conversations.length +
            (conversations.find((c) => c.id === chatId) ? 0 : 1),
          totalMessages: userMessageCount,
        },
        { merge: true },
      );
    } catch (err) {
      console.error("Gagal simpan percakapan:", err);
    }
  };

  const handleToggleSpeech = (text, index) => {
    if (!("speechSynthesis" in window)) {
      alert("Browser lo nggak support fitur suara bro, coba update Chrome/Edge.");
      return;
    }

    const synth = window.speechSynthesis;

    if (speakingIndex === index) {
      if (isPaused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
      return;
    }

    synth.cancel();
    setSpeakingIndex(index);
    setIsPaused(false);

    let cleanText = text.replace(/```[\s\S]*?```/g, "Berikut adalah kodenya. ");
    cleanText = cleanText.replace(/[*_#]/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;

    window.speechUtterance = utterance;

    utterance.onend = () => {
      setSpeakingIndex(null);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        setSpeakingIndex(null);
        setIsPaused(false);
      }
    };

    synth.speak(utterance);
  };

  const exportToWord = (content) => {
    const preHtml =
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='[http://www.w3.org/TR/REC-html40](http://www.w3.org/TR/REC-html40)'><head><meta charset='utf-8'><title>Tugas Kuliah</title></head><body>";
    const postHtml = "</body></html>";
    let htmlContent = content
      .replace(
        /```[\s\S]*?```/g,
        "<p>[Kode dilampirkan terpisah, silakan copy dari web Kojet AI]</p>",
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    const html = preHtml + htmlContent + postHtml;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KojetAI_${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (content) => {
    const printWindow = window.open("", "_blank");
    let htmlContent = content
      .replace(
        /```[\s\S]*?```/g,
        "<br><i>[Kode dilampirkan terpisah di web]</i><br>",
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    printWindow.document.write(
      `<html><head><title>Generated by Kojet AI</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: auto; } h1, h2, h3 { color: #111; } strong { color: #000; }</style></head><body>${htmlContent}</body></html>`,
    );
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const toggleListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition)
      return alert("Browser tidak mendukung Dikte Suara.");
    if (isListening) return setIsListening(false);
    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++)
        currentTranscript += event.results[i][0].transcript;
      if (event.results[0].isFinal)
        setInput(
          (prev) =>
            prev + (prev.endsWith(" ") ? "" : " ") + currentTranscript + " ",
        );
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    files.forEach((file) => {
      const reader = new FileReader();
      if (file.type.startsWith("image/")) {
        reader.onload = (event) =>
          setImageAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              mimeType: file.type,
              data: event.target.result.split(",")[1],
              url: event.target.result,
            },
          ]);
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) =>
          setInput(
            (prev) =>
              prev +
              `\n\n// --- File referensi: ${file.name} ---\n\`\`\`${file.name.split(".").pop()}\n${event.target.result}\n\`\`\`\n`,
          );
        reader.readAsText(file);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index) =>
    setImageAttachments((prev) => prev.filter((_, i) => i !== index));

  const fetchGeminiResponse = async (chatHistory, currentImages) => {
    const url = `/api/gemini`;
    const payload = {
      history: chatHistory,
      images: currentImages || [],
    };

    const delays = [1000, 2000, 4000, 8000];
    for (let i = 0; i < 4; i++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok)
          throw new Error(
            data.error || `HTTP error! status: ${response.status}`,
          );

        return data.text;
      } catch (err) {
        if (i === 3) throw new Error("Gagal menghubungi server Vercel.");
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const currentInput = input.trim();

    if (currentInput === ADMIN_SECRET_COMMAND) {
      setViewMode("admin_dashboard");
      setInput("");
      return;
    }

    if ((!currentInput && imageAttachments.length === 0) || isLoading) return;

    if (!isRegistered) {
      setIsLoading(true);
      await handleRegisterName(currentInput);
      setInput("");
      return;
    }

    let textToSave = currentInput;
    if (imageAttachments.length > 0) textToSave += `\n\n[Mengirim lampiran]`;

    const userMessage = {
      role: "user",
      text: textToSave || "[Lampiran gambar]",
    };
    const newMessages = [...messages, userMessage];
    const imagesToSend = [...imageAttachments];

    setMessages(newMessages);
    setInput("");
    setImageAttachments([]);
    setIsLoading(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      setIsPaused(false);
    }

    saveConversation(currentChatId, newMessages);

    try {
      const aiTextResponse = await fetchGeminiResponse(
        newMessages,
        imagesToSend,
      );
      const updatedMessages = [
        ...newMessages,
        { role: "model", text: aiTextResponse },
      ];
      setMessages(updatedMessages);
      saveConversation(currentChatId, updatedMessages);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "model",
          text: "Waduh sorry bro, server backend Kojet AI lagi ngadat dikit (pastikan sudah jalan di Vercel). Coba kirim ulang ya!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    if (!isRegistered)
      return alert("Isi nama lo di chat dulu ya bro sebelum bikin chat baru!");

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      setIsPaused(false);
    }

    const newId = generateId();
    setCurrentChatId(newId);
    setMessages([]);
    setImageAttachments([]);
    setIsSidebarOpen(false);
  };

  const loadChat = (chatId) => {
    const chat = conversations.find((c) => c.id === chatId);
    if (chat) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setSpeakingIndex(null);
        setIsPaused(false);
      }

      setCurrentChatId(chat.id);
      setMessages(chat.messages || []);
      setImageAttachments([]);
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f111a] text-gray-100 font-sans overflow-hidden">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[280px] bg-[#161925] border-r border-gray-800/60 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl md:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Lucide.TerminalSquare size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide text-white">
              Kojet
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                AI
              </span>
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white bg-white/5 p-1.5 rounded-lg transition-colors"
          >
            <Lucide.X size={20} />
          </button>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => {
              createNewChat();
              setViewMode("chat");
            }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-500 py-3 md:py-2.5 px-4 rounded-xl transition-all font-semibold text-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            <Lucide.Plus size={18} /> Chat Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          <p className="text-[10px] md:text-[11px] font-bold text-gray-500 mb-3 px-3 uppercase tracking-widest">
            Riwayat Percakapan
          </p>
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-600 px-3 italic">
              Belum ada history.
            </p>
          ) : (
            <div className="space-y-1.5">
              {conversations.map((conv) => (
                <div key={conv.id} className="relative group">
                  <button
                    onClick={() => {
                      loadChat(conv.id);
                      setViewMode("chat");
                    }}
                    className={`w-full flex items-center gap-3 text-left px-3 py-3 md:py-2.5 rounded-lg transition-all text-sm pr-10 ${currentChatId === conv.id && viewMode === "chat" ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"}`}
                  >
                    <Lucide.MessageSquare
                      size={16}
                      className={`shrink-0 ${currentChatId === conv.id && viewMode === "chat" ? "text-blue-500" : "text-gray-500"}`}
                    />
                    <span className="truncate">{conv.title}</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteChat(e, conv.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-red-500/10"
                    title="Hapus Chat"
                  >
                    <Lucide.Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800/60 bg-[#161925]">
          <div className="flex items-center gap-3 text-sm text-gray-400 bg-black/20 p-2.5 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0 uppercase">
              <span className="text-xs font-bold text-white">
                {userName ? userName.substring(0, 2) : "?"}
              </span>
            </div>
            <div className="truncate flex-1">
              <p className="font-semibold text-gray-200 text-xs truncate">
                {userName || "Tamu"}
              </p>
              <p className="text-[10px] font-mono opacity-60 truncate mt-0.5">
                ID: {activeUid ? activeUid.substring(0, 6) : "Unknown"}
              </p>
            </div>
            {isRegistered && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Ganti Nama / Logout"
              >
                <Lucide.LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-[#0f111a] w-full max-w-full">
        <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/10 rounded-full blur-[100px] md:blur-[120px] pointer-events-none"></div>

        <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 border-b border-white/5 bg-[#0f111a]/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 text-gray-400 hover:text-white rounded-lg bg-white/5 transition-colors"
            >
              <Lucide.Menu size={22} />
            </button>
            <h1 className="text-[15px] md:text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Lucide.Sparkles
                size={16}
                className={
                  viewMode === "chat" ? "text-blue-400" : "text-emerald-400"
                }
              />
              {viewMode === "chat" ? "Kojet AI Workspace" : "Admin Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-[11px] text-gray-400">
            {viewMode === "admin_dashboard" ? (
              <button
                onClick={() => setViewMode("chat")}
                className="flex items-center gap-1.5 hover:text-red-400 transition-colors bg-red-500/10 text-red-500 px-3 py-1.5 rounded-md"
              >
                <Lucide.LogOut size={14} /> Tutup Admin
              </button>
            ) : (
              <>
                <a
                  href={`https://instagram.com/${appSettings.ig}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-blue-400 transition-colors bg-white/5 px-2 py-1 md:py-1.5 rounded-md"
                >
                  <Lucide.Camera size={12} />{" "}
                  <span className="hidden sm:inline">@{appSettings.ig}</span>
                </a>
                <a
                  href={`https://wa.me/${appSettings.wa}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-green-400 transition-colors bg-white/5 px-2 py-1 md:py-1.5 rounded-md"
                >
                  <Lucide.Phone size={12} />{" "}
                  <span className="hidden sm:inline">{appSettings.wa}</span>
                </a>
              </>
            )}
          </div>
        </header>

        {viewMode === "admin_dashboard" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-[#161925] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <Lucide.Users size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                      Total User
                    </p>
                    <h3 className="text-2xl font-bold text-white">
                      {allUsersStats.length}
                    </h3>
                  </div>
                </div>
                <div className="bg-[#161925] border border-gray-800 p-6 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <Lucide.MessageSquare
                      size={20}
                      className="text-green-400"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                      Total Pesan Dibuat
                    </p>
                    <h3 className="text-2xl font-bold text-white">
                      {allUsersStats.reduce(
                        (acc, curr) => acc + (curr.totalMessages || 0),
                        0,
                      )}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="bg-[#161925] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#1a1d2d]">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lucide.BarChart3 size={16} className="text-blue-400" />{" "}
                    Data Pengguna Kojet AI
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs text-gray-500 uppercase bg-[#0f111a]/50">
                      <tr>
                        <th className="px-6 py-4 font-medium">Nama User</th>
                        <th className="px-6 py-4 font-medium">ID (UID)</th>
                        <th className="px-6 py-4 font-medium">Jumlah Pesan</th>
                        <th className="px-6 py-4 font-medium">
                          Terakhir Aktif
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {allUsersStats.map((u, i) => (
                        <tr
                          key={i}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-gray-200">
                            {u.name}
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] opacity-70">
                            {u.uid}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-500/20">
                              {u.totalMessages || 0} Pesan
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {new Date(u.lastActive).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                      {allUsersStats.length === 0 && (
                        <tr>
                          <td
                            colSpan="4"
                            className="px-6 py-8 text-center text-gray-500 italic"
                          >
                            Belum ada pengguna.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#161925] border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Lucide.Settings size={16} className="text-blue-400" />{" "}
                  Pengaturan Kontak (Tersimpan di Backend)
                </h3>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">
                        Username Instagram
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-gray-500">
                          @
                        </span>
                        <input
                          name="ig"
                          defaultValue={appSettings.ig}
                          className="w-full bg-[#0f111a] border border-gray-700 text-white rounded-xl pl-8 pr-4 py-2.5 focus:outline-none focus:border-blue-500"
                          placeholder="faajharr_"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1.5 block">
                        Nomor WhatsApp
                      </label>
                      <input
                        name="wa"
                        defaultValue={appSettings.wa}
                        className="w-full bg-[#0f111a] border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-green-500"
                        placeholder="0831xxx"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors w-full md:w-auto"
                  >
                    Simpan Pengaturan
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {viewMode === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 custom-scrollbar relative z-0 w-full">
              <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-10 w-full">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center mt-6 md:mt-24 opacity-90 animate-fade-in px-2 w-full">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative">
                      <Lucide.TerminalSquare
                        size={20}
                        className="text-blue-400 md:w-10 md:h-10 relative z-10"
                      />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 md:mb-3 tracking-tight px-4">
                      {!isRegistered
                        ? "Selamat Datang di Kojet AI!"
                        : `Tugas Apa Hari Ini, ${userName}?`}
                    </h2>
                    <p className="text-gray-400 max-w-[280px] md:max-w-md text-xs md:text-sm leading-relaxed mb-6 md:mb-8">
                      {!isRegistered
                        ? "Gue asisten nugas lo. Sebelum mulai ngobrol, ketik nama panggilan lo di bawah ini dulu ya!"
                        : "Gue Kojet AI. Ketik aja tugas kuliah lo, minta kodingan, atau upload file dokumen lo di sini."}
                    </p>

                    {isRegistered && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl text-left px-2">
                        <button
                          onClick={() =>
                            setInput("Siapa Kojet AI dan siapa pembuatmu?")
                          }
                          className="p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-[13px] md:text-sm text-gray-300 transition-all hover:scale-[1.02] group"
                        >
                          <span className="flex items-center gap-2 text-blue-400 font-medium mb-1">
                            <Lucide.Sparkles size={14} /> Kenalan
                          </span>
                          "Siapa Kojet AI dan siapa kreator lo?"
                        </button>
                        <button
                          onClick={() =>
                            setInput(
                              "Buatkan makalah 3 paragraf tentang Pengaruh AI di Bidang Pendidikan dan siapkan format Word/PDF nya",
                            )
                          }
                          className="p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 text-[13px] md:text-sm text-gray-300 transition-all hover:scale-[1.02] group"
                        >
                          <span className="flex items-center gap-2 text-purple-400 font-medium mb-1">
                            <Lucide.FileText size={14} /> Nugas Makalah
                          </span>
                          "Buatin esai tentang AI dan kasih tombol Word-nya"
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"} w-full`}
                    >
                      <div
                        className={`flex gap-3 md:gap-5 w-full ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg mt-1 md:mt-0 ${msg.role === "user" ? "bg-gradient-to-br from-blue-600 to-indigo-600" : "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"}`}
                        >
                          {msg.role === "user" ? (
                            <span className="text-[11px] md:text-sm font-bold text-white uppercase">
                              {userName ? userName.substring(0, 2) : "ME"}
                            </span>
                          ) : (
                            <Lucide.TerminalSquare
                              size={16}
                              className="text-blue-400 md:w-5 md:h-5"
                            />
                          )}
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl md:rounded-3xl px-4 py-3 md:px-6 md:py-4 shadow-xl overflow-hidden ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-[#181a25] border border-white/5 text-gray-100 rounded-tl-sm w-full"}`}
                        >
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-[14px] md:text-[15px]">
                              {msg.text}
                            </p>
                          ) : (
                            <MessageFormatter text={msg.text} />
                          )}
                        </div>
                      </div>
                      {msg.role === "model" && (
                        <div className="flex flex-wrap gap-2 ml-11 md:ml-16 mt-1 mb-2">
                          <button
                            onClick={() => handleToggleSpeech(msg.text, index)}
                            className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-medium bg-green-600/20 text-green-400 hover:bg-green-600/40 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg transition-colors border border-green-500/20 w-[85px] justify-center"
                          >
                            {speakingIndex === index && !isPaused ? (
                              <>
                                <Lucide.Pause
                                  size={12}
                                  className="md:w-3.5 md:h-3.5"
                                />{" "}
                                Pause
                              </>
                            ) : speakingIndex === index && isPaused ? (
                              <>
                                <Lucide.Play
                                  size={12}
                                  className="md:w-3.5 md:h-3.5"
                                />{" "}
                                Lanjut
                              </>
                            ) : (
                              <>
                                <Lucide.Volume2
                                  size={12}
                                  className="md:w-3.5 md:h-3.5"
                                />{" "}
                                Bacakan
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => exportToWord(msg.text)}
                            className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg transition-colors border border-blue-500/20"
                          >
                            <Lucide.FileText
                              size={12}
                              className="md:w-3.5 md:h-3.5"
                            />{" "}
                            Word
                          </button>
                          <button
                            onClick={() => exportToPDF(msg.text)}
                            className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/40 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg transition-colors border border-red-500/20"
                          >
                            <Lucide.Printer
                              size={12}
                              className="md:w-3.5 md:h-3.5"
                            />{" "}
                            PDF
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3 md:gap-5 w-full">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center shrink-0">
                      <Lucide.TerminalSquare
                        size={16}
                        className="text-blue-400 md:w-5 md:h-5"
                      />
                    </div>
                    <div className="bg-[#181a25] border border-white/5 rounded-2xl md:rounded-3xl rounded-tl-sm px-5 py-3 md:px-6 md:py-4 flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div
                          className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                      <span className="text-[13px] md:text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse">
                        {!isRegistered
                          ? "Kojet lagi siapin akun lo..."
                          : "Kojet lagi mikir..."}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-6 md:h-8" />
              </div>
            </div>

            <div className="p-2 md:p-4 bg-[#0f111a] md:bg-gradient-to-t md:from-[#0f111a] md:via-[#0f111a] md:to-transparent shrink-0 relative z-30">
              <div className="max-w-4xl mx-auto w-full">
                {imageAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 md:gap-3 mb-2 md:mb-3 p-2 md:p-3 bg-white/5 backdrop-blur-md rounded-xl md:rounded-2xl border border-white/5">
                    {imageAttachments.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative group w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl border border-gray-600 overflow-hidden shadow-lg"
                      >
                        <img
                          src={img.url}
                          alt="attachment"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute inset-0 bg-red-500/80 md:opacity-0 md:group-hover:opacity-100 flex items-center justify-center transition-all opacity-100 sm:opacity-0"
                        >
                          <Lucide.Trash2
                            size={16}
                            className="text-white md:w-5 md:h-5"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form
                  onSubmit={handleSendMessage}
                  className="relative flex items-end gap-1.5 md:gap-2 bg-[#161925] p-1.5 md:p-2 rounded-2xl md:rounded-3xl border border-gray-700/50 shadow-xl md:shadow-2xl md:shadow-black/50 focus-within:border-blue-500/50 focus-within:ring-2 md:focus-within:ring-4 focus-within:ring-blue-500/10 transition-all w-full"
                >
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".txt,.js,.html,.css,.py,.doc,.docx,.pdf,image/*"
                  />

                  <button
                    type="button"
                    disabled={!isRegistered}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 md:p-3.5 rounded-full transition-colors shrink-0 ${!isRegistered ? "text-gray-600 opacity-50 cursor-not-allowed" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                    title="Upload File/Foto"
                  >
                    <Lucide.Paperclip size={20} className="md:w-5 md:h-5" />
                  </button>

                  <div className="flex-1 relative w-full">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          window.innerWidth > 768
                        ) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={
                        !isRegistered
                          ? "Ketik nama panggilan lo buat mulai..."
                          : isListening
                            ? "Ngomong aja bro..."
                            : "Ketik soal tugas (Rahasia admin: /admin-faajharr)..."
                      }
                      className={`w-full bg-transparent text-gray-100 placeholder-gray-500 md:placeholder-gray-600 rounded-xl md:rounded-2xl px-1 md:px-2 py-3 md:py-3.5 focus:outline-none resize-none min-h-[44px] md:min-h-[52px] max-h-[120px] md:max-h-[200px] custom-scrollbar block text-[14px] md:text-[15px] ${isListening ? "animate-pulse text-blue-400 placeholder-blue-500" : ""}`}
                      rows={Math.min(4, (input.match(/\n/g) || []).length + 1)}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={!isRegistered}
                    onClick={toggleListening}
                    className={`p-2.5 md:p-3.5 rounded-full transition-all duration-300 shrink-0 ${!isRegistered ? "text-gray-600 opacity-50 cursor-not-allowed" : isListening ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                    title="Dikte Suara"
                  >
                    {isListening ? (
                      <Lucide.MicOff size={18} className="md:w-5 md:h-5" />
                    ) : (
                      <Lucide.Mic size={20} className="md:w-5 md:h-5" />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={
                      (!input.trim() && imageAttachments.length === 0) ||
                      isLoading
                    }
                    className="p-2.5 md:p-3.5 mr-0.5 md:mr-1 mb-0.5 md:mb-1 rounded-full md:rounded-[1.2rem] bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 transition-all shadow-lg disabled:shadow-none shrink-0 active:scale-95"
                  >
                    <Lucide.Send
                      size={20}
                      className={`md:w-5 md:h-5 ${input.trim() || imageAttachments.length > 0 ? "translate-x-0.5 -translate-y-0.5 md:translate-x-1 md:-translate-y-1" : ""}`}
                    />
                  </button>
                </form>
                <div className="text-center mt-2 md:mt-3 hidden md:block">
                  <span className="text-[10px] md:text-[11px] font-medium text-gray-500 bg-[#161925] px-3 py-1 rounded-full border border-gray-800/50">
                    Created by @{appSettings.ig} ✨ AI Partner Mahasiswa
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        @media (min-width: 768px) { .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `,
        }}
      />
    </div>
  );
}
