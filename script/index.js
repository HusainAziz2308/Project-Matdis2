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

  // 1) jika ada pola "jika X maka Y" atau "apabila X maka Y"
  for (let pre of kwIf) {
    if (t.includes(pre) && (t.includes(" maka ") || t.includes(" maka, ") || t.includes(", maka "))) {
      // contoh: "jika X maka Y" atau "jika X, maka Y"
      let afterIf = t.split(pre)[1];
      // split at " maka "
      let parts = afterIf.split(/ maka |, maka | maka, /);
      if (parts.length >= 2) {
        let X = parts[0].trim();
        // gabungkan sisa sebagai Y
        let Y = parts.slice(1).join(" maka ").trim();
        return [X, Y];
      }
    }
  }

  // 1b) pola "Y terjadi jika X" -> balik
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

  // 2) pola "X dan Y" atau "X, Y dan Z" -> split by ' dan '
  for (let a of kwAnd) {
    if (t.includes(a)) {
      // handle commas too
      // split by ' dan ' first to get final conjunction groups, but keep commas as separators for more than 2
      // we'll split on ' dan ' then split the left part by ',' as well
      let rawParts = t.split(a).map(s=>s.trim());
      // rawParts could be ["X", "Y"] or ["X, Y", "Z"] etc.
      // create final clauses by splitting commas in each part
      let clauses = [];
      for (let rp of rawParts) {
        rp.split(",").map(x=>x.trim()).forEach(x => { if (x) clauses.push(x); });
      }
      // if too many clauses, limit to maxVars
      return clauses.slice(0, maxVars);
    }
  }

  // 3) pola "X menyebabkan Y" atau "X menyebabkan bahwa Y"
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

  // 4) pola 'karena X maka Y' (because)
  for (let p of kwBecause) {
    if (t.includes(p) && t.includes(" maka ")) {
      let after = t.split(p)[1].trim();
      let parts = after.split(" maka ");
      if (parts.length>=2) {
        let X = parts[0].trim();
        let Y = parts.slice(1).join(" maka ").trim();
        return [X, Y];
      }
    }
  }

  // fallback: coba split comma untuk >1 klausa
  if (t.includes(",")) {
    let cs = t.split(",").map(x=>x.trim()).filter(Boolean).slice(0, maxVars);
    if (cs.length>1) return cs;
  }

  // kalau tidak dikenali, return single clause
  return [t];
}

/* ===========================
   Logic Helpers
   =========================== */

function boolToTF(b) { return b ? "T" : "F"; }

// Evaluate implication p -> q
function impl(p,q) { return (!p) || q; }

// compute truth table for n vars, vars array like ['p','q'] and formula function that accepts object {p:true,...}
function generateTruthTable(vars, formulaFns) {
  // formulaFns: array of {name, compute: fn(varsObj)}
  const n = vars.length;
  const rows = [];
  const total = Math.pow(2,n);
  for (let i=0;i<total;i++) {
    const row = {};
    for (let j=0;j<n;j++) {
      // assign bits; MSB = vars[0]
      const bit = (i >> (n-1-j)) & 1;
      row[vars[j]] = bit===1;
    }
    // compute each formula result
    formulaFns.forEach(fn => {
      row[fn.name] = fn.compute(row);
    });
    rows.push(row);
  }
  return rows;
}

