// ================================================
// DAILY PRODUCTIVITY ANALYZER v2
// Splash → Onboarding → Full App with AI Roadmap
// ================================================

const APP = {

  // ---- STORAGE HELPERS ----
  save(key, val) { try { localStorage.setItem('dpa_' + key, JSON.stringify(val)); } catch(e) {} },
  load(key, fallback = null) {
    try { const v = localStorage.getItem('dpa_' + key); return v !== null ? JSON.parse(v) : fallback; }
    catch(e) { return fallback; }
  },
  getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  // ============================================================
  // PHASE 1: SPLASH SCREEN
  // ============================================================
  runSplash() {
    const title = 'Daily Productivity Analyzer';
    const el = document.getElementById('splashTitle');
    const bar = document.getElementById('splashBar');
    const status = document.getElementById('splashStatus');

    const statuses = ['Initializing...', 'Loading your data...', 'Preparing workspace...', 'Almost ready...'];
    let charIdx = 0, statusIdx = 0, barPct = 0;

    // Start typing after hex animation (0.8s delay)
    const typeInterval = setInterval(() => {
      if (charIdx <= title.length) {
        el.textContent = title.slice(0, charIdx);
        charIdx++;
      } else {
        clearInterval(typeInterval);
        document.getElementById('splashCursor').style.display = 'none';
      }
    }, 55);

    // Progress bar fills over 2.5s
    const barInterval = setInterval(() => {
      barPct += 2;
      bar.style.width = Math.min(barPct, 100) + '%';
      if (barPct % 25 === 0 && statusIdx < statuses.length) {
        status.textContent = statuses[statusIdx++];
      }
      if (barPct >= 100) clearInterval(barInterval);
    }, 50);

    // After 3.5s, fade out splash and show app
    setTimeout(() => {
      document.getElementById('splash').classList.add('fade-out');
      setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        this.afterSplash();
      }, 600);
    }, 3500);
  },

  afterSplash() {
    const isSetup = this.load('setupDone', false);
    if (!isSetup) {
      this.showOnboarding();
    } else {
      this.launchApp();
    }
  },

  // ============================================================
  // PHASE 2: ONBOARDING
  // ============================================================
  showOnboarding() {
    document.getElementById('onboarding').classList.add('show');
    this.setupOnboardingListeners();
  },

  setupOnboardingListeners() {
    let currentStep = 1;

    const goTo = (step) => {
      document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
      document.getElementById(`ob-step-${step}`).classList.add('active');
      document.querySelectorAll('.ob-dot').forEach((d, i) => {
        d.classList.toggle('active', i < step);
      });
      currentStep = step;
    };

    // Step 1 → 2
    document.getElementById('ob-next-1').addEventListener('click', () => {
      const name = document.getElementById('ob-name').value.trim();
      const role = document.getElementById('ob-role').value.trim();
      if (!name) return this.showToast('Please enter your name!', 'warn');
      this.save('profile', { name, role, goalHours: 8 });
      goTo(2);
    });

    // Step 2 → 3
    document.getElementById('ob-next-2').addEventListener('click', () => {
      const key = document.getElementById('ob-key').value.trim();
      if (!key) return this.showToast('Please enter your API key!', 'warn');
      this.save('geminiKey', key);
      goTo(3);
    });
    document.getElementById('ob-back-2').addEventListener('click', () => goTo(1));
    document.getElementById('ob-skip-key').addEventListener('click', () => goTo(3));

    // Step 3 → 4 (generate roadmap)
    document.getElementById('ob-next-3').addEventListener('click', async () => {
      const goal = document.getElementById('ob-goal').value.trim();
      const hours = parseFloat(document.getElementById('ob-hours').value) || 2;
      if (!goal) return this.showToast('Please enter a learning goal!', 'warn');
      goTo(4);
      await this.generateRoadmap(goal, hours, 'ob-progress-bar', 'ob-gen-status');
      this.finishOnboarding();
    });
    document.getElementById('ob-back-3').addEventListener('click', () => goTo(2));
    document.getElementById('ob-skip-goal').addEventListener('click', () => {
      this.finishOnboarding();
    });
  },

  finishOnboarding() {
    this.save('setupDone', true);
    document.getElementById('onboarding').classList.remove('show');
    this.launchApp();
  },

  // ============================================================
  // PHASE 3: LAUNCH APP
  // ============================================================
  launchApp() {
    const shell = document.getElementById('appShell');
    shell.style.display = 'flex';
    shell.style.opacity = '0';
    shell.style.transform = 'translateY(20px)';
    shell.style.transition = 'opacity .5s ease, transform .5s ease';
    requestAnimationFrame(() => {
      shell.style.opacity = '1';
      shell.style.transform = 'translateY(0)';
    });

    this.initApp();
  },

  initApp() {
    this.loadAllState();
    this.setupNav();
    this.setupClock();
    this.setupPunch();
    this.setupTodayLog();
    this.setupQuickTask();
    this.setupMonthly();
    this.setupSettings();
    this.setupCheckinModal();
    this.setupMenuToggle();
    this.setupRoadmapPage();
    this.updateDashboard();
    this.renderTodayTasks();
    this.scheduleNotification();
    this.updateGreeting();
    this.renderCalendar();
    this.updateMonthlyStats();
    this.calculateStreak();
    this.updateRoadmapDashboard();
    this.updateStudyTodayCard();

    // Bind AI buttons
    document.getElementById('refreshInsight').addEventListener('click', () => this.getAiInsight());
    document.getElementById('getRecsBtn').addEventListener('click', () => this.getAiRecommendations());
    document.getElementById('stdGoBtn').addEventListener('click', () => this.switchTab('roadmap'));
  },

  loadAllState() {
    const todayKey = this.getTodayKey();
    this.state = this.state || {};
    this.state.sessions = this.load(`sessions_${todayKey}`, []);
    this.state.tasks = this.load(`tasks_${todayKey}`, []);
    this.state.isPunchedIn = this.load('isPunchedIn', false);
    this.state.punchInTime = this.load('punchInTime', null);
    if (this.state.punchInTime) this.state.punchInTime = new Date(this.state.punchInTime);
    this.state.currentMonth = new Date().getMonth();
    this.state.currentYear = new Date().getFullYear();
    this.updatePunchUI();
  },

  // ============================================================
  // NAVIGATION
  // ============================================================
  setupNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.switchTab(link.dataset.tab);
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  },

  switchTab(tab) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const link = document.querySelector(`[data-tab="${tab}"]`);
    if (link) link.classList.add('active');
    const tabEl = document.getElementById(`tab-${tab}`);
    if (tabEl) tabEl.classList.add('active');
    document.getElementById('topBarTitle').textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
    if (tab === 'monthly') { this.renderCalendar(); this.updateMonthlyStats(); }
    if (tab === 'dashboard') { this.updateDashboard(); this.updateRoadmapDashboard(); }
    if (tab === 'roadmap') { this.renderRoadmapPage(); }
    if (tab === 'settings') { this.loadSettingsForm(); }
  },

  setupMenuToggle() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  },

  // ============================================================
  // CLOCK
  // ============================================================
  setupClock() {
    const update = () => {
      const now = new Date();
      const t = now.toLocaleTimeString('en-IN', { hour12: false });
      const d = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      document.getElementById('sidebarClock').textContent = t;
      if (document.getElementById('bigClock')) document.getElementById('bigClock').textContent = t;
      document.getElementById('punchDate') && (document.getElementById('punchDate').textContent = d);
      document.getElementById('headerDate').textContent = d;
      this.updateWorkTimer();
      this.updateSessionTimer();
    };
    update();
    setInterval(update, 1000);
  },

  updateGreeting() {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
    document.getElementById('greetingTime').textContent = greet;
    const profile = this.load('profile', {});
    document.getElementById('greetingName').textContent = profile.name || '';
    document.getElementById('sidebarUser').textContent = profile.name ? `👤 ${profile.name}` : '👤 You';
  },

  // ============================================================
  // PUNCH IN / OUT
  // ============================================================
  setupPunch() {
    document.getElementById('bigPunchBtn').addEventListener('click', () => this.togglePunch());
    document.getElementById('mainPunchBtn').addEventListener('click', () => this.togglePunch());
  },

  togglePunch() {
    if (!this.state.isPunchedIn) {
      this.state.punchInTime = new Date();
      this.state.isPunchedIn = true;
      this.save('isPunchedIn', true);
      this.save('punchInTime', this.state.punchInTime.toISOString());
      this.showToast('✓ Punched In at ' + this.state.punchInTime.toLocaleTimeString());
    } else {
      const out = new Date();
      const duration = Math.floor((out - this.state.punchInTime) / 1000);
      this.state.sessions.push({ in: this.state.punchInTime.toISOString(), out: out.toISOString(), duration });
      this.save(`sessions_${this.getTodayKey()}`, this.state.sessions);
      this.state.isPunchedIn = false;
      this.state.punchInTime = null;
      this.save('isPunchedIn', false);
      this.save('punchInTime', null);
      this.showToast('✓ Punched Out — ' + this.formatDuration(duration));
    }
    this.updatePunchUI();
    this.renderSessions();
    this.updateDashboard();
  },

  updatePunchUI() {
    const isPunchedIn = this.state.isPunchedIn;
    ['bigPunchBtn', 'mainPunchBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.textContent = isPunchedIn ? 'PUNCH OUT' : 'PUNCH IN';
      btn.classList.toggle('out', isPunchedIn);
    });
    const badge = document.getElementById('punchBadge');
    badge.textContent = isPunchedIn ? '● CLOCKED IN' : '● CLOCKED OUT';
    badge.classList.toggle('active', isPunchedIn);
    this.renderSessions();
  },

  renderSessions() {
    const list = document.getElementById('sessionList');
    if (!list) return;
    list.innerHTML = '';
    this.state.sessions.forEach(s => {
      const li = document.createElement('li');
      li.className = 'session-item';
      li.innerHTML = `<span class="session-in">IN: ${new Date(s.in).toLocaleTimeString()}</span><span class="session-out">OUT: ${new Date(s.out).toLocaleTimeString()}</span><span style="color:var(--text2)">${this.formatDuration(s.duration)}</span>`;
      list.appendChild(li);
    });
    if (this.state.isPunchedIn) {
      const li = document.createElement('li');
      li.className = 'session-item';
      li.innerHTML = `<span class="session-in">IN: ${new Date(this.state.punchInTime).toLocaleTimeString()}</span><span style="color:var(--accent3)">● Active</span>`;
      list.appendChild(li);
    }
  },

  getTotalWorkedSeconds() {
    let total = (this.state.sessions || []).reduce((a, s) => a + s.duration, 0);
    if (this.state.isPunchedIn && this.state.punchInTime) total += Math.floor((new Date() - this.state.punchInTime) / 1000);
    return total;
  },

  updateWorkTimer() {
    const el = document.getElementById('totalWorkTime');
    if (el) el.textContent = this.formatDuration(this.getTotalWorkedSeconds());
    const st = document.getElementById('punchStatusText');
    if (st) st.textContent = this.state.isPunchedIn ? '● Currently clocked in' : `${(this.state.sessions||[]).length} session(s) today`;
  },

  updateSessionTimer() {
    const el = document.getElementById('sessionTimer');
    if (!el) return;
    el.textContent = (this.state.isPunchedIn && this.state.punchInTime)
      ? this.formatDuration(Math.floor((new Date() - this.state.punchInTime) / 1000))
      : '00:00:00';
  },

  formatDuration(secs) {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  // ============================================================
  // TASK LOGGING
  // ============================================================
  setupTodayLog() {
    const catSel = document.getElementById('taskCategory');
    const studyRow = document.getElementById('studyLinkRow');
    const topicLink = document.getElementById('roadmapTopicLink');

    catSel.addEventListener('change', () => {
      const isLearning = catSel.value === 'learning';
      studyRow.style.display = isLearning ? 'block' : 'none';
      if (isLearning) this.populateTopicLinkDropdown();
    });

    document.getElementById('linkToRoadmap').addEventListener('change', e => {
      topicLink.style.display = e.target.checked ? 'block' : 'none';
      if (e.target.checked) this.populateTopicLinkDropdown();
    });

    document.getElementById('addTaskBtn').addEventListener('click', () => {
      const title = document.getElementById('taskTitle').value.trim();
      const desc = document.getElementById('taskDesc').value.trim();
      const cat = document.getElementById('taskCategory').value;
      const dur = parseInt(document.getElementById('taskDuration').value) || 0;
      if (!title) return this.showToast('Enter a task title!', 'warn');

      // Handle roadmap link
      const linkedTopic = document.getElementById('linkToRoadmap').checked
        ? document.getElementById('roadmapTopicLink').value : null;
      if (linkedTopic) this.markTopicComplete(linkedTopic);

      const task = { id: Date.now(), title, desc, cat, dur, time: new Date().toISOString(), linkedTopic };
      this.state.tasks.push(task);
      this.save(`tasks_${this.getTodayKey()}`, this.state.tasks);

      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDesc').value = '';
      document.getElementById('taskDuration').value = '';
      document.getElementById('linkToRoadmap').checked = false;
      document.getElementById('roadmapTopicLink').style.display = 'none';
      studyRow.style.display = 'none';

      this.renderTodayTasks();
      this.updateDashboard();
      this.showToast('✓ Activity logged!');
    });
  },

  populateTopicLinkDropdown() {
    const sel = document.getElementById('roadmapTopicLink');
    const roadmap = this.load('roadmap', null);
    if (!roadmap) { sel.innerHTML = '<option>No roadmap found</option>'; return; }
    sel.innerHTML = '';
    roadmap.phases.forEach(phase => {
      phase.topics.forEach(topic => {
        if (!topic.completed) {
          const opt = document.createElement('option');
          opt.value = topic.id;
          opt.textContent = `[${phase.title}] ${topic.name}`;
          sel.appendChild(opt);
        }
      });
    });
  },

  markTopicComplete(topicId) {
    const roadmap = this.load('roadmap', null);
    if (!roadmap) return;
    roadmap.phases.forEach(phase => {
      phase.topics.forEach(topic => {
        if (topic.id === topicId) topic.completed = true;
      });
    });
    this.save('roadmap', roadmap);
    this.updateRoadmapDashboard();
    this.renderRoadmapPage();
    this.showToast('✓ Topic marked complete on roadmap!');
  },

  renderTodayTasks() {
    const list = document.getElementById('todayTaskList');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('activityCount');
    if (!list) return;
    list.innerHTML = '';
    if (!this.state.tasks.length) { empty.style.display = 'block'; count.textContent = '0'; return; }
    empty.style.display = 'none';
    count.textContent = this.state.tasks.length;
    this.state.tasks.slice().reverse().forEach(task => {
      const div = document.createElement('div');
      div.className = `task-item ${task.cat}`;
      div.innerHTML = `
        <div class="task-meta">
          <div class="task-title-text">${task.title}</div>
          ${task.desc ? `<div class="task-desc-text">${task.desc}</div>` : ''}
          <div class="task-tags">
            <span class="task-tag">${this.catLabel(task.cat)}</span>
            ${task.dur ? `<span class="task-tag">⏱ ${task.dur}m</span>` : ''}
            ${task.linkedTopic ? `<span class="task-tag" style="border-color:var(--accent2);color:var(--accent2)">📚 Roadmap</span>` : ''}
            <span class="task-tag">${new Date(task.time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
          </div>
        </div>
        <button class="task-delete" onclick="APP.deleteTask(${task.id})">✕</button>`;
      list.appendChild(div);
    });
    this.updateScoreBreakdown();
  },

  deleteTask(id) {
    this.state.tasks = this.state.tasks.filter(t => t.id !== id);
    this.save(`tasks_${this.getTodayKey()}`, this.state.tasks);
    this.renderTodayTasks();
    this.updateDashboard();
  },

  catLabel(cat) {
    return { work:'💼 Work', learning:'📚 Learning', health:'🏃 Health', personal:'🧘 Personal', creative:'🎨 Creative', admin:'📋 Admin' }[cat] || cat;
  },

  calculateProductivityScore() {
    if (!this.state.tasks.length) return 0;
    const profile = this.load('profile', {});
    const goalMins = (profile.goalHours || 8) * 60;
    const workedMins = this.getTotalWorkedSeconds() / 60;
    let score = 0;
    score += Math.min(this.state.tasks.length * 6, 40);
    score += new Set(this.state.tasks.map(t => t.cat)).size * 4;
    score += Math.min((workedMins / goalMins) * 30, 30);
    score += Math.min(this.state.tasks.filter(t => ['work','learning','creative'].includes(t.cat)).length * 2, 10);
    // Bonus for roadmap progress
    const roadmap = this.load('roadmap', null);
    if (roadmap) {
      const allTopics = roadmap.phases.flatMap(p => p.topics);
      const doneToday = this.state.tasks.filter(t => t.linkedTopic).length;
      score += Math.min(doneToday * 5, 10);
    }
    return Math.min(Math.round(score), 100);
  },

  updateScoreBreakdown() {
    const el = document.getElementById('scoreBreakdown');
    if (!el) return;
    const catCounts = {};
    this.state.tasks.forEach(t => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });
    const totalMins = this.state.tasks.reduce((a, t) => a + (t.dur || 0), 0);
    el.textContent = [
      `Total tasks: ${this.state.tasks.length}`,
      `Total logged time: ${totalMins}m`,
      `Categories: ${Object.entries(catCounts).map(([k,v])=>`${k}(${v})`).join(', ')}`,
      `\nProductivity Score: ${this.calculateProductivityScore()}%`
    ].join('\n');
  },

  // ============================================================
  // QUICK TASK
  // ============================================================
  setupQuickTask() {
    const addQuick = () => {
      const input = document.getElementById('quickTask');
      const val = input.value.trim();
      if (!val) return;
      this.state.tasks.push({ id: Date.now(), title: val, desc: '', cat: 'work', dur: 0, time: new Date().toISOString() });
      this.save(`tasks_${this.getTodayKey()}`, this.state.tasks);
      input.value = '';
      this.renderQuickList();
      this.updateDashboard();
      this.showToast('✓ Task logged!');
    };
    document.getElementById('quickAddBtn').addEventListener('click', addQuick);
    document.getElementById('quickTask').addEventListener('keydown', e => { if (e.key === 'Enter') addQuick(); });
    this.renderQuickList();
  },

  renderQuickList() {
    const list = document.getElementById('quickTaskList');
    if (!list) return;
    list.innerHTML = '';
    (this.state.tasks || []).slice(-5).reverse().forEach(t => {
      const li = document.createElement('li');
      li.className = 'quick-task-item';
      li.textContent = t.title;
      list.appendChild(li);
    });
  },

  // ============================================================
  // DASHBOARD
  // ============================================================
  updateDashboard() {
    const score = this.calculateProductivityScore();
    document.getElementById('scoreNumber').textContent = score + '%';
    const circ = 2 * Math.PI * 50;
    document.getElementById('ringFill').setAttribute('stroke-dasharray', `${(score / 100) * circ} ${circ}`);
    this.renderQuickList();
    this.saveToday(score);
    this.calculateStreak();
    this.updateStudyTodayCard();
    this.updateRoadmapDashboard();
  },

  saveToday(score) {
    const todayKey = this.getTodayKey();
    const dayData = this.load(`day_${todayKey}`, {});
    dayData.score = score;
    dayData.tasks = this.state.tasks.length;
    dayData.workedSecs = this.getTotalWorkedSeconds();
    this.save(`day_${todayKey}`, dayData);
  },

  calculateStreak() {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const day = this.load(`day_${key}`, null);
      if (day && day.score >= 50) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    const el = document.getElementById('streakValue');
    if (el) el.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
  },

  updateStudyTodayCard() {
    const roadmap = this.load('roadmap', null);
    const topicEl = document.getElementById('stdTopic');
    const whyEl = document.getElementById('stdWhy');
    const goBtn = document.getElementById('stdGoBtn');
    if (!roadmap || !topicEl) return;

    // Find first uncompleted topic
    let nextTopic = null, nextPhase = null;
    for (const phase of roadmap.phases) {
      for (const topic of phase.topics) {
        if (!topic.completed) { nextTopic = topic; nextPhase = phase; break; }
      }
      if (nextTopic) break;
    }

    if (!nextTopic) {
      topicEl.textContent = '🎉 All topics complete! Start a new roadmap.';
      whyEl.textContent = '';
      goBtn.style.display = 'none';
    } else {
      topicEl.textContent = `📌 ${nextTopic.name}`;
      whyEl.textContent = `Phase: ${nextPhase.title} · ${nextTopic.desc ? nextTopic.desc.slice(0, 80) + '...' : ''}`;
      goBtn.style.display = 'inline-block';
    }
  },

  updateRoadmapDashboard() {
    const roadmap = this.load('roadmap', null);
    const noMsg = document.getElementById('noRoadmapMsg');
    const display = document.getElementById('roadmapProgressDisplay');
    if (!roadmap) {
      noMsg && (noMsg.style.display = 'block');
      display && (display.style.display = 'none');
      return;
    }
    noMsg && (noMsg.style.display = 'none');
    display && (display.style.display = 'block');

    const allTopics = roadmap.phases.flatMap(p => p.topics);
    const done = allTopics.filter(t => t.completed).length;
    const pct = allTopics.length ? Math.round((done / allTopics.length) * 100) : 0;

    const rpGoal = document.getElementById('rpGoal');
    const rpBar = document.getElementById('rpBar');
    const rpPct = document.getElementById('rpPct');
    const rpNext = document.getElementById('rpNext');

    if (rpGoal) rpGoal.textContent = `🗺 ${roadmap.goal}`;
    if (rpBar) rpBar.style.width = pct + '%';
    if (rpPct) rpPct.textContent = `${done}/${allTopics.length} topics · ${pct}% complete`;

    // Find next topic
    let next = null;
    for (const phase of roadmap.phases) {
      for (const topic of phase.topics) { if (!topic.completed) { next = topic; break; } }
      if (next) break;
    }
    if (rpNext) rpNext.textContent = next ? `→ Up next: ${next.name}` : '🎉 All done!';

    // Update sidebar roadmap label
    const rmGoal = document.getElementById('rmGoalLabel');
    const rmProg = document.getElementById('rmProgressLabel');
    if (rmGoal) rmGoal.textContent = roadmap.goal;
    if (rmProg) rmProg.textContent = `${pct}% complete`;
    const rmBar = document.getElementById('rmOverallBar');
    if (rmBar) rmBar.style.width = pct + '%';
  },

  // ============================================================
  // GEMINI AI
  // ============================================================
  async callGemini(prompt, systemContext = '') {
    const key = this.load('geminiKey', '');
    if (!key) return '⚠ Add your Gemini API key in Settings to enable AI features.';
    try {
      const fullPrompt = systemContext ? `${systemContext}\n\n${prompt}` : prompt;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      });
      const data = await res.json();
      if (data.error) return `API Error: ${data.error.message}`;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    } catch(e) {
      return 'Error contacting Gemini API. Check your key in Settings.';
    }
  },

  buildUserContext() {
    const profile = this.load('profile', {});
    const roadmap = this.load('roadmap', null);
    const allTopics = roadmap ? roadmap.phases.flatMap(p => p.topics) : [];
    const done = allTopics.filter(t => t.completed).length;
    const pct = allTopics.length ? Math.round((done / allTopics.length) * 100) : 0;
    let ctx = `User: ${profile.name || 'Unknown'}, Role: ${profile.role || 'Unknown'}`;
    if (roadmap) ctx += `\nLearning Goal: ${roadmap.goal} — ${pct}% complete (${done}/${allTopics.length} topics)`;
    ctx += `\nToday's tasks: ${this.state.tasks.map(t => t.title).join(', ') || 'none'}`;
    ctx += `\nHours worked today: ${(this.getTotalWorkedSeconds() / 3600).toFixed(1)}`;
    ctx += `\nProductivity score: ${this.calculateProductivityScore()}%`;
    return ctx;
  },

  async getAiInsight() {
    const el = document.getElementById('aiInsight');
    el.textContent = '⟳ Thinking...';
    const ctx = this.buildUserContext();
    const result = await this.callGemini(
      'Give a concise 2-3 sentence insight about today\'s productivity. Be encouraging, specific, and helpful. Mention roadmap progress if relevant.',
      ctx
    );
    el.textContent = result;
  },

  async getAiRecommendations() {
    const el = document.getElementById('recommendationsList');
    el.textContent = '⟳ Analyzing...';
    const ctx = this.buildUserContext();
    const roadmap = this.load('roadmap', null);
    let nextTopics = '';
    if (roadmap) {
      const upcoming = roadmap.phases.flatMap(p => p.topics).filter(t => !t.completed).slice(0, 3).map(t => t.name).join(', ');
      nextTopics = `Upcoming roadmap topics: ${upcoming}`;
    }
    const result = await this.callGemini(
      `Give 4 specific, actionable recommendations for the rest of today. Include study suggestions from the roadmap if available. Each on its own line starting with an emoji. Be very concise.\n${nextTopics}`,
      ctx
    );
    el.innerHTML = result.split('\n').filter(l => l.trim()).map(l => `<div class="rec-item">${l}</div>`).join('');
  },

  // ============================================================
  // ROADMAP GENERATION
  // ============================================================
  async generateRoadmap(goal, hoursPerDay, progressBarId = null, statusId = null) {
    const setProgress = (pct, msg) => {
      if (progressBarId) document.getElementById(progressBarId).style.width = pct + '%';
      if (statusId) document.getElementById(statusId).textContent = msg;
    };

    setProgress(20, 'Asking Gemini to design your roadmap...');

    const prompt = `Create a detailed learning roadmap for: "${goal}"
Daily study time available: ${hoursPerDay} hours

Return ONLY valid JSON in this exact structure, nothing else:
{
  "goal": "${goal}",
  "totalWeeks": 16,
  "phases": [
    {
      "id": "phase-1",
      "title": "Phase Title",
      "subtitle": "Brief subtitle",
      "description": "What this phase covers in 1-2 sentences",
      "weeks": "Weeks 1-4",
      "topics": [
        {
          "id": "topic-1-1",
          "name": "Topic Name",
          "desc": "What to learn and how. 1-2 sentences.",
          "hours": 8,
          "resources": "Best free resource or platform",
          "completed": false
        }
      ]
    }
  ]
}

Create 4-5 phases with 4-6 topics each. Be specific and practical for ${goal}. Topics should be ordered from beginner to advanced.`;

    setProgress(50, 'Processing your personalized roadmap...');

    const raw = await this.callGemini(prompt);

    setProgress(80, 'Saving your roadmap...');

    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      const roadmap = JSON.parse(clean);
      roadmap.goal = goal;
      roadmap.hoursPerDay = hoursPerDay;
      roadmap.createdAt = new Date().toISOString();
      // Ensure all topics have completed=false and unique IDs
      roadmap.phases.forEach((phase, pi) => {
        phase.id = phase.id || `phase-${pi+1}`;
        phase.topics.forEach((topic, ti) => {
          topic.id = topic.id || `topic-${pi+1}-${ti+1}`;
          topic.completed = topic.completed || false;
        });
      });
      this.save('roadmap', roadmap);
      setProgress(100, '✓ Roadmap created!');
      return roadmap;
    } catch(e) {
      setProgress(100, '⚠ Could not parse roadmap. Try regenerating.');
      return null;
    }
  },

  // ============================================================
  // ROADMAP PAGE
  // ============================================================
  setupRoadmapPage() {
    document.getElementById('generateRoadmapBtn').addEventListener('click', async () => {
      const goal = document.getElementById('newGoalInput').value.trim();
      const hours = parseFloat(document.getElementById('newGoalHours').value) || 2;
      if (!goal) return this.showToast('Enter a learning goal!', 'warn');
      this.showRoadmapLoading('Generating your roadmap...');
      await this.generateRoadmap(goal, hours, null, 'roadmapLoadingText');
      this.renderRoadmapPage();
    });

    document.getElementById('rmAskNextBtn').addEventListener('click', () => this.askWhatNext());
    document.getElementById('rmNewGoalBtn').addEventListener('click', () => {
      if (confirm('Start a new learning goal? Your current roadmap progress will be cleared.')) {
        this.save('roadmap', null);
        this.renderRoadmapPage();
        this.updateRoadmapDashboard();
        this.updateStudyTodayCard();
      }
    });
    document.getElementById('rmRegenerateBtn').addEventListener('click', async () => {
      const roadmap = this.load('roadmap', null);
      if (!roadmap) return;
      if (confirm('Regenerate roadmap? Progress will be lost.')) {
        this.showRoadmapLoading('Regenerating roadmap...');
        await this.generateRoadmap(roadmap.goal, roadmap.hoursPerDay || 2, null, 'roadmapLoadingText');
        this.renderRoadmapPage();
      }
    });
  },

  showRoadmapLoading(msg) {
    document.getElementById('noRoadmapState').style.display = 'none';
    document.getElementById('roadmapState').style.display = 'none';
    document.getElementById('roadmapLoading').style.display = 'block';
    document.getElementById('roadmapLoadingText').textContent = msg;
  },

  renderRoadmapPage() {
    const roadmap = this.load('roadmap', null);
    document.getElementById('roadmapLoading').style.display = 'none';

    if (!roadmap) {
      document.getElementById('noRoadmapState').style.display = 'block';
      document.getElementById('roadmapState').style.display = 'none';
      return;
    }

    document.getElementById('noRoadmapState').style.display = 'none';
    document.getElementById('roadmapState').style.display = 'block';

    // Header
    const allTopics = roadmap.phases.flatMap(p => p.topics);
    const done = allTopics.filter(t => t.completed).length;
    const pct = allTopics.length ? Math.round((done / allTopics.length) * 100) : 0;
    document.getElementById('rmGoalLabel').textContent = `🗺 ${roadmap.goal}`;
    document.getElementById('rmProgressLabel').textContent = `${done}/${allTopics.length} topics · ${pct}% complete`;
    document.getElementById('rmOverallBar').style.width = pct + '%';

    // Find next topic
    let nextTopicId = null;
    for (const phase of roadmap.phases) {
      for (const topic of phase.topics) { if (!topic.completed) { nextTopicId = topic.id; break; } }
      if (nextTopicId) break;
    }

    // Render phases
    const container = document.getElementById('roadmapPhases');
    container.innerHTML = '';

    roadmap.phases.forEach((phase, pi) => {
      const phaseTopics = phase.topics;
      const phaseDone = phaseTopics.filter(t => t.completed).length;
      const phasePct = phaseTopics.length ? Math.round((phaseDone / phaseTopics.length) * 100) : 0;
      const phaseComplete = phaseDone === phaseTopics.length;

      const card = document.createElement('div');
      card.className = 'phase-card';
      card.innerHTML = `
        <div class="phase-header" onclick="APP.togglePhase('phase-body-${pi}', this)">
          <div class="phase-title-wrap">
            <div class="phase-number ${phaseComplete ? 'done' : ''}">${phaseComplete ? '✓' : pi+1}</div>
            <div>
              <div class="phase-title">${phase.title}</div>
              <div class="phase-subtitle">${phase.subtitle || ''} ${phase.weeks ? '· '+phase.weeks : ''}</div>
            </div>
          </div>
          <div class="phase-right">
            <div class="phase-progress-pill ${phaseComplete ? 'complete' : ''}">${phaseDone}/${phaseTopics.length} ${phaseComplete ? '✓' : ''}</div>
            <div class="phase-chevron" id="chevron-${pi}">▼</div>
          </div>
        </div>
        <div class="phase-body ${pi === 0 ? 'open' : ''}" id="phase-body-${pi}">
          ${phase.description ? `<div class="phase-desc">${phase.description}</div>` : ''}
          <div class="phase-bar-wrap"><div class="phase-bar" style="width:${phasePct}%"></div></div>
          <div class="topics-list" id="topics-${pi}"></div>
        </div>`;
      container.appendChild(card);

      // Set initial chevron state
      if (pi === 0) document.getElementById(`chevron-${pi}`).classList.add('open');

      // Render topics
      const topicsContainer = card.querySelector(`#topics-${pi}`);
      phaseTopics.forEach(topic => {
        const isNext = topic.id === nextTopicId;
        const div = document.createElement('div');
        div.className = `topic-item ${topic.completed ? 'completed' : ''}`;
        div.id = `topic-el-${topic.id}`;
        div.innerHTML = `
          <div class="topic-check ${topic.completed ? 'checked' : ''}" onclick="APP.toggleTopic('${topic.id}')">${topic.completed ? '✓' : ''}</div>
          <div class="topic-info">
            <div class="topic-name">${topic.name} ${isNext ? '<span style="color:var(--accent2);font-size:.7rem">← NEXT</span>' : ''}</div>
            ${topic.desc ? `<div class="topic-desc">${topic.desc}</div>` : ''}
            <div class="topic-meta">
              ${topic.hours ? `<span class="topic-tag">⏱ ~${topic.hours}h</span>` : ''}
              ${topic.resources ? `<span class="topic-tag">📚 ${topic.resources}</span>` : ''}
              ${isNext ? `<span class="topic-tag topic-next-badge">Study Next</span>` : ''}
            </div>
          </div>`;
        topicsContainer.appendChild(div);
      });
    });

    this.updateRoadmapDashboard();
    this.updateStudyTodayCard();
  },

  togglePhase(bodyId, header) {
    const body = document.getElementById(bodyId);
    const idx = bodyId.split('-').pop();
    const chevron = document.getElementById(`chevron-${idx}`);
    body.classList.toggle('open');
    chevron.classList.toggle('open', body.classList.contains('open'));
  },

  toggleTopic(topicId) {
    const roadmap = this.load('roadmap', null);
    if (!roadmap) return;
    let changed = false;
    roadmap.phases.forEach(phase => {
      phase.topics.forEach(topic => {
        if (topic.id === topicId) { topic.completed = !topic.completed; changed = true; }
      });
    });
    if (changed) {
      this.save('roadmap', roadmap);
      this.renderRoadmapPage();
      this.updateDashboard();
      this.showToast(roadmap.phases.flatMap(p=>p.topics).find(t=>t.id===topicId)?.completed ? '✓ Topic complete!' : 'Topic unmarked');
    }
  },

  async askWhatNext() {
    const panel = document.getElementById('rmAiPanel');
    const text = document.getElementById('rmAiText');
    panel.style.display = 'block';
    text.textContent = '⟳ Analyzing your progress...';
    const ctx = this.buildUserContext();
    const roadmap = this.load('roadmap', null);
    if (!roadmap) return;
    const allTopics = roadmap.phases.flatMap(p => p.topics);
    const done = allTopics.filter(t => t.completed).map(t => t.name).join(', ');
    const next = allTopics.filter(t => !t.completed).slice(0, 3).map(t => t.name).join(', ');
    const result = await this.callGemini(
      `For someone learning ${roadmap.goal}:\nCompleted: ${done || 'nothing yet'}\nNext up: ${next}\n\nGive specific, actionable advice for what to study next and how. Include: what to focus on today, a study tip, and estimated time. Keep it under 120 words.`,
      ctx
    );
    text.textContent = result;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  // ============================================================
  // MONTHLY
  // ============================================================
  setupMonthly() {
    document.getElementById('prevMonth').addEventListener('click', () => {
      this.state.currentMonth--;
      if (this.state.currentMonth < 0) { this.state.currentMonth = 11; this.state.currentYear--; }
      this.renderCalendar(); this.updateMonthlyStats();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
      this.state.currentMonth++;
      if (this.state.currentMonth > 11) { this.state.currentMonth = 0; this.state.currentYear++; }
      this.renderCalendar(); this.updateMonthlyStats();
    });
    document.getElementById('getMonthlyAnalysis').addEventListener('click', () => this.getMonthlyAiAnalysis());
  },

  renderCalendar() {
    const { currentMonth: m, currentYear: y } = this.state;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('monthLabel').textContent = `${monthNames[m]} ${y}`;
    const cal = document.getElementById('calendarHeatmap');
    if (!cal) return;
    cal.innerHTML = '';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-header'; h.textContent = d; cal.appendChild(h);
    });
    const firstDay = new Date(y, m, 1).getDay();
    for (let i = 0; i < firstDay; i++) cal.appendChild(document.createElement('div'));
    const today = new Date();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = this.load(`day_${key}`, null);
      const div = document.createElement('div');
      div.className = 'cal-day';
      if (today.getDate() === d && today.getMonth() === m && today.getFullYear() === y) div.classList.add('today');
      if (data) {
        const s = data.score || 0;
        if (s < 30) div.classList.add('score-low');
        else if (s < 60) div.classList.add('score-mid');
        else if (s < 80) div.classList.add('score-high');
        else div.classList.add('score-great');
        div.title = `${d} ${monthNames[m]}: Score ${s}%`;
      }
      div.textContent = d;
      cal.appendChild(div);
    }
  },

  updateMonthlyStats() {
    const { currentMonth: m, currentYear: y } = this.state;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dayData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = this.load(`day_${key}`, null);
      if (data) dayData.push({ day: d, data });
    }
    const scores = dayData.map(d => d.data.score || 0);
    const hours = dayData.map(d => (d.data.workedSecs || 0) / 3600);
    const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const totalHours = hours.reduce((a,b)=>a+b,0);
    const productiveDays = scores.filter(s => s >= 60).length;
    const bestScore = scores.length ? Math.max(...scores) : 0;
    const bestDayObj = dayData.find(d => (d.data.score||0) === bestScore);
    document.getElementById('monthAvgScore').textContent = avgScore + '%';
    document.getElementById('monthTotalHours').textContent = totalHours.toFixed(1) + 'h';
    document.getElementById('monthProductiveDays').textContent = productiveDays;
    document.getElementById('monthBestDay').textContent = bestDayObj ? bestDayObj.day : '—';
    this.renderCategoryChart();
  },

  renderCategoryChart() {
    const { currentMonth: m, currentYear: y } = this.state;
    const el = document.getElementById('categoryChart');
    if (!el) return;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const catCounts = { work:0, learning:0, health:0, personal:0, creative:0, admin:0 };
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      (this.load(`tasks_${key}`, [])).forEach(t => { if (catCounts[t.cat]!==undefined) catCounts[t.cat]++; });
    }
    const total = Object.values(catCounts).reduce((a,b)=>a+b,0) || 1;
    const colors = { work:'#b4f542', learning:'#42f5c5', health:'#42f5a5', personal:'#f5a342', creative:'#d542f5', admin:'#9090aa' };
    const labels = { work:'💼 Work', learning:'📚 Learn', health:'🏃 Health', personal:'🧘 Personal', creative:'🎨 Create', admin:'📋 Admin' };
    el.innerHTML = Object.entries(catCounts).map(([cat, count]) => `
      <div class="cat-row">
        <span class="cat-label">${labels[cat]}</span>
        <div class="cat-bar-wrap"><div class="cat-bar" style="width:${Math.round((count/total)*100)}%;background:${colors[cat]}"></div></div>
        <span class="cat-pct">${Math.round((count/total)*100)}%</span>
      </div>`).join('');
  },

  async getMonthlyAiAnalysis() {
    const el = document.getElementById('monthlyAiAnalysis');
    el.textContent = '⟳ Generating monthly analysis...';
    const { currentMonth: m, currentYear: y } = this.state;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const dayData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = this.load(`day_${key}`, null);
      if (data) dayData.push({ day: d, data });
    }
    const scores = dayData.map(d => d.data.score || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const roadmap = this.load('roadmap', null);
    const allTopics = roadmap ? roadmap.phases.flatMap(p => p.topics) : [];
    const donePct = allTopics.length ? Math.round((allTopics.filter(t=>t.completed).length/allTopics.length)*100) : 0;
    const ctx = this.buildUserContext();
    const result = await this.callGemini(
      `Monthly analysis for ${monthNames[m]} ${y}: ${dayData.length} days tracked, avg score ${avgScore}%, ${scores.filter(s=>s>=60).length} productive days, roadmap ${donePct}% complete. Write 4-5 sentences: performance summary, patterns, wins, and 2 specific next-month goals.`,
      ctx
    );
    el.textContent = result;
  },

  // ============================================================
  // 2-HOUR CHECK-IN NOTIFICATION
  // ============================================================
  setupCheckinModal() {
    document.getElementById('notifSubmit').addEventListener('click', async () => {
      const input = document.getElementById('notifTaskInput').value.trim();
      if (input) {
        input.split('\n').filter(l => l.trim()).forEach(line => {
          this.state.tasks.push({ id: Date.now()+Math.random(), title: line.trim(), desc: '', cat: 'work', dur: 0, time: new Date().toISOString() });
        });
        this.save(`tasks_${this.getTodayKey()}`, this.state.tasks);

        // Check if roadmap topic was marked
        const topicSel = document.getElementById('notifTopicSelect');
        const topicDone = document.getElementById('notifTopicDone');
        if (topicSel.value && topicDone.checked) this.markTopicComplete(topicSel.value);

        this.renderTodayTasks();
        this.updateDashboard();
        this.showToast('✓ Check-in logged!');

        // Quick AI analysis
        const ai = document.getElementById('aiInsight');
        ai.textContent = '⟳ Analyzing check-in...';
        const result = await this.callGemini(
          `Quick feedback (1-2 sentences) on these activities logged in a work block: "${input}". Be encouraging.`,
          this.buildUserContext()
        );
        ai.textContent = result;
      }
      document.getElementById('notifModal').classList.remove('show');
      document.getElementById('notifTaskInput').value = '';
      document.getElementById('notifTopicDone').checked = false;
    });
    document.getElementById('notifSkip').addEventListener('click', () => {
      document.getElementById('notifModal').classList.remove('show');
    });
  },

  scheduleNotification() {
    const savedInterval = this.load('notifInterval', 120);
    const enabled = this.load('notifEnabled', true);
    if (document.getElementById('notifToggle')) document.getElementById('notifToggle').checked = enabled;
    if (document.getElementById('reminderInterval')) document.getElementById('reminderInterval').value = savedInterval;
    if (this.state?.notifTimer) clearInterval(this.state.notifTimer);
    if (!enabled) return;
    if (!this.state) this.state = {};
    const intervalMs = savedInterval * 60 * 1000;
    this.state.notifTimer = setInterval(() => {
      if (!this.load('notifEnabled', true) || !this.state.isPunchedIn) return;
      const mins = this.load('notifInterval', 120);
      const label = mins >= 60 ? `${Math.round(mins/60)}-hour` : `${mins}-minute`;
      document.getElementById('notifInterval').textContent = label;

      // Populate roadmap topics in notif modal
      const roadmap = this.load('roadmap', null);
      const notifRow = document.getElementById('notifStudyRow');
      const topicSel = document.getElementById('notifTopicSelect');
      if (roadmap) {
        notifRow.style.display = 'block';
        topicSel.innerHTML = '';
        roadmap.phases.flatMap(p => p.topics).filter(t => !t.completed).slice(0, 8).forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.id; opt.textContent = t.name;
          topicSel.appendChild(opt);
        });
      } else {
        notifRow.style.display = 'none';
      }

      document.getElementById('notifModal').classList.add('show');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Daily Productivity Analyzer ⬡', {
          body: `${label} check-in: What have you accomplished?`,
        });
      }
    }, intervalMs);
  },

  // ============================================================
  // SETTINGS
  // ============================================================
  setupSettings() {
    document.getElementById('saveGeminiKey').addEventListener('click', () => {
      const key = document.getElementById('geminiKey').value.trim();
      if (key && !key.startsWith('•')) {
        this.save('geminiKey', key);
        document.getElementById('geminiKey').value = '••••••••••••••••';
        this.showToast('✓ Gemini API key saved!');
      }
    });
    document.getElementById('saveProfile').addEventListener('click', () => {
      const profile = {
        name: document.getElementById('userName').value.trim(),
        role: document.getElementById('userRole').value.trim(),
        goalHours: parseInt(document.getElementById('dailyGoalHours').value) || 8
      };
      this.save('profile', profile);
      this.updateGreeting();
      this.showToast('✓ Profile saved!');
    });
    document.getElementById('requestNotif').addEventListener('click', async () => {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        this.showToast(perm === 'granted' ? '✓ Notifications enabled!' : '⚠ Notifications blocked.');
      }
    });
    document.getElementById('notifToggle').addEventListener('change', e => {
      this.save('notifEnabled', e.target.checked);
      this.scheduleNotification();
    });
    document.getElementById('reminderInterval').addEventListener('change', e => {
      this.save('notifInterval', parseInt(e.target.value));
      this.scheduleNotification();
    });
    document.getElementById('exportData').addEventListener('click', () => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith('dpa_')) data[k] = localStorage.getItem(k);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dpa-export-${this.getTodayKey()}.json`;
      a.click();
      this.showToast('✓ Data exported!');
    });
    document.getElementById('clearData').addEventListener('click', () => {
      if (confirm('Clear ALL data? This cannot be undone.')) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) { if (localStorage.key(i).startsWith('dpa_')) keys.push(localStorage.key(i)); }
        keys.forEach(k => localStorage.removeItem(k));
        location.reload();
      }
    });
  },

  loadSettingsForm() {
    const profile = this.load('profile', {});
    if (profile.name) document.getElementById('userName').value = profile.name;
    if (profile.role) document.getElementById('userRole').value = profile.role;
    if (profile.goalHours) document.getElementById('dailyGoalHours').value = profile.goalHours;
    const key = this.load('geminiKey', '');
    document.getElementById('geminiKey').value = key ? '••••••••••••••••' : '';
    document.getElementById('notifToggle').checked = this.load('notifEnabled', true);
    document.getElementById('reminderInterval').value = this.load('notifInterval', 120);
  },

  // ============================================================
  // TOAST
  // ============================================================
  showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.borderColor = type === 'warn' ? 'var(--accent3)' : 'var(--accent)';
    t.style.color = type === 'warn' ? 'var(--accent3)' : 'var(--accent)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  },

  state: {}
};

// ---- BOOT ----
document.addEventListener('DOMContentLoaded', () => APP.runSplash());
