/* Insect Zoo homepage helpers. The exhibit copy panel folds to a tab so it stops hiding the sim:
   open on a first visit, it folds after 6 s on screen or at the first touch of the sim; the toggle
   reopens it (and then the timer leaves it alone, though touching the sim folds it again). The state is kept per exhibit in sessionStorage. */
(function () {
  var session;
  try { session = window.sessionStorage; } catch (e) { session = null; }

  function load(k) { if (session) { try { return session.getItem(k); } catch (e) { return null; } } return null; }
  function save(k, v) { if (session) { try { session.setItem(k, v); } catch (e) { /* storage full or blocked: the fold just isn't remembered */ } } }

  function panel(sec) {
    var ov = sec.querySelector('.exhibit-overlay'), btn = sec.querySelector('.exhibit-toggle');
    var cv = sec.querySelector('.exhibit-sim'), key = 'zoo-fold:' + sec.id, timer = 0;
    if (!ov || !btn) return;
    function set(folded) {
      ov.classList.toggle('is-collapsed', folded);
      btn.setAttribute('aria-expanded', folded ? 'false' : 'true');
      btn.setAttribute('aria-label', folded ? 'Open the exhibit notes' : 'Fold the exhibit notes');
      btn.textContent = folded ? 'i' : '−';
      save(key, folded ? '1' : '0');
    }
    function auto() { if (!ov.classList.contains('is-collapsed')) set(true); }   // touching the sim folds the notes away, even after a manual reopen
    btn.addEventListener('click', function (e) {
      e.stopPropagation(); clearTimeout(timer);
      set(!ov.classList.contains('is-collapsed'));
    });
    if (cv) cv.addEventListener('pointerdown', auto);
    if (load(key) === '1') { set(true); return; }
    set(false);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          clearTimeout(timer);
          if (en.isIntersecting && en.intersectionRatio >= 0.5) timer = setTimeout(auto, 6000);
        });
      }, { threshold: [0, 0.5] }).observe(sec);
    }
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('section.exhibit:not(.exhibit--hero)'), panel);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* Argos the guide: docked bottom-right, he says what to do in each exhibit and takes you to the next.
   He greets a Living Twin visitor by company name. Text goes in with textContent only. */
(function () {
  var guide = document.getElementById('argos-guide');
  if (!guide) return;
  var bubble = guide.querySelector('.argos-bubble'), next = guide.querySelector('.guide-next');
  var prev = guide.querySelector('.guide-prev'), min = guide.querySelector('.guide-min'), fig = guide.querySelector('.argos-figure');
  var ORDER = ['charlotte', 'ants', 'fireflies', 'bees', 'termites', 'roi', 'contact'];
  var TIPS = {
    charlotte: 'Two barn spiders are spinning their webs. Fly me into the sticky spiral, or pluck a strand and watch her run to check it.',
    ants: 'Drag to lay scent toward a leaf. The weaver ants follow it, grab the leaf and haul it home to the nest.',
    fireflies: 'Click to scramble their rhythm, then watch them fall back into sync with no leader at all.',
    bees: 'Click to plant a flower. A scout finds it, dances the way home, and her recruits fly out to it.',
    termites: 'Pick Eat or Build, then paint with me. Tap the mound wall to breach it: soldiers guard, workers repair.',
    roi: 'Drag the sliders: the cloud bill climbs with use while AI you own stays flat.',
    contact: 'Ready when you are. Let’s talk about what this could do for your team.'
  };
  var small = !!(window.matchMedia && window.matchMedia('(max-width: 480px)').matches);
  var here = 0, hush = 0, greeting = true, pending = null;

  function say(text) {
    bubble.textContent = text; bubble.classList.add('show');
    clearTimeout(hush);
    if (small) hush = setTimeout(function () { bubble.classList.remove('show'); }, 4000);
  }
  function go(i) {
    var s = document.getElementById(ORDER[Math.max(0, Math.min(ORDER.length - 1, i))]);
    if (s && s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth' });
  }
  function setMin(on, keep) {
    guide.classList.toggle('is-min', on);
    min.setAttribute('aria-expanded', on ? 'false' : 'true');
    if (!keep) { try { window.localStorage.setItem('zoo-guide-min', on ? '1' : '0'); } catch (e) { /* not remembered */ } }
  }
  function arrive(id) {
    here = ORDER.indexOf(id);
    next.disabled = here === ORDER.length - 1; prev.disabled = here === 0;
    if (greeting) pending = id; else say(TIPS[id]);
  }

  next.addEventListener('click', function () { go(here + 1); });
  prev.addEventListener('click', function () { go(here - 1); });
  min.addEventListener('click', function () { setMin(!guide.classList.contains('is-min')); });
  fig.addEventListener('click', function () {   // tucked away: he comes back; on a phone (no buttons) he takes you on
    if (guide.classList.contains('is-min')) setMin(false); else if (small) go(here + 1);
  });
  var stored = null;
  try { stored = window.localStorage.getItem('zoo-guide-min'); } catch (e) { stored = null; }
  if (stored === '1') setMin(true, true);

  var T = window.__TWIN;
  say(T && T.company ? 'Hi ' + T.company + ', I’m Argos. I pre-ran your numbers further down. Start with the spiders up here.'
                     : 'Hi, I’m Argos, your guide. Play with each exhibit; I’ll tell you what it does.');
  setTimeout(function () { greeting = false; if (pending) say(TIPS[pending]); }, 5000);

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting && en.intersectionRatio >= 0.5) arrive(en.target.id); });
    }, { threshold: [0.5] });
    ORDER.forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }
  window.ArgosGuide = { tips: TIPS, order: ORDER, say: say, go: go };
})();
