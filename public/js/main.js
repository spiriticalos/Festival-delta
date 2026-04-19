// ══════════════════════════════════════════════════════════
// THE BOHEMIANS FESTIVAL 2026 — main.js
// ══════════════════════════════════════════════════════════

// ── Navbar scroll + Back to top + Scroll progress ──────────
const navbar       = document.getElementById('navbar');
const backToTop    = document.getElementById('backToTop');
const progressBar  = document.getElementById('scroll-progress');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  backToTop.classList.toggle('visible', window.scrollY > 500);

  // Scroll progress bar
  const scrolled = document.documentElement.scrollTop;
  const total    = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  progressBar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
}, { passive: true });

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

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
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
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
    cdWrap.innerHTML = '<p class="countdown-done">See you there.</p>';
    clearInterval(cdInterval);
    return;
  }

  animateDigit(elDays,  pad(Math.floor(diff / 864e5)));
  animateDigit(elHours, pad(Math.floor((diff / 36e5) % 24)));
  animateDigit(elMins,  pad(Math.floor((diff / 6e4) % 60)));
}

// Style the digit elements for transition
[elDays, elHours, elMins].forEach(el => {
  el.style.display    = 'inline-block';
  el.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
});

tick();
const cdInterval = setInterval(tick, 1000);

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
        p.textContent = '✓ You\'re on the list.';
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
      el.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('open');
      btn.querySelector('.faq-icon').textContent = '−';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── Video lightbox ─────────────────────────────────────────
const videoThumb   = document.getElementById('videoThumb');
const videoLightbox = document.getElementById('videoLightbox');
const videoClose   = document.getElementById('videoClose');
const videoIframe  = document.getElementById('videoIframe');

