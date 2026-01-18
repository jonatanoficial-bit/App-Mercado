/* admin.js – painel administrativo */

document.addEventListener('DOMContentLoaded', () => {

  const passwordInput = document.getElementById('adminPassword');
  const loginBtn = document.getElementById('loginBtn');
  const loginSection = document.getElementById('loginSection');
  const adminPanel = document.getElementById('adminPanel');
  const dlcList = document.getElementById('dlcList');

  const PASSWORD_KEY = 'adminPassword';

  if (!localStorage.getItem(PASSWORD_KEY)) {
    localStorage.setItem(PASSWORD_KEY, '1234');
  }

  loginBtn.onclick = () => {
    if (passwordInput.value === localStorage.getItem(PASSWORD_KEY)) {
      loginSection.style.display = 'none';
      adminPanel.style.display = 'block';
      renderDLCs();
    } else {
      alert('Senha incorreta');
    }
  };

  function renderDLCs() {
    dlcList.innerHTML = '';
    DlcLoader.getManifest().forEach(dlc => {
      const div = document.createElement('div');
      div.className = 'dlc-card';
      div.innerHTML = `
        <strong>${dlc.name}</strong>
        <small>v${dlc.version}</small>
        <p>${dlc.description}</p>
        <label>
          <input type="checkbox" ${dlc.active ? 'checked' : ''} />
          Ativo
        </label>
      `;
      div.querySelector('input').onchange = e => {
        DlcLoader.setActive(dlc.id, e.target.checked);
      };
      dlcList.appendChild(div);
    });
  }
});