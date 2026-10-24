import { CONFIG, PRODUCTS, SYMPTOMS } from './data.js';
import { qrSvg } from './qr.js';

/* ───────────────────────── utilidades ───────────────────────── */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const money = (n) => `Q${n.toFixed(2)}`;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────────────────── 3D bajo demanda ───────────────────────── */

let scenesPromise = null;

function loadScenes() {
  if (window.EcoReset3D) return Promise.resolve(window.EcoReset3D);
  if (!scenesPromise) {
    scenesPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'assets/js/three.bundle.js';
      script.async = true;
      script.onload = () => resolve(window.EcoReset3D || null);
      script.onerror = () => resolve(null);
      document.body.appendChild(script);
    });
  }
  return scenesPromise;
}

function whenVisible(el, cb, margin = '350px') {
  if (!('IntersectionObserver' in window)) { cb(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) { io.disconnect(); cb(); }
  }, { rootMargin: margin });
  io.observe(el);
}

function toast(message, time = 3200) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('is-visible'), time);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/* ───────────────────────── preloader ───────────────────────── */

function initPreloader() {
  const el = $('#preloader');
  if (!el) return;
  const done = () => {
    el.classList.add('is-done');
    setTimeout(() => el.remove(), 900);
  };
  const min = reduceMotion ? 0 : 120;
  const start = performance.now();
  const finish = () => setTimeout(done, Math.max(0, min - (performance.now() - start)));
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once: true });
  setTimeout(done, 1600);
}

/* ───────────────────────── nav / menú ───────────────────────── */

function initNav() {
  const nav = $('#nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menu = $('#menu');
  const openBtn = $('[data-menu-open]');
  const closeBtn = $('[data-menu-close]');
  if (!menu || !openBtn) return;

  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
    setTimeout(() => closeBtn?.focus(), 120);
  };
  const close = () => {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  };

  openBtn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  $$('[data-menu-link]').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
  });
}

/* ───────────────────────── reveals + tilt ───────────────────────── */

function initReveal() {
  const items = $$('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window) || reduceMotion) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -4% 0px', threshold: 0.04 });

  items.forEach((el) => io.observe(el));

  // Red de seguridad: si por cualquier motivo el observer no dispara, el contenido nunca queda oculto.
  setTimeout(() => {
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 2) el.classList.add('is-in');
    });
  }, 4000);
}

