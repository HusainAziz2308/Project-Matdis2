/* ===========================
   Utility & Parsing Engine
   =========================== */

const maxVars = 3;

// simple keyword lists (bahasa indonesia)
const kwAnd = [" dan "];
const kwIf = ["jika ", "apabila ", "kalau ", "kalo ", "bila "];
const kwThen = [" maka ", " sehingga ", " sehingga "];
const kwBecause = ["karena ", "sebab ", "oleh karena "];
const kwCause = ["menyebabkan", "mengakibatkan", "akibatnya", "sebabkan"];
const kwIfReverse = [" terjadi jika ", " jika terjadi "];

function normalizeText(s) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

// ekstraksi klausa (simple): kembalikan array klausa (string)
function extractClauses(text) {
  let t = normalizeText(text);

  // 1) pola "jika X maka Y"
  for (let pre of kwIf) {
    if (t.includes(pre) && (t.includes(" maka ") || t.includes(", maka "))) {
      let afterIf = t.split(pre)[1];
      let parts = afterIf.split(/ maka |, maka | maka, /);
      if (parts.length >= 2) {
        let X = parts[0].trim();
        let Y = parts.slice(1).join(" maka ").trim();
        return [X, Y];
      }
    }
  }

  // 1b) pola "Y terjadi jika X"
  for (let p of kwIfReverse) {
    if (t.includes(p)) {
      let parts = t.split(p);
      if (parts.length >= 2) {
        let Y = parts[0].trim();
        let X = parts.slice(1).join(p).trim();
        return [X, Y];
      }
    }
  }

  // 2) pola "X dan Y"
  for (let a of kwAnd) {
    if (t.includes(a)) {
      let rawParts = t.split(a).map(s => s.trim());
      let clauses = [];
      for (let rp of rawParts) {
        rp.split(",").map(x => x.trim()).forEach(x => { if (x) clauses.push(x); });
      }
      return clauses.slice(0, maxVars);
    }
  }

  // 3) pola "X menyebabkan Y"
  for (let p of kwCause) {
    if (t.includes(p)) {
      let parts = t.split(p);
      if (parts.length >= 2) {
        let X = parts[0].trim();
        let Y = parts.slice(1).join(p).trim();
        return [X, Y];
      }
    }
  }

  // 4) pola "karena X maka Y"
  for (let p of kwBecause) {
    if (t.includes(p) && t.includes(" maka ")) {
      let after = t.split(p)[1].trim();
      let parts = after.split(" maka ");
      if (parts.length >= 2) {
        let X = parts[0].trim();
        let Y = parts.slice(1).join(" maka ").trim();
        return [X, Y];
      }
    }
  }

  // fallback: coba split comma
  if (t.includes(",")) {
    let cs = t.split(",").map(x => x.trim()).filter(Boolean).slice(0, maxVars);
    if (cs.length > 1) return cs;
  }

  return [t];
}

/* ===========================
   Logic Helpers
   =========================== */

function boolToTF(b) { return b ? "T" : "F"; }
function impl(p, q) { return (!p) || q; }


/* ===========================
   UI ELEMENTS
   =========================== */

const inputEl = document.getElementById("inputText");
const btnProcess = document.getElementById("btnProcess");
const btnClear = document.getElementById("btnClear");

const extractionArea = document.getElementById("extractionArea");
const mappingControls = document.getElementById("mappingControls");
const logicForms = document.getElementById("logicForms");
const logicOutputs = document.getElementById("logicOutputs");

const truthCard = document.getElementById("truthCard");
const truthTableWrap = document.getElementById("truthTableWrap");

const theoryCard = document.getElementById("theoryCard");
const theoryText = document.getElementById("theoryText");

const modeFormal = document.getElementById("modeFormal");

const historyList = document.getElementById("historyList");
const clearHistory = document.getElementById("clearHistory");

const exportPdf = document.getElementById("exportPdf");

const varCountBadge = document.getElementById("varCountBadge");

let currentState = { clauses: [], mapping: null };


/* ===========================
   HISTORY SYSTEM
   =========================== */