if (videoThumb) {
  videoThumb.addEventListener('click', () => {
    videoIframe.src = videoIframe.dataset.src;
    videoLightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  const closeVideo = () => {
    videoLightbox.style.display = 'none';
    videoIframe.src = '';
    document.body.style.overflow = '';
  };

  videoClose.addEventListener('click', closeVideo);
  videoLightbox.addEventListener('click', e => {
    if (e.target === videoLightbox) closeVideo();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && videoLightbox.style.display === 'flex') closeVideo();
  });
}

// ══════════════════════════════════════════════════════════
// API INTEGRATIONS
// ══════════════════════════════════════════════════════════

// ── HTML escape helper (prevents XSS in innerHTML) ─────────
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── a) Settings ────────────────────────────────────────────
async function loadSettings() {
  try {
    const s = await fetch('/api/settings').then(r => r.json());

    // Update countdown target from settings
    if (s.festival_date) {
      TARGET = new Date(s.festival_date);
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
          ? `<img src="${esc(a.image_path)}" alt="${esc(a.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />`
          : `<div style="width:100%;height:100%;background:var(--bg-card);"></div>`}
        <div class="lineup-card-name">
          <span class="lineup-card-title">${esc(a.name)}</span>
        </div>
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
      <span>${esc(ann.title)}</span>
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
      grid.innerHTML = '<p class="gallery-empty">Photos coming soon.</p>';
      return;
    }

    // Remove skeleton, show marquee
    const skeleton = document.querySelector('.gallery-skeleton');
    if (skeleton) skeleton.remove();
    grid.style.display = 'flex';

    const itemHTML = items.map((item, i) => `
      <div class="gallery-item" data-index="${i}">
        <img src="${esc(item.image_path)}"
             alt="${esc(item.caption) || 'The Bohemians Festival'}"
             loading="${i < 4 ? 'eager' : 'lazy'}"
             decoding="async" />
        ${item.caption ? `<div class="gallery-caption">${esc(item.caption)}</div>` : ''}
      </div>
    `).join('');

    const wrap    = grid.parentElement;           // .gallery-marquee-wrap
    const stage   = wrap.parentElement;            // .gallery-stage (includes overlay text)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Always duplicate for seamless infinite marquee loop (desktop + mobile)
    grid.innerHTML = itemHTML + itemHTML;

    let offset  = 0;
    let paused  = false;
    let visible = true;
    const speed = 0.5;

    function marqueeStep() {
      if (!paused && visible && !reduced) {
        const half = grid.scrollWidth / 2;
        offset += speed;
        if (offset >= half) offset = 0;
        grid.style.transform = `translateX(-${offset}px)`;
      }
      requestAnimationFrame(marqueeStep);
    }
    requestAnimationFrame(marqueeStep);

    // Desktop: pause on hover over the full stage (includes overlay text)
    stage.addEventListener('mouseenter', () => { paused = true; });
    stage.addEventListener('mouseleave', () => { paused = false; });

    // Mobile: manual drag on wrap — pause marquee, move with finger, resume on release
    let touchStartX = 0;
    wrap.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      paused = true;
    }, { passive: true });
    wrap.addEventListener('touchmove', e => {
      const delta = touchStartX - e.touches[0].clientX;
      touchStartX = e.touches[0].clientX;
      const half = grid.scrollWidth / 2;
      offset = ((offset + delta) % half + half) % half;
      grid.style.transform = `translateX(-${offset}px)`;
    }, { passive: true });
    wrap.addEventListener('touchend', () => { paused = false; }, { passive: true });

    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(stage);

    // Lightbox state
    let lightbox    = null;
    let current     = 0;
    let triggerEl   = null; // element that opened the lightbox, for focus restore

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove('open');
      setTimeout(() => {
        if (lightbox) { lightbox.remove(); lightbox = null; }
        document.body.style.overflow = '';
        if (triggerEl) { triggerEl.focus(); triggerEl = null; }
      }, 300);
    }

    function renderLightbox(index) {
      current = ((index % items.length) + items.length) % items.length;
      const item = items[current];
      const multi = items.length > 1;

      if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.className = 'gallery-lightbox';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Gallery image viewer');
        document.body.appendChild(lightbox);
        requestAnimationFrame(() => lightbox.classList.add('open'));
        document.body.style.overflow = 'hidden';

        // Single delegated listener — attached once, handles all clicks
        lightbox.addEventListener('click', e => {
          if (e.target === lightbox)                                  closeLightbox();
          else if (e.target.closest('.gallery-lightbox-close'))     { e.stopPropagation(); closeLightbox(); }
          else if (e.target.closest('.gallery-lightbox-prev'))      { e.stopPropagation(); renderLightbox(current - 1); }
          else if (e.target.closest('.gallery-lightbox-next'))      { e.stopPropagation(); renderLightbox(current + 1); }
        });
      }

      lightbox.innerHTML = `
        <button class="gallery-lightbox-close" aria-label="Închide lightbox">✕</button>
        ${multi ? `<button class="gallery-lightbox-prev" aria-label="Imaginea anterioară">&#8249;</button>` : ''}
        <div class="gallery-lightbox-img-wrap">
          <img src="${esc(item.image_path)}" alt="${esc(item.caption) || 'The Bohemians Festival'}" />
          ${item.caption ? `<p class="gallery-lightbox-caption">${esc(item.caption)}</p>` : ''}
        </div>
        ${multi ? `<button class="gallery-lightbox-next" aria-label="Imaginea următoare">&#8250;</button>` : ''}
        ${multi ? `<span class="gallery-lightbox-counter" aria-live="polite">${current + 1} / ${items.length}</span>` : ''}
      `;
      // Move focus to close button after render
      requestAnimationFrame(() => {
        const closeBtn = lightbox.querySelector('.gallery-lightbox-close');
        if (closeBtn) closeBtn.focus();
      });
    }

    // Click on any gallery item (both original + duplicate sets)
    grid.addEventListener('click', e => {
      const item = e.target.closest('.gallery-item[data-index]');
      if (item) {
        triggerEl = e.target.closest('.gallery-item');
        renderLightbox(parseInt(item.dataset.index, 10));
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (!lightbox) return;
      if (e.key === 'Escape')      closeLightbox();
      if (e.key === 'ArrowLeft')   renderLightbox(current - 1);
      if (e.key === 'ArrowRight')  renderLightbox(current + 1);
    });

  } catch (e) {
    // gallery unavailable
  }
}

// ── Cookie banner ───────────────────────────────────────────
function initCookieBanner() {
  const consent = localStorage.getItem('cookie-consent');
  if (consent === 'all' || consent === 'necessary') return;
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  banner.style.display = 'block';
  document.getElementById('cookie-accept-all').addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'all');
    banner.style.display = 'none';
  });
  document.getElementById('cookie-necessary').addEventListener('click', () => {
    localStorage.setItem('cookie-consent', 'necessary');
    banner.style.display = 'none';
  });
}

// ── Navbar active section ───────────────────────────────────
function initNavActive() {
  const navLinks       = document.querySelectorAll('.nav-links li a[href^="#"]');
  const mobileLinks    = document.querySelectorAll('.nav-mobile-link[href^="#"]');
  const allNavLinks    = [...navLinks, ...mobileLinks];
  if (!allNavLinks.length) return;

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        allNavLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.35, rootMargin: '-5% 0px -55% 0px' });

  document.querySelectorAll('section[id]').forEach(s => sectionObserver.observe(s));
}

// ── Ripple effect on ticket buttons ────────────────────────
function initRipple() {
  document.querySelectorAll('.btn-ticket').forEach(btn => {
    btn.addEventListener('click', e => {
      const rect   = btn.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height);
      const x      = e.clientX - rect.left - size / 2;
      const y      = e.clientY - rect.top  - size / 2;
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });
}

// ── Service Worker ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCookieBanner();
  initScrollAnimations();
  initNavActive();
  initRipple();
  loadSettings();
  loadArtists();
  loadAnnouncements();
  loadGallery();
});
