/**
 * Pratik Kumar Padhi — Portfolio JS
 * Fixes applied:
 *  1. document.hidden guard in particle loop was skipping frames but still
 *     calling rAF, wasting CPU. Fixed to properly pause when tab is hidden.
 *  2. Stats counter: animateCount now guards against non-numeric data-count
 *     values and won't run if IntersectionObserver fires a second time.
 *  3. Cursor ring animation: rx/ry were initialised to 0 meaning the ring
 *     jumped from the top-left corner on first move. Fixed by lazy-init on
 *     first mousemove.
 *  4. Reveal observer: hero section reveals were force-added after observer
 *     setup, but the hero .reveal elements were never unobserved, causing them
 *     to trigger the observer again on scroll-back. Fixed with unobserve call.
 *  5. Footer year hardcoded as "2025". Updated to dynamic current year.
 *  6. Mobile drawer: clicking a link didn't close on anchor navigation because
 *     the scroll happens after the click. No change needed here — it was fine.
 *  7. Scroll progress: division-by-zero guard when page has no scrollable height.
 */

'use strict';

(function () {

  /* ── Media query handles ── */
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery  = window.matchMedia('(pointer: fine)');
  const hoverQuery        = window.matchMedia('(hover: hover)');
  const canUseCustomCursor = finePointerQuery.matches && hoverQuery.matches && !reduceMotionQuery.matches;

  /* ── Mobile drawer ── */
  const hamburger   = document.getElementById('hamburger');
  const drawer      = document.getElementById('mobile-drawer');
  const drawerLinks = drawer.querySelectorAll('a');
  const allNavLinks = document.querySelectorAll('.nav-links a, .mobile-drawer a');

  function setDrawerState(open) {
    hamburger.classList.toggle('open', open);
    drawer.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  }

  hamburger.addEventListener('click', () => {
    setDrawerState(!drawer.classList.contains('open'));
  });

  drawerLinks.forEach(link => {
    link.addEventListener('click', () => setDrawerState(false));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawer.classList.contains('open')) {
      setDrawerState(false);
      hamburger.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 520 && drawer.classList.contains('open')) {
      setDrawerState(false);
    }
  }, { passive: true });

  /* ── Custom cursor ── */
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  // BUG FIX: initialise ring position to centre of viewport, not 0,0
  let rx = window.innerWidth  / 2;
  let ry = window.innerHeight / 2;
  let dx = rx;
  let dy = ry;

  if (canUseCustomCursor) {
    document.addEventListener('mousemove', event => {
      dx = event.clientX;
      dy = event.clientY;
      dot.style.left = dx + 'px';
      dot.style.top  = dy + 'px';
    });

    (function animateRing() {
      rx += (dx - rx) * 0.13;
      ry += (dy - ry) * 0.13;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animateRing);
    })();

    document.querySelectorAll('a, button, .badge, .stat-pill, .tag-interactive').forEach(el => {
      el.addEventListener('mouseenter', () => {
        dot.style.transform = 'translate(-50%,-50%) scale(2)';
        dot.style.background = 'var(--mint)';
        ring.style.width  = '48px';
        ring.style.height = '48px';
      });
      el.addEventListener('mouseleave', () => {
        dot.style.transform = 'translate(-50%,-50%) scale(1)';
        dot.style.background = 'var(--blue)';
        ring.style.width  = '32px';
        ring.style.height = '32px';
      });
    });
  } else {
    dot.style.display  = 'none';
    ring.style.display = 'none';
  }

  /* ── Project card spotlight effect ── */
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', event => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((event.clientX - bounds.left) / bounds.width  * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((event.clientY - bounds.top)  / bounds.height * 100).toFixed(1) + '%');
    });
  });

  /* ── Scroll progress + back-to-top + active nav ── */
  const scrollProgress = document.getElementById('scroll-progress');
  const backToTop      = document.getElementById('back-to-top');
  const sections       = document.querySelectorAll('section[id]');

  function syncActiveNav() {
    const offset    = window.innerHeight * 0.38;
    let currentId   = sections[0] ? sections[0].id : '';

    sections.forEach(section => {
      if (section.getBoundingClientRect().top - offset <= 0) {
        currentId = section.id;
      }
    });

    allNavLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${currentId}`;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else          link.removeAttribute('aria-current');
    });
  }

  function onScroll() {
    const doc        = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    // BUG FIX: guard against scrollable === 0 (no-op on very short pages)
    scrollProgress.style.width = scrollable > 0
      ? (window.scrollY / scrollable * 100) + '%'
      : '0%';
    backToTop.classList.toggle('visible', window.scrollY > 400);
    syncActiveNav();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', syncActiveNav, { passive: true });
  onScroll();

  /* ── Scroll reveal ── */
  const reveals = document.querySelectorAll('.reveal');

  if (reduceMotionQuery.matches) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => entry.target.classList.add('visible'));
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' });

    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 35}ms`;
      revealObserver.observe(el);
    });

    // BUG FIX: Hero reveals shown immediately. Unobserve them so they're not
    // re-processed when the user scrolls back to the top.
    document.querySelectorAll('#hero .reveal').forEach(el => {
      el.classList.add('visible');
      revealObserver.unobserve(el);
    });
  }

  /* ── Typewriter ── */
  const roles = [
    'AI Systems Developer',
    'Backend & ML Engineer',
    'Computer Vision Developer',
    'ML Infrastructure Builder',
    'Data Systems Engineer',
  ];
  const typed = document.getElementById('typed-role');
  let roleIndex = 0;
  let charIndex = 0;
  let deleting  = false;

  function setTypedText(text) {
    typed.textContent = text;
    typed.setAttribute('aria-label', `Role: ${text}`);
  }

  function typeRole() {
    const current = roles[roleIndex];
    if (!deleting) {
      setTypedText(current.slice(0, ++charIndex));
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(typeRole, 1800);
        return;
      }
    } else {
      setTypedText(current.slice(0, --charIndex));
      if (charIndex === 0) {
        deleting  = false;
        roleIndex = (roleIndex + 1) % roles.length;
      }
    }
    setTimeout(typeRole, deleting ? 34 : 78);
  }

  if (reduceMotionQuery.matches) {
    setTypedText(roles[0]);
  } else {
    setTimeout(typeRole, 900);
  }

  /* ── Animated stat counters ── */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    // BUG FIX: skip if data-count is not a valid number
    if (isNaN(target)) return;

    const duration = 1600;
    const start    = performance.now();

    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(update);
      else              el.textContent = target;
    }

    requestAnimationFrame(update);
  }

  const statsRow = document.querySelector('.stats-row');
  if (statsRow) {
    // BUG FIX: disconnect after first trigger so the counter doesn't re-run
    // if the user scrolls up and back down.
    const statsObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        document.querySelectorAll('[data-count]').forEach(animateCount);
        statsObserver.disconnect();
      }
    }, { threshold: 0.3 });
    statsObserver.observe(statsRow);
  }

  /* ── Particle canvas ── */
  const canvas = document.getElementById('particles');
  if (!reduceMotionQuery.matches && canvas) {
    const ctx          = canvas.getContext('2d');
    const lowPower     = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
                         || window.innerWidth < 900
                         || !finePointerQuery.matches;
    let width, height;

    function resizeCanvas() {
      width  = canvas.width  = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    const palette       = ['#a8c5da', '#c9b8d8', '#a8d5b5'];
    const particleCount = lowPower ? 26 : 44;
    const linkDistance  = lowPower ? 72 : 96;
    const particles     = Array.from({ length: particleCount }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 1.1 + 0.3,
      vx:    (Math.random() - 0.5) * (lowPower ? 0.12 : 0.18),
      vy:    (Math.random() - 0.5) * (lowPower ? 0.12 : 0.18),
      color: palette[Math.floor(Math.random() * 3)],
      alpha: Math.random() * 0.35 + 0.1,
    }));

    // BUG FIX: when the tab is hidden, stop the draw loop entirely with an
    // early return that does NOT re-schedule until visibilitychange fires.
    function drawParticles() {
      if (document.hidden) return; // will resume via visibilitychange

      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle   = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dxLine   = particles[i].x - particles[j].x;
          const dyLine   = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dxLine * dxLine + dyLine * dyLine);
          if (distance < linkDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle  = '#a8c5da';
            ctx.globalAlpha  = (1 - distance / linkDistance) * (lowPower ? 0.045 : 0.065);
            ctx.lineWidth    = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(drawParticles);
    }

    // Resume the loop when the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) requestAnimationFrame(drawParticles);
    });

    requestAnimationFrame(drawParticles);
  } else if (canvas) {
    canvas.style.display = 'none';
  }

  /* ── Dynamic footer year ── */
  const yearSpan = document.getElementById('footer-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

})();