function escapeHtml(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function loadHistory() {
  const data = JSON.parse(localStorage.getItem("logicpro_history") || "[]");
  if (data.length === 0) {
    historyList.innerHTML = "<p class='text-slate-500'>Riwayat kosong.</p>";
    return;
  }
  historyList.innerHTML = "";

  data.slice().reverse().forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between py-1 text-xs";
    row.innerHTML = `
      <span>${escapeHtml(item.input)}</span>
      <button class="reprocess text-blue-600" data-i="${idx}">Proses</button>
    `;
    historyList.appendChild(row);
  });

  document.querySelectorAll(".reprocess").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = parseInt(e.target.dataset.i);
      const data = JSON.parse(localStorage.getItem("logicpro_history") || "[]");
      inputEl.value = data[i].input;
      doProcess();
    });
  });
}

function addHistory(input) {
  const arr = JSON.parse(localStorage.getItem("logicpro_history") || "[]");
  arr.push({ input, at: Date.now() });
  if (arr.length > 50) arr.shift();
  localStorage.setItem("logicpro_history", JSON.stringify(arr));
  loadHistory();
}

clearHistory.addEventListener("click", () => {
  localStorage.removeItem("logicpro_history");
  loadHistory();
});


/* ===========================
   MAIN PROCESS
   =========================== */

btnProcess.addEventListener("click", doProcess);
btnClear.addEventListener("click", () => {
  inputEl.value = "";
  extractionArea.innerHTML = "";
  mappingControls.innerHTML = "";
  logicOutputs.innerHTML = "";
  logicForms.classList.add("hidden");
  truthCard.classList.add("hidden");
  theoryCard.classList.add("hidden");
  varCountBadge.textContent = "0 proposisi";
});

function doProcess() {
  const raw = inputEl.value.trim();
  if (!raw) return alert("Masukkan kalimat dulu.");

  const clauses = extractClauses(raw);
  currentState.clauses = clauses;
  currentState.raw = raw;

  const vars = clauses.slice(0, maxVars);
  currentState.vars = vars;

  renderExtraction(clauses);
  renderMappingControls(vars);
  produceLogicFromMapping();
  addHistory(raw);
}


/* ===========================
   EXTRACTION RENDER
   =========================== */

