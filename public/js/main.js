// ══════════════════════════════════════════════════════════
// THE BOHEMIANS FESTIVAL 2026 — main.js
// ══════════════════════════════════════════════════════════

// ── Navbar scroll ──────────────────────────────────────────
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ── Hamburger menu ─────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navMobile = document.getElementById('navMobile');

hamburger.addEventListener('click', () => {
  navMobile.classList.toggle('open');
  hamburger.textContent = navMobile.classList.contains('open') ? '✕' : '☰';
});

document.querySelectorAll('.nav-mobile-link, .nav-mobile-btn').forEach(link => {
  link.addEventListener('click', () => {
    navMobile.classList.remove('open');
    hamburger.textContent = '☰';
  });
});

// ── Smooth scroll for anchor links ─────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── Countdown Timer ────────────────────────────────────────
let TARGET = new Date('2026-06-18T12:00:00');

const elDays  = document.getElementById('cd-days');
const elHours = document.getElementById('cd-hours');
const elMins  = document.getElementById('cd-mins');
const elSecs  = document.getElementById('cd-secs');
const cdWrap  = document.getElementById('countdown');

// Digit flip animation
function animateDigit(el, newVal) {
  const current = el.textContent;
  if (current === newVal) return;
  el.style.transform  = 'scale(0.8)';
  el.style.opacity    = '0';
  setTimeout(() => {
    el.textContent      = newVal;
    el.style.transform  = '';
    el.style.opacity    = '';
  }, 150);
}

function pad(n) { return String(n).padStart(2, '0'); }

function tick() {
  const now  = new Date();
  const diff = TARGET - now;

  if (diff <= 0) {
    cdWrap.innerHTML = '<p class="countdown-done">See you there 🌿</p>';
    return;
  }

  animateDigit(elDays,  pad(Math.floor(diff / 864e5)));
  animateDigit(elHours, pad(Math.floor((diff / 36e5) % 24)));
  animateDigit(elMins,  pad(Math.floor((diff / 6e4) % 60)));
  animateDigit(elSecs,  pad(Math.floor((diff / 1e3) % 60)));
}

// Style the digit elements for transition
[elDays, elHours, elMins, elSecs].forEach(el => {
  el.style.display    = 'inline-block';
  el.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
});

tick();
setInterval(tick, 1000);

// ── Scroll animations — IntersectionObserver ───────────────
const observerCfg = { threshold: 0.15 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerCfg);

function initScrollAnimations() {
  const selectors = [
    '.section-heading',
    '.strip-col',
    '.cazare-card',
    '.act-card',
    '.faq-item',
    '.about-body',
    '.venue-card',
    '.split-text p',
    '.split-label',
    '.lineup-card',
    '.gallery-item',
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('animate-ready');
      el.style.transitionDelay = (i * 0.08) + 's';
      observer.observe(el);
    });
  });
}

// ── Email capture ───────────────────────────────────────────
const emailForm  = document.getElementById('emailForm');
const emailInput = document.getElementById('emailInput');
const emailBtn   = document.getElementById('emailBtn');

if (emailBtn) {
  emailBtn.addEventListener('click', async () => {
    const val   = emailInput.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

    if (!valid) {
      emailInput.classList.remove('shake');
      void emailInput.offsetWidth;
      emailInput.classList.add('shake');
      emailInput.addEventListener('animationend', () => emailInput.classList.remove('shake'), { once: true });
      return;
    }

    emailBtn.disabled    = true;
    emailBtn.textContent = '...';

    try {
      const res  = await fetch('/api/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: val }),
      });
      const data = await res.json();
      if (data.success) {
        const p    = document.createElement('p');
        p.className   = 'email-success';
        p.textContent = '✓ You\'re in. Check your inbox.';
        document.getElementById('emailForm').replaceWith(p);
      } else {
        emailBtn.disabled    = false;
        emailBtn.textContent = 'Notify Me';
      }
    } catch {
      emailBtn.disabled    = false;
      emailBtn.textContent = 'Notify Me';
    }
  });
}

// ── FAQ Accordion ───────────────────────────────────────────
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item   = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-icon').textContent = '+';
    });

    if (!isOpen) {
      item.classList.add('open');
      btn.querySelector('.faq-icon').textContent = '−';
    }
  });
});

