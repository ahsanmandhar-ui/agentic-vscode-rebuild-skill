// src/ui/settings-panel.ts
import { maskKey } from '../providers/accounts';

export function renderSettingsPanel(args: any = {}): string {
  const esc = (v: any) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const pickArr = (keys: string[]) => { for (const k of keys) if (Array.isArray(args?.[k])) return args[k]; return []; };
  const cli = pickArr(['cliAllowlist','allowlist','binaries','allowedBinaries']);
  const trust = pickArr(['skillTrust','trust','skills']);
  const providers = pickArr(['providers','providerList']);
  const accounts = pickArr(['accounts','accountList','rows','items','list']);
  const guidedObj = (args?.guided && typeof args.guided === 'object') ? args.guided : (args?.settings || args?.basic || {});
  const advancedObj = (args?.advanced && typeof args.advanced === 'object') ? args.advanced : (args?.json || {});
  const gKeys = Object.keys(guidedObj || {});
  const guidedHtml = gKeys.length ? '<dl class="vc-settings-list settings-list guided-list">' + gKeys.map((k:any) => `<div class="vc-settings-entry settings-entry"><dt class="vc-settings-key settings-key">${esc(k)}</dt><dd class="vc-settings-value settings-value">${esc(typeof guidedObj[k]==='object'?JSON.stringify(guidedObj[k]):guidedObj[k])}</dd></div>`).join('') + '</dl>' : '<div class="vc-empty settings-guided-empty vc-card"><p class="vc-empty-msg settings-empty-msg">No settings.</p></div>';
  const advHtml = '<pre class="vc-settings-advanced-json advanced-json settings-advanced"><code>' + esc(JSON.stringify(advancedObj||{},null,2)) + '</code></pre>';
  const cliHtml = cli.length ? '<ul class="vc-cli-allowlist cli-allowlist allowlist" role="list" aria-label="CLI allowlist">' + cli.map((b:any,i:number) => { const id=String(b?.id??b?.name??b?.label??b?.binary??b?.path??`binary-${i}`); const label=String(b?.name??b?.label??b?.id??b?.binary??b?.path??`Binary ${i+1}`); const allowed=b?.allowed===true||b?.enabled===true; return `<li class="vc-cli-allowlist-item cli-allowlist-item allowlist-item${allowed?' is-allowed':''}" data-binary-id="${esc(id)}" aria-label="${esc(label)}"><span class="vc-cli-allowlist-name cli-allowlist-name">${esc(label)}</span><span class="vc-cli-allowlist-status cli-allowlist-status">${allowed?'Allowed':'Blocked'}</span><button type="button" class="vc-btn vc-cli-allow-toggle cli-allow-toggle" data-action="vibecode.cli.allowlist.toggle" data-id="${esc(id)}" aria-label="Toggle ${esc(label)}">${allowed?'Revoke':'Allow'}</button></li>`; }).join('') + '</ul>' : '<div class="vc-empty settings-cli-empty vc-card"><p class="vc-empty-msg">No CLI binaries allowlisted.</p></div>';
  const trustHtml = trust.length ? '<ul class="vc-skill-trust-list skill-trust-list trust-list" role="list" aria-label="Skill trust">' + trust.map((s:any,i:number) => { const id=String(s?.id??s?.name??s?.label??`skill-${i}`); const label=String(s?.name??s?.label??s?.id??`Skill ${i+1}`); const trustLevel=String(s?.trust??s?.level??(s?.trusted===true||s?.approved===true?'trusted':'untrusted')); const trusted=trustLevel.toLowerCase().includes('trust')||s?.trusted===true||s?.approved===true; return `<li class="vc-skill-trust-item skill-trust-item trust-item${trusted?' is-trusted':''}" data-skill-id="${esc(id)}" aria-label="${esc(label)} ${esc(trustLevel)}"><span class="vc-skill-trust-name skill-trust-name">${esc(label)}</span><span class="vc-skill-trust-level skill-trust-level trust-level">${esc(trustLevel)}</span><button type="button" class="vc-btn vc-skill-trust-toggle skill-trust-toggle" data-action="vibecode.skills.trust" data-id="${esc(id)}" aria-label="Toggle trust ${esc(label)}">Toggle trust</button></li>`; }).join('') + '</ul>' : '<div class="vc-empty settings-skill-trust-empty vc-card"><p class="vc-empty-msg">No skill trust entries.</p></div>';
  const providerIds = providers.length ? providers : (accounts.length ? Array.from(new Set(accounts.map((a:any)=>String(a?.provider??a?.providerId??'unknown')))) : []);
  const providersHtml = providerIds.length
    ? '<ul class="vc-settings-providers settings-providers provider-list" role="list" aria-label="Providers">' + providerIds.map((p:any,i:number) => {
        const id = String(typeof p === 'string' ? p : (p?.id??p?.name??p?.label??`provider-${i}`));
        const label = String(typeof p === 'string' ? p : (p?.name??p?.label??p?.id??id));
        return `<li class="vc-settings-provider settings-provider provider-item" data-provider-id="${esc(id)}"><span class="vc-settings-provider-name settings-provider-name">${esc(label)}</span><button type="button" class="vc-btn vc-settings-provider-remove settings-provider-remove" data-action="vibecode.settings.provider.remove" data-id="${esc(id)}" aria-label="Remove provider ${esc(label)}">Remove</button></li>`;
      }).join('') + '</ul>'
    : '<div class="vc-empty settings-providers-empty vc-card"><p class="vc-empty-msg">No providers configured.</p></div>';

  const strategy = String(args?.strategy ?? args?.rotationStrategy ?? args?.selectionStrategy ?? 'manual');
  const strategyHtml = `<div class="vc-settings-strategy settings-strategy strategy-selector" aria-label="Selection strategy">
    <label for="vc-settings-strategy-select">Strategy</label>
    <select id="vc-settings-strategy-select" class="vc-settings-strategy-select settings-strategy-select" data-action="vibecode.settings.strategy">
      ${['manual','round-robin','least-used'].map((s) => `<option value="${s}" ${s===strategy?'selected':''}>${s}</option>`).join('')}
    </select>
  </div>`;

  const accountsRows = accounts.length ? accounts.map((a:any,i:number) => {
    const id = String(a?.id ?? a?.label ?? a?.name ?? a?.provider ?? `account-${i}`);
    const label = String(a?.label ?? a?.name ?? a?.id ?? 'Unnamed account');
    const provider = String(a?.provider ?? a?.providerId ?? 'unknown');
    const direct = a?.key ?? a?.apiKey ?? a?.token ?? a?.secret ?? a?.value;
    let masked = '—';
    if (typeof direct === 'string' && direct) masked = maskKey(direct);
    else if (a?.secretRef) masked = '••••••••';
    const keys = args?.keys ?? args?.maskedKeys ?? args?.secrets;
    if (keys && typeof keys === 'object') {
      const v = (keys as any)[id] ?? (keys as any)[a?.secretRef] ?? (keys as any)[a?.id];
      if (typeof v === 'string' && v) masked = maskKey(v);
    }
    return `<tr class="vc-settings-account-row settings-account-row account-row" data-account-id="${esc(id)}" data-provider="${esc(provider)}">
      <td class="vc-settings-account-label settings-account-label">${esc(label)}</td>
      <td class="vc-settings-account-provider settings-account-provider">${esc(provider)}</td>
      <td class="vc-settings-account-key settings-account-key masked-key">${esc(masked)}</td>
      <td class="vc-settings-account-actions settings-account-actions">
        <button type="button" class="vc-btn vc-settings-account-remove settings-account-remove" data-action="vibecode.settings.account.remove" data-id="${esc(id)}" aria-label="Remove account ${esc(label)}">Remove</button>
      </td>
    </tr>`;
  }).join('') : '';

  const accountsTable = accounts.length === 0
    ? '<div class="vc-empty settings-accounts-empty vc-card"><p class="vc-empty-msg">No accounts configured.</p><button type="button" class="vc-btn vc-btn-primary" data-action="vibecode.settings.account.add" aria-label="Add account">Add account</button></div>'
    : `<div class="vc-settings-accounts-toolbar settings-accounts-toolbar"><button type="button" class="vc-btn vc-btn-primary" data-action="vibecode.settings.account.add" aria-label="Add account">Add account</button><button type="button" class="vc-btn" data-action="vibecode.settings.key.add" aria-label="Add key">Add key</button></div>
       <table class="vc-settings-accounts-table settings-accounts-table accounts-table" role="table" aria-label="Accounts and keys">
         <thead><tr><th scope="col">Account</th><th scope="col">Provider</th><th scope="col">Key</th><th scope="col">Actions</th></tr></thead>
         <tbody>${accountsRows}</tbody>
       </table>`;

  const mode = String(args?.mode ?? args?.planMode ?? 'act').toLowerCase();
  const planActHtml = `<div class="vc-settings-planact settings-planact plan-act-toggle" aria-label="Plan/Act mode">
    <button type="button" class="vc-btn vc-settings-mode-toggle settings-mode-toggle ${mode==='plan'?'is-active':''}" data-action="vibecode.settings.mode" data-mode="plan" aria-pressed="${mode==='plan'}">Plan</button>
    <button type="button" class="vc-btn vc-settings-mode-toggle settings-mode-toggle ${mode==='act'?'is-active':''}" data-action="vibecode.settings.mode" data-mode="act" aria-pressed="${mode==='act'}">Act</button>
  </div>`;

  const telemetryConsent = args?.telemetryConsent === true || args?.telemetry === true;
  const dataClassification = String(args?.dataClassification ?? args?.classification ?? 'internal');
  const telemetryHtml = `<div class="vc-settings-telemetry settings-telemetry telemetry-consent" aria-label="Telemetry consent">
    <label><input type="checkbox" class="vc-settings-telemetry-consent settings-telemetry-consent" data-action="vibecode.settings.telemetry" ${telemetryConsent?'checked':''} /> Enable telemetry</label>
  </div>
  <div class="vc-settings-dataclass settings-dataclass data-classification" aria-label="Data classification">
    <label for="vc-settings-dataclass-select">Data classification</label>
    <select id="vc-settings-dataclass-select" class="vc-settings-dataclass-select settings-dataclass-select" data-action="vibecode.settings.dataClassification">
      ${['public','internal','confidential','restricted'].map((c) => `<option value="${c}" ${c===dataClassification?'selected':''}>${c}</option>`).join('')}
    </select>
  </div>`;

  const backupHtml = `<div class="vc-settings-backup settings-backup backup-restore" aria-label="Backup and restore">
    <button type="button" class="vc-btn" data-action="vibecode.settings.backup.export" aria-label="Export settings">Export</button>
    <button type="button" class="vc-btn" data-action="vibecode.settings.backup.import" aria-label="Import settings">Import</button>
  </div>`;

  const emptyMessage = String(args?.emptyMessage ?? 'Settings are using defaults. Open settings to customise.');
  return [
    `<section class="vc-settings-panel settings-panel" aria-label="Settings panel">`,
    `  <header class="vc-settings-panel__header settings-header"><h2>Settings</h2></header>`,
    `  <div class="vc-settings-guided guided-section settings-guided" aria-label="Guided settings"><h3 class="vc-settings-section-title">Guided</h3>${guidedHtml}</div>`,
    `  <div class="vc-settings-advanced advanced-section settings-advanced-section" aria-label="Advanced settings" aria-expanded="true"><h3 class="vc-settings-section-title">Advanced</h3>${advHtml}</div>`,
    `  <div class="vc-settings-providers-section settings-providers-section" aria-label="Providers"><h3 class="vc-settings-section-title">Providers</h3>${providersHtml}<button type="button" class="vc-btn vc-settings-provider-add settings-provider-add" data-action="vibecode.settings.provider.add" aria-label="Add provider">Add provider</button></div>`,
    `  <div class="vc-settings-accounts-section settings-accounts-section" aria-label="Accounts and keys"><h3 class="vc-settings-section-title">Accounts &amp; Keys</h3>${strategyHtml}${accountsTable}</div>`,
    `  <div class="vc-settings-cli-allowlist cli-allowlist-section settings-cli-allowlist" aria-label="CLI allowlist"><h3 class="vc-settings-section-title">CLI allowlist</h3>${cliHtml}</div>`,
    `  <div class="vc-settings-skill-trust skill-trust-section settings-skill-trust" aria-label="Skill trust"><h3 class="vc-settings-section-title">Skill trust</h3>${trustHtml}</div>`,
    `  <div class="vc-settings-planact-section settings-planact-section" aria-label="Plan/Act mode"><h3 class="vc-settings-section-title">Mode</h3>${planActHtml}</div>`,
    `  <div class="vc-settings-telemetry-section settings-telemetry-section" aria-label="Telemetry"><h3 class="vc-settings-section-title">Telemetry</h3>${telemetryHtml}</div>`,
    `  <div class="vc-settings-backup-section settings-backup-section" aria-label="Backup and restore"><h3 class="vc-settings-section-title">Backup / Restore</h3>${backupHtml}</div>`,
    `  <p class="vc-empty-msg settings-empty-msg">${esc(emptyMessage)}</p>`,
    `</section>`,
  ].join('\n');
}
export default renderSettingsPanel;