/* ===========================
   UI & App Logic
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
const varCountBadge = document.getElementById("varCountBadge");
const historyList = document.getElementById("historyList");
const clearHistory = document.getElementById("clearHistory");
const modeFormal = document.getElementById("modeFormal");
const exportPdf = document.getElementById("exportPdf");
const toggleTheme = document.getElementById("toggleTheme");

let currentState = { clauses: [], mapping: null };

// Theme toggle
let dark = false;
toggleTheme.addEventListener("click", ()=>{
  dark = !dark;
  if (dark) {
    document.documentElement.style.background = "#0f172a";
    document.body.classList.add("bg-slate-900","text-slate-100");
    document.body.classList.remove("bg-slate-50","text-slate-800");
    document.body.classList.add("bg-slate-900","text-slate-100","dark-mode");
    document.body.classList.remove("bg-slate-900","text-slate-100","dark-mode");
    toggleTheme.textContent = "Light";
    toggleTheme.classList.remove("bg-slate-800");
    toggleTheme.classList.add("bg-slate-200","text-slate-800");
  } else {
    document.documentElement.style.background = "";
    document.body.classList.remove("bg-slate-900","text-slate-100");
    document.body.classList.add("bg-slate-50","text-slate-800");
    toggleTheme.textContent = "Dark";
    toggleTheme.classList.remove("bg-slate-200","text-slate-800");
    toggleTheme.classList.add("bg-slate-800");
  }
});

// history
function loadHistory() {
  const data = JSON.parse(localStorage.getItem("logicpro_history") || "[]");
  if (data.length===0) {
    historyList.innerHTML = "<p class='text-slate-500'>Riwayat kosong.</p>";
    return;
  }
  historyList.innerHTML = "";
  data.slice().reverse().forEach((item, idx) => {
    const el = document.createElement("div");
    el.className = "flex items-center justify-between py-1";
    el.innerHTML = `<div class="text-xs text-slate-700">${escapeHtml(item.input)}</div>
      <div class="flex gap-2"><button class="reprocess text-blue-600 text-sm" data-i="${idx}">Proses</button></div>`;
    historyList.appendChild(el);
  });
  // attach reprocess
  document.querySelectorAll(".reprocess").forEach(btn => {
    btn.addEventListener("click", (e)=>{
      const idx = parseInt(e.target.getAttribute("data-i"));
      const data = JSON.parse(localStorage.getItem("logicpro_history") || "[]");
      const item = data[idx];
      if (item) {
        inputEl.value = item.input;
        doProcess();
      }
    });
  });
}
function addHistory(input) {
  const arr = JSON.parse(localStorage.getItem("logicpro_history") || "[]");
  arr.push({input, when: new Date().toISOString()});
  // limit to 50
  if (arr.length>50) arr.shift();
  localStorage.setItem("logicpro_history", JSON.stringify(arr));
  loadHistory();
}
clearHistory.addEventListener("click", ()=>{
  localStorage.removeItem("logicpro_history");
  loadHistory();
});

/* Escape basic HTML for listing */
function escapeHtml(s) { return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

/* main processing */
btnProcess.addEventListener("click", doProcess);
btnClear.addEventListener("click", ()=>{
  inputEl.value = ""; extractionArea.innerHTML = ""; mappingControls.innerHTML = ""; logicOutputs.innerHTML = "";
  logicForms.classList.add("hidden"); truthCard.classList.add("hidden"); theoryCard.classList.add("hidden");
  varCountBadge.textContent = "0 proposisi";
});

function doProcess() {
  const raw = inputEl.value.trim();
  if (!raw) {
    alert("Masukkan kalimat dulu.");
    return;
  }
  const clauses = extractClauses(raw); // array
  currentState.clauses = clauses;
  currentState.raw = raw;
  // default mapping: vars = a,b,c -> p,q,r
  const vars = clauses.slice(0, maxVars);
  currentState.vars = vars;

  // update extraction area
  renderExtraction(clauses);

  // create mapping controls (user can reassign which clause is antecedent/consequent)
  renderMappingControls(vars);

  // produce logic with current default mapping
  produceLogicFromMapping();

  addHistory(raw);
}

function renderExtraction(clauses) {
  extractionArea.innerHTML = "";
  varCountBadge.textContent = `${clauses.length} proposisi`;
  const ul = document.createElement("div");
  clauses.forEach((c,i) => {
    const el = document.createElement("div");
    el.className = "mb-2";
    el.innerHTML = `<div class="keyword"><strong>${String.fromCharCode(112+i)}</strong> = ${escapeHtml(c)}</div>`;
    ul.appendChild(el);
  });
  extractionArea.appendChild(ul);
}

function renderMappingControls(vars) {
  mappingControls.innerHTML = "";
  // If only 1 clause, show info and stop
  if (vars.length===1) {
    mappingControls.innerHTML = `<div class="text-sm text-slate-500">Hanya terdeteksi 1 proposisi. Untuk bentuk implikasi, aplikasi akan menganggap input sebagai proposisi tunggal. Kamu dapat menuliskan pola lain (mis. "Jika X maka Y" atau "X dan Y").</div>`;
    return;
  }

  // For 2 or 3 vars, allow user to pick antecedent(s) and consequent
  const label = document.createElement("div");
  label.className = "text-sm text-slate-600 mb-2";
  label.textContent = "Pilih mana yang menjadi Antecedent (sebab) dan Consequent (akibat). Untuk antecedent bisa dipilih 1 atau lebih (gabungan menggunakan ∧).";
  mappingControls.appendChild(label);

  // create checkboxes for antecedent selection
  const ancDiv = document.createElement("div");
  ancDiv.className = "flex gap-2 items-center";
  ancDiv.innerHTML = `<div class="text-sm font-medium">Antecedent:</div>`;
  vars.forEach((v,i) => {
    const id = `anc_${i}`;
    const cb = document.createElement("label");
    cb.className = "flex items-center gap-2 text-sm";
    cb.innerHTML = `<input type="checkbox" id="${id}" data-i="${i}" ${i===0 ? "checked": ""}/> <span>${escapeHtml(v)}</span>`;
    ancDiv.appendChild(cb);
  });
  mappingControls.appendChild(ancDiv);

  // Consequent select (single)
  const consDiv = document.createElement("div");
  consDiv.className = "flex gap-2 items-center mt-2";
  consDiv.innerHTML = `<div class="text-sm font-medium">Consequent:</div>`;
  const sel = document.createElement("select");
  sel.id = "consSelect";
  sel.className = "custom-select rounded border px-2";
  vars.forEach((v,i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = v;
    if (i===1) opt.selected = true;
    sel.appendChild(opt);
  });
  consDiv.appendChild(sel);
  mappingControls.appendChild(consDiv);

  // Button apply mapping
  const btnApply = document.createElement("button");
  btnApply.className = "mt-3 px-3 py-1 bg-indigo-600 text-white rounded text-sm";
  btnApply.textContent = "Terapkan Mapping";
  btnApply.addEventListener("click", ()=>{
    produceLogicFromMapping();
  });
  mappingControls.appendChild(btnApply);
}

function produceLogicFromMapping() {
  const vars = currentState.vars || [];
  if (!vars || vars.length===0) return;
  const n = vars.length;
  // get antecedent indices
  const ancBoxes = Array.from(mappingControls.querySelectorAll("input[type=checkbox]"));
  const ancIdx = ancBoxes.filter(cb => cb.checked).map(cb=>parseInt(cb.getAttribute("data-i")));
  // consequent
  const consSel = document.getElementById("consSelect");
  const consIdx = consSel ? parseInt(consSel.value) : (n>1?1:0);

  // ensure consequent not part of antecedent only scenario; if so remove from antecedent
  const finalAncIdx = ancIdx.filter(i => i!==consIdx);
  // if antecedent empty (because user unchecked), default to first var
  const finalAnc = finalAncIdx.length ? finalAncIdx.map(i=>vars[i]) : [vars[0]];
  const consequent = vars[consIdx];

  // build symbolic names p,q,r
  const symNames = ["p","q","r"];
  const mapping = {};
  for (let i=0;i<vars.length;i++) mapping[symNames[i]] = vars[i];
  currentState.mapping = { mapping, antecedentIdx: finalAncIdx, consequentIdx: consIdx, antecedent: finalAnc, consequent };

  // render mapping summary
  const mapHtml = `
    <div class="text-sm text-slate-700">
      <p><strong>Antecedent (sebab):</strong> ${finalAnc.map(x=>escapeHtml(x)).join(" ∧ ")}</p>
      <p><strong>Consequent (akibat):</strong> ${escapeHtml(consequent)}</p>
    </div>
  `;
  // append to extraction area (replace last)
  extractionArea.innerHTML += mapHtml;

  // generate logic outputs
  renderLogicOutputs(finalAnc, consequent);
  // generate truth table (only up to 3)
  generateAndRenderTruth(finalAnc, consequent, mapping);
  // show theory
  renderTheory();
}

function renderLogicOutputs(antecedentArr, consequent) {
  logicOutputs.innerHTML = "";
  logicForms.classList.remove("hidden");
  const modeF = modeFormal.checked;

  // build symbol forms: antecedent may be p or (p ∧ q)
  // map antecedentArr to p,q,... names
  let symMap = {};
  currentState.vars.forEach((v,i)=> symMap[v] = String.fromCharCode(112+i)); // p,q,r
  const antecedentSym = antecedentArr.map(a=> symMap[a]).join(" ∧ ");
  const consequentSym = symMap[consequent] || "q";

  // forms:
  const implSym = `${antecedentSym} → ${consequentSym}`;
  const negSym = `¬(${antecedentSym} → ${consequentSym})`;
  const convSym = `${consequentSym} → ${antecedentSym}`;
  const invSym = `¬(${antecedentSym}) → ¬(${consequentSym})`;
  const contraSym = `¬(${consequentSym}) → ¬(${antecedentSym})`;

  // natural language versions
  const ancNat = antecedentArr.join(" dan ");
  const consNat = consequent;
  const implNat = `Jika ${ancNat}, maka ${consNat}.`;
  const negNat = `${ancNat} dan tidak ${consNat}.`;
  const convNat = `Jika ${consNat}, maka ${ancNat}.`;
  const invNat = `Jika tidak ${ancNat}, maka tidak ${consNat}.`;
  const contraNat = `Jika tidak ${consNat}, maka tidak ${ancNat}.`;

  // produce HTML
  const items = [
    { title:"Implikasi (p → q)", sym:implSym, nat:implNat },
    { title:"Negasi", sym:negSym, nat:negNat },
    { title:"Konvers", sym:convSym, nat:convNat },
    { title:"Invers", sym:invSym, nat:invNat },
    { title:"Kontraposisi", sym:contraSym, nat:contraNat }
  ];

  items.forEach(it => {
    const div = document.createElement("div");
    div.className = "p-2 rounded border mb-2";
    div.innerHTML = `<div class="text-sm font-medium">${it.title}</div>
      <div class="text-xs mt-1 text-slate-600">${modeF ? `<span class='font-mono'>${escapeHtml(it.sym)}</span>` : escapeHtml(it.nat)}</div>
      <div class="text-xs mt-1 text-slate-500">(${modeF ? escapeHtml(it.nat) : `<span class='font-mono'>${escapeHtml(it.sym)}</span>`})</div>`;
    logicOutputs.appendChild(div);
  });

  // show theory card
  theoryCard.classList.remove("hidden");
}

function generateAndRenderTruth(antecedentArr, consequent, mapping) {
  // determine variables used: union antecedent vars + consequent (limit to 3)
  let varsList = Array.from(new Set([].concat(antecedentArr, [consequent]))).slice(0, maxVars);
  // create formulafns: p, q, ¬p etc
  // name mapping: use p,q,r in order of varsList
  const symNames = ["p","q","r"];
  const varToSym = {};
  varsList.forEach((v,i)=> varToSym[v] = symNames[i]);

  // produce compute fns
  const fns = [];

  // single variable booleans for table
  varsList.forEach((v,i) => {
    fns.push({ name: varToSym[v], compute: (row)=> row[varToSym[v]] });
  });

  // We will compute: Impl (antecedent -> consequent), ¬(impl), conv, inv, contra
  // Build compute functions using sym positions
  // compute antecedent bool: if antecedentArr has multiple -> AND of them; else single
  const antecedentFn = (row) => {
    return antecedentArr.reduce((acc,a)=>{
      const sym = varToSym[a];
      const val = sym ? row[sym] : false;
      return acc && val;
    }, true);
  };
  const consequentFn = (row) => {
    const sym = varToSym[consequent];
    return sym ? row[sym] : false;
  };

  fns.push({ name: "impl", compute: (row) => impl(antecedentFn(row), consequentFn(row)) });
  fns.push({ name: "not_impl", compute: (row) => !impl(antecedentFn(row), consequentFn(row)) });
  fns.push({ name: "conv", compute: (row) => impl(consequentFn(row), antecedentFn(row)) }); // q->p
  fns.push({ name: "inv", compute: (row) => impl(!antecedentFn(row), !consequentFn(row)) }); // ¬p->¬q
  fns.push({ name: "contra", compute: (row) => impl(!consequentFn(row), !antecedentFn(row)) }); // ¬q->¬p

  // But we need rows to have p,q,r values keys; create mapping of row keys accordingly in generateTruthTable
  // We'll generate rows with keys symNames used
  const usedSyms = varsList.map(v=>varToSym[v]);
  // create a wrapper generate that maps index to usedSyms
  const rows = [];
  const total = Math.pow(2, usedSyms.length);
  for (let i=0;i<total;i++) {
    const row = {};
    for (let j=0;j<usedSyms.length;j++) {
      const bit = (i >> (usedSyms.length-1-j)) & 1;
      row[usedSyms[j]] = bit===1;
    }
    // compute each fn into row
    fns.forEach(fn => {
      row[fn.name] = fn.compute(row);
    });
    rows.push(row);
  }

  // render table HTML
  let html = `<div class="text-xs text-slate-600 mb-2">Variabel: ${varsList.map(v=>`<span class="badge">${varToSym[v]} = ${escapeHtml(v)}</span>`).join(" ")}</div>`;
  html += `<table class="w-full text-xs border-collapse"><thead><tr>`;
  // columns: usedSyms, then impl, not_impl, conv, inv, contra
  usedSyms.forEach(s => html += `<th class="border px-2 py-1">${s}</th>`);
  ["p→q","¬(p→q)","q→p","¬p→¬q","¬q→¬p"].forEach(h => html += `<th class="border px-2 py-1">${h}</th>`);
  html += `</tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr>`;
    usedSyms.forEach(s => html += `<td class="border px-2 py-1 text-center">${boolToTF(r[s])}</td>`);
    html += `<td class="border px-2 py-1 text-center">${boolToTF(r["impl"])}</td>`;
    html += `<td class="border px-2 py-1 text-center">${boolToTF(r["not_impl"])}</td>`;
    html += `<td class="border px-2 py-1 text-center">${boolToTF(r["conv"])}</td>`;
    html += `<td class="border px-2 py-1 text-center">${boolToTF(r["inv"])}</td>`;
    html += `<td class="border px-2 py-1 text-center">${boolToTF(r["contra"])}</td>`;
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  truthTableWrap.innerHTML = html;
  truthCard.classList.remove("hidden");
}

/* theory */
function renderTheory() {
  const txt = `
    <p><strong>Negasi</strong> dari (p → q) adalah ¬(p → q), yang ekuivalen dengan p ∧ ¬q.</p>
    <p><strong>Konvers</strong> (converse) adalah q → p — tidak selalu ekuivalen dengan p → q.</p>
    <p><strong>Invers</strong> adalah ¬p → ¬q — juga tidak selalu ekuivalen dengan p → q.</p>
    <p><strong>Kontraposisi</strong> adalah ¬q → ¬p — <em>selalu</em> ekuivalen dengan p → q.</p>
    <p class="mt-2 text-sm text-slate-500">(Penjelasan otomatis ini disesuaikan dengan mapping antecedent/ consequent yang dipilih.)</p>
  `;
  theoryText.innerHTML = txt;
  theoryCard.classList.remove("hidden");
}

/* initial load */
loadHistory();

/* Export to PDF using jsPDF */
exportPdf.addEventListener("click", async ()=>{
  if (!currentState.raw) { alert("Proses dulu input sebelum export."); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 40;
  doc.setFontSize(14);
  doc.text("LogicPro Natural — Hasil Proses", 40, y);
  y += 20;
  doc.setFontSize(11);
  doc.text(`Input: ${currentState.raw}`, 40, y);
  y += 18;

  // mapping summary (if any)
  if (currentState.mapping) {
    const anc = currentState.mapping.antecedent.join(" ∧ ");
    const cons = currentState.mapping.consequent;
    doc.text(`Antecedent: ${anc}`, 40, y); y+=14;
    doc.text(`Consequent: ${cons}`, 40, y); y+=14;
  }
  y += 6;

  // logic outputs
  const logicHtmlEl = logicOutputs;
  // gather text from logicOutputs
  doc.setFontSize(12);
  Array.from(logicHtmlEl.querySelectorAll("div.p-2")).forEach(div => {
    const title = div.querySelector(".font-medium")?.textContent || "";
    const sym = div.querySelector(".text-xs")?.textContent || "";
    if (y>750) { doc.addPage(); y=40; }
    doc.setFontSize(11);
    doc.text(title, 40, y); y += 14;
    doc.setFontSize(10);
    // wrap long text
    const lines = doc.splitTextToSize(sym, 500);
    doc.text(lines, 40, y); y += lines.length*12 + 6;
  });

  // add truth table as plain text (small)
  if (!truthCard.classList.contains("hidden")) {
    if (y>600) { doc.addPage(); y=40; }
    doc.setFontSize(11);
    doc.text("Tabel Kebenaran:", 40, y); y+=14;
    // convert table to text lines
    const table = truthTableWrap.querySelector("table");
    if (table) {
      const rows = table.querySelectorAll("tr");
      rows.forEach((tr, i) => {
        const cells = Array.from(tr.querySelectorAll("th,td")).map(td => td.textContent.trim());
        const line = cells.join(" | ");
        if (y>750) { doc.addPage(); y=40; }
        doc.setFontSize(8);
        doc.text(line, 40, y); y += 10;
      });
    }
  }

  // save
  doc.save("logicpro_result.pdf");
});

/* small helper: click Enter in textarea triggers process with Ctrl+Enter alt? */
inputEl.addEventListener("keydown", (e)=>{
  if (e.key === "Enter" && e.ctrlKey) {
    doProcess();
  }
});