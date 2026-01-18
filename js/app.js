/* ============================================================================
 * js/app.js (COMPLETO)
 * Lista de Compras AAA — Mobile-first, acessível (Modo Sênior), export/import JSON,
 * export PDF, listas mensais, DLC suggestions, UX premium.
 *
 * Requisitos atendidos neste arquivo:
 * - MODO SÊNIOR (acessibilidade forte + UI simplificada)
 * - Exportar / Importar JSON (backup completo do app)
 * - Melhorias AAA: microinterações, validação amigável, atalhos, persistência
 *
 * Observação:
 * - Este arquivo NÃO depende de frameworks.
 * - Ele cria alguns controles de UI automaticamente (ex.: toggle modo sênior)
 *   caso não existam no HTML.
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
   * Constantes / Storage Keys
   * ========================= */
  const LS_KEYS = {
    LISTS: "shoppingLists",        // Array de listas salvas
    SETTINGS: "appSettings",       // Configurações (inclui modo sênior)
    DRAFT: "currentDraftItems",    // Rascunho de itens atuais (opcional)
  };

  const DEFAULT_SETTINGS = {
    seniorMode: false,
    highContrast: false,
    reduceMotion: false,
    currency: "BRL",
  };

  /* =========================
   * Seletores (HTML existente)
   * ========================= */
  const el = {
    itemName: document.getElementById("itemName"),
    itemQty: document.getElementById("itemQuantity"),
    itemPrice: document.getElementById("itemPrice"),
    addItemBtn: document.getElementById("addItemBtn"),
    itemList: document.getElementById("itemList"),
    totalValue: document.getElementById("totalValue"),
    saveListBtn: document.getElementById("saveListBtn"),
    exportPdfBtn: document.getElementById("exportPdfBtn"),
    clearListBtn: document.getElementById("clearListBtn"),
    savedLists: document.getElementById("savedLists"),
    adminBtn: document.getElementById("adminBtn"),
  };

  /* =========================
   * Estado
   * ========================= */
  let settings = loadSettings();
  let currentItems = loadDraftItems();

  /* =========================
   * Helpers UI/UX
   * ========================= */
  function hapticTick() {
    // Vibração leve em celulares compatíveis (opcional)
    try {
      if (navigator.vibrate) navigator.vibrate(10);
    } catch (_) {}
  }

  function money(n) {
    const value = Number.isFinite(n) ? n : 0;
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: settings.currency || "BRL",
      }).format(value);
    } catch (_) {
      return `R$ ${value.toFixed(2)}`;
    }
  }

  function safeParseJSON(str, fallback) {
    try {
      return JSON.parse(str);
    } catch (_) {
      return fallback;
    }
  }

  function toast(message, type = "info", ms = 2200) {
    // Toast AAA simples, criado dinamicamente
    let host = document.getElementById("toastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "toastHost";
      host.style.position = "fixed";
      host.style.left = "50%";
      host.style.bottom = "18px";
      host.style.transform = "translateX(-50%)";
      host.style.zIndex = "9999";
      host.style.display = "flex";
      host.style.flexDirection = "column";
      host.style.gap = "8px";
      host.style.pointerEvents = "none";
      document.body.appendChild(host);
    }

    const t = document.createElement("div");
    t.textContent = message;
    t.style.pointerEvents = "none";
    t.style.padding = settings.seniorMode ? "14px 16px" : "12px 14px";
    t.style.borderRadius = "14px";
    t.style.fontWeight = "600";
    t.style.fontSize = settings.seniorMode ? "1.05rem" : "0.95rem";
    t.style.boxShadow = "0 10px 25px rgba(0,0,0,.18)";
    t.style.backdropFilter = "blur(10px)";
    t.style.background =
      type === "error"
        ? "rgba(220,38,38,.92)"
        : type === "success"
        ? "rgba(16,185,129,.92)"
        : "rgba(37,99,235,.92)";
    t.style.color = "#fff";
    t.style.maxWidth = "92vw";
    t.style.textAlign = "center";

    if (!settings.reduceMotion) {
      t.style.opacity = "0";
      t.style.transform = "translateY(8px) scale(.98)";
      t.style.transition = "opacity .18s ease, transform .18s ease";
      requestAnimationFrame(() => {
        t.style.opacity = "1";
        t.style.transform = "translateY(0) scale(1)";
      });
    }

    host.appendChild(t);

    window.setTimeout(() => {
      if (!settings.reduceMotion) {
        t.style.opacity = "0";
        t.style.transform = "translateY(8px) scale(.98)";
        t.style.transition = "opacity .18s ease, transform .18s ease";
        window.setTimeout(() => t.remove(), 220);
      } else {
        t.remove();
      }
    }, ms);
  }

  function confirmDialog(message) {
    // Para idosos: texto mais claro
    return window.confirm(message);
  }

  /* =========================
   * Storage
   * ========================= */
  function loadSettings() {
    const raw = localStorage.getItem(LS_KEYS.SETTINGS);
    const s = safeParseJSON(raw, null);
    return { ...DEFAULT_SETTINGS, ...(s || {}) };
  }

  function saveSettings() {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
  }

  function loadDraftItems() {
    const raw = localStorage.getItem(LS_KEYS.DRAFT);
    const arr = safeParseJSON(raw, []);
    return Array.isArray(arr) ? sanitizeItems(arr) : [];
  }

  function saveDraftItems() {
    localStorage.setItem(LS_KEYS.DRAFT, JSON.stringify(currentItems));
  }

  function loadSavedLists() {
    const raw = localStorage.getItem(LS_KEYS.LISTS);
    const lists = safeParseJSON(raw, []);
    return Array.isArray(lists) ? lists : [];
  }

  function saveSavedLists(lists) {
    localStorage.setItem(LS_KEYS.LISTS, JSON.stringify(lists));
  }

  /* =========================
   * Sanitização
   * ========================= */
  function sanitizeItems(items) {
    return (items || [])
      .map((it) => ({
        name: String(it.name || "").trim(),
        quantity: clampNumber(it.quantity, 1, 9999, 1),
        price: clampNumber(it.price, 0, 999999, 0),
      }))
      .filter((it) => it.name.length > 0);
  }

  function clampNumber(v, min, max, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /* =========================
   * Modo Sênior / Acessibilidade
   * ========================= */
  function applyAccessibilityModes() {
    // Usa classes no body (não exige mudanças no CSS, mas integra fácil)
    document.body.classList.toggle("senior-mode", !!settings.seniorMode);
    document.body.classList.toggle("high-contrast", !!settings.highContrast);
    document.body.classList.toggle("reduce-motion", !!settings.reduceMotion);

    // Se seu CSS não tiver essas classes ainda, aqui vai um fallback inline leve:
    if (settings.seniorMode) {
      document.documentElement.style.fontSize = "18px";
    } else {
      document.documentElement.style.fontSize = "";
    }

    if (settings.highContrast) {
      document.body.style.filter = "contrast(1.15)";
    } else {
      document.body.style.filter = "";
    }
  }

  function ensureSeniorControls() {
    // Cria um mini painel rápido no topo (sem depender do HTML)
    let header = document.querySelector(".app-header");
    if (!header) header = document.body;

    let controls = document.getElementById("quickA11yControls");
    if (controls) return;

    controls = document.createElement("div");
    controls.id = "quickA11yControls";
    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "10px";
    controls.style.marginLeft = "12px";

    // Toggle Modo Sênior
    const btnSenior = document.createElement("button");
    btnSenior.type = "button";
    btnSenior.id = "seniorToggleBtn";
    btnSenior.textContent = settings.seniorMode ? "Modo Sênior: ON" : "Modo Sênior: OFF";
    btnSenior.setAttribute("aria-pressed", settings.seniorMode ? "true" : "false");
    btnSenior.style.border = "none";
    btnSenior.style.borderRadius = "999px";
    btnSenior.style.padding = "10px 12px";
    btnSenior.style.fontWeight = "700";
    btnSenior.style.cursor = "pointer";
    btnSenior.style.background = settings.seniorMode ? "rgba(16,185,129,.14)" : "rgba(107,114,128,.14)";
    btnSenior.style.color = "#111827";
    btnSenior.style.whiteSpace = "nowrap";
    btnSenior.style.minHeight = "44px"; // touch-friendly
    btnSenior.style.userSelect = "none";

    btnSenior.addEventListener("click", () => {
      hapticTick();
      settings.seniorMode = !settings.seniorMode;
      saveSettings();
      applyAccessibilityModes();
      btnSenior.textContent = settings.seniorMode ? "Modo Sênior: ON" : "Modo Sênior: OFF";
      btnSenior.setAttribute("aria-pressed", settings.seniorMode ? "true" : "false");
      btnSenior.style.background = settings.seniorMode ? "rgba(16,185,129,.14)" : "rgba(107,114,128,.14)";
      toast(settings.seniorMode ? "Modo Sênior ativado" : "Modo Sênior desativado", "success");
      refreshAll();
    });

    // Botão Backup JSON
    const btnBackup = document.createElement("button");
    btnBackup.type = "button";
    btnBackup.id = "backupBtn";
    btnBackup.textContent = "Backup JSON";
    btnBackup.style.border = "none";
    btnBackup.style.borderRadius = "999px";
    btnBackup.style.padding = "10px 12px";
    btnBackup.style.fontWeight = "700";
    btnBackup.style.cursor = "pointer";
    btnBackup.style.background = "rgba(37,99,235,.14)";
    btnBackup.style.color = "#111827";
    btnBackup.style.whiteSpace = "nowrap";
    btnBackup.style.minHeight = "44px";
    btnBackup.style.userSelect = "none";

    btnBackup.addEventListener("click", () => {
      hapticTick();
      exportBackupJSON();
    });

    // Botão Import JSON
    const btnImport = document.createElement("button");
    btnImport.type = "button";
    btnImport.id = "importBtn";
    btnImport.textContent = "Import JSON";
    btnImport.style.border = "none";
    btnImport.style.borderRadius = "999px";
    btnImport.style.padding = "10px 12px";
    btnImport.style.fontWeight = "700";
    btnImport.style.cursor = "pointer";
    btnImport.style.background = "rgba(107,114,128,.14)";
    btnImport.style.color = "#111827";
    btnImport.style.whiteSpace = "nowrap";
    btnImport.style.minHeight = "44px";
    btnImport.style.userSelect = "none";

    btnImport.addEventListener("click", () => {
      hapticTick();
      importBackupJSON();
    });

    controls.appendChild(btnSenior);
    controls.appendChild(btnBackup);
    controls.appendChild(btnImport);

    // Insere no header (depois do título, antes do botão admin se existir)
    // Se não achar posição, só anexa.
    const title = header.querySelector(".app-title");
    if (title && title.parentElement === header) {
      title.insertAdjacentElement("afterend", controls);
    } else {
      header.appendChild(controls);
    }
  }

  /* =========================
   * DLC Suggestions (opcional)
   * ========================= */
  function populateItemSuggestions() {
    if (typeof window.DlcLoader === "undefined" || !window.DlcLoader.getAdditionalItems) return;
    const additionalItems = window.DlcLoader.getAdditionalItems();
    if (!Array.isArray(additionalItems) || additionalItems.length === 0) return;

    let dataList = document.getElementById("itemSuggestions");
    if (!dataList) {
      dataList = document.createElement("datalist");
      dataList.id = "itemSuggestions";
      document.body.appendChild(dataList);
      if (el.itemName) el.itemName.setAttribute("list", "itemSuggestions");
    }
    dataList.innerHTML = "";
    additionalItems.forEach((it) => {
      const opt = document.createElement("option");
      opt.value = String(it.name || "").trim();
      if (opt.value) dataList.appendChild(opt);
    });
  }

  /* =========================
   * Render / UI principal
   * ========================= */
  function updateListDisplay() {
    if (!el.itemList || !el.totalValue) return;

    el.itemList.innerHTML = "";

    let total = 0;

    currentItems.forEach((item, index) => {
      const subtotal = item.quantity * item.price;
      total += subtotal;

      const card = document.createElement("div");
      card.className = "item-card";

      const info = document.createElement("div");
      info.className = "item-info";

      const nameEl = document.createElement("div");
      nameEl.className = "item-name";
      nameEl.textContent = item.name;

      const metaEl = document.createElement("div");
      metaEl.className = "item-meta";
      metaEl.textContent = `${item.quantity} × ${money(item.price)} = ${money(subtotal)}`;

      info.appendChild(nameEl);
      info.appendChild(metaEl);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      // Botão Remover (touch friendly)
      const removeBtn = document.createElement("button");
      removeBtn.className = "icon-button";
      removeBtn.type = "button";
      removeBtn.title = "Remover item";
      removeBtn.setAttribute("aria-label", "Remover item");

      // Ícone simples (se você tiver SVG no CSS/HTML, pode substituir)
      removeBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>';

      removeBtn.addEventListener("click", () => {
        hapticTick();
        currentItems.splice(index, 1);
        saveDraftItems();
        updateListDisplay();
      });

      actions.appendChild(removeBtn);
      card.appendChild(info);
      card.appendChild(actions);

      el.itemList.appendChild(card);
    });

    el.totalValue.textContent = money(total);
  }

  function focusNextField() {
    // Fluxo simplificado para idosos: após adicionar item, volta ao campo nome
    if (el.itemName) el.itemName.focus();
  }

  function validateAndAddItem() {
    if (!el.itemName || !el.itemQty || !el.itemPrice) return;

    const name = String(el.itemName.value || "").trim();
    const qty = clampNumber(el.itemQty.value, 1, 9999, 1);
    const price = clampNumber(el.itemPrice.value, 0, 999999, 0);

    if (!name) {
      toast("Informe o nome do item.", "error");
      el.itemName.focus();
      return;
    }

    currentItems.push({ name, quantity: qty, price });
    currentItems = sanitizeItems(currentItems);

    // Limpa campos
    el.itemName.value = "";
    el.itemQty.value = "1";
    el.itemPrice.value = "";

    saveDraftItems();
    updateListDisplay();
    focusNextField();
    toast("Item adicionado!", "success", 1500);
  }

  function generateDefaultListName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `Lista ${year}-${month}`;
  }

  function saveCurrentList() {
    if (currentItems.length === 0) {
      toast("Adicione pelo menos 1 item antes de salvar.", "error");
      return;
    }

    let name = prompt("Nome da lista:", generateDefaultListName());
    if (!name) return;
    name = name.trim();
    if (!name) return;

    const lists = loadSavedLists();
    const id = Date.now();
    const total = currentItems.reduce((sum, it) => sum + it.quantity * it.price, 0);

    lists.push({
      id,
      name,
      items: currentItems,
      total,
      createdAt: new Date().toISOString(),
    });

    saveSavedLists(lists);

    // Limpa a lista atual
    currentItems = [];
    saveDraftItems();
    updateListDisplay();
    renderSavedLists();

    toast("Lista salva com sucesso!", "success");
  }

  function clearCurrentList() {
    if (currentItems.length === 0) return;
    const ok = confirmDialog("Remover todos os itens da lista atual?");
    if (!ok) return;

    currentItems = [];
    saveDraftItems();
    updateListDisplay();
    toast("Lista atual limpa.", "success", 1600);
  }

  function renderSavedLists() {
    if (!el.savedLists) return;

    el.savedLists.innerHTML = "";

    const lists = loadSavedLists();
    if (lists.length === 0) {
      const p = document.createElement("p");
      p.textContent = "Nenhuma lista salva.";
      el.savedLists.appendChild(p);
      return;
    }

    lists.sort((a, b) => (b.id || 0) - (a.id || 0));

    lists.forEach((list) => {
      const card = document.createElement("div");
      card.className = "saved-list-card";

      const info = document.createElement("div");
      info.className = "saved-info";
      const date = list.createdAt ? new Date(list.createdAt) : new Date();
      info.innerHTML = `
        <div>
          <strong>${escapeHtml(String(list.name || "Lista"))}</strong><br>
          <small>${date.toLocaleDateString("pt-BR")}</small>
        </div>
        <div><strong>${money(Number(list.total || 0))}</strong></div>
      `;

      const actions = document.createElement("div");
      actions.className = "saved-actions";

      const loadBtn = document.createElement("button");
      loadBtn.type = "button";
      loadBtn.className = "secondary-button";
      loadBtn.textContent = settings.seniorMode ? "Abrir" : "Carregar";
      loadBtn.style.minHeight = "44px";
      loadBtn.addEventListener("click", () => {
        hapticTick();
        if (currentItems.length > 0) {
          const ok = confirmDialog("A lista atual será substituída. Continuar?");
          if (!ok) return;
        }
        currentItems = sanitizeItems((list.items || []).map((i) => ({ ...i })));
        saveDraftItems();
        updateListDisplay();
        toast("Lista carregada.", "success", 1500);
      });

      const pdfBtn = document.createElement("button");
      pdfBtn.type = "button";
      pdfBtn.className = "secondary-button";
      pdfBtn.textContent = "PDF";
      pdfBtn.style.minHeight = "44px";
      pdfBtn.addEventListener("click", () => {
        hapticTick();
        exportListToPdf(list.items || [], list.name || "Lista de Compras");
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "danger-button";
      delBtn.textContent = settings.seniorMode ? "Apagar" : "Excluir";
      delBtn.style.minHeight = "44px";
      delBtn.addEventListener("click", () => {
        hapticTick();
        const ok = confirmDialog("Excluir esta lista salva?");
        if (!ok) return;
        const updated = loadSavedLists().filter((l) => l.id !== list.id);
        saveSavedLists(updated);
        renderSavedLists();
        toast("Lista excluída.", "success", 1600);
      });

      actions.appendChild(loadBtn);
      actions.appendChild(pdfBtn);
      actions.appendChild(delBtn);

      card.appendChild(info);
      card.appendChild(actions);

      el.savedLists.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* =========================
   * Export PDF (jsPDF + fallback print)
   * ========================= */
  function exportListToPdf(items, listName = "Lista de Compras") {
    const safeItems = sanitizeItems(items);
    if (safeItems.length === 0) {
      toast("Não há itens para exportar.", "error");
      return;
    }

    const jsPdfLoaded = window.jspdf && window.jspdf.jsPDF;

    // Se tiver jsPDF + autoTable
    if (jsPdfLoaded && window.jspdf.autoTable) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Cabeçalho
      doc.setFontSize(settings.seniorMode ? 18 : 14);
      doc.text(String(listName), 14, 18);

      // Tabela
      const body = safeItems.map((it) => [
        it.name,
        String(it.quantity),
        money(it.price),
        money(it.quantity * it.price),
      ]);

      doc.autoTable({
        head: [["Item", "Qtd", "Preço", "Subtotal"]],
        body,
        startY: 24,
        styles: {
          fontSize: settings.seniorMode ? 12 : 10,
        },
      });

      const total = safeItems.reduce((sum, it) => sum + it.quantity * it.price, 0);
      const endY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 140;
      doc.setFontSize(settings.seniorMode ? 14 : 12);
      doc.text(`Total: ${money(total)}`, 14, endY);

      doc.save(`${String(listName).replace(/\s+/g, "_")}.pdf`);
      toast("PDF gerado!", "success");
      return;
    }

    // Fallback: imprime HTML
    const win = window.open("", "_blank");
    if (!win) {
      toast("Pop-up bloqueado. Permita pop-ups para exportar.", "error");
      return;
    }

    const rows = safeItems
      .map(
        (it) => `<tr>
          <td>${escapeHtml(it.name)}</td>
          <td>${it.quantity}</td>
          <td>${escapeHtml(money(it.price))}</td>
          <td>${escapeHtml(money(it.quantity * it.price))}</td>
        </tr>`
      )
      .join("");

    const total = safeItems.reduce((sum, it) => sum + it.quantity * it.price, 0);

    const fontSize = settings.seniorMode ? "18px" : "14px";
    win.document.write(`
      <html>
        <head>
          <title>${escapeHtml(listName)}</title>
          <meta charset="UTF-8"/>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; font-size: ${fontSize}; }
            h1 { margin: 0 0 12px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cfcfcf; padding: 10px; text-align: left; }
            th { background: #f3f4f6; }
            .total { margin-top: 14px; font-weight: 800; font-size: 1.1em; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(listName)}</h1>
          <table>
            <thead><tr><th>Item</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">Total: ${escapeHtml(money(total))}</div>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  /* =========================
   * Export / Import JSON (Backup completo)
   * ========================= */
  function buildBackupPayload() {
    const payload = {
      meta: {
        app: "ListaDeComprasAAA",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
      },
      settings,
      draftItems: currentItems,
      savedLists: loadSavedLists(),
      // DLC manifest e dados (se existirem) — mantém compatibilidade
      dlcManifest: safeParseJSON(localStorage.getItem("dlcManifest"), null),
    };
    return payload;
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportBackupJSON() {
    const payload = buildBackupPayload();
    const json = JSON.stringify(payload, null, 2);
    const fileName = `backup_lista_compras_${new Date().toISOString().slice(0, 10)}.json`;
    downloadTextFile(fileName, json);
    toast("Backup JSON exportado!", "success");
  }

  function importBackupJSON() {
    // Abre seletor de arquivo
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) {
        input.remove();
        return;
      }

      try {
        const text = await file.text();
        const data = safeParseJSON(text, null);
        if (!data || typeof data !== "object") {
          toast("Arquivo inválido.", "error");
          input.remove();
          return;
        }

        const ok = confirmDialog(
          "Importar este backup irá substituir suas listas e configurações atuais. Continuar?"
        );
        if (!ok) {
          input.remove();
          return;
        }

        // Settings
        if (data.settings && typeof data.settings === "object") {
          settings = { ...DEFAULT_SETTINGS, ...data.settings };
          saveSettings();
        }

        // Draft
        if (Array.isArray(data.draftItems)) {
          currentItems = sanitizeItems(data.draftItems);
          saveDraftItems();
        }

        // Lists
        if (Array.isArray(data.savedLists)) {
          // sanitiza listas
          const lists = data.savedLists
            .map((l) => ({
              id: Number(l.id || Date.now()),
              name: String(l.name || generateDefaultListName()),
              createdAt: l.createdAt || new Date().toISOString(),
              items: sanitizeItems(l.items || []),
              total: Number.isFinite(Number(l.total))
                ? Number(l.total)
                : sanitizeItems(l.items || []).reduce((s, it) => s + it.quantity * it.price, 0),
            }))
            .filter((l) => l.items.length > 0);

          saveSavedLists(lists);
        }

        // DLC manifest (opcional)
        if (data.dlcManifest) {
          localStorage.setItem("dlcManifest", JSON.stringify(data.dlcManifest));
        }

        applyAccessibilityModes();
        refreshAll();
        toast("Backup importado com sucesso!", "success");
      } catch (err) {
        console.error(err);
        toast("Falha ao importar JSON.", "error");
      } finally {
        input.remove();
      }
    });

    input.click();
  }

  /* =========================
   * Eventos / Atalhos
   * ========================= */
  function bindEvents() {
    if (el.addItemBtn) el.addItemBtn.addEventListener("click", validateAndAddItem);
    if (el.saveListBtn) el.saveListBtn.addEventListener("click", saveCurrentList);
    if (el.exportPdfBtn) el.exportPdfBtn.addEventListener("click", () => exportListToPdf(currentItems, "Lista Atual"));
    if (el.clearListBtn) el.clearListBtn.addEventListener("click", clearCurrentList);

    if (el.adminBtn) {
      el.adminBtn.addEventListener("click", () => {
        window.location.href = "admin.html";
      });
    }

    // Enter para adicionar (melhor para idosos)
    if (el.itemPrice) {
      el.itemPrice.addEventListener("keydown", (e) => {
        if (e.key === "Enter") validateAndAddItem();
      });
    }
    if (el.itemName) {
      el.itemName.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          // Move para quantidade no modo normal; no modo sênior adiciona direto se tiver preço
          if (settings.seniorMode && el.itemPrice && el.itemPrice.value) {
            validateAndAddItem();
          } else if (el.itemQty) {
            el.itemQty.focus();
          }
        }
      });
    }
    if (el.itemQty) {
      el.itemQty.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          if (el.itemPrice) el.itemPrice.focus();
        }
      });
    }
  }

  /* =========================
   * Refresh / Init
   * ========================= */
  function refreshAll() {
    updateListDisplay();
    renderSavedLists();
    populateItemSuggestions();
  }

  async function init() {
    // DLC Loader (se existir)
    if (typeof window.DlcLoader !== "undefined" && window.DlcLoader.init) {
      try {
        await window.DlcLoader.init();
      } catch (e) {
        console.warn("Falha ao inicializar DLCs:", e);
      }
    }

    applyAccessibilityModes();
    ensureSeniorControls();
    bindEvents();
    refreshAll();

    // Se não existirem elementos essenciais, avisa (sem quebrar)
    if (!el.itemName || !el.itemQty || !el.itemPrice || !el.itemList) {
      console.warn("Alguns elementos esperados não existem no HTML. Verifique o index.html.");
    }
  }

  init();
});