function initTilt() {
  if (reduceMotion || window.matchMedia('(hover: none)').matches) return;
  $$('[data-tilt]').forEach((el) => {
    let raf = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-py * 4.5).toFixed(2)}deg) rotateY(${(px * 5.5).toFixed(2)}deg) translateY(-3px)`;
      });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      el.style.transform = '';
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', reset);
  });
}

/* ───────────────────────── calculadora ───────────────────────── */

function initCalc(scope = document) {
  const range = $('#calcRange', scope) || $('#calcRange');
  if (!range) return;
  const outLiters = $('#calcLiters');
  const outMl = $('#calcMl');
  const fill = () => {
    const min = Number(range.min);
    const max = Number(range.max);
    const val = Number(range.value);
    const pct = ((val - min) / (max - min)) * 100;
    range.style.setProperty('--fill', `${pct}%`);
    if (outLiters) outLiters.textContent = `${val.toFixed(1)} L`;
    if (outMl) outMl.textContent = `${Math.round(val * 15)}`;
  };
  range.addEventListener('input', fill);
  fill();
}

/* ───────────────────────── Scan & Care ───────────────────────── */

function initSymptoms() {
  const keys = Object.keys(SYMPTOMS);
  if (!keys.length) return;

  // versión home (dentro del teléfono)
  const title = $('#careTitle');
  if (title) {
    const causes = $('#careCauses');
    const checks = $('#careChecks');
    const tip = $('#careTip');
    const buttons = $$('[data-symptom]');

    const render = (key) => {
      const s = SYMPTOMS[key];
      if (!s) return;
      const body = $('#careApp .app__body');
      body?.classList.add('is-swapping');
      setTimeout(() => {
        title.textContent = s.title;
        causes.textContent = s.summary;
        checks.innerHTML = s.checks.map((c) => `<li>${c}</li>`).join('');
        tip.textContent = s.short;
        body?.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 110);
      buttons.forEach((b) => {
        const on = b.dataset.symptom === key;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    };

    buttons.forEach((b) => b.addEventListener('click', () => render(b.dataset.symptom)));
    render(keys[0]);
  }

  // versión completa (cuidado.html)
  const detail = $('#careDetail');
  if (detail) {
    const cards = $$('[data-care-symptom]');
    const renderDetail = (key) => {
      const s = SYMPTOMS[key];
      if (!s) return;
      detail.innerHTML = `
        <div class="care-detail__top">
          <div>
            <p class="eyebrow">Síntoma</p>
            <h3>${s.title}</h3>
          </div>
          <span class="care-detail__tag">${s.tag}</span>
        </div>
        <div class="care-detail__cols">
          <div>
            <h4>Posibles causas</h4>
            <ul>${s.causes.map((c) => `<li>${c}</li>`).join('')}</ul>
          </div>
          <div>
            <h4>Qué revisar</h4>
            <ul>${s.checks.map((c) => `<li>${c}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="care-detail__tip">
          <span class="eyebrow">Orientación</span>
          <p>${s.tip}</p>
        </div>
        <p class="care-detail__note">${s.note} Orientación preliminar: no sustituye un diagnóstico profesional ni las indicaciones de la etiqueta.</p>
      `;
      cards.forEach((c) => {
        const on = c.dataset.careSymptom === key;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    };

    cards.forEach((c) => c.addEventListener('click', () => renderDetail(c.dataset.careSymptom)));
    renderDetail(keys[0]);
  }
}

/* ───────────────────────── carrito ───────────────────────── */

function initCart() {
  const drawer = $('#drawer');
  if (!drawer) return;

  const KEY = 'ecoreset:pedido:v1';
  const itemsEl = $('#cartItems');
  const emptyEl = $('#cartEmpty');
  const totalEl = $('#cartTotal');
  const countEl = $('[data-cart-count]');
  const checkout = $('#checkout');
  const copyBtn = $('#copyOrder');
  const note = $('.drawer__note');

  let cart = {};
  try {
    cart = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch { cart = {}; }

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* noop */ }
  };

  const entries = () => Object.entries(cart).filter(([id, qty]) => qty > 0 && PRODUCTS[id]);
  const total = () => entries().reduce((sum, [id, qty]) => sum + (PRODUCTS[id]?.price || 0) * qty, 0);
  const count = () => entries().reduce((sum, [, qty]) => sum + qty, 0);

  const orderText = () => {
    const lines = ['Pedido Eco Reset', ''];
    entries().forEach(([id, qty]) => {
      const p = PRODUCTS[id];
      if (!p) return;
      lines.push(`${qty} × ${p.name} — ${money(p.price * qty)}`);
      lines.push(`   ${p.meta}`);
    });
    lines.push('', `Subtotal: ${money(total())}`, '', 'Gracias por darle un nuevo comienzo a tus plantas.');
    return lines.join('\n');
  };

  const render = () => {
    const list = entries();
    const empty = list.length === 0;

    if (emptyEl) emptyEl.hidden = !empty;
    if (itemsEl) itemsEl.innerHTML = '';

    if (!empty && itemsEl) {
      itemsEl.innerHTML = list.map(([id, qty]) => {
        const p = PRODUCTS[id];
        if (!p) return '';
        return `
          <div class="cart-item" data-id="${id}">
            <div class="cart-thumb" aria-hidden="true"></div>
            <div>
              <p class="cart-item__name">${p.name}</p>
              <p class="cart-item__meta">${p.meta}</p>
              <p class="cart-item__price">${money(p.price * qty)}</p>
              <div class="qty">
                <button type="button" data-qty="-1" aria-label="Quitar una unidad de ${p.name}"><svg width="12" height="12" aria-hidden="true"><use href="#i-minus"/></svg></button>
                <span aria-live="polite">${qty}</span>
                <button type="button" data-qty="1" aria-label="Añadir una unidad de ${p.name}"><svg width="12" height="12" aria-hidden="true"><use href="#i-plus"/></svg></button>
              </div>
            </div>
            <button type="button" class="cart-item__remove" data-remove>Quitar</button>
          </div>`;
      }).join('');
    }

    if (totalEl) totalEl.textContent = money(total());
    if (countEl) {
      const n = count();
      countEl.textContent = String(n);
      countEl.hidden = n === 0;
    }
    if (checkout) checkout.disabled = empty;
    if (copyBtn) copyBtn.disabled = empty;

    const configured = CONFIG.whatsapp && CONFIG.whatsapp !== '50200000000';
    if (note && !configured) {
      note.textContent = 'Pedido de demostración: el pedido se copia para que lo envíes por WhatsApp. Configura el número real en assets/js (CONFIG.whatsapp).';
    }
  };

  const openDrawer = () => {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    const focusTarget = $('.drawer__panel .icon-btn', drawer);
    setTimeout(() => focusTarget?.focus(), 150);
  };

  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  $$('[data-cart-open]').forEach((b) => b.addEventListener('click', openDrawer));
  $$('[data-cart-close]').forEach((b) => b.addEventListener('click', closeDrawer));
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-cart-close]')) closeDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });

  $$('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.add;
      if (!PRODUCTS[id]) return;
      cart[id] = (cart[id] || 0) + 1;
      save();
      render();
      openDrawer();
      toast(`${PRODUCTS[id].name} añadido a tu pedido`);
    });
  });

  itemsEl?.addEventListener('click', (e) => {
    const row = e.target.closest('.cart-item');
    if (!row) return;
    const id = row.dataset.id;
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      const delta = Number(qtyBtn.dataset.qty);
      cart[id] = Math.max(0, (cart[id] || 0) + delta);
      if (cart[id] === 0) delete cart[id];
      save();
      render();
      return;
    }
    if (e.target.closest('[data-remove]')) {
      delete cart[id];
      save();
      render();
    }
  });

  checkout?.addEventListener('click', async () => {
    if (!entries().length) return;
    const text = orderText();
    const configured = CONFIG.whatsapp && CONFIG.whatsapp !== '50200000000';
    if (configured) {
      const url = `https://wa.me/${CONFIG.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
      toast('Abriendo WhatsApp con tu pedido…');
    } else {
      const ok = await copyText(text);
      toast(ok ? 'Pedido copiado. Pégalo en WhatsApp para enviarlo.' : 'No pudimos copiar el pedido.', 4200);
    }
  });

  copyBtn?.addEventListener('click', async () => {
    if (!entries().length) return;
    const ok = await copyText(orderText());
    toast(ok ? 'Resumen del pedido copiado' : 'No pudimos copiar el pedido');
  });

  render();
}

/* ───────────────────────── QR ───────────────────────── */

function initQR() {
  $$('[data-qr]').forEach((el) => {
    const target = new URL(el.dataset.qr || 'cuidado.html', window.location.href).href;
    el.innerHTML = qrSvg(target);
  });
}

/* ───────────────────────── newsletter ───────────────────────── */

function initNewsletter() {
  const form = $('#newsletter');
  if (!form) return;
  const input = $('#email', form);
  const msg = $('.newsletter__msg', form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = (input?.value || '').trim();
    const valid = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value);

    form.classList.remove('is-error', 'is-success');
    if (!valid) {
      form.classList.add('is-error');
      if (msg) msg.textContent = 'Revisa tu correo: parece que falta algo.';
      input?.focus();
      return;
    }

    form.classList.add('is-success');
    if (msg) msg.textContent = 'Listo. Te enviamos el 10% y la guía de cuidado.';
    toast('Gracias. Revisa tu correo para el 10% de apertura.');
    try { localStorage.setItem('ecoreset:newsletter', value); } catch { /* noop */ }
    form.reset();
  });
}

/* ───────────────────────── WhatsApp ───────────────────────── */

function initWhatsApp() {
  const configured = CONFIG.whatsapp && CONFIG.whatsapp !== '50200000000';
  if (!configured) return;
  const num = CONFIG.whatsapp.replace(/\D/g, '');
  $$('[data-whatsapp]').forEach((a) => {
    const text = encodeURIComponent('Hola Eco Reset, quiero saber más sobre el fertilizante foliar.');
    a.setAttribute('href', `https://wa.me/${num}?text=${text}`);
  });
}

