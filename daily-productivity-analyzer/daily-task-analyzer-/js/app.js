// =============================================
// DAILY PRODUCTIVITY ANALYZER - Main App Logic
// =============================================

const APP = {
  state: {
    isPunchedIn: false,
    punchInTime: null,
    sessions: [],
    tasks: [],
    notifInterval: null,
    notifTimer: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
  },

  // ---- STORAGE ----
  save(key, val) {
    try { localStorage.setItem('dpa_' + key, JSON.stringify(val)); } catch(e) {}
  },
  load(key, fallback = null) {
    try {
      const v = localStorage.getItem('dpa_' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch(e) { return fallback; }
  },
  getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  // ---- INIT ----
  init() {
    this.loadAllState();
    this.setupNav();
    this.setupClock();
    this.setupPunch();
    this.setupTodayLog();
    this.setupQuickTask();
    this.setupMonthly();
    this.setupSettings();
    this.setupModal();
    this.setupMenuToggle();
    this.updateDashboard();
    this.renderTodayTasks();
    this.scheduleNotification();
    this.updateGreeting();
    this.renderCalendar();
    this.updateMonthlyStats();
    this.calculateStreak();

    // Load saved gemini key display
    const savedKey = this.load('geminiKey', '');
    if (savedKey) document.getElementById('geminiKey').value = '••••••••••••••••';

    // Load profile
    const profile = this.load('profile', {});
    if (profile.name) document.getElementById('userName').value = profile.name;
    if (profile.role) document.getElementById('userRole').value = profile.role;
    if (profile.goalHours) document.getElementById('dailyGoalHours').value = profile.goalHours;
  },

  loadAllState() {
    const todayKey = this.getTodayKey();
    this.state.sessions = this.load(`sessions_${todayKey}`, []);
    this.state.tasks = this.load(`tasks_${todayKey}`, []);
    this.state.isPunchedIn = this.load('isPunchedIn', false);
    this.state.punchInTime = this.load('punchInTime', null);
    if (this.state.punchInTime) this.state.punchInTime = new Date(this.state.punchInTime);
    this.updatePunchUI();
  },

  // ---- NAVIGATION ----
  setupNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const tab = link.dataset.tab;
        this.switchTab(tab);
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  },

  switchTab(tab) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('topBarTitle').textContent = tab.charAt(0).toUpperCase() + tab.slice(1);

    if (tab === 'monthly') { this.renderCalendar(); this.updateMonthlyStats(); }
    if (tab === 'dashboard') { this.updateDashboard(); }
  },

  setupMenuToggle() {
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  },

  // ---- CLOCK ----
  setupClock() {
    const update = () => {
      const now = new Date();
      const t = now.toLocaleTimeString('en-IN', { hour12: false });
      const d = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      document.getElementById('sidebarClock').textContent = t;
      document.getElementById('bigClock').textContent = t;
      document.getElementById('punchDate').textContent = d;
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
  },

  // ---- PUNCH IN/OUT ----
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
      const session = {
        in: this.state.punchInTime.toISOString(),
        out: out.toISOString(),
        duration,
      };
      this.state.sessions.push(session);
      this.save(`sessions_${this.getTodayKey()}`, this.state.sessions);
      this.state.isPunchedIn = false;
      this.state.punchInTime = null;
      this.save('isPunchedIn', false);
      this.save('punchInTime', null);
      this.showToast('✓ Punched Out — Session: ' + this.formatDuration(duration));
    }
    this.updatePunchUI();
    this.renderSessions();
    this.updateDashboard();
  },

  updatePunchUI() {
    const btn = document.getElementById('bigPunchBtn');
    const mainBtn = document.getElementById('mainPunchBtn');
    const badge = document.getElementById('punchBadge');
    if (this.state.isPunchedIn) {
      btn.textContent = 'PUNCH OUT';
      btn.classList.add('out');
      mainBtn.textContent = 'PUNCH OUT';
      mainBtn.classList.add('out');
      badge.textContent = '● CLOCKED IN';
      badge.classList.add('active');
    } else {
      btn.textContent = 'PUNCH IN';
      btn.classList.remove('out');
      mainBtn.textContent = 'PUNCH IN';
      mainBtn.classList.remove('out');
      badge.textContent = '● CLOCKED OUT';
      badge.classList.remove('active');
    }
    this.renderSessions();
  },

  renderSessions() {
    const list = document.getElementById('sessionList');
    if (!list) return;
    list.innerHTML = '';
    this.state.sessions.forEach((s, i) => {
      const li = document.createElement('li');
      li.className = 'session-item';
      li.innerHTML = `
        <span class="session-in">IN: ${new Date(s.in).toLocaleTimeString()}</span>
        <span class="session-out">OUT: ${new Date(s.out).toLocaleTimeString()}</span>
        <span class="session-duration">${this.formatDuration(s.duration)}</span>
      `;
      list.appendChild(li);
    });
    if (this.state.isPunchedIn) {
      const li = document.createElement('li');
      li.className = 'session-item';
      li.innerHTML = `<span class="session-in">IN: ${new Date(this.state.punchInTime).toLocaleTimeString()}</span><span style="color:var(--accent3)">Active...</span>`;
      list.appendChild(li);
    }
  },

  getTotalWorkedSeconds() {
    let total = this.state.sessions.reduce((a, s) => a + s.duration, 0);
    if (this.state.isPunchedIn && this.state.punchInTime) {
      total += Math.floor((new Date() - this.state.punchInTime) / 1000);
    }
    return total;
  },

  updateWorkTimer() {
    const secs = this.getTotalWorkedSeconds();
    document.getElementById('totalWorkTime').textContent = this.formatDuration(secs);
    const statusEl = document.getElementById('punchStatusText');
    if (statusEl) {
      statusEl.textContent = this.state.isPunchedIn ? '● Currently clocked in' : `${this.state.sessions.length} session(s) today`;
    }
  },

  updateSessionTimer() {
    const el = document.getElementById('sessionTimer');
    if (!el) return;
    if (this.state.isPunchedIn && this.state.punchInTime) {
      const secs = Math.floor((new Date() - this.state.punchInTime) / 1000);
      el.textContent = this.formatDuration(secs);
    } else {
      el.textContent = '00:00:00';
    }
  },

  formatDuration(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  // ---- TASKS ----
  setupTodayLog() {
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      const title = document.getElementById('taskTitle').value.trim();
      const desc = document.getElementById('taskDesc').value.trim();
      const cat = document.getElementById('taskCategory').value;
      const dur = parseInt(document.getElementById('taskDuration').value) || 0;
      if (!title) return this.showToast('Enter a task title!', 'warn');
      const task = { id: Date.now(), title, desc, cat, dur, time: new Date().toISOString() };
      this.state.tasks.push(task);
      this.save(`tasks_${this.getTodayKey()}`, this.state.tasks);
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDesc').value = '';
      document.getElementById('taskDuration').value = '';
      this.renderTodayTasks();
      this.updateDashboard();
      this.showToast('✓ Activity logged!');
    });
  },

  renderTodayTasks() {
    const list = document.getElementById('todayTaskList');
    const empty = document.getElementById('emptyState');
    const count = document.getElementById('activityCount');
    if (!list) return;
    list.innerHTML = '';
    if (this.state.tasks.length === 0) {
      empty.style.display = 'block';
      count.textContent = '0';
      return;
    }
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
            <span class="task-tag">${new Date(task.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
          </div>
        </div>
        <button class="task-delete" onclick="APP.deleteTask(${task.id})">✕</button>
      `;
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
    const map = { work:'💼 Work', learning:'📚 Learning', health:'🏃 Health', personal:'🧘 Personal', creative:'🎨 Creative', admin:'📋 Admin' };
    return map[cat] || cat;
  },

  calculateProductivityScore() {
    if (this.state.tasks.length === 0) return 0;
    const profile = this.load('profile', {});
    const goalMins = (profile.goalHours || 8) * 60;
    const totalWorkedMins = this.getTotalWorkedSeconds() / 60;

    // Score factors
    let score = 0;

    // Task count (up to 40 pts — more tasks = more productive)
    score += Math.min(this.state.tasks.length * 6, 40);

    // Task diversity (up to 20 pts)
    const cats = new Set(this.state.tasks.map(t => t.cat));
    score += cats.size * 4;

    // Time logged (up to 30 pts)
    const timeScore = Math.min((totalWorkedMins / goalMins) * 30, 30);
    score += timeScore;

    // High-value categories bonus (up to 10 pts)
    const highVal = this.state.tasks.filter(t => ['work','learning','creative'].includes(t.cat));
    score += Math.min(highVal.length * 2, 10);

    return Math.min(Math.round(score), 100);
  },

  updateScoreBreakdown() {
    const el = document.getElementById('scoreBreakdown');
    if (!el) return;
    const catCounts = {};
    this.state.tasks.forEach(t => { catCounts[t.cat] = (catCounts[t.cat] || 0) + 1; });
    const totalMins = this.state.tasks.reduce((a, t) => a + (t.dur || 0), 0);
    let html = `Total tasks: ${this.state.tasks.length}\n`;
    html += `Total logged time: ${totalMins}m\n`;
    html += `Categories: ${Object.entries(catCounts).map(([k,v]) => `${k}(${v})`).join(', ')}\n`;
    html += `\nProductivity Score: ${this.calculateProductivityScore()}%`;
    el.textContent = html;
  },

  // ---- QUICK TASK ----
  setupQuickTask() {
    const addQuick = () => {
      const input = document.getElementById('quickTask');
      const val = input.value.trim();
      if (!val) return;
      const task = { id: Date.now(), title: val, desc: '', cat: 'work', dur: 0, time: new Date().toISOString() };
      this.state.tasks.push(task);
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
    this.state.tasks.slice(-5).reverse().forEach(t => {
      const li = document.createElement('li');
      li.className = 'quick-task-item';
      li.textContent = t.title;
      list.appendChild(li);
    });
  },

  // ---- DASHBOARD ----
  updateDashboard() {
    const score = this.calculateProductivityScore();
    document.getElementById('scoreNumber').textContent = score + '%';
    const circ = 2 * Math.PI * 50;
    document.getElementById('ringFill').setAttribute('stroke-dasharray', `${(score / 100) * circ} ${circ}`);
    this.renderQuickList();
    this.saveToday(score);
    this.calculateStreak();
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

  // ---- GEMINI AI ----
  async callGemini(prompt) {
    const key = this.load('geminiKey', '');
    if (!key) return '⚠ Add your Gemini API key in Settings to enable AI features.';
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      if (data.error) return `API Error: ${data.error.message}`;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
    } catch(e) {
      return 'Error calling Gemini API. Check your key.';
    }
  },

  async getAiInsight() {
    const el = document.getElementById('aiInsight');
    el.textContent = '⟳ Thinking...';
    const tasks = this.state.tasks.map(t => `${t.cat}: ${t.title}${t.desc ? ' - '+t.desc : ''}`).join('\n');
    const workedHrs = (this.getTotalWorkedSeconds() / 3600).toFixed(1);
    const prompt = `You are a productivity coach. Analyze this person's day:
Tasks done today:
${tasks || 'No tasks logged yet'}
Hours worked: ${workedHrs}
Productivity score: ${this.calculateProductivityScore()}%

Give a very concise 2-3 sentence insight about their day. Be encouraging but honest. Focus on what's good and one quick tip.`;
    const insight = await this.callGemini(prompt);
    el.textContent = insight;
  },

  async getAiRecommendations() {
    const el = document.getElementById('recommendationsList');
    el.textContent = '⟳ Analyzing...';
    const tasks = this.state.tasks.map(t => t.title).join(', ') || 'nothing yet';
    const profile = this.load('profile', {});
    const prompt = `You are a productivity coach. Someone with role "${profile.role || 'professional'}" has done these tasks today: ${tasks}.
List 3-4 specific, actionable things they should do next or haven't done today. Be very concise, one line each. Start each with an emoji.`;
    const result = await this.callGemini(prompt);
    el.innerHTML = result.split('\n').filter(l => l.trim()).map(l => `<div class="rec-item">${l}</div>`).join('');
  },

  // ---- MONTHLY ----
  setupMonthly() {
    document.getElementById('prevMonth').addEventListener('click', () => {
      this.state.currentMonth--;
      if (this.state.currentMonth < 0) { this.state.currentMonth = 11; this.state.currentYear--; }
      this.renderCalendar();
      this.updateMonthlyStats();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
      this.state.currentMonth++;
      if (this.state.currentMonth > 11) { this.state.currentMonth = 0; this.state.currentYear++; }
      this.renderCalendar();
      this.updateMonthlyStats();
    });
    document.getElementById('getMonthlyAnalysis').addEventListener('click', () => this.getMonthlyAiAnalysis());
  },

  getDayDataForMonth(year, month) {
    const days = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let d = 1; d <= days; d++) {
      const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = this.load(`day_${key}`, null);
      result.push({ day: d, data });
    }
    return result;
  },

  renderCalendar() {
    const { currentMonth: m, currentYear: y } = this.state;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('monthLabel').textContent = `${monthNames[m]} ${y}`;

    const cal = document.getElementById('calendarHeatmap');
    if (!cal) return;
    cal.innerHTML = '';

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    days.forEach(d => {
      const header = document.createElement('div');
      header.className = 'cal-header';
      header.textContent = d;
      cal.appendChild(header);
    });

    const firstDay = new Date(y, m, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      cal.appendChild(empty);
    }

    const today = new Date();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const data = this.load(`day_${key}`, null);
      const div = document.createElement('div');
      div.className = 'cal-day';

      const isToday = today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;
      if (isToday) div.classList.add('today');

      if (data) {
        const s = data.score || 0;
        if (s < 30) div.classList.add('score-low');
        else if (s < 60) div.classList.add('score-mid');
        else if (s < 80) div.classList.add('score-high');
        else div.classList.add('score-great');
        div.title = `${d} ${monthNames[m]}: Score ${s}%, ${data.tasks || 0} tasks`;
      }
      div.textContent = d;
      cal.appendChild(div);
    }
  },

  updateMonthlyStats() {
    const { currentMonth: m, currentYear: y } = this.state;
    const dayData = this.getDayDataForMonth(y, m).filter(d => d.data);
    const scores = dayData.map(d => d.data.score || 0);
    const hours = dayData.map(d => (d.data.workedSecs || 0) / 3600);

    const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0) / scores.length) : 0;
    const totalHours = hours.reduce((a,b)=>a+b,0);
    const productiveDays = scores.filter(s => s >= 60).length;
    const bestScore = scores.length ? Math.max(...scores) : 0;
    const bestDayObj = dayData.find(d => (d.data.score || 0) === bestScore);

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
      const tasks = this.load(`tasks_${key}`, []);
      tasks.forEach(t => { if (catCounts[t.cat] !== undefined) catCounts[t.cat]++; });
    }
    const total = Object.values(catCounts).reduce((a,b)=>a+b,0) || 1;
    const colors = { work:'#b4f542', learning:'#42f5c5', health:'#42f5a5', personal:'#f5a342', creative:'#d542f5', admin:'#9090aa' };
    const labels = { work:'💼 Work', learning:'📚 Learn', health:'🏃 Health', personal:'🧘 Personal', creative:'🎨 Create', admin:'📋 Admin' };

    el.innerHTML = Object.entries(catCounts).map(([cat, count]) => `
      <div class="cat-row">
        <span class="cat-label">${labels[cat]}</span>
        <div class="cat-bar-wrap"><div class="cat-bar" style="width:${Math.round((count/total)*100)}%;background:${colors[cat]}"></div></div>
        <span class="cat-pct">${Math.round((count/total)*100)}%</span>
      </div>
    `).join('');
  },

  async getMonthlyAiAnalysis() {
    const el = document.getElementById('monthlyAiAnalysis');
    el.textContent = '⟳ Generating monthly analysis...';
    const { currentMonth: m, currentYear: y } = this.state;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayData = this.getDayDataForMonth(y, m).filter(d => d.data);
    const scores = dayData.map(d => d.data.score || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    const productiveDays = scores.filter(s => s >= 60).length;
    const prompt = `You are a productivity analyst. Analyze this monthly report for ${monthNames[m]} ${y}:
- Days tracked: ${dayData.length}
- Average productivity score: ${avgScore}%
- Productive days (score ≥ 60%): ${productiveDays}
- Scores by day: ${dayData.map(d=>`Day ${d.day}: ${d.data.score}%`).join(', ')}

Write a 4-5 sentence monthly analysis. Include: overall performance, patterns you notice, strengths, and 2 specific recommendations for next month. Be direct and actionable.`;
    const result = await this.callGemini(prompt);
    el.textContent = result;
  },

  // ---- NOTIFICATIONS ----
  setupModal() {
    document.getElementById('notifSubmit').addEventListener('click', async () => {
      const input = document.getElementById('notifTaskInput').value.trim();
      if (input) {
        const lines = input.split('\n').filter(l => l.trim());
        lines.forEach(line => {
          this.state.tasks.push({ id: Date.now() + Math.random(), title: line.trim(), desc: '', cat: 'work', dur: 0, time: new Date().toISOString() });
        });
        this.save(`tasks_${this.getTodayKey()}`, this.state.tasks);
        this.renderTodayTasks();
        this.updateDashboard();
        this.showToast('✓ Tasks logged from check-in!');

        // AI analysis of check-in
        const ai = document.getElementById('aiInsight');
        ai.textContent = '⟳ Analyzing your check-in...';
        const prompt = `In 1-2 sentences, give quick feedback on these activities logged in a 2-hour work block: "${input}". Be encouraging and brief.`;
        const result = await this.callGemini(prompt);
        ai.textContent = result;
      }
      document.getElementById('notifModal').classList.remove('show');
      document.getElementById('notifTaskInput').value = '';
    });
    document.getElementById('notifSkip').addEventListener('click', () => {
      document.getElementById('notifModal').classList.remove('show');
    });
  },

  scheduleNotification() {
    const savedInterval = this.load('notifInterval', 120);
    const enabled = this.load('notifEnabled', true);
    document.getElementById('notifToggle').checked = enabled;
    document.getElementById('reminderInterval').value = savedInterval;

    if (this.state.notifTimer) clearInterval(this.state.notifTimer);
    if (!enabled) return;

    const intervalMs = savedInterval * 60 * 1000;
    this.state.notifTimer = setInterval(() => {
      if (!this.load('notifEnabled', true)) return;
      if (this.state.isPunchedIn) {
        const mins = this.load('notifInterval', 120);
        document.getElementById('notifInterval').textContent = mins >= 60 ? Math.round(mins/60) + ' hour' + (mins >= 120?'s':'') : mins + ' minutes';
        document.getElementById('notifModal').classList.add('show');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Daily Productivity Analyzer', {
            body: `${mins >= 60 ? Math.round(mins/60) + '-hour' : mins + '-minute'} check-in: What have you accomplished?`,
            icon: '⬡'
          });
        }
      }
    }, intervalMs);
  },

  // ---- SETTINGS ----
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
      this.showToast('✓ Profile saved!');
    });

    document.getElementById('requestNotif').addEventListener('click', async () => {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        this.showToast(perm === 'granted' ? '✓ Notifications enabled!' : '⚠ Notifications blocked by browser.');
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `dpa-export-${this.getTodayKey()}.json`;
      a.click();
      this.showToast('✓ Data exported!');
    });

    document.getElementById('clearData').addEventListener('click', () => {
      if (confirm('Clear ALL data? This cannot be undone.')) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          if (localStorage.key(i).startsWith('dpa_')) keys.push(localStorage.key(i));
        }
        keys.forEach(k => localStorage.removeItem(k));
        location.reload();
      }
    });

    // AI buttons
    document.getElementById('refreshInsight').addEventListener('click', () => this.getAiInsight());
    document.getElementById('recommendationsList').addEventListener('click', () => {});
    const recCard = document.querySelector('.card-recommendations .card-label');
    if (recCard) recCard.style.cursor = 'pointer';
    document.querySelector('.card-recommendations').addEventListener('click', (e) => {
      if (e.target.classList.contains('card-label') || e.target.textContent.includes('AI Recommendations')) {
        this.getAiRecommendations();
      }
    });

    // Add get recommendations button dynamically
    const recDiv = document.querySelector('.card-recommendations');
    const recBtn = document.createElement('button');
    recBtn.className = 'btn-sm';
    recBtn.textContent = '✦ Get Recommendations';
    recBtn.style.marginTop = '.8rem';
    recBtn.addEventListener('click', () => this.getAiRecommendations());
    recDiv.appendChild(recBtn);
  },

  // ---- TOAST ----
  showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.borderColor = type === 'warn' ? 'var(--accent3)' : 'var(--accent)';
    t.style.color = type === 'warn' ? 'var(--accent3)' : 'var(--accent)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
};

// ---- START ----
document.addEventListener('DOMContentLoaded', () => APP.init());
