// Service worker (MV3) da extensão "PetShop Web - Envio em Lote WhatsApp".
//
// Fluxo: o petshop_web abre uma porta externa ("wa-queue") e manda a lista
// de {id, telefone, mensagem}. Aqui a gente acha (ou abre) a aba do WhatsApp
// Web já logada, navega pra cada conversa via URL (send/?phone=...&text=...),
// injeta um script que espera o chat carregar e clica em "Enviar", espera um
// intervalo aleatório entre as mensagens e reporta o progresso de volta pela
// porta — tudo isso pra dar pra selecionar várias estimativas na tela e
// mandar tudo de uma vez, sem abrir uma por uma.

function digitosTelefone(t) {
  return (t || '').replace(/\D/g, '');
}

function numeroCompleto(telefone) {
  const d = digitosTelefone(telefone);
  if (d.length < 10) return null;
  return d.length <= 11 ? `55${d}` : d;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function aguardarCarregamento(tabId, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const inicio = Date.now();
    function checar() {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) { resolve(); return; }
        if (!tab || tab.status === 'complete' || Date.now() - inicio > timeoutMs) {
          resolve();
          return;
        }
        setTimeout(checar, 300);
      });
    }
    checar();
  });
}

async function getOrCreateWaTab() {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  if (tabs.length > 0) return tabs[0];
  const tab = await chrome.tabs.create({ url: 'https://web.whatsapp.com/', active: false });
  try { await chrome.tabs.update(tab.id, { autoDiscardable: false }); } catch {}
  await aguardarCarregamento(tab.id);
  // Aba recém-criada: WhatsApp Web ainda está montando a lista de conversas
  // bem depois do evento "complete" do documento — sem essa folga extra o
  // primeiro item do lote quase sempre estoura o timeout em scriptEnviar.
  await esperar(9000);
  return tab;
}

async function abrirConversa(tabId, numero, mensagem) {
  const url = `https://web.whatsapp.com/send/?phone=${numero}&text=${encodeURIComponent(mensagem)}&type=phone_number&app_absent=0`;
  await chrome.tabs.update(tabId, { url });
  await aguardarCarregamento(tabId);
}

// Executado dentro da aba do WhatsApp Web via chrome.scripting.executeScript.
// Fica em polling curto esperando o botão de enviar aparecer (chat carregado)
// ou o aviso de "número inválido" — clica em um ou outro e resolve.
function scriptEnviar() {
  return new Promise((resolve) => {
    const inicio = Date.now();
    const TIMEOUT = 45000;
    function tick() {
      const dialogInvalido = Array.from(
        document.querySelectorAll('div[role="dialog"], div[data-animate-modal-popup="true"]'),
      ).find((el) => /inv[aá]lido/i.test(el.textContent || ''));

      if (dialogInvalido) {
        const botaoOk = dialogInvalido.querySelector('button');
        if (botaoOk) botaoOk.click();
        resolve({ ok: false, motivo: 'telefone_invalido' });
        return;
      }

      const botaoEnviar =
        document.querySelector('button[aria-label="Enviar"]') ||
        document.querySelector('span[data-icon="send"]')?.closest('button') ||
        document.querySelector('span[data-icon="wds-ic-send-filled"]')?.closest('button');

      if (botaoEnviar) {
        botaoEnviar.click();
        setTimeout(() => resolve({ ok: true }), 1200);
        return;
      }

      if (Date.now() - inicio > TIMEOUT) {
        resolve({ ok: false, motivo: 'timeout' });
        return;
      }
      setTimeout(tick, 400);
    }
    tick();
  });
}

async function enviarItem(tabId, numero, mensagem) {
  await abrirConversa(tabId, numero, mensagem);
  await esperar(2500);
  const resultados = await chrome.scripting.executeScript({
    target: { tabId },
    func: scriptEnviar,
  });
  return resultados?.[0]?.result || { ok: false, motivo: 'sem_resultado' };
}

let cancelado = false;

async function processarLote(itens, intervaloMinSeg, intervaloMaxSeg, port) {
  cancelado = false;
  let enviados = 0;
  let erros = 0;

  let tab;
  try {
    tab = await getOrCreateWaTab();
  } catch (e) {
    for (const item of itens) {
      erros++;
      port.postMessage({ type: 'progresso', item: { id: item.id, status: 'erro', motivo: 'whatsapp_web_indisponivel' } });
    }
    port.postMessage({ type: 'concluido', resumo: { enviados, erros } });
    return;
  }

  for (let i = 0; i < itens.length; i++) {
    if (cancelado) break;
    const item = itens[i];
    const numero = numeroCompleto(item.telefone);

    if (!numero) {
      erros++;
      port.postMessage({ type: 'progresso', item: { id: item.id, status: 'telefone_invalido' } });
      continue;
    }

    port.postMessage({ type: 'progresso', item: { id: item.id, status: 'enviando' } });
    try {
      const r = await enviarItem(tab.id, numero, item.mensagem);
      if (r.ok) {
        enviados++;
        port.postMessage({ type: 'progresso', item: { id: item.id, status: 'enviado' } });
      } else {
        erros++;
        const status = r.motivo === 'telefone_invalido' ? 'telefone_invalido' : 'erro';
        port.postMessage({ type: 'progresso', item: { id: item.id, status, motivo: r.motivo } });
      }
    } catch (e) {
      erros++;
      port.postMessage({ type: 'progresso', item: { id: item.id, status: 'erro', motivo: String((e && e.message) || e) } });
    }

    if (cancelado) break;
    if (i < itens.length - 1) {
      const min = Math.max(1, intervaloMinSeg || 10);
      const max = Math.max(min, intervaloMaxSeg || 20);
      const segundos = min + Math.random() * (max - min);
      await esperar(segundos * 1000);
    }
  }

  port.postMessage({ type: 'concluido', resumo: { enviados, erros } });
}

chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'ping') {
    sendResponse({ ok: true, versao: chrome.runtime.getManifest().version });
  }
  return true;
});

chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name !== 'wa-queue') return;
  port.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'enviarLote') {
      processarLote(msg.itens || [], msg.intervaloMinSeg, msg.intervaloMaxSeg, port);
    } else if (msg.type === 'cancelar') {
      cancelado = true;
    }
  });
});
