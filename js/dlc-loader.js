const DlcLoader = (() => {
  let manifest = [];
  let expansions = {};

  async function init() {
    const res = await fetch('dlc/manifest.json');
    manifest = await res.json();

    const stored = JSON.parse(localStorage.getItem('dlcManifest') || 'null');
    if (stored) manifest = stored;

    for (const dlc of manifest) {
      if (dlc.active) {
        const data = await fetch(`dlc/${dlc.file}`).then(r => r.json());
        expansions[dlc.id] = data;
      }
    }
  }

  function getManifest() {
    return manifest;
  }

  function setActive(id, active) {
    const dlc = manifest.find(d => d.id === id);
    if (dlc) dlc.active = active;
    localStorage.setItem('dlcManifest', JSON.stringify(manifest));
  }

  function getAdditionalItems() {
    return Object.values(expansions).flatMap(e => e.items || []);
  }

  return {
    init,
    getManifest,
    setActive,
    getAdditionalItems
  };
})();