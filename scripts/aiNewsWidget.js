document.addEventListener('DOMContentLoaded', () => {
  // Initialize compact AI News widget (Regular Mode only)
  try {
    const widget = document.getElementById('ai-news-widget');
    const modeStatus = document.getElementById('mode-status');
    function isLeetCodeTheme() {
      return document.body.classList.contains('leetcode-theme');
    }

    function syncVisibility() {
      if (!widget) return;
      widget.style.display = isLeetCodeTheme() ? 'none' : 'block';
    }
    syncVisibility();
    // Observe mode changes so the widget only shows in non‑LeetCode UI
    // Observe body class changes (mode switches)
    const bodyObserver = new MutationObserver(syncVisibility);
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const contentEl = document.getElementById('ai-news-content');
    const updatedEl = document.getElementById('ai-news-updated');
    const viewAllEl = document.getElementById('ai-news-view-all');
    const refreshBtn = document.getElementById('ai-news-refresh');
    const tabs = Array.from(document.querySelectorAll('.ai-news-tab'));
    const filtersEl = document.getElementById('ai-news-filters');
    const chips = filtersEl
      ? Array.from(filtersEl.querySelectorAll('.ai-chip'))
      : [];
    const collapseBtn = document.getElementById('ai-news-collapse');
    const headerTitle = document.querySelector('.ai-news-title');
    const marquee = headerTitle
      ? headerTitle.querySelector('.ai-news-marquee')
      : null;

    let currentTab = 'papers';
    let currentDomain = 'cs.LG';

    function setFiltersVisible(visible) {
      if (!filtersEl) return;
      filtersEl.style.display = visible ? 'flex' : 'none';
    }

    // Simple TTL cache in chrome.storage.local
    const TTL_MS = 6 * 60 * 60 * 1000; // 6h
    async function getCache(key) {
      try {
        const res = await chrome.storage.local.get(key);
        const entry = res[key];
        if (!entry) return null;
        if (Date.now() - (entry.ts || 0) > TTL_MS) return null;
        return entry.data;
      } catch {
        return null;
      }
    }
    async function setCache(key, data) {
      try {
        await chrome.storage.local.set({ [key]: { ts: Date.now(), data } });
      } catch {}
    }

    async function fetchArxiv(domain) {
      const cacheKey = `aiNews:arxiv:${domain}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;
      const query = encodeURIComponent(`cat:${domain}`);
      const url = `https://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=20`;
      const xml = await fetch(url).then(r => r.text());
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const entries = [...doc.querySelectorAll('entry')].map(e => {
        const title = (e.querySelector('title')?.textContent || '').trim();
        const id = e.querySelector('id')?.textContent || '';
        const published = e.querySelector('published')?.textContent || '';
        const summary = (e.querySelector('summary')?.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        const authors = [...e.querySelectorAll('author > name')].map(n =>
          n.textContent.trim()
        );
        // Prefer abstract page link
        let href = id;
        const abs = [...e.querySelectorAll('link')].find(
          l => l.getAttribute('rel') === 'alternate'
        );
        if (abs && abs.getAttribute('href')) href = abs.getAttribute('href');
        return {
          title,
          url: href,
          source: 'arXiv',
          time: new Date(published).toLocaleDateString(),
          summary,
          authors,
        };
      });
      await setCache(cacheKey, entries);
      return entries;
    }

    const demoData = {
      papers: [
        {
          title: 'Recent submissions in cs.LG (Machine Learning)',
          url: 'https://arxiv.org/list/cs.LG/recent',
          source: 'arXiv',
          time: 'updated',
        },
        {
          title: 'Recent submissions in cs.AI (Artificial Intelligence)',
          url: 'https://arxiv.org/list/cs.AI/recent',
          source: 'arXiv',
          time: 'updated',
        },
        {
          title: 'Recent submissions in cs.CL (Computation and Language)',
          url: 'https://arxiv.org/list/cs.CL/recent',
          source: 'arXiv',
          time: 'updated',
        },
      ],
      trending: [
        {
          title: 'Hacker News: Artificial Intelligence (past week)',
          url: 'https://hn.algolia.com/?q=%22artificial%20intelligence%22&dateRange=pastWeek&type=story',
          source: 'HN',
          time: 'updated',
        },
        {
          title: 'Hacker News: Machine Learning (past week)',
          url: 'https://hn.algolia.com/?q=machine%20learning&dateRange=pastWeek&type=story',
          source: 'HN',
          time: 'updated',
        },
      ],
    };

    async function renderList(kind) {
      const list = document.createElement('ul');
      list.className = 'ai-news-list';
      let items = [];
      if (kind === 'papers') {
        items = await fetchArxiv(currentDomain);
      } else {
        items = demoData[kind] || [];
      }
      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'ai-news-item';
        const left = document.createElement('div');
        left.className = 'ai-news-left';
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = item.title;
        left.appendChild(link);
        const meta = document.createElement('div');
        meta.className = 'ai-news-meta';
        meta.innerHTML = `<span>${item.source}</span><span>·</span><span>${item.time}</span>`;
        li.appendChild(left);
        li.appendChild(meta);

        // Add expandable details for papers only if arXiv provided a summary
        if (kind === 'papers' && item.summary) {
          const details = document.createElement('div');
          details.className = 'ai-news-item-details';
          const abstract = document.createElement('div');
          abstract.className = 'ai-news-abstract';
          const shortText =
            item.summary && item.summary.length > 400
              ? `${item.summary.slice(0, 400)}…`
              : item.summary || '';
          abstract.textContent = shortText;
          const authors = document.createElement('div');
          authors.className = 'ai-news-authors';
          if (item.authors && item.authors.length) {
            const shown = item.authors.slice(0, 3).join(', ');
            const suffix = item.authors.length > 3 ? ' et al.' : '';
            authors.textContent = `Authors: ${shown}${suffix}`;
          }
          details.appendChild(abstract);
          details.appendChild(authors);

          const detailsContainer = document.createElement('div');
          detailsContainer.style.display = 'none';
          detailsContainer.appendChild(details);

          const wrapper = document.createElement('div');
          // Add a small chevron toggle before the title
          const toggle = document.createElement('button');
          toggle.className = 'ai-news-toggle';
          toggle.setAttribute('aria-expanded', 'false');
          toggle.title = 'Show details';
          toggle.textContent = '›';
          left.prepend(toggle);

          wrapper.appendChild(li);
          wrapper.appendChild(detailsContainer);

          function toggleDetails() {
            const isOpen = detailsContainer.style.display === 'block';
            detailsContainer.style.display = isOpen ? 'none' : 'block';
            toggle.setAttribute('aria-expanded', String(!isOpen));
            toggle.classList.toggle('open', !isOpen);
          }

          // Clicking the toggle or the row (except links) opens details
          toggle.addEventListener('click', ev => {
            ev.stopPropagation();
            toggleDetails();
          });
          li.addEventListener('click', ev => {
            if (ev.target && ev.target.tagName === 'A') return;
            toggleDetails();
          });

          list.appendChild(wrapper);
        } else {
          list.appendChild(li);
        }
      });
      contentEl.innerHTML = '';
      contentEl.appendChild(list);
      updatedEl.textContent = 'Updated just now';
      viewAllEl.href =
        kind === 'papers'
          ? `https://arxiv.org/list/${currentDomain}/recent`
          : 'https://hn.algolia.com/?dateRange=pastWeek&type=story&query=AI';
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const kind = tab.getAttribute('data-tab');
        currentTab = kind;
        setFiltersVisible(kind === 'papers');
        renderList(kind);
      });
    });

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        setTimeout(() => refreshBtn.classList.remove('spinning'), 650);
        const active = document.querySelector('.ai-news-tab.active');
        const kind = active ? active.getAttribute('data-tab') : 'papers';
        renderList(kind);
        // Recompute marquee after refresh in case layout changed
        requestAnimationFrame(computeMarquee);
      });
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentDomain = chip.getAttribute('data-domain') || 'cs.LG';
        if (currentTab === 'papers') renderList('papers');
      });
    });

    // Initial state: collapsed by default in Regular mode
    if (widget) {
      widget.classList.add('collapsed');
      if (collapseBtn) {
        collapseBtn.classList.remove('expanded');
        collapseBtn.setAttribute('aria-expanded', 'false');
      }
    }

    // Initial render (content will be hidden until expanded)
    setFiltersVisible(true);
    renderList('papers');

    // Footer collapse toggle for the list region
    if (collapseBtn && widget) {
      collapseBtn.addEventListener('click', () => {
        const isCollapsed = widget.classList.toggle('collapsed');
        // Show up chevron when expanded, down when collapsed
        collapseBtn.classList.toggle('expanded', !isCollapsed);
        collapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
        // Recompute when expanding since width may change
        if (!isCollapsed) requestAnimationFrame(computeMarquee);
      });
    }

    // Compute marquee travel distance so that the text runs from start to just before refresh icon
    function computeMarquee() {
      try {
        if (!headerTitle || !marquee) return;
        // Available width is the header title container width
        const available = headerTitle.clientWidth || 0;
        const textWidth = marquee.scrollWidth || 0;

        // Measure width up to the last 'I' in the phrase so the animation stops
        // when the 'I' reaches the right edge, not the end of the whole string.
        let pivotWidth = textWidth;
        const titleText = marquee.textContent || '';
        const lastI = titleText.lastIndexOf('I');
        if (lastI !== -1) {
          const measure = document.createElement('span');
          measure.textContent = titleText.slice(0, lastI + 1);
          // Copy font styling to ensure accurate measurement
          const cs = window.getComputedStyle(marquee);
          measure.style.position = 'absolute';
          measure.style.visibility = 'hidden';
          measure.style.whiteSpace = 'nowrap';
          measure.style.font = cs.font;
          measure.style.letterSpacing = cs.letterSpacing;
          headerTitle.appendChild(measure);
          pivotWidth = measure.scrollWidth || measure.offsetWidth || pivotWidth;
          headerTitle.removeChild(measure);
        }

        const distance = Math.max(0, available - pivotWidth);
        const pxPerSecond = 40; // speed
        const duration = Math.max(6, Math.min(20, distance / pxPerSecond));
        marquee.style.setProperty('--marquee-distance', distance + 'px');
        marquee.style.setProperty('--marquee-duration', duration + 's');
      } catch {}
    }

    // Initial compute after layout
    setTimeout(computeMarquee, 0);
    window.addEventListener('resize', computeMarquee);
  } catch (e) {
    // fail silently; widget is optional
  }
});
