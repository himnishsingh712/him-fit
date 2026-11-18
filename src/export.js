// Export: three CSV files and a full JSON backup, built in the browser.
const q = v => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const toCSV = rows => rows.map(r => r.map(q).join(',')).join('\n') + '\n';
export function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], {type})); const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
