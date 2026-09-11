/* ========================================
   喵日常 v0.6 · 历史快照 + 完整交互
   - 状态：state.currentDate（默认今天）+ mode（today / history）
   - 三个模块均按日期存/读
   - 历史模式下全部只读，回到今天才可编辑
   ======================================== */

(function () {
  'use strict';

  /* ===== 存储键名 ===== */
  var KEYS = {
    todos: 'miao_daily_todos',            // { "YYYY-MM-DD": [todo,...] }
    habits: 'miao_daily_habit_list',      // [habit,...]
    habitRecords: 'miao_daily_habit_records', // { date: [habitId,...] }
    mood: 'miao_daily_mood'               // { date: {mood, note} }
  };

  var DEFAULT_HABIT_EMOJI = '⭐';
  var ID_TO_EMOJI = { water: '💧', read: '📖', sleep: '🛌', exercise: '🏃' };

  /* ===== 全局状态 ===== */
  var state = {
    currentDate: todayStr(),
    mode: 'today' // 'today' | 'history'
  };

  /* ===== 工具函数 ===== */
  function $(id) { return document.getElementById(id); }
  function $all(sel) { return document.querySelectorAll(sel); }

  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) { console.warn('保存失败：', e); }
    if (window.supabaseClient && window.__miaoUserId) scheduleSync();
  }

  /* ===== 云端同步（v1.1.0） ===== */
  var SYNC_KEYS = [KEYS.todos, KEYS.habits, KEYS.habitRecords, KEYS.mood];
  var syncTimer = null;

  function scheduleSync() {
    if (!window.__miaoUserId) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { pushCloud(); }, 800);
  }

  function buildPayload() {
    var payload = {};
    SYNC_KEYS.forEach(function (k) {
      var raw = localStorage.getItem(k);
      try { payload[k] = raw ? JSON.parse(raw) : null; }
      catch (e) { payload[k] = null; }
    });
    return payload;
  }

  async function pushCloud() {
    var c = window.supabaseClient;
    var uid = window.__miaoUserId;
    if (!c || !uid) return;
    var payload = buildPayload();
    var { error } = await c.from('user_data').upsert({
      user_id: uid,
      payload: payload,
      updated_at: new Date().toISOString()
    });
    if (error) console.warn('☁️ 云端同步失败：', error.message || error);
  }

  async function pullCloud(uid) {
    var c = window.supabaseClient;
    if (!c || !uid) return null;
    var { data, error } = await c.from('user_data').select('payload').eq('user_id', uid).maybeSingle();
    if (error) { console.warn('☁️ 云端拉取失败：', error.message || error); return null; }
    if (data && data.payload && typeof data.payload === 'object') {
      Object.keys(data.payload).forEach(function (k) {
        if (data.payload[k] != null) {
          try { localStorage.setItem(k, JSON.stringify(data.payload[k])); } catch (e) {}
        }
      });
      return data.payload;
    }
    return null;
  }

  async function startApp(uid) {
    window.__miaoUserId = uid;
    var cloud = await pullCloud(uid);
    var hadLocal = SYNC_KEYS.some(function (k) { return !!localStorage.getItem(k); });
    if (!cloud && hadLocal) {
      // 云端为空但本地有旧数据（v1.0 时代）→ 自动上传到云端
      await pushCloud();
      showToast('☁️ 已把本地旧数据同步到云端～');
    }
    init();
  }

  function boot() {
    var c = window.supabaseClient;
    if (!c) { init(); return; } // 没接 Supabase 时退回纯本地模式
    c.auth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (session) { startApp(session.user.id); return; }
      // 可能还在从邮件链接的 URL 里恢复登录态
      var handled = false;
      c.auth.onAuthStateChange(function (event, sess) {
        if (!handled && sess && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          handled = true;
          startApp(sess.user.id);
        } else if (event === 'SIGNED_OUT') {
          window.location.href = 'login.html';
        }
      });
      setTimeout(function () {
        if (!handled) window.location.href = 'login.html';
      }, 2500);
    });
  }

  function load(key, defaultValue) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) { return defaultValue; }
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function dateLabel(dateStr) {
    var d = new Date(dateStr);
    var month = d.getMonth() + 1;
    var date = d.getDate();
    var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var day = days[d.getDay()];
    if (dateStr === todayStr()) return '今天 · ' + month + '月' + date + '日';
    return month + '月' + date + '日 · ' + day;
  }

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function isToday() { return state.currentDate === todayStr(); }

  /* ===== 醒目可爱提示气泡 ===== */
  function showToast(message) {
    var existing = document.getElementById('toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.innerHTML =
      '<span class="toast-icon">🥺</span>' +
      '<span class="toast-text">' + escapeHtml(message) + '</span>' +
      '<span class="toast-sparkle">✨</span>';
    document.body.appendChild(toast);
    toast.getBoundingClientRect();
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () { toast.classList.remove('show'); }, 2800);
    setTimeout(function () { toast.remove(); }, 3200);
  }

  /* ===== 标题区用的图标（保持 SVG） ===== */
  var ICONS = {
    todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 12l2 2 4-4"/></svg>',
    habit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg>',
    mood: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6c-1.6-1.5-4-1.5-5.6 0L12 7.7 8.8 4.6C7.2 3.1 4.8 3.1 3.2 4.6s-1.5 4.1 0 5.6l8.8 8.8 8.8-8.8c1.5-1.5 1.5-4.1 0-5.6z"/></svg>'
  };

  /* ===== Todo 模块（按日期分组） ===== */
  var TodoModule = {
    allTodos: {},

    init: function () {
      var stored = load(KEYS.todos, null);

      // 兼容旧格式（数组）→ 迁移到今天
      if (Array.isArray(stored)) {
        var oldArr = stored;
        this.allTodos = {};
        this.allTodos[todayStr()] = oldArr;
        save(KEYS.todos, this.allTodos);
      } else if (stored && typeof stored === 'object') {
        this.allTodos = stored;
      } else {
        // 首次访问，初始化示例数据到今天
        this.allTodos = {};
        this.allTodos[todayStr()] = [
          { id: 1, text: '回复重要邮件', completed: false },
          { id: 2, text: '整理书桌', completed: false },
          { id: 3, text: '喝一杯水', completed: true }
        ];
        save(KEYS.todos, this.allTodos);
      }

      this.bind();
      this.render();
    },

    getCurrentList: function () {
      return this.allTodos[state.currentDate] || [];
    },

    bind: function () {
      var self = this;

      $('todoForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!isToday()) return;
        var input = $('todoInput');
        var text = input.value.trim();
        if (!text) return;
        self.add(text);
        input.value = '';
        input.focus();
      });

      $('todoList').addEventListener('click', function (e) {
        var item = e.target.closest('.todo-item');
        if (!item) return;
        var id = parseInt(item.dataset.id, 10);

        if (e.target.classList.contains('todo-delete')) {
          if (!isToday()) return;
          self.remove(id);
        } else if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') {
          if (!isToday()) return;
          self.toggle(id);
        }
      });
    },

    add: function (text) {
      if (!this.allTodos[state.currentDate]) this.allTodos[state.currentDate] = [];
      var list = this.allTodos[state.currentDate];
      var trimmed = text.trim();
      if (list.some(function (t) { return t.text.trim() === trimmed; })) {
        showToast('哎呀，已经有「' + trimmed + '」啦～ 别重复啦 🥺');
        return false;
      }
      list.push({
        id: Date.now(),
        text: text,
        completed: false
      });
      save(KEYS.todos, this.allTodos);
      this.render();
      return true;
    },

    toggle: function (id) {
      var list = this.allTodos[state.currentDate];
      if (!list) return;
      var t = list.find(function (x) { return x.id === id; });
      if (!t) return;
      t.completed = !t.completed;
      save(KEYS.todos, this.allTodos);
      this.render();
    },

    remove: function (id) {
      var list = this.allTodos[state.currentDate];
      if (!list) return;
      this.allTodos[state.currentDate] = list.filter(function (x) { return x.id !== id; });
      save(KEYS.todos, this.allTodos);
      this.render();
    },

    render: function () {
      var listEl = $('todoList');
      listEl.innerHTML = '';
      var list = this.getCurrentList();
      var editable = isToday();

      if (list.length === 0) {
        listEl.innerHTML = '<li class="todo-empty">' + (editable ? '还没有待办，加一件想做的事吧～' : '这天没有待办记录') + '</li>';
      } else {
        list.forEach(function (todo) {
          var li = document.createElement('li');
          li.className = 'todo-item';
          li.dataset.id = todo.id;
          li.innerHTML =
            '<input type="checkbox" id="todo-' + todo.id + '"' +
              (todo.completed ? ' checked' : '') + (editable ? '' : ' disabled') + '>' +
            '<label for="todo-' + todo.id + '"' +
              (todo.completed ? ' class="done"' : '') + '>' +
              escapeHtml(todo.text) +
            '</label>' +
            (editable ? '<button class="todo-delete" title="删除">×</button>' : '');
          listEl.appendChild(li);
        });
      }

      var completed = list.filter(function (t) { return t.completed; }).length;
      $('todoCount').textContent = list.length === 0 ? '0' : (completed + '/' + list.length);
    },

    // 历史视图专用：渲染到 #todoListSnap（只读）
    renderSnapshot: function () {
      var listEl = $('todoListSnap');
      if (!listEl) return;
      listEl.innerHTML = '';
      var list = this.getCurrentList();

      if (list.length === 0) {
        listEl.innerHTML = '<li class="todo-empty">这天没有待办哦～</li>';
      } else {
        list.forEach(function (todo) {
          var li = document.createElement('li');
          li.className = 'todo-item';
          li.dataset.id = todo.id;
          li.innerHTML =
            '<input type="checkbox" id="todo-snap-' + todo.id + '" disabled' +
              (todo.completed ? ' checked' : '') + '>' +
            '<label for="todo-snap-' + todo.id + '"' +
              (todo.completed ? ' class="done"' : '') + '>' +
              escapeHtml(todo.text) +
            '</label>';
          listEl.appendChild(li);
        });
      }
      var completed = list.filter(function (t) { return t.completed; }).length;
      $('todoCountSnap').textContent = list.length === 0 ? '' : (completed + '/' + list.length);
    }
  };

  /* ===== Habit 模块（按日期存打卡记录，habit list 全局） ===== */
  var HabitModule = {
    defaultHabits: [
      { id: 'water', name: '喝水', emoji: '💧' },
      { id: 'read', name: '阅读', emoji: '📖' },
      { id: 'sleep', name: '早睡', emoji: '🛌' },
      { id: 'exercise', name: '运动', emoji: '🏃' }
    ],
    habits: [],
    records: {},

    init: function () {
      var stored = load(KEYS.habits, null);
      if (!stored) {
        this.habits = this.defaultHabits;
        save(KEYS.habits, this.habits);
      } else {
        this.habits = stored;
      }
      this.habits = this.habits.map(function (h) {
        if (!h.emoji) h.emoji = ID_TO_EMOJI[h.icon] || DEFAULT_HABIT_EMOJI;
        delete h.icon;
        return h;
      });
      save(KEYS.habits, this.habits);

      this.records = load(KEYS.habitRecords, {});
      this.bind();
      this.render();
    },

    getDayDone: function (dateStr) {
      var all = this.records[dateStr] || [];
      // 过滤掉已经不存在习惯列表里的孤立 id（防止删除习惯后 done 数虚高）
      var validIds = this.habits.map(function (h) { return h.id; });
      return all.filter(function (id) { return validIds.indexOf(id) >= 0; });
    },

    bind: function () {
      var self = this;

      $('habitGrid').addEventListener('click', function (e) {
        var btn = e.target.closest('.habit-btn');
        if (!btn) return;
        if (!isToday()) return;

        if (e.target.classList.contains('habit-delete')) {
          e.stopPropagation();
          self.removeHabit(btn.dataset.habit);
        } else {
          self.toggle(btn.dataset.habit);
        }
      });

      $('emojiPicker').addEventListener('click', function (e) {
        if (!isToday()) return;
        var opt = e.target.closest('.emoji-option');
        if (!opt) return;
        $all('.emoji-option').forEach(function (o) {
          o.classList.remove('is-selected');
        });
        opt.classList.add('is-selected');
      });

      $('habitForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!isToday()) return;
        var input = $('habitInput');
        var name = input.value.trim();
        if (!name) return;
        var selected = $all('.emoji-option.is-selected')[0];
        var chosen = selected ? selected.dataset.emoji : '__none__';
        var emoji = (chosen === '__none__' || !chosen) ? DEFAULT_HABIT_EMOJI : chosen;
        self.addHabit(name, emoji);
        input.value = '';
        $all('.emoji-option').forEach(function (o) {
          o.classList.toggle('is-selected', o.dataset.emoji === '__none__');
        });
        input.focus();
      });
    },

    addHabit: function (name, emoji) {
      var trimmed = name.trim();
      if (this.habits.some(function (h) { return h.name.trim() === trimmed; })) {
        showToast('哎呀，已经有「' + trimmed + '」啦～ 别重复啦 🥺');
        return false;
      }
      var id = 'habit_' + Date.now();
      this.habits.push({ id: id, name: name, emoji: emoji || DEFAULT_HABIT_EMOJI });
      save(KEYS.habits, this.habits);
      this.render();
      return true;
    },

    removeHabit: function (id) {
      this.habits = this.habits.filter(function (h) { return h.id !== id; });
      save(KEYS.habits, this.habits);
      this.render();
    },

    toggle: function (id) {
      var day = state.currentDate;
      var arr = this.records[day] || [];
      var idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
      this.records[day] = arr;
      save(KEYS.habitRecords, this.records);
      this.render();
    },

    render: function () {
      var grid = $('habitGrid');
      grid.innerHTML = '';
      var self = this;
      var editable = isToday();

      if (this.habits.length === 0) {
        grid.innerHTML = '<div class="todo-empty" style="grid-column:1/-1;">还没有习惯，添加一个吧～</div>';
        $('habitCount').textContent = '0/0';
        return;
      }

      var done = this.getDayDone(state.currentDate);

      this.habits.forEach(function (h) {
        var isDone = done.indexOf(h.id) >= 0;
        var btn = document.createElement('button');
        btn.className = 'habit-btn' + (isDone ? ' habit-done' : '');
        btn.dataset.habit = h.id;
        btn.innerHTML =
          '<span class="habit-emoji">' + escapeHtml(h.emoji || DEFAULT_HABIT_EMOJI) + '</span>' +
          '<span>' + escapeHtml(h.name) + '</span>' +
          (editable ? '<span class="habit-delete" title="删除">×</span>' : '');
        grid.appendChild(btn);
      });

      $('habitCount').textContent = done.length + '/' + this.habits.length;
    },

    // 历史视图专用：渲染到 #habitGridSnap（只读）
    renderSnapshot: function () {
      var grid = $('habitGridSnap');
      if (!grid) return;
      grid.innerHTML = '';
      var self = this;

      if (this.habits.length === 0) {
        grid.innerHTML = '<div class="habit-empty-hint">这天没有打卡哦～</div>';
        $('habitCountSnap').textContent = '';
        return;
      }

      var done = this.getDayDone(state.currentDate);

      // 历史模式下：这天没打卡就只显示提示，不再列出习惯按钮
      if (done.length === 0) {
        grid.innerHTML = '<div class="habit-empty-hint">这天没有打卡哦～</div>';
        $('habitCountSnap').textContent = '';
        return;
      }

      this.habits.forEach(function (h) {
        var isDone = done.indexOf(h.id) >= 0;
        var btn = document.createElement('button');
        btn.className = 'habit-btn' + (isDone ? ' habit-done' : '');
        btn.innerHTML =
          '<span class="habit-emoji">' + escapeHtml(h.emoji || DEFAULT_HABIT_EMOJI) + '</span>' +
          '<span>' + escapeHtml(h.name) + '</span>';
        grid.appendChild(btn);
      });
      $('habitCountSnap').textContent = done.length + '/' + this.habits.length;
    }
  };

  /* ===== Mood 模块（按日期存） ===== */
  var MoodModule = {
    moods: [
      { id: 'happy', label: '开心', emoji: '😊' },
      { id: 'calm', label: '平静', emoji: '😌' },
      { id: 'tired', label: '疲惫', emoji: '😴' },
      { id: 'sad', label: '难过', emoji: '🥺' },
      { id: 'excited', label: '兴奋', emoji: '🥰' },
      { id: 'angry', label: '生气', emoji: '😡' },
      { id: 'anxious', label: '焦虑', emoji: '😰' },
      { id: 'cool', label: '酷', emoji: '😎' },
      { id: 'party', label: '庆祝', emoji: '🎉' },
      { id: 'think', label: '纠结', emoji: '🤔' }
    ],
    current: null,
    note: '',

    loadDay: function (dateStr) {
      var data = load(KEYS.mood, {});
      var day = data[dateStr] || { mood: null, note: '' };
      this.current = day.mood;
      this.note = day.note || '';
    },

    init: function () {
      this.loadDay(state.currentDate);
      this.bind();
      this.render();
    },

    bind: function () {
      var self = this;

      $('moodOptions').addEventListener('click', function (e) {
        if (!isToday()) return;
        var btn = e.target.closest('.mood-btn');
        if (!btn) return;
        var mood = btn.dataset.mood;
        self.current = (self.current === mood) ? null : mood;
        self.persist();
        self.render();
      });

      var timer;
      $('moodNote').addEventListener('input', function (e) {
        if (!isToday()) return;
        self.note = e.target.value;
        clearTimeout(timer);
        timer = setTimeout(function () { self.persist(); }, 400);
      });
    },

    persist: function () {
      var all = load(KEYS.mood, {});
      all[state.currentDate] = { mood: this.current, note: this.note };
      save(KEYS.mood, all);
    },

    render: function () {
      var options = $('moodOptions');
      var self = this;

      if (options.children.length === 0) {
        this.moods.forEach(function (m) {
          var btn = document.createElement('button');
          btn.className = 'mood-btn';
          btn.dataset.mood = m.id;
          btn.title = m.label;
          btn.innerHTML = '<span class="mood-emoji">' + m.emoji + '</span>';
          options.appendChild(btn);
        });
      }

      $all('.mood-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.mood === self.current);
      });

      $('moodNote').value = this.note;
      $('moodNote').readOnly = !isToday();
    },

    // 历史视图专用：渲染到 #moodOptionsSnap（只读）
    renderSnapshot: function () {
      var options = $('moodOptionsSnap');
      if (!options) return;
      var self = this;

      if (options.children.length === 0) {
        this.moods.forEach(function (m) {
          var btn = document.createElement('button');
          btn.className = 'mood-btn';
          btn.dataset.mood = m.id;
          btn.title = m.label;
          btn.innerHTML = '<span class="mood-emoji">' + m.emoji + '</span>';
          options.appendChild(btn);
        });
      }

      var content = $('moodContentSnap');
      var empty = $('moodEmptySnap');
      var options = $('moodOptionsSnap');
      var note = $('moodNoteSnap');

      // 历史模式下：没记录心情就统一显示空态提示
      if (!this.current && !this.note) {
        if (content) content.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
      }

      if (content) content.style.display = 'block';
      if (empty) empty.style.display = 'none';

      if (options) {
        if (options.children.length === 0) {
          this.moods.forEach(function (m) {
            var btn = document.createElement('button');
            btn.className = 'mood-btn';
            btn.dataset.mood = m.id;
            btn.title = m.label;
            btn.innerHTML = '<span class="mood-emoji">' + m.emoji + '</span>';
            options.appendChild(btn);
          });
        }
        $all('#moodOptionsSnap .mood-btn').forEach(function (btn) {
          btn.classList.toggle('active', btn.dataset.mood === self.current);
        });
      }

      if (note) {
        note.value = this.note || '';
        note.readOnly = true;
        note.disabled = true;
        note.classList.add('readonly');
      }
    }
  };

  /* ===== 日历组件 ===== */
  var Calendar = {
    viewYear: 0,
    viewMonth: 0,
    expanded: true,

    init: function () {
      var parts = state.currentDate.split('-');
      this.viewYear = parseInt(parts[0], 10);
      this.viewMonth = parseInt(parts[1], 10) - 1;
      this.expanded = true;
      this.bind();
      this.render();
    },

    bind: function () {
      var self = this;
      $('prevMonth').addEventListener('click', function () {
        self.viewMonth--;
        if (self.viewMonth < 0) { self.viewMonth = 11; self.viewYear--; }
        self.render();
      });
      $('nextMonth').addEventListener('click', function () {
        self.viewMonth++;
        if (self.viewMonth > 11) { self.viewMonth = 0; self.viewYear++; }
        self.render();
      });

      // 折叠 / 展开日历
      var header = $('calendarHeader');
      var toggle = $('calendarToggle');
      var onToggle = function () { self.toggle(); };
      header.addEventListener('click', onToggle);
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        self.toggle();
      });
    },

    toggle: function () {
      this.expanded = !this.expanded;
      var card = $('calendarCard');
      var toggle = $('calendarToggle');
      if (this.expanded) {
        card.classList.remove('is-collapsed');
        toggle.textContent = '收起 ▲';
      } else {
        card.classList.add('is-collapsed');
        toggle.textContent = '展开 ▼';
      }
    },

    expand: function () {
      this.expanded = true;
      var card = $('calendarCard');
      var toggle = $('calendarToggle');
      card.classList.remove('is-collapsed');
      if (toggle) toggle.textContent = '收起 ▲';
    },

    collapse: function () {
      this.expanded = false;
      var card = $('calendarCard');
      var toggle = $('calendarToggle');
      card.classList.add('is-collapsed');
      if (toggle) toggle.textContent = '展开 ▼';
    },

    render: function () {
      $('monthLabel').textContent = this.viewYear + '年' + (this.viewMonth + 1) + '月';
      var grid = $('calendarGrid');
      grid.innerHTML = '';

      var headers = ['一', '二', '三', '四', '五', '六', '日'];
      headers.forEach(function (h) {
        var div = document.createElement('div');
        div.className = 'cal-head';
        div.textContent = h;
        grid.appendChild(div);
      });

      // 周一开头：getDay() 中 0=周日→7
      var firstDayCol = new Date(this.viewYear, this.viewMonth, 1).getDay() || 7;
      for (var i = 1; i < firstDayCol; i++) {
        grid.appendChild(document.createElement('div'));
      }

      var lastDate = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
      var todayD = todayStr();

      for (var d = 1; d <= lastDate; d++) {
        var dateStr = this.viewYear + '-' +
          String(this.viewMonth + 1).padStart(2, '0') + '-' +
          String(d).padStart(2, '0');

        var btn = document.createElement('button');
        btn.className = 'cal-day';
        btn.textContent = d;
        btn.dataset.date = dateStr;
        if (dateStr === todayD) {
          btn.classList.add('is-today');
          btn.classList.add('is-disabled');
          btn.title = '今天（在历史里不可选）';
          grid.appendChild(btn);
          continue;
        }
        if (dateStr === state.currentDate) btn.classList.add('is-active');
        if (dateStr > todayD) {
          btn.classList.add('is-future');
          btn.title = '还没到这天';
        }

        (function (ds) {
          btn.addEventListener('click', function () {
            if (ds >= todayD) return; // 今天及未来不允许
            ViewController.setDate(ds);
          });
        })(dateStr);

        grid.appendChild(btn);
      }
    }
  };

  /* ===== 视图控制器（切换 today / history 模式） ===== */
  var ViewController = {
    enterHistory: function () {
      state.mode = 'history';
      // 历史视图默认看昨天，不能看今天
      state.currentDate = yesterdayStr();
      $('historyView').style.display = 'block';
      $('mainView').style.display = 'none';
      Calendar.init();
      Calendar.expand();
      this.refreshSnapshot();
    },

    backToToday: function () {
      state.mode = 'today';
      state.currentDate = todayStr();
      $('historyView').style.display = 'none';
      $('mainView').style.display = 'block';
      TodoModule.init();
      HabitModule.init();
      MoodModule.init();
    },

    setDate: function (dateStr) {
      if (dateStr === todayStr()) return; // 历史视图不能选今天
      state.currentDate = dateStr;
      $all('.cal-day').forEach(function (b) {
        b.classList.toggle('is-active', b.dataset.date === dateStr);
      });
      this.refreshSnapshot();
    },

    refreshSnapshot: function () {
      // 历史视图用独立的快照元素渲染
      TodoModule.renderSnapshot();
      HabitModule.renderSnapshot();
      MoodModule.loadDay(state.currentDate);
      MoodModule.renderSnapshot();

      $('viewingDate').textContent = dateLabel(state.currentDate);
    }
  };

  /* ===== 启动 ===== */
  function dedupMoodNote() {
    var notes = document.querySelectorAll('textarea#moodNote');
    if (notes.length > 1) {
      for (var i = 1; i < notes.length; i++) notes[i].remove();
    }
  }

  function init() {
    dedupMoodNote();
    renderDate();
    TodoModule.init();
    HabitModule.init();
    MoodModule.init();

    // 视图切换按钮
    $('openHistory').addEventListener('click', function () {
      ViewController.enterHistory();
    });
    $('backToToday').addEventListener('click', function () {
      ViewController.backToToday();
    });
  }

  function renderDate() {
    var today = new Date();
    var days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var month = today.getMonth() + 1;
    var date = today.getDate();
    var day = days[today.getDay()];
    $('todayDate').textContent = month + '月' + date + '日 · ' + day;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
