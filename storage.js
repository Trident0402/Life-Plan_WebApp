/**
 * 劇本儲存/載入 (storage.js)
 */
const STORAGE_KEY = 'lifeSimulator_v2_scenario';

function saveScenario(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; }
    catch (e) { console.error('Save failed:', e); return false; }
}

function loadScenario() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { console.error('Load failed:', e); return null; }
}

function exportScenarioJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `人生財務規劃_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importScenarioJSON(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try { callback(JSON.parse(ev.target.result)); }
            catch { alert('匯入失敗：檔案格式錯誤'); }
        };
        reader.readAsText(file);
    };
    input.click();
}