function renderExtraction(clauses) {
  extractionArea.innerHTML = "";
  varCountBadge.textContent = `${clauses.length} proposisi`;

  clauses.forEach((c, i) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <div class="keyword mb-2">
        <strong>${String.fromCharCode(112 + i)}</strong> = ${escapeHtml(c)}
      </div>`;
    extractionArea.appendChild(div);
  });
}


/* ===========================
   MAPPING CONTROLS
   =========================== */

function renderMappingControls(vars) {
  mappingControls.innerHTML = "";

  if (vars.length === 1) {
    mappingControls.innerHTML = `<p class="text-sm text-slate-500">
      Hanya satu proposisi. Tambahkan pola seperti "Jika X maka Y".
    </p>`;
    return;
  }

  const info = document.createElement("p");
  info.className = "text-sm mb-2";
  info.textContent = "Pilih antecedent (sebab) dan consequent (akibat).";
  mappingControls.appendChild(info);

  // antecedent checkboxes
  const ancDiv = document.createElement("div");
  ancDiv.className = "flex items-center gap-3 mb-2";
  ancDiv.innerHTML = `<span class="text-sm font-medium">Antecedent:</span>`;
  vars.forEach((v, i) => {
    const label = document.createElement("label");
    label.className = "text-sm flex items-center gap-1";
    label.innerHTML = `<input type="checkbox" data-i="${i}" ${i === 0 ? "checked" : ""}> ${escapeHtml(v)}`;
    ancDiv.appendChild(label);
  });
  mappingControls.appendChild(ancDiv);

  // consequent dropdown
  const consDiv = document.createElement("div");
  consDiv.className = "flex items-center gap-3 mb-2";
  consDiv.innerHTML = `<span class="text-sm font-medium">Consequent:</span>`;
  const sel = document.createElement("select");
  sel.id = "consSelect";
  sel.className = "custom-select border rounded px-2 py-1";
  vars.forEach((v, i) => {
    let opt = document.createElement("option");
    opt.value = i;
    opt.textContent = v;
    if (i === 1) opt.selected = true;
    sel.appendChild(opt);
  });
  consDiv.appendChild(sel);
  mappingControls.appendChild(consDiv);

  const apply = document.createElement("button");
  apply.textContent = "Terapkan Mapping";
  apply.className = "px-3 py-1 bg-indigo-600 text-white rounded text-sm";
  apply.addEventListener("click", () => produceLogicFromMapping());
  mappingControls.appendChild(apply);
}


/* ===========================
   LOGIC GENERATION
   =========================== */

function produceLogicFromMapping() {
  const vars = currentState.vars;
  if (!vars || vars.length === 0) return;

  const ancIdx = Array.from(mappingControls.querySelectorAll("input[type=checkbox]"))
    .filter(c => c.checked)
    .map(c => parseInt(c.dataset.i));

  const consIdx = parseInt(document.getElementById("consSelect").value);

  const finalAncIdx = ancIdx.filter(i => i !== consIdx);
  const finalAnc = finalAncIdx.length ? finalAncIdx.map(i => vars[i]) : [vars[0]];
  const consequent = vars[consIdx];

  const symNames = ["p", "q", "r"];
  let mapping = {};
  vars.forEach((v, i) => mapping[symNames[i]] = v);

  currentState.mapping = {
    mapping,
    antecedent: finalAnc,
    consequent
  };

  renderLogicOutputs(finalAnc, consequent);
  generateTruthTableRender(finalAnc, consequent);
  renderTheory();
}


/* ===========================
   LOGIC OUTPUT RENDER
   =========================== */

function renderLogicOutputs(ancArr, cons) {
  logicForms.classList.remove("hidden");
  logicOutputs.innerHTML = "";

  const modeF = modeFormal.checked;

  const symMap = {};
  currentState.vars.forEach((v, i) => symMap[v] = String.fromCharCode(112 + i));

  const ancSym = ancArr.map(a => symMap[a]).join(" ∧ ");
  const consSym = symMap[cons];

  const implSym = `${ancSym} → ${consSym}`;
  const negSym = `¬(${ancSym} → ${consSym})`;
  const convSym = `${consSym} → ${ancSym}`;
  const invSym = `¬(${ancSym}) → ¬(${consSym})`;
  const contraSym = `¬(${consSym}) → ¬(${ancSym})`;

  const ancNat = ancArr.join(" dan ");
  const consNat = cons;

  const items = [
    ["Implikasi", implSym, `Jika ${ancNat}, maka ${consNat}.`],
    ["Negasi", negSym, `${ancNat} dan tidak ${consNat}.`],
    ["Konvers", convSym, `Jika ${consNat}, maka ${ancNat}.`],
    ["Invers", invSym, `Jika tidak ${ancNat}, maka tidak ${consNat}.`],
    ["Kontraposisi", contraSym, `Jika tidak ${consNat}, maka tidak ${ancNat}.`]
  ];

  items.forEach(([title, sym, nat]) => {
    const div = document.createElement("div");
    div.className = "border p-2 rounded mb-2 text-sm";
    div.innerHTML = `
      <div class="font-medium">${title}</div>
      <div class="text-xs mt-1 text-slate-400">${modeF ? sym : escapeHtml(nat)}</div>
      <div class="text-xs mt-1 text-slate-400">(${modeF ? escapeHtml(nat) : sym})</div>
    `;
    logicOutputs.appendChild(div);
  });
}


/* ===========================
   TRUTH TABLE
   =========================== */

function generateTruthTableRender(ancArr, cons) {
  const varsList = Array.from(new Set([...ancArr, cons]));
  const symNames = ["p", "q", "r"];
  const symMap = {};
  varsList.forEach((v, i) => symMap[v] = symNames[i]);

  const rows = [];
  const n = varsList.length;
  const total = 2 ** n;

  function val(row, prop) { return row[symMap[prop]]; }

  for (let i = 0; i < total; i++) {
    const row = {};

    varsList.forEach((v, j) => {
      const bit = (i >> (n - 1 - j)) & 1;
      row[symMap[v]] = bit === 1;
    });

    const A = ancArr.every(a => val(row, a));
    const C = val(row, cons);

    row["impl"] = impl(A, C);
    row["not_impl"] = !row.impl;
    row["conv"] = impl(C, A);
    row["inv"] = impl(!A, !C);
    row["contra"] = impl(!C, !A);

    rows.push(row);
  }

  let html = `<div class="text-xs mb-2">Variabel: ${
    varsList.map(v => `<span class="badge">${symMap[v]} = ${escapeHtml(v)}</span>`).join(" ")
  }</div>`;

  html += `<table class="w-full text-xs border-collapse">
    <thead><tr>
      ${varsList.map(v => `<th class="border px-2 py-1">${symMap[v]}</th>`).join("")}
      <th class="border px-2 py-1">p→q</th>
      <th class="border px-2 py-1">¬(p→q)</th>
      <th class="border px-2 py-1">q→p</th>
      <th class="border px-2 py-1">¬p→¬q</th>
      <th class="border px-2 py-1">¬q→¬p</th>
    </tr></thead><tbody>`;

  rows.forEach(r => {
    html += `<tr>
      ${varsList.map(v => `<td class="border px-2 py-1 text-center">${boolToTF(r[symMap[v]])}</td>`).join("")}
      <td class="border text-center">${boolToTF(r.impl)}</td>
      <td class="border text-center">${boolToTF(r.not_impl)}</td>
      <td class="border text-center">${boolToTF(r.conv)}</td>
      <td class="border text-center">${boolToTF(r.inv)}</td>
      <td class="border text-center">${boolToTF(r.contra)}</td>
    </tr>`;
  });

  html += "</tbody></table>";

  truthTableWrap.innerHTML = html;
  truthCard.classList.remove("hidden");
}


/* ===========================
   THEORY CARD
   =========================== */

function renderTheory() {
  theoryText.innerHTML = `
    <p><strong>Negasi</strong> dari (p → q) adalah ¬(p → q), yang ekuivalen dengan p ∧ ¬q.</p>
    <p><strong>Konvers</strong> adalah q → p.</p>
    <p><strong>Invers</strong> adalah ¬p → ¬q.</p>
    <p><strong>Kontraposisi</strong> adalah ¬q → ¬p dan selalu ekuivalen dengan p → q.</p>
  `;
  theoryCard.classList.remove("hidden");
}


/* ===========================
   EXPORT PDF
   =========================== */

exportPdf.addEventListener("click", () => {
  if (!currentState.raw) return alert("Proses dulu input sebelum export.");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = 40;

  doc.setFontSize(14);
  doc.text("Project Matdis 2 — Hasil Logika", 40, y); 
  y += 20;

  doc.setFontSize(11);
  doc.text("Input: " + currentState.raw, 40, y);
  y += 20;

  if (currentState.mapping) {
    const A = currentState.mapping.antecedent.join(" ∧ ");
    const C = currentState.mapping.consequent;

    doc.text("Antecedent: " + A, 40, y);
    y += 14;
    doc.text("Consequent: " + C, 40, y);
    y += 20;
  }

  Array.from(logicOutputs.children).forEach(div => {
    const title = div.querySelector(".font-medium")?.textContent || "";
    const text = div.querySelector(".text-xs")?.textContent || "";

    doc.setFontSize(11);
    doc.text(title, 40, y);
    y += 14;

    const lines = doc.splitTextToSize(text, 500);
    doc.text(lines, 40, y);
    y += lines.length * 12 + 10;

    if (y > 720) {
      doc.addPage();
      y = 40;
    }
  });

  doc.save("Project Matdis 2 - Hasil Logika.pdf");
});


/* ===========================
   ADD CTRL+ENTER
   =========================== */

inputEl.addEventListener("keydown", e => {
  if (e.ctrlKey && e.key === "Enter") doProcess();
});


/* === INITIAL LOAD === */
loadHistory();
