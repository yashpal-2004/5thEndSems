(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = (name, cls = '') => {
    const paths = {
      search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
      chevron: '<path d="m7 10 5 5 5-5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      cross: '<path d="m6 6 12 12M18 6 6 18"/>',
      reset: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/>',
      hub: '<rect x="3" y="4" width="7" height="6" rx="1"/><rect x="14" y="4" width="7" height="6" rx="1"/><rect x="8.5" y="15" width="7" height="6" rx="1"/><path d="M6.5 10v2h11v-2M12 12v3"/>',
      network: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="m10.8 7.2-4.5 8.6m6.9-8.6 4.5 8.6M7.5 18h9"/>',
      code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4m-2-11-4 14"/>'
    };
    return `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.book}</svg>`;
  };

  document.documentElement.setAttribute('data-theme', 'light');
  const hero = $('.hero');
  const navStack = $('.nav-stack');
  const main = $('.main');
  if (!hero || !navStack || !main) return;

  // One measured sticky block keeps the header and wrapped topic navigation together.
  const stickyShell = document.createElement('div');
  stickyShell.className = 'sticky-shell';
  hero.parentNode.insertBefore(stickyShell, hero);
  stickyShell.append(hero, navStack);
  const progressTrack = document.createElement('div');
  progressTrack.className = 'quiz-progress-track';
  progressTrack.setAttribute('role', 'progressbar');
  progressTrack.setAttribute('aria-label', 'MCQ completion');
  progressTrack.setAttribute('aria-valuemin', '0');
  progressTrack.setAttribute('aria-valuemax', '100');
  progressTrack.innerHTML = '<div class="quiz-progress-fill"></div>';
  stickyShell.appendChild(progressTrack);
  const setStickyHeight = () => document.documentElement.style.setProperty('--sticky-height', `${stickyShell.getBoundingClientRect().height}px`);
  setStickyHeight();
  if (window.ResizeObserver) new ResizeObserver(setStickyHeight).observe(stickyShell);
  window.addEventListener('resize', setStickyHeight);

  const heroRight = $('.hero-right');
  const score = $('#scoreDisplay');
  const search = $('#searchInput');
  const oldReset = $('.theme-btn');
  if (oldReset) {
    oldReset.className = 'reset-quiz-button';
    oldReset.type = 'button';
    oldReset.innerHTML = `${icon('reset')}<span>Reset quiz</span>`;
    oldReset.title = 'Clear saved MCQ answers';
    oldReset.onclick = () => window.resetMcqProgress();
  }
  if (search) {
    search.placeholder = 'Search notes, code, numericals, MCQs…';
    search.setAttribute('aria-label', 'Search notes, code, numericals and MCQs');
    const searchMark = $('.search-bar > span:first-child');
    if (searchMark) searchMark.innerHTML = icon('search');
  }
  if (score) score.setAttribute('aria-live', 'polite');

  const sourceLinks = $$('.nav-stack .nav-pill');
  const linkLabels = new Map(sourceLinks.map(a => [a.getAttribute('href')?.slice(1), a.textContent.trim().replace(/\s+/g, ' ')]));
  const firstNav = $('.nav-stack .nav-bar');
  const secondNav = $('.nav-stack .lec-bar');
  if (secondNav) secondNav.hidden = true;
  if (firstNav) {
    firstNav.replaceChildren();
    firstNav.setAttribute('aria-label', 'Study topics');
    const primaryIds = ['blueprint', ...Array.from({ length: 17 }, (_, i) => `lec${i + 1}`), 'labs', 'tables'];
    const shortLabels = { blueprint: 'Guide', labs: 'Labs', tables: 'Tables' };
    const makeNavLink = id => {
      const a = document.createElement('a');
      a.className = 'nav-pill';
      a.href = `#${id}`;
      a.dataset.topicId = id;
      const full = linkLabels.get(id) || (id.startsWith('lec') ? `Lecture ${id.slice(3)}` : id);
      a.innerHTML = `<span class="nav-full">${full.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span><span class="nav-short">${id.startsWith('lec') ? `L${id.slice(3)}` : (shortLabels[id] || full)}</span>`;
      a.setAttribute('aria-label', full);
      return a;
    };
    primaryIds.forEach(id => { if ($(`#${CSS.escape(id)}`)) firstNav.appendChild(makeNavLink(id)); });
    const more = document.createElement('details');
    more.className = 'nav-more';
    more.innerHTML = `<summary class="nav-pill"><span class="nav-full">More topics</span><span class="nav-short">More</span>${icon('chevron')}</summary><div class="nav-more-panel"></div>`;
    ['mistakes', 'subjective', 'aws', 'playbook', 'diagrams', 'match', 'comprehension'].forEach(id => {
      if ($(`#${CSS.escape(id)}`)) more.querySelector('.nav-more-panel').appendChild(makeNavLink(id));
    });
    firstNav.appendChild(more);
  }

  const sections = $$('.main .section');
  const lectures = sections.filter(s => /^lec\d+$/.test(s.id));
  const allMcq = $('#allmcq');
  const numericalSection = $('#numericals');
  const mcqBank = $('#mcqs');

  // Practice Hub is a separate view. Existing data and answer logic stay in place.
  const practice = document.createElement('section');
  practice.className = 'practice-view';
  practice.id = 'practiceHubView';
  practice.hidden = true;
  practice.innerHTML = `<div class="practice-toolbar"><button class="practice-mode-button active" type="button" data-mode="quizzes">Quizzes (MCQs)</button><button class="practice-mode-button" type="button" data-mode="numericals">Numericals</button></div><h1 class="practice-heading">Practice Hub</h1><p class="practice-intro" id="practiceIntro"></p><div class="practice-mode" id="quizMode"><h2 class="practice-heading">Quizzes (MCQs)</h2><p class="practice-intro">Choose a source, then narrow to a topic or subtopic. Each unique question appears once.</p><div class="quiz-overview" id="quizOverview"></div><h3>Topics</h3><div class="chip-row" id="quizTopicChips"></div><h3>Subtopics</h3><div class="chip-row" id="quizSubtopicChips"></div></div><div class="practice-mode" id="numericalMode" hidden><h2 class="practice-heading">Numericals</h2><p class="practice-intro">How-to notes, worked examples and unsolved practice from the lectures.</p><div id="numericalExtras"></div></div>`;
  main.parentNode.insertBefore(practice, main);
  const quizMode = $('#quizMode', practice);
  const numericalMode = $('#numericalMode', practice);
  const extras = $('#numericalExtras', practice);
  if (allMcq) quizMode.appendChild(allMcq);
  if (numericalSection) numericalMode.appendChild(numericalSection);
  if (mcqBank) {
    const mcqArchive = document.createElement('div');
    mcqArchive.id = 'mcqSourceArchive';
    mcqArchive.hidden = true;
    practice.appendChild(mcqArchive);
    mcqArchive.appendChild(mcqBank);
  }
  const allMcqHead = allMcq && $('.section-header', allMcq);
  if (allMcqHead) allMcqHead.hidden = true;
  if (numericalSection) { const h = $('.section-header', numericalSection); if (h) h.hidden = true; }

  // Preserve the original MCQ blocks in the quiz source; remove their lecture tabs from view.
  const mcqKey = block => typeof window.qKey === 'function' ? window.qKey(block) : (block.querySelector('.mcq-q')?.textContent || '').trim().toLowerCase();
  const uniqueMcqs = () => {
    const seen = new Set();
    return $$('.mcq-block:not(.mcq-clone)').filter(block => {
      if (!block.querySelector('.opt')) return false;
      const key = mcqKey(block);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Reshape each lecture into Theory and Code. Original subtopic tabs remain under Theory.
  lectures.forEach(section => {
    const body = $('.section-body', section);
    const oldBar = body && $('.tab-bar', body);
    if (!body || !oldBar || section.dataset.polished) return;
    section.dataset.polished = 'true';
    const tabs = [...oldBar.querySelectorAll('.tab')];
    const tabContents = tabs.map(tab => {
      const match = (tab.getAttribute('onclick') || '').match(/'([^']+)'/);
      return { tab, target: match && document.getElementById(match[1]), label: tab.textContent.trim() };
    }).filter(x => x.target);
    const theory = document.createElement('div');
    theory.className = 'lecture-theory-view';
    const code = document.createElement('div');
    code.className = 'lecture-code-view';
    code.hidden = true;
    const archive = document.createElement('div');
    archive.className = 'lecture-mcq-archive';
    archive.hidden = true;
    const moved = new Set();
    tabContents.forEach(item => {
      if (/mcq/i.test(item.label) || /-mcq$/i.test(item.target.id)) {
        item.tab.remove();
        item.target.classList.remove('active');
        item.target.dataset.practiceSource = 'quizzes';
        archive.appendChild(item.target);
        moved.add(item.target);
        return;
      }
      if (/worked|math|formula|numerical|cidr|subnet|magic|mask|calculation/i.test(`${item.label} ${item.target.id}`)) {
        item.tab.remove();
        item.target.classList.remove('tab-content', 'active');
        item.target.classList.add('moved-numerical-content');
        const group = document.createElement('section');
        group.className = 'numerical-topic';
        group.dataset.topic = `Lecture ${section.id.slice(3)}`;
        const heading = document.createElement('h3');
        heading.textContent = `Lecture ${section.id.slice(3)} · ${item.label}`;
        group.append(heading, item.target);
        extras.appendChild(group);
        moved.add(item.target);
      }
    });
    const remaining = tabContents.filter(item => !moved.has(item.target));
    if (remaining.length && !remaining.some(item => item.tab.classList.contains('active'))) {
      remaining[0].tab.classList.add('active');
      remaining[0].target.classList.add('active');
    }
    const switcher = document.createElement('div');
    switcher.className = 'lecture-switcher';
    switcher.setAttribute('role', 'tablist');
    const theoryButton = document.createElement('button');
    theoryButton.type = 'button';
    theoryButton.className = 'view-tab active';
    theoryButton.textContent = 'Theory';
    theoryButton.setAttribute('role', 'tab');
    const codeButton = document.createElement('button');
    codeButton.type = 'button';
    codeButton.className = 'view-tab';
    codeButton.innerHTML = `${icon('code')}<span>Code</span>`;
    codeButton.setAttribute('role', 'tab');
    const setLectureView = view => {
      const isCode = view === 'code';
      theory.hidden = isCode;
      code.hidden = !isCode;
      theoryButton.classList.toggle('active', !isCode);
      codeButton.classList.toggle('active', isCode);
      theoryButton.setAttribute('aria-selected', String(!isCode));
      codeButton.setAttribute('aria-selected', String(isCode));
      setStickyHeight();
    };
    theoryButton.onclick = () => setLectureView('theory');
    codeButton.onclick = () => setLectureView('code');
    switcher.append(theoryButton, codeButton);
    const preExisting = [...body.children];
    body.insertBefore(switcher, body.firstChild);
    body.insertBefore(theory, switcher.nextSibling);
    body.insertBefore(code, theory.nextSibling);
    theory.appendChild(oldBar);
    preExisting.forEach(node => {
      if (node === oldBar || node === switcher || node === theory || node === code) return;
      if (node.classList?.contains('tab-content') && moved.has(node)) return;
      theory.appendChild(node);
    });
    const codeBlocks = $$('.tab-content pre:not(.mermaid), .tab-content .code-label + pre', section).filter(pre => !pre.closest('.lecture-mcq-archive'));
    const seenCode = new Set();
    codeBlocks.forEach(pre => {
      const value = pre.textContent.trim();
      if (!value || seenCode.has(value)) return;
      seenCode.add(value);
      const label = pre.previousElementSibling?.classList.contains('code-label') ? pre.previousElementSibling.cloneNode(true) : null;
      if (label) code.appendChild(label);
      code.appendChild(pre.cloneNode(true));
    });
    if (!codeBlocks.length) {
      const note = document.createElement('p');
      note.className = 'code-empty';
      note.textContent = 'No separate code snippets for this lecture.';
      code.appendChild(note);
    }
    body.appendChild(archive);
    code.hidden = true;
  });

  // If any numericals were found in lecture tabs, keep them grouped by lecture in the hub.
  if (!extras.children.length) {
    const note = document.createElement('p');
    note.textContent = 'Worked examples and practice questions are collected above.';
    extras.appendChild(note);
  }

  const srcSelect = $('#mcqSrc');
  const topicSelect = $('#mcqTopic');
  const statusSelect = $('#mcqStatus');
  const mcqHost = $('#allMcqList');
  const overview = $('#quizOverview');
  const topicChips = $('#quizTopicChips');
  const subtopicChips = $('#quizSubtopicChips');
  const esc = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const unique = uniqueMcqs();
  const uniqueByKey = new Map(unique.map(block => [mcqKey(block), block]));

  // Prune duplicate question copies in the existing cloned quiz list without changing source data.
  const pruneClones = () => {
    if (!mcqHost) return;
    const seen = new Set();
    $$('.mcq-clone', mcqHost).forEach(block => {
      const key = mcqKey(block);
      if (seen.has(key)) block.remove();
      else seen.add(key);
    });
    $$('.mcq-group-head', mcqHost).forEach(head => {
      if (!head.nextElementSibling?.classList.contains('mcq-clone')) head.remove();
    });
  };
  if (mcqHost && window.MutationObserver) new MutationObserver(() => queueMicrotask(pruneClones)).observe(mcqHost, { childList: true });
  pruneClones();

  const getSource = block => block.dataset.src || 'Other questions';
  const getTopic = block => block.dataset.topic || 'General';
  const countFiltered = (source, topic = 'all') => unique.filter(block => (source === 'all' || getSource(block) === source) && (topic === 'all' || getTopic(block) === topic)).length;
  const fillChips = (host, items, current, onPick, withCounts = true) => {
    if (!host) return;
    host.replaceChildren();
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mcq-chip${item.value === current ? ' active' : ''}`;
      button.textContent = withCounts ? `${item.label} (${item.count})` : item.label;
      button.setAttribute('aria-pressed', String(item.value === current));
      button.onclick = () => onPick(item.value);
      host.appendChild(button);
    });
  };
  const selectedSource = () => srcSelect?.value || 'all';
  const selectedTopic = () => topicSelect?.value || 'all';
  const sourceItems = [...new Set(unique.map(getSource))].map(source => ({ value: source, label: source, count: countFiltered(source) }));
  const setFilters = (source = 'all', topic = 'all') => {
    if (!srcSelect || !topicSelect) return;
    srcSelect.value = [...srcSelect.options].some(o => o.value === source) ? source : 'all';
    srcSelect.dispatchEvent(new Event('change', { bubbles: true }));
    topicSelect.value = [...topicSelect.options].some(o => o.value === topic) ? topic : 'all';
    topicSelect.dispatchEvent(new Event('change', { bubbles: true }));
    requestAnimationFrame(pruneClones);
  };
  const renderQuizChips = () => {
    const source = selectedSource();
    const sources = sourceItems;
    if (overview) {
      overview.replaceChildren();
      sources.forEach(item => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `hub-card${item.value === source ? ' active' : ''}`;
        card.innerHTML = `<strong>${esc(item.label)}</strong><small>${item.count} unique question${item.count === 1 ? '' : 's'}</small>`;
        card.setAttribute('aria-pressed', String(item.value === source));
        card.onclick = () => setFilters(item.value, 'all');
        overview.appendChild(card);
      });
    }
    const topicList = [...new Set(unique.filter(block => source === 'all' || getSource(block) === source).map(getTopic))]
      .map(topic => ({ value: topic, label: topic, count: countFiltered(source, topic) }));
    fillChips(topicChips, [{ value: 'all', label: source === 'all' ? 'All topics' : 'All subtopics', count: countFiltered(source) }, ...topicList], selectedTopic(), value => setFilters(source, value));
    const visibleTopics = selectedTopic() === 'all' ? topicList : topicList.filter(item => item.value === selectedTopic());
    fillChips(subtopicChips, visibleTopics, selectedTopic(), value => setFilters(source, value));
    const title = $('#practiceIntro');
    if (title) title.textContent = `${unique.length} unique MCQs across ${sourceItems.length} sources.`;
  };
  if (srcSelect && topicSelect) {
    srcSelect.addEventListener('change', () => requestAnimationFrame(renderQuizChips));
    topicSelect.addEventListener('change', () => requestAnimationFrame(renderQuizChips));
    renderQuizChips();
  }

  // Score is based on distinct question keys, so copies of a question count once.
  window.updateScore = function updateUniqueScore() {
    const byKey = new Map();
    $$('.mcq-block:not(.mcq-clone)').filter(block => block.querySelector('.opt')).forEach(block => {
      const key = mcqKey(block);
      if (!byKey.has(key)) byKey.set(key, block);
    });
    let answered = 0, correctCount = 0;
    byKey.forEach(block => {
      if (!block.dataset.answered) return;
      answered++;
      if (!block.querySelector('.opt.wrong')) correctCount++;
    });
    if (score) score.innerHTML = `MCQ answered: <strong>${answered}/${byKey.size}</strong> · correct: <strong>${correctCount}</strong>`;
    const percent = byKey.size ? Math.round(answered * 100 / byKey.size) : 0;
    $('.quiz-progress-fill', progressTrack).style.width = `${percent}%`;
    progressTrack.setAttribute('aria-valuenow', String(percent));
  };
  window.updateScore();

  // Move each lecture's focused calculation tabs into the Numericals mode.
  const numericHeading = document.createElement('h3');
  numericHeading.textContent = 'Worked examples by lecture';
  extras.prepend(numericHeading);
  const notesSections = sections.filter(section => !['allmcq', 'numericals', 'mcqs'].includes(section.id));

  // Replace the old multi-row category strip with a wrapped, compact notes navigator.
  // Bind section navigation only to the top-level topic links. The More topics
  // summary is a disclosure control, so leave its native click behavior intact.
  const primaryNavLinks = $$('.nav-pill[data-topic-id]', firstNav).filter(link => !link.closest('.nav-more-panel'));
  primaryNavLinks.forEach(link => {
    const id = link.dataset.topicId;
    link.addEventListener('click', event => {
      event.preventDefault();
      openSection(id, true);
    });
  });
  $$('.nav-more-panel .nav-pill', firstNav).forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    firstNav.querySelector('.nav-more').open = false;
    openSection(link.dataset.topicId, true);
  }));

  const modeButtons = $$('.practice-mode-button', practice);
  const setPracticeMode = mode => {
    const quizzes = mode !== 'numericals';
    quizMode.hidden = !quizzes;
    numericalMode.hidden = quizzes;
    modeButtons.forEach(button => {
      const active = button.dataset.mode === (quizzes ? 'quizzes' : 'numericals');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (!quizzes) numericalSection?.classList.remove('collapsed');
    window.updateScore();
    setStickyHeight();
  };
  modeButtons.forEach(button => button.addEventListener('click', () => setPracticeMode(button.dataset.mode)));
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'back-notes-button';
  backButton.innerHTML = `${icon('book')}<span>Back to notes</span>`;
  backButton.hidden = true;
  backButton.onclick = () => openSection(window.lastNoteSection || 'lec1', true);
  const hubButton = document.createElement('button');
  hubButton.type = 'button';
  hubButton.className = 'practice-hub-button';
  hubButton.innerHTML = `${icon('hub')}<span>Practice Hub</span>`;
  hubButton.onclick = () => openPractice('quizzes', true);
  if (heroRight) heroRight.insertBefore(hubButton, oldReset || null), heroRight.appendChild(backButton);

  function openSection(id, updateHash = false, target = null) {
    if (['allmcq', 'numericals', 'mcqs'].includes(id)) {
      openPractice(id === 'numericals' ? 'numericals' : 'quizzes', updateHash);
      return;
    }
    const section = document.getElementById(id)?.closest('.section') || document.getElementById(id);
    if (!section || !section.classList?.contains('section') || !main.contains(section)) return;
    window.lastNoteSection = section.id;
    practice.hidden = true;
    main.hidden = false;
    hubButton.hidden = false;
    backButton.hidden = true;
    notesSections.forEach(item => {
      item.style.display = item === section ? '' : 'none';
      item.classList.remove('collapsed');
    });
    $$('.nav-pill', firstNav).forEach(link => link.classList.toggle('active', link.dataset.topicId === section.id));
    if (target && target.closest('.tab-content')) {
      const targetTab = $$('.tab', section).find(tab => (tab.getAttribute('onclick') || '').includes(`'${target.closest('.tab-content').id}'`));
      if (targetTab && typeof window.showTab === 'function') window.showTab(targetTab, target.closest('.tab-content').id);
    }
    if (target?.closest('.lecture-code-view')) {
      const codeButton = $('.view-tab:nth-child(2)', section);
      codeButton?.click();
    } else {
      $('.view-tab:first-child', section)?.click();
    }
    if (updateHash) history.replaceState(null, '', `#${section.id}`);
    setStickyHeight();
    requestAnimationFrame(() => {
      const point = target || $('.section-header', section);
      const y = point.getBoundingClientRect().top + window.scrollY - stickyShell.getBoundingClientRect().height - 12;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      if (target) flash(target);
    });
  }

  function openPractice(mode = 'quizzes', updateHash = false) {
    window.lastNoteSection ||= 'lec1';
    main.hidden = true;
    practice.hidden = false;
    hubButton.hidden = true;
    backButton.hidden = false;
    setPracticeMode(mode);
    if (updateHash) history.replaceState(null, '', `#practice-${mode}`);
    setStickyHeight();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.openStudySection = openSection;
  window.openPracticeHub = openPractice;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    if (id.startsWith('practice-')) { event.preventDefault(); openPractice(id.endsWith('numericals') ? 'numericals' : 'quizzes', true); return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const section = target.closest('.section');
    if (section?.id === 'numericals' || section?.id === 'allmcq' || section?.id === 'mcqs') {
      openPractice(section.id === 'numericals' ? 'numericals' : 'quizzes', true);
      return;
    }
    if (section) openSection(section.id, true, target);
  });
  window.addEventListener('hashchange', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id.startsWith('practice-')) openPractice(id.endsWith('numericals') ? 'numericals' : 'quizzes');
    else if (id && document.getElementById(id)?.closest('.section')) openSection(id, false, document.getElementById(id));
  });

  // Replace text check/cross glyphs with consistent inline stroke icons; Mermaid source uses words.
  $$('.chevron').forEach(node => { node.innerHTML = icon('chevron'); });
  $$('.section-header').forEach(node => node.removeAttribute('onclick'));
  $$('.callout').forEach(box => { if (/in one minute|tl;\s*dr/i.test(box.textContent)) box.classList.add('one-minute'); });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const replacements = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || /^(SCRIPT|STYLE|SVG)$/.test(parent.tagName) || parent.closest('pre.mermaid')) continue;
    if (/[✓✗]/.test(node.nodeValue)) replacements.push(node);
  }
  replacements.forEach(node => {
    const parts = node.nodeValue.split(/([✓✗])/g);
    const fragment = document.createDocumentFragment();
    parts.forEach(part => {
      if (part === '✓' || part === '✗') {
        const span = document.createElement('span');
        span.className = `answer-mark ${part === '✓' ? 'answer-correct' : 'answer-incorrect'}`;
        span.setAttribute('aria-label', part === '✓' ? 'correct' : 'incorrect');
        span.innerHTML = icon(part === '✓' ? 'check' : 'cross');
        fragment.appendChild(span);
      } else if (part) fragment.appendChild(document.createTextNode(part));
    });
    node.replaceWith(fragment);
  });
  $$('pre.mermaid').forEach(pre => { pre.textContent = pre.textContent.replaceAll('✓', 'OK').replaceAll('✗', 'X'); });

  // Search index includes full MCQ prompts, options and explanations, notes, code and calculations.
  const inputOriginal = $('#searchInput');
  let input = inputOriginal;
  const searchBar = $('.search-bar');
  if (inputOriginal && searchBar) {
    input = inputOriginal.cloneNode(true);
    inputOriginal.replaceWith(input);
  }
  const searchCount = $('#searchCount');
  const dropdown = document.createElement('div');
  dropdown.className = 'search-results';
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;
  searchBar?.appendChild(dropdown);
  const searchIndex = [];
  const addSearchEntry = entry => {
    const text = (entry.node?.innerText || entry.node?.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length < 5) return;
    searchIndex.push({ ...entry, text, folded: text.toLocaleLowerCase() });
  };
  unique.forEach(block => addSearchEntry({ type: 'MCQ', topic: `${getSource(block)} · ${getTopic(block)}`, title: block.querySelector('.mcq-q')?.textContent.trim() || 'Question', node: block, key: mcqKey(block), source: getSource(block), subtopic: getTopic(block), practice: true }));
  notesSections.forEach(section => {
    const sectionName = $('.section-title', section)?.textContent.trim().replace(/\s+/g, ' ') || section.id;
    $$('.tab-content', section).forEach(tabContent => {
      if (tabContent.closest('.lecture-mcq-archive')) return;
      const button = $$('.tab', section).find(item => (item.getAttribute('onclick') || '').includes(`'${tabContent.id}'`));
      const subtopic = button?.textContent.trim() || sectionName;
      $$('h3, h4, p, li, pre:not(.mermaid), .formula, .callout', tabContent).forEach(node => {
        if (node.closest('.mcq-block')) return;
        const code = node.matches('pre, code, .code-label');
        addSearchEntry({ type: code ? 'Code' : /numerical|math|formula|cidr|subnet|magic/i.test(subtopic) ? 'Numerical' : 'Theory', topic: sectionName, title: subtopic, node, sectionId: section.id, code });
      });
    });
    if (!section.querySelector('.tab-content')) {
      $$('.section-body h3, .section-body h4, .section-body p, .section-body li, .section-body pre:not(.mermaid), .section-body .formula, .section-body .callout', section).forEach(node => {
        if (node.closest('.mcq-block')) return;
        addSearchEntry({ type: section.id === 'numericals' ? 'Numerical' : 'Theory', topic: sectionName, title: sectionName, node, sectionId: section.id });
      });
    }
  });
  $$('.numerical-topic, #numericals .section-body').forEach(group => {
    $$('h3, h4, p, li, pre, .formula, .callout', group).forEach(node => addSearchEntry({ type: 'Numerical', topic: group.dataset.topic || 'Numericals', title: $('.numerical-topic h3', group)?.textContent || 'Numerical practice', node, numeric: true }));
  });
  let searchResults = [];
  let activeResult = -1;
  const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapeHtml = text => String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const highlightText = (text, terms) => {
    let safe = escapeHtml(text);
    terms.forEach(term => { safe = safe.replace(new RegExp(`(${escapeRegExp(escapeHtml(term))})`, 'gi'), '<mark>$1</mark>'); });
    return safe;
  };
  const paintResults = (query, terms) => {
    dropdown.replaceChildren();
    if (!query) { dropdown.hidden = true; if (searchCount) searchCount.textContent = ''; return; }
    if (!searchResults.length) {
      const empty = document.createElement('div'); empty.className = 'search-empty'; empty.textContent = 'No results'; dropdown.appendChild(empty); dropdown.hidden = false; if (searchCount) searchCount.textContent = 'No results'; return;
    }
    searchResults.forEach((entry, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'search-result'; button.setAttribute('role', 'option'); button.setAttribute('aria-selected', String(index === activeResult));
      const at = Math.max(0, entry.folded.indexOf(terms[0]));
      const start = Math.max(0, at - 45);
      let snippet = entry.text.slice(start, start + 150);
      if (start) snippet = `…${snippet}`;
      if (start + 150 < entry.text.length) snippet += '…';
      button.innerHTML = `<small>${escapeHtml(entry.type)} · ${escapeHtml(entry.topic)}</small><b>${highlightText(entry.title.slice(0, 110), terms)}</b><span class="snippet">${highlightText(snippet, terms)}</span>`;
      button.addEventListener('click', () => openSearchResult(entry));
      dropdown.appendChild(button);
    });
    dropdown.hidden = false;
    if (searchCount) searchCount.textContent = `${searchResults.length} results`;
  };
  const runSearch = () => {
    const query = input?.value.trim().toLocaleLowerCase() || '';
    if (query.length < 2) { searchResults = []; paintResults('', []); return; }
    const terms = query.split(/\s+/).filter(Boolean);
    searchResults = searchIndex.filter(entry => terms.every(term => entry.folded.includes(term))).slice(0, 30);
    activeResult = searchResults.length ? 0 : -1;
    paintResults(query, terms);
  };
  const flash = node => {
    if (!node) return;
    node.classList.add('flash-target');
    setTimeout(() => node.classList.remove('flash-target'), 1800);
  };
  function openSearchResult(entry) {
    dropdown.hidden = true;
    if (entry.practice) {
      openPractice('quizzes', true);
      setFilters(entry.source, entry.subtopic);
      requestAnimationFrame(() => {
        const clone = $$('.mcq-clone', mcqHost).find(item => mcqKey(item) === entry.key);
        if (clone) { clone.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(clone); }
      });
      return;
    }
    if (entry.numeric) {
      openPractice('numericals', true);
      requestAnimationFrame(() => { entry.node.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(entry.node); });
      return;
    }
    const target = entry.node;
    openSection(entry.sectionId, true, target);
    if (entry.code) {
      requestAnimationFrame(() => {
        const section = document.getElementById(entry.sectionId);
        $('.view-tab:nth-child(2)', section)?.click();
        requestAnimationFrame(() => {
          const codeTarget = $$('.lecture-code-view pre', section).find(pre => pre.textContent.trim() === target.textContent.trim()) || target;
          codeTarget.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(codeTarget);
        });
      });
    } else {
      requestAnimationFrame(() => { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); flash(target); });
    }
  }
  input?.addEventListener('input', runSearch);
  input?.addEventListener('keydown', event => {
    if (event.key === 'Escape') { dropdown.hidden = true; searchResults = []; return; }
    if (dropdown.hidden || !searchResults.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); activeResult = Math.min(activeResult + 1, searchResults.length - 1); paintResults(input.value.trim(), input.value.trim().toLowerCase().split(/\s+/)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); activeResult = Math.max(activeResult - 1, 0); paintResults(input.value.trim(), input.value.trim().toLowerCase().split(/\s+/)); }
    if (event.key === 'Enter' && activeResult >= 0) { event.preventDefault(); openSearchResult(searchResults[activeResult]); }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.search-bar')) dropdown.hidden = true; });

  // Show one selected notes section by default; hash links open their exact section.
  const initialHash = decodeURIComponent(location.hash.slice(1));
  if (initialHash.startsWith('practice-')) openPractice(initialHash.endsWith('numericals') ? 'numericals' : 'quizzes');
  else openSection(notesSections.some(section => section.id === initialHash) ? initialHash : 'lec1');
  setStickyHeight();
})();