// ══════════════════════════════════════════════════════════
// API INTEGRATIONS
// ══════════════════════════════════════════════════════════

// ── a) Settings ────────────────────────────────────────────
async function loadSettings() {
  try {
    const s = await fetch('/api/settings').then(r => r.json());

    // Update countdown target from settings
    if (s.festival_date) {
      TARGET = new Date(s.festival_date);
    }

    // Tickets remaining badge
    const tickets = parseInt(s.tickets_remaining, 10);
    const ticketsEl = document.getElementById('hero-tickets');
    if (ticketsEl && !isNaN(tickets) && tickets > 0) {
      ticketsEl.textContent = `⚡ Mai sunt doar ${tickets} bilete disponibile`;
      ticketsEl.style.display = 'block';
    }

    // Early bird badge
    if (s.early_bird_active === '1') {
      const eb = document.getElementById('hero-early-bird');
      if (eb) eb.style.display = 'inline-block';
    }
  } catch (e) {
    // settings unavailable — silently ignore
  }
}

// ── b) Artists — replace placeholders if any ───────────────
async function loadArtists() {
  try {
    const artists = await fetch('/api/artists').then(r => r.json());
    if (!artists.length) return;

    const grid = document.getElementById('lineup-grid');
    if (!grid) return;

    grid.innerHTML = artists.map(a => `
      <div class="lineup-card lineup-card--artist">
        ${a.image_path
          ? `<img src="${a.image_path}" alt="${a.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`
          : `<div style="text-align:center;padding:20px;">
               <p style="font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--text);">${a.name}</p>
               <p style="font-size:12px;color:var(--text-muted);margin-top:6px;">${a.genre || ''}</p>
             </div>`}
      </div>
    `).join('');
  } catch (e) {
    // artists unavailable — keep placeholders
  }
}

// ── c) Announcements banner ────────────────────────────────
async function loadAnnouncements() {
  try {
    const list = await fetch('/api/announcements/active').then(r => r.json());
    if (!list.length) return;

    const ann = list[0]; // show latest active
    const dismissed = localStorage.getItem('ann-dismissed-' + ann.id);
    if (dismissed) return;

    const banner = document.getElementById('ann-banner');
    banner.innerHTML = `
      <span>${ann.title}</span>
      <button class="ann-dismiss" aria-label="Închide">✕</button>
    `;
    banner.style.display = 'block';

    banner.querySelector('.ann-dismiss').addEventListener('click', () => {
      banner.style.display = 'none';
      localStorage.setItem('ann-dismissed-' + ann.id, '1');
    });
  } catch (e) {
    // announcements unavailable
  }
}

// ── d) Gallery ─────────────────────────────────────────────
async function loadGallery() {
  try {
    const items = await fetch('/api/gallery').then(r => r.json());
    const grid  = document.getElementById('gallery-grid');
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = '<p class="gallery-empty">Fotografiile vin în curând.</p>';
      return;
    }

    grid.innerHTML = items.map(item => `
      <div class="gallery-item" data-src="${item.image_path}" data-caption="${item.caption || ''}">
        <img src="${item.image_path}"
             alt="${item.caption || 'The Bohemians Festival'}"
             loading="lazy" />
        ${item.caption ? `<div class="gallery-caption">${item.caption}</div>` : ''}
      </div>
    `).join('');

    // Lightbox
    grid.querySelectorAll('.gallery-item').forEach(el => {
      el.addEventListener('click', () => {
        const src     = el.dataset.src;
        const caption = el.dataset.caption;
        const box     = document.createElement('div');
        box.className = 'gallery-lightbox';
        box.innerHTML = `
          <button class="gallery-lightbox-close" aria-label="Închide">✕</button>
          <img src="${src}" alt="${caption}" />
        `;
        document.body.appendChild(box);
        document.body.style.overflow = 'hidden';

        const close = () => {
          box.remove();
          document.body.style.overflow = '';
        };
        box.addEventListener('click', close);
        box.querySelector('.gallery-lightbox-close').addEventListener('click', e => {
          e.stopPropagation();
          close();
        });
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape') close();
        }, { once: true });
      });
    });
  } catch (e) {
    // gallery unavailable
  }
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  loadSettings();
  loadArtists();
  loadAnnouncements();
  loadGallery();
});
