# 🌟 Project Matdis 2  
**Aplikasi Pemrosesan Logika Proposisi — Versi 2**

<img width="100%" src="https://dummyimage.com/1200x250/1e1e2e/ffffff&text=Project+Matdis+2+-+Logic+Processor" />

## 📌 Deployment
🔗 **Akses Aplikasi:**  
👉 [https://projectmatdis2.netlify.app/](https://projectmatdis2.netlify.app/)

# ✨ Tentang Project-Matdis2

**Project-Matdis2** adalah pengembangan lanjutan dari versi sebelumnya (Matdis1).  
Fokus pada versi ini adalah:  
- peningkatan kemampuan logika,  
- UI yang lebih modern,  
- fitur otomatis yang membantu pemula memahami teori.  

Aplikasi ini dibuat untuk mendukung pembelajaran Matematika Diskrit secara interaktif, terutama bagi mahasiswa atau siswa yang baru mempelajari logika proposisi.

# 🚀 Fitur Baru & Utama di Versi 2

### 1️⃣ **Tabel Kebenaran Otomatis**
Sistem dapat menghasilkan *truth table* secara otomatis berdasarkan ekspresi logika yang dimasukkan.  
Mendukung proposisi p, q, r, dan operator seperti:
- AND (∧)  
- OR (∨)  
- NOT (¬)  
- IMPLIES (→)  
- BICONDITIONAL (↔)

---

### 2️⃣ **Deteksi Pola Bahasa Natural**
Aplikasi bisa memahami kalimat sehari-hari seperti:
- “Jika X maka Y”  
- “Karena X maka Y”  
- “X menyebabkan Y”  
- “Y bergantung pada X”

Sistem lalu mengonversinya ke proposisi formal, misalnya:  
**Jika X maka Y → X → Y**

---

### 3️⃣ **Export ke PDF**
Seluruh hasil analisis dapat diekspor menjadi PDF:
- tabel kebenaran  
- negasi / invers  
- pola bahasa natural yang terdeteksi  
- penjelasan teori  
- struktur proposisi

Sangat membantu untuk laporan, tugas, atau arsip belajar.

---

### 4️⃣ **UI Modern Menggunakan Tailwind CSS**
Versi 2 hadir dengan desain baru:
- layout responsive  
- tombol & card modern  
- warna lebih soft  
- pengalaman pengguna jauh lebih nyaman

Tailwind membuat kode lebih rapi dan mudah dikembangkan.

---

### 5️⃣ **Multiple Proposisi (p, q, r)**
Pengguna dapat memasukkan lebih dari satu proposisi.  
Contoh:  
```

(p → q) ∧ ¬r

```
Aplikasi akan:
- memvalidasi  
- menghitung  
- membentuk tabel kebenaran  
- memberikan penjelasan teori  

---

### 6️⃣ **Penjelasan Teori Otomatis**
Setiap output yang dihasilkan aplikasi akan disertai penjelasan, seperti:
- apa itu negasi  
- apa itu implikasi  
- bagaimana tabel kebenaran dihitung  
- apa hubungan p, q, r  
- penjelasan dengan bahasa sederhana untuk pemula  

Sangat cocok untuk mahasiswa baru atau pengguna tanpa dasar logika kuat.

# 📂 Struktur Proyek

```

Project-Matdis2/
│
├── index.html            ← Halaman utama
├── style.css / tailwind  ← Styling modern
├── script.js             ← Logika utama aplikasi
├── pdf.js                ← Modul export PDF
└── README.md

```

# 🔧 Teknologi yang Digunakan

- **HTML5**
- **Tailwind CSS**
- **JavaScript**
- **jsPDF** (untuk export PDF)
- **Netlify** (untuk deployment)

# 🔄 Changelog — Perubahan dari Versi 1 → 2

### 📌 **Versi 1 (Project-Matdis1)**
- Input proposisi sederhana  
- Output negasi & invers dasar  
- UI sangat sederhana  
- Tidak ada tabel kebenaran  
- Tidak ada deteksi bahasa natural  
- Tidak ada export PDF  

### 🚀 **Versi 2 (Project-Matdis2)** — *Update besar*
- ✔ Tabel kebenaran otomatis  
- ✔ Deteksi kalimat bahasa natural  
- ✔ Export PDF  
- ✔ UI modern (Tailwind CSS)  
- ✔ Dukungan multi-proposisi  
- ✔ Penjelasan teori otomatis  

Versi 2 dirancang sebagai pondasi menuju versi 3 yang lebih interaktif.

# 📬 Kontak Developer

**Aziz Husain**  
🔗 https://github.com/HusainAziz2308

# 📄 Lisensi

Proyek ini bebas digunakan untuk pembelajaran, penelitian, dan pengembangan non-komersial.
