/* ── PARTICLES ── */
const particleContainer = document.getElementById('particles');
for (let i = 0; i < 18; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  const size = Math.random() * 80 + 30;
  p.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    left: ${Math.random() * 100}%;
    animation-duration: ${Math.random() * 14 + 10}s;
    animation-delay: ${Math.random() * 12}s;
  `;
  particleContainer.appendChild(p);
}

/* ── SCROLL REVEAL ── */
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
}, { threshold: 0.12 });
revealEls.forEach(el => observer.observe(el));

/* ── LIGHTBOX ── */
let lbImages = [];   // all photo srcs in the gallery
let lbIndex  = 0;    // currently shown index
let lbAnimating = false;

function buildImageList() {
  lbImages = Array.from(
    document.querySelectorAll('#gallery-grid .photo-card img')
  ).map(img => img.src);
}

function openLightbox(index) {
  buildImageList();
  if (!lbImages.length) return;
  lbIndex = index;

  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');

  img.src = lbImages[lbIndex];
  lb.classList.add('open');
  updateCounter();
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.style.opacity = '0';
  lb.style.background = 'rgba(20,15,10,0)';
  setTimeout(() => {
    lb.classList.remove('open');
    lb.style.opacity = '';
    lb.style.background = '';
    document.getElementById('lightbox-img').src = '';
  }, 320);
}

function navigateLightbox(dir) {
  if (lbAnimating || lbImages.length < 2) return;
  lbAnimating = true;

  const img = document.getElementById('lightbox-img');
  const outClass = dir === 1 ? 'slide-out-left' : 'slide-out-right';
  const inClass  = dir === 1 ? 'slide-in-left'  : 'slide-in-right';

  img.classList.add(outClass);

  setTimeout(() => {
    lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
    img.src = lbImages[lbIndex];
    img.classList.remove(outClass);
    img.classList.add(inClass);

    // Force reflow then animate in
    void img.offsetWidth;
    img.classList.remove(inClass);
    updateCounter();

    setTimeout(() => { lbAnimating = false; }, 320);
  }, 260);
}

function updateCounter() {
  const el = document.getElementById('lb-counter');
  if (lbImages.length > 1) {
    el.textContent = `${lbIndex + 1} / ${lbImages.length}`;
  } else {
    el.textContent = '';
  }
}

// Open on photo card click
document.getElementById('gallery-grid').addEventListener('click', function(e) {
  const card = e.target.closest('.photo-card');
  if (!card) return;
  const img = card.querySelector('img');
  if (!img) return;
  buildImageList();
  const idx = lbImages.indexOf(img.src);
  openLightbox(idx >= 0 ? idx : 0);
});

// Backdrop click closes
document.getElementById('lightbox').addEventListener('click', function(e) {
  if (e.target === this) closeLightbox();
});

// Buttons
document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lb-prev').addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
document.getElementById('lb-next').addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

// Keyboard
document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowRight')  navigateLightbox(1);
  if (e.key === 'ArrowLeft')   navigateLightbox(-1);
});

// Touch swipe support
let touchStartX = 0;
document.getElementById('lightbox').addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('lightbox').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) navigateLightbox(dx < 0 ? 1 : -1);
});

/* ── CANDLES (Firebase Firestore — real-time shared) ── */

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createCandleEl(name, index) {
  const wrap = document.createElement('div');
  wrap.className = 'candle-wrap';
  wrap.style.animationDelay = `${Math.min(index * 0.05, 1.5)}s`;
  wrap.innerHTML = `
    <div class="candle">
      <div class="candle-glow-ring"></div>
      <div class="candle-wick">
        <div class="candle-flame"></div>
      </div>
      <div class="candle-body"></div>
    </div>
    <div class="candle-name">${escHtml(name)}</div>
  `;
  return wrap;
}

function updateCount(n) {
  const el = document.getElementById('candle-count');
  if (n === 0)      el.textContent = 'İlk mumu sen yak.';
  else if (n === 1) el.textContent = '1 mum yanıyor';
  else              el.textContent = `${n} mum yanıyor`;
}

async function addCandle(name) {
  const safeName = (name || 'Anonim').trim().slice(0, 24) || 'Anonim';
  try {
    await window.db.collection('candles').add({
      name: safeName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    console.error('Mum kaydedilemedi:', err);
  }
}

function startCandleListener() {
  window.db
    .collection('candles')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      const grid = document.getElementById('candle-grid');
      grid.innerHTML = '';
      snapshot.docs.forEach((doc, i) => {
        const data = doc.data();
        grid.appendChild(createCandleEl(data.name || 'Anonim', i));
      });
      updateCount(snapshot.size);
    }, err => {
      console.error('Firestore dinleme hatası:', err);
    });
}

/* ── MODAL ── */
const modalOverlay = document.getElementById('modal-overlay');

document.getElementById('open-modal-btn').addEventListener('click', () => {
  modalOverlay.classList.add('open');
  document.getElementById('candle-name-input').value = '';
  document.getElementById('candle-name-input').focus();
});

modalOverlay.addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('open');
});

document.getElementById('confirm-candle-btn').addEventListener('click', () => {
  const name = document.getElementById('candle-name-input').value.trim();
  modalOverlay.classList.remove('open');
  addCandle(name || 'Anonim');
});

document.getElementById('skip-name-btn').addEventListener('click', () => {
  modalOverlay.classList.remove('open');
  addCandle('Anonim');
});

document.getElementById('candle-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('confirm-candle-btn').click();
});

/* ── INIT ── */
startCandleListener();
