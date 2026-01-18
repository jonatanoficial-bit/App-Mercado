/* app.js – lógica principal do app */

document.addEventListener('DOMContentLoaded', () => {

  const itemName = document.getElementById('itemName');
  const itemQuantity = document.getElementById('itemQuantity');
  const itemPrice = document.getElementById('itemPrice');
  const itemList = document.getElementById('itemList');
  const totalValue = document.getElementById('totalValue');
  const savedLists = document.getElementById('savedLists');

  let currentItems = [];

  function updateUI() {
    itemList.innerHTML = '';
    let total = 0;

    currentItems.forEach((item, index) => {
      total += item.quantity * item.price;

      const div = document.createElement('div');
      div.className = 'item-card';
      div.innerHTML = `
        <div>
          <strong>${item.name}</strong><br>
          ${item.quantity} x R$ ${item.price.toFixed(2)}
        </div>
        <button class="icon-button">✕</button>
      `;

      div.querySelector('button').onclick = () => {
        currentItems.splice(index, 1);
        updateUI();
      };

      itemList.appendChild(div);
    });

    totalValue.textContent = `R$ ${total.toFixed(2)}`;
  }

  document.getElementById('addItemBtn').onclick = () => {
    if (!itemName.value) return alert('Informe o item');

    currentItems.push({
      name: itemName.value,
      quantity: Number(itemQuantity.value),
      price: Number(itemPrice.value)
    });

    itemName.value = '';
    itemPrice.value = '';
    itemQuantity.value = 1;
    updateUI();
  };

  document.getElementById('saveListBtn').onclick = () => {
    const lists = JSON.parse(localStorage.getItem('shoppingLists') || '[]');
    lists.push({
      id: Date.now(),
      date: new Date().toISOString(),
      items: currentItems
    });
    localStorage.setItem('shoppingLists', JSON.stringify(lists));
    currentItems = [];
    updateUI();
    loadSaved();
  };

  function loadSaved() {
    savedLists.innerHTML = '';
    const lists = JSON.parse(localStorage.getItem('shoppingLists') || '[]');

    lists.forEach(list => {
      const div = document.createElement('div');
      div.className = 'saved-list-card';
      div.innerHTML = `
        <strong>${new Date(list.date).toLocaleDateString()}</strong>
        <button class="secondary-button">Carregar</button>
      `;
      div.querySelector('button').onclick = () => {
        currentItems = list.items;
        updateUI();
      };
      savedLists.appendChild(div);
    });
  }

  document.getElementById('adminBtn').onclick = () => {
    location.href = 'admin.html';
  };

  DlcLoader.init().then(loadSaved);
});