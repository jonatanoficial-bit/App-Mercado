/* ============================================================================
 * js/app.js (COMPLETO)
 * Splash VALE GAMES (não trava) + Lista + PDF + DLC safe + PWA
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // ===== SPLASH =====
  const splash = document.getElementById("splash");
  const splashFoot = splash ? splash.querySelector(".splash-foot") : null;

  function setSplashText(txt) {
    if (splashFoot) splashFoot.textContent = txt;
  }

  function hideSplash() {
    if (!splash) return;
    splash.classList.add("is-hidden");
    window.setTimeout(() => {
      if (splash && splash.parentNode) splash.remove();
    }, 450);
  }

  // Tempo mínimo e máximo (segurança)
  const splashMinMs = 700;     // bonito/AAA
  const splashMaxMs = 4000;    // NUNCA trava
  const splashStart = performance.now();

  // Timeout de segurança: se algo quebrar, some mesmo assim
  const splashSafetyTimer = window.setTimeout(() => {
    setSplashText("Iniciando…");
    hideSplash();
  }, splashMaxMs);

  function doneSplash() {
    const elapsed = performance.now() - splashStart;
    const wait = Math.max(0, splashMinMs - elapsed);
    window.setTimeout(() => {
      window.clearTimeout(splashSafetyTimer);
      hideSplash();
    }, wait);
  }

  function failSplash(msg) {
    setSplashText(msg || "Erro ao carregar. Abrindo mesmo assim…");
    // mesmo com erro, abre após um tempinho
    window.setTimeout(() => {
      window.clearTimeout(splashSafetyTimer);
      hideSplash();
    }, 900);
  }

  // ===== PWA / SERVICE WORKER =====
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  // ===== ELEMENTOS =====
  const itemNameInput = document.getElementById("itemName");
  const itemQuantityInput = document.getElementById("itemQuantity");
  const itemPriceInput = document.getElementById("itemPrice");
  const itemListContainer = document.getElementById("itemList");
  const totalValueSpan = document.getElementById("totalValue");
  const saveListBtn = document.getElementById("saveListBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const clearListBtn = document.getElementById("clearListBtn");
  const savedListsContainer = document.getElementById("savedLists");
  const addItemBtn = document.getElementById("addItemBtn");
  const adminBtn = document.getElementById("adminBtn");

  // Se por algum motivo o HTML mudou e faltou algo, não trava no splash
  const required = [
    itemNameInput, itemQuantityInput, itemPriceInput,
    itemListContainer, totalValueSpan,
    saveListBtn, exportPdfBtn, clearListBtn,
    savedListsContainer, addItemBtn, adminBtn
  ];
  if (required.some((x) => !x)) {
    failSplash("Arquivos incompletos. Verifique index.html.");
    return;
  }

  let currentItems = [];

  function money(n) {
    const v = Number.isFinite(n) ? n : 0;
    return `R$ ${v.toFixed(2)}`;
  }

  function updateListDisplay() {
    itemListContainer.innerHTML = "";
    let total = 0;

    currentItems.forEach((item, index) => {
      total += item.quantity * item.price;

      const card = document.createElement("div");
      card.className = "item-card";

      const info = document.createElement("div");
      info.className = "item-info";

      const nameEl = document.createElement("div");
      nameEl.className = "item-name";
      nameEl.textContent = item.name;

      const metaEl = document.createElement("div");
      metaEl.className = "item-meta";
      metaEl.textContent = `${item.quantity} × ${money(item.price)} = ${money(item.quantity * item.price)}`;

      info.appendChild(nameEl);
      info.appendChild(metaEl);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const removeBtn = document.createElement("button");
      removeBtn.className = "icon-button";
      removeBtn.title = "Remover item";
      removeBtn.setAttribute("aria-label", "Remover item");
      removeBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>';

      removeBtn.addEventListener("click", () => {
        currentItems.splice(index, 1);
        updateListDisplay();
      });

      actions.appendChild(removeBtn);
      card.appendChild(info);
      card.appendChild(actions);
      itemListContainer.appendChild(card);
    });

    totalValueSpan.textContent = money(total);
  }

  function addItem() {
    const name = itemNameInput.value.trim();
    const quantity = parseFloat(itemQuantityInput.value) || 0;
    const price = parseFloat(itemPriceInput.value) || 0;

    if (!name) {
      alert("Informe o nome do item.");
      itemNameInput.focus();
      return;
    }
    if (quantity <= 0 || price < 0) {
      alert("Quantidade e preço devem ser válidos.");
      return;
    }

    currentItems.push({ name, quantity, price });
    itemNameInput.value = "";
    itemQuantityInput.value = "1";
    itemPriceInput.value = "";
    updateListDisplay();
    itemNameInput.focus();
  }

  function generateDefaultListName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `Lista ${year}-${month}`;
  }

  function saveCurrentList() {
    if (currentItems.length === 0) {
      alert("Adicione ao menos um item antes de salvar.");
      return;
    }

    let name = prompt("Informe um nome para a lista:", generateDefaultListName());
    if (!name) return;
    name = name.trim();
    if (!name) return;

    const lists = JSON.parse(localStorage.getItem("shoppingLists") || "[]");
    const id = Date.now();
    const total = currentItems.reduce((sum, it) => sum + it.quantity * it.price, 0);

    lists.push({
      id,
      name,
      items: currentItems,
      total,
      createdAt: new Date().toISOString(),
    });

    localStorage.setItem("shoppingLists", JSON.stringify(lists));

    currentItems = [];
    updateListDisplay();
    loadSavedLists();
  }

  function loadSavedLists() {
    savedListsContainer.innerHTML = "";
    const lists = JSON.parse(localStorage.getItem("shoppingLists") || "[]");

    if (lists.length === 0) {
      const msg = document.createElement("p");
      msg.textContent = "Nenhuma lista salva.";
      savedListsContainer.appendChild(msg);
      return;
    }

    lists.sort((a, b) => b.id - a.id);

    lists.forEach((list) => {
      const card = document.createElement("div");
      card.className = "saved-list-card";

      const info = document.createElement("div");
      info.className = "saved-info";
      info.innerHTML =
        `<div><strong>${list.name}</strong><br><small>${new Date(list.createdAt).toLocaleDateString()}</small></div>` +
        `<div><strong>${money(list.total)}</strong></div>`;

      const actions = document.createElement("div");
      actions.className = "saved-actions";

      const loadBtn = document.createElement("button");
      loadBtn.className = "secondary-button";
      loadBtn.textContent = "Carregar";
      loadBtn.addEventListener("click", () => {
        if (currentItems.length > 0 && !confirm("A lista atual será substituída. Continuar?")) return;
        currentItems = (list.items || []).map((i) => ({ ...i }));
        updateListDisplay();
      });

      const pdfBtn = document.createElement("button");
      pdfBtn.className = "secondary-button";
      pdfBtn.textContent = "PDF";
      pdfBtn.addEventListener("click", () => exportListToPdf(list.items, list.name));

      const delBtn = document.createElement("button");
      delBtn.className = "danger-button";
      delBtn.textContent = "Excluir";
      delBtn.addEventListener("click", () => {
        if (!confirm("Excluir esta lista?")) return;
        const updated = lists.filter((l) => l.id !== list.id);
        localStorage.setItem("shoppingLists", JSON.stringify(updated));
        loadSavedLists();
      });

      actions.appendChild(loadBtn);
      actions.appendChild(pdfBtn);
      actions.appendChild(delBtn);

      card.appendChild(info);
      card.appendChild(actions);
      savedListsContainer.appendChild(card);
    });
  }

  function clearCurrentList() {
    if (currentItems.length === 0) return;
    if (confirm("Remover todos os itens da lista atual?")) {
      currentItems = [];
      updateListDisplay();
    }
  }

  function exportListToPdf(items, listName = "Lista de Compras") {
    if (!items || items.length === 0) {
      alert("Não há itens para exportar.");
      return;
    }

    const jsPdfLoaded = window.jspdf && window.jspdf.jsPDF;

    // ✅ Se o jsPDF não carregou (CDN falhou), NÃO trava — faz fallback print
    if (jsPdfLoaded && window.jspdf.autoTable) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(14);
      doc.text(listName, 14, 18);

      const body = items.map((it) => [
        it.name,
        String(it.quantity),
        money(it.price),
        money(it.quantity * it.price),
      ]);

      window.jspdf.autoTable(doc, {
        head: [["Item", "Quantidade", "Preço", "Subtotal"]],
        body,
        startY: 24,
      });

      const total = items.reduce((sum, it) => sum + it.quantity * it.price, 0);
      const y = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 40;
      doc.text(`Total: ${money(total)}`, 14, y);

      doc.save(`${listName.replace(/\s+/g, "_")}.pdf`);
      return;
    }

    // Fallback: imprimir HTML
    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up bloqueado. Permita pop-ups para exportar.");
      return;
    }

    const htmlRows = items
      .map(
        (it) =>
          `<tr><td>${it.name}</td><td>${it.quantity}</td><td>${money(it.price)}</td><td>${money(it.quantity * it.price)}</td></tr>`
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>${listName}</title>
          <style>
            body{font-family:Arial;padding:18px;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #ccc;padding:10px;text-align:left;}
            th{background:#f3f4f6;}
          </style>
        </head>
        <body>
          <h1>${listName}</h1>
          <table>
            <thead><tr><th>Item</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead>
            <tbody>${htmlRows}</tbody>
          </table>
          <script>window.onload=()=>window.print()</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  // DLC Suggestions (NUNCA trava)
  function populateItemSuggestions() {
    try {
      if (!window.DlcLoader || !window.DlcLoader.getAdditionalItems) return;
      const additionalItems = window.DlcLoader.getAdditionalItems();
      if (!additionalItems || additionalItems.length === 0) return;

      let dataList = document.getElementById("itemSuggestions");
      if (!dataList) {
        dataList = document.createElement("datalist");
        dataList.id = "itemSuggestions";
        document.body.appendChild(dataList);
        itemNameInput.setAttribute("list", "itemSuggestions");
      }

      dataList.innerHTML = "";
      additionalItems.forEach((it) => {
        const opt = document.createElement("option");
        opt.value = it.name;
        dataList.appendChild(opt);
      });
    } catch (_) {
      // ignora
    }
  }

  // ===== INIT (à prova de travamento) =====
  async function init() {
    setSplashText("Carregando recursos…");

    // 1) Tenta inicializar DLCs, mas com timeout interno
    if (window.DlcLoader && window.DlcLoader.init) {
      try {
        setSplashText("Carregando conteúdos…");

        // timeout de 1.2s pro DlcLoader (se travar, segue)
        const dlcPromise = window.DlcLoader.init();
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
        await Promise.race([dlcPromise, timeoutPromise]);
      } catch (_) {
        // ignora erro do DLC pra não travar
      }
    }

    // 2) Render básico
    setSplashText("Finalizando…");
    populateItemSuggestions();
    updateListDisplay();
    loadSavedLists();

    // 3) Splash some SEMPRE
    doneSplash();
  }

  // Eventos
  addItemBtn.addEventListener("click", addItem);
  saveListBtn.addEventListener("click", saveCurrentList);
  exportPdfBtn.addEventListener("click", () => exportListToPdf(currentItems, "Lista Atual"));
  clearListBtn.addEventListener("click", clearCurrentList);

  adminBtn.addEventListener("click", () => (window.location.href = "admin.html"));

  // Enter rápido
  itemPriceInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addItem();
  });

  // Qualquer erro JS agora NÃO prende o splash
  try {
    init();
  } catch (e) {
    console.error(e);
    failSplash("Erro ao iniciar. Abrindo…");
  }
});