/* ───────────────────────── init ───────────────────────── */

export function boot() {
  window.__ecoReady = true;
  const params = new URLSearchParams(window.location.search);
  if (params.has('lite')) document.documentElement.classList.add('lite');

  initPreloader();
  initNav();
  initReveal();
  initTilt();
  initCalc();
  initSymptoms();
  initCart();
  initQR();
  initNewsletter();
  initWhatsApp();

  const skip3D = params.has('nogl');

  if (params.has('static')) {
    document.documentElement.classList.remove('js');
  }

  // Las escenas se cargan después del primer pintado; el papel plantable,
  // solo cuando su sección está cerca de la ventana.
  const bottle = $('[data-scene="bottle"]');
  const seed = $('[data-scene="seed"]');

  if (!skip3D && (bottle || seed)) {
    const start = () => {
      loadScenes().then((S) => {
        if (!S) return;
        const bottleScene = bottle ? S.initBottleScene(bottle) : null;
        let seedScene = null;
        const initSeed = () => {
          if (!seed || seedScene) return;
          seedScene = S.initSeedScene(seed);
          document.fonts?.ready.then(() => seedScene?.refreshPaper?.()).catch(() => {});
        };
        if (seed) whenVisible(seed, initSeed);
        document.fonts?.ready.then(() => bottleScene?.refreshLabel?.()).catch(() => {});
      });
    };

    // Cargamos el 3D poco después de que el HTML esté listo: el texto y las
    // tipografías ya se pueden pintar mientras llega el paquete de Three.js.
    setTimeout(start, 350);
  }

  // soporte de teclado para las tarjetas de síntoma
  $$('[data-symptom], [data-care-symptom]').forEach((b) => {
    if (b.tagName !== 'BUTTON') return;
    b.setAttribute('aria-pressed', b.classList.contains('is-active') ? 'true' : 'false');
  });
}
