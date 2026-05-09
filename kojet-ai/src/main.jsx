import React from "react";
import ReactDOM from "react-dom/client";
// Menghilangkan ekstensi .jsx seringkali membantu bundler (seperti Vite atau esbuild)
// untuk mendeteksi file secara otomatis jika terjadi masalah pada resolusi path eksplisit.
import App from "./App";
import "./index.css";

// Memastikan elemen root tersedia di DOM sebelum melakukan rendering.
// Ini membantu mendiagnosa masalah jika index.html tidak memiliki <div id="root"></div>
const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  // Jika layar tetap blank, pesan ini akan muncul di Console (F12) untuk membantu debugging.
  console.error(
    "Gagal memulai aplikasi: Elemen dengan ID 'root' tidak ditemukan di index.html.",
  );
}
