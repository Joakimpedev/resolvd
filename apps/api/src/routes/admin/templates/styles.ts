export const STYLES = `
:root{
  --bg:#F5F1E8; --surface:#FBF8F1; --border:#E8E2D4; --text:#1A2420;
  --muted:#6B6558; --accent:#2D6A4F; --accentSoft:#E1F0E8;
  --amber:#F5E8D0; --amberT:#7A4F0E; --red:#C1432B; --redSoft:#F6E1DD;
  --chip-company:#2D6A4F; --chip-companyBg:#E1F0E8;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;font-family:-apple-system,system-ui,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.4}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 20px;display:flex;gap:16px;align-items:center;position:sticky;top:0;z-index:5}
.topbar h1{margin:0;font-size:18px;font-weight:800}
.topbar nav{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap}
.container{max-width:1200px;margin:0 auto;padding:20px}
.section{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px}
.section h2{margin:0 0 12px 0;font-size:15px;font-weight:800;display:flex;justify-content:space-between;align-items:center}
.section h2 .count{background:var(--border);color:var(--muted);font-size:11px;padding:2px 8px;border-radius:12px;font-weight:500}

table{width:100%;border-collapse:collapse;font-size:12.5px}
th{text-align:left;color:var(--muted);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
tr:last-child td{border-bottom:none}
tr.expanded td{background:#FCFAF4}
code{background:var(--bg);padding:1px 6px;border-radius:4px;font-size:11px;color:var(--muted);word-break:break-all}

.btn{background:var(--accent);color:white;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;text-decoration:none;display:inline-block;font-weight:500}
.btn:hover{filter:brightness(1.08)}
.btn.secondary{background:transparent;color:var(--accent);border:1px solid var(--accent)}
.btn.danger{background:transparent;color:var(--red);border:1px solid var(--red)}
.btn.sm{padding:3px 8px;font-size:11px}
.btn.nav{background:transparent;color:var(--accent);border:1px solid var(--accent);font-size:12px;padding:5px 10px}

.badge{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;display:inline-block;white-space:nowrap}
.badge.green{background:var(--accentSoft);color:var(--accent)}
.badge.amber{background:var(--amber);color:var(--amberT)}
.badge.neutral{background:var(--border);color:var(--muted)}
.badge.admin{background:var(--accent);color:white}
.badge.red{background:var(--redSoft);color:var(--red)}

.chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:500;margin:2px}
.chip-company{background:var(--chip-companyBg);color:var(--chip-company)}
.chip-tag{font-weight:500}
.chip-close{cursor:pointer;opacity:0.6;margin-left:2px}
.chip-close:hover{opacity:1}

.actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.search{margin-bottom:10px}
.search input{width:100%;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:6px;background:var(--surface)}

.empty{color:var(--muted);font-style:italic;padding:20px;text-align:center}

details.inline summary{cursor:pointer;color:var(--accent);font-size:12px;padding:2px 0;list-style:none}
details.inline summary::-webkit-details-marker{display:none}
details.inline summary::before{content:"▸ ";color:var(--muted)}
details.inline[open] summary::before{content:"▾ "}
details.inline .body{margin-top:8px;padding:10px;background:var(--bg);border-radius:6px;white-space:pre-wrap;font-size:12px;line-height:1.5}

input,select,textarea{padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font-family:inherit;width:100%;box-sizing:border-box}
textarea{min-height:140px;resize:vertical;line-height:1.5}
label{display:block;margin:10px 0 4px;font-size:11px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:0.5px}

.modal-overlay{position:fixed;inset:0;background:rgba(26,36,32,0.5);display:none;align-items:flex-start;justify-content:center;z-index:100;padding:40px 16px;overflow-y:auto}
.modal-overlay.open{display:flex}
.modal{background:var(--surface);border-radius:12px;padding:24px;max-width:640px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.2);position:relative}
.modal.lg{max-width:820px}
.modal h3{margin:0 0 4px 0;font-size:18px;font-weight:800}
.modal .subtitle{color:var(--muted);font-size:12px;margin-bottom:16px}
.modal-close{position:absolute;top:12px;right:14px;background:transparent;border:0;font-size:22px;color:var(--muted);cursor:pointer;padding:4px;line-height:1}
.modal-close:hover{color:var(--text)}
.modal form .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.modal form footer{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid var(--border)}
.modal form .msg{font-size:12px;margin-top:8px;min-height:16px}

.chip-picker{border:1px solid var(--border);border-radius:6px;padding:6px;background:var(--surface);min-height:38px;display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.chip-picker input{border:0;flex:1;min-width:120px;padding:4px 6px;background:transparent;font-size:12px}
.chip-picker input:focus{outline:none}
.chip-picker-dropdown{position:relative}
.chip-picker-options{position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:6px;box-shadow:0 8px 20px rgba(0,0,0,0.08);margin-top:4px;max-height:200px;overflow-y:auto;z-index:10;display:none}
.chip-picker-options.open{display:block}
.chip-picker-option{padding:8px 12px;cursor:pointer;font-size:12px}
.chip-picker-option:hover,.chip-picker-option.active{background:var(--accentSoft)}
.chip-picker-option.selected{opacity:0.4}

.toggle-row{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:8px;margin:10px 0}
.toggle-row input[type="checkbox"]{width:18px;height:18px;margin:0;cursor:pointer}
.toggle-row label{margin:0;text-transform:none;font-size:13px;color:var(--text);font-weight:500;letter-spacing:0;cursor:pointer}
.toggle-row .hint{margin-left:auto;font-size:11px;color:var(--muted)}

.course-view{padding:8px 0}
.module-block{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:10px}
.module-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.module-header strong{font-size:13px}
.lesson-row{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:var(--surface);border-radius:6px;margin-top:4px;font-size:12px}

.small-muted{font-size:11px;color:var(--muted)}
`;
