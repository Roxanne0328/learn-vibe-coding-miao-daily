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

  /* ===== 云端同步（v1.1.2：直连 REST，不走 SDK） ===== */
  var SYNC_KEYS = [KEYS.todos, KEYS.habits, KEYS.habitRecords, KEYS.mood];
  var syncTimer = null;

  function apiBase() { return (window.SUPABASE_CONFIG || {}).url || ''; }
  function anonKey() { return (window.SUPABASE_CONFIG || {}).anonKey || ''; }

  function authHeaders(extra) {
    var s = readSession();
    var h = {
      'apikey': anonKey(),
      'Authorization': 'Bearer ' + ((s && s.access_token) || anonKey()),
      'Content-Type': 'application/json'
    };
    if (extra) { Object.keys(extra).forEach(function (k) { h[k] = extra[k]; }); }
    return h;
  }

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
    var uid = window.__miaoUserId;
    if (!apiBase() || !uid) return;
    try {
      var r = await fetch(apiBase() + '/rest/v1/user_data', {
        method: 'POST',
        headers: authHeaders({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify([{ user_id: uid, payload: buildPayload(), updated_at: new Date().toISOString() }])
      });
      if (!r.ok) console.warn('☁️ 云端同步失败：HTTP ' + r.status);
    } catch (e) { console.warn('☁️ 云端同步失败：', e && e.message); }
  }

  async function pullCloud(uid) {
    if (!apiBase() || !uid) return null;
    try {
      var r = await fetch(apiBase() + '/rest/v1/user_data?select=payload&user_id=eq.' + encodeURIComponent(uid) + '&limit=1', {
        headers: authHeaders()
      });
      if (!r.ok) { console.warn('☁️ 云端拉取失败：HTTP ' + r.status); return null; }
      var arr = await r.json();
      var data = arr && arr[0];
      if (data && data.payload && typeof data.payload === 'object') {
        Object.keys(data.payload).forEach(function (k) {
          if (data.payload[k] != null) {
            try { localStorage.setItem(k, JSON.stringify(data.payload[k])); } catch (e) {}
          }
        });
        return data.payload;
      }
      return null;
    } catch (e) { console.warn('☁️ 云端拉取失败：', e && e.message); return null; }
  }

  async function startApp(uid) {
    window.__miaoUserId = uid;
    // 先揭开遮罩、先把界面跑起来，云端同步放后台慢慢来（最多等 6 秒，卡也不影响使用）
    hideGate();
    init();
    var hadLocal = SYNC_KEYS.some(function (k) { return !!localStorage.getItem(k); });
    var cloud = await Promise.race([
      pullCloud(uid),
      new Promise(function (r) { setTimeout(function () { r(null); }, 6000); })
    ]);
    if (!cloud && hadLocal) {
      // 云端为空但本地有旧数据（v1.0 时代）→ 自动上传到云端
      await pushCloud();
      showToast('☁️ 已把本地旧数据同步到云端～');
    }
  }

  function hideGate() {
    var g = document.getElementById('authGate');
    if (g) g.style.display = 'none';
  }

  /* ===== 自有会话存储（v1.1.2：登录判断完全不依赖 SDK） ===== */
  var SESSION_KEY = 'miao_daily_session';

  // 项目 ID：优先从 anonKey（JWT）里解出来，最可靠；地址里是代理域名时正则取不到
  function getProjectRef() {
    var cfg = window.SUPABASE_CONFIG || {};
    try {
      var seg = (cfg.anonKey || '').split('.')[1] || '';
      if (seg) {
        var b = seg.replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        var payload = JSON.parse(atob(b));
        if (payload && payload.ref) return payload.ref;
        var mi = ((payload && payload.iss) || '').match(/https:\/\/([^.]+)\.supabase\.co/);
        if (mi && mi[1]) return mi[1];
      }
    } catch (e) {}
    var m = (cfg.url || '').match(/https:\/\/([^.]+)\.supabase\.co/);
    return m ? m[1] : '';
  }

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function writeSession(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
    // 同时按 SDK 的存储格式写一份（key: sb-<ref>-auth-token），
    // 这样 SDK 一切正常时也能直接读到会话
    var ref = getProjectRef();
    if (ref) {
      try { localStorage.setItem('sb-' + ref + '-auth-token', JSON.stringify(session)); } catch (e) {}
    }
  }

  function decodeJwtPayload(token) {
    try {
      var seg = (token || '').split('.')[1] || '';
      if (!seg) return null;
      var b = seg.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      return JSON.parse(atob(b));
    } catch (e) { return null; }
  }

  // 自己用凭证完成登录。
  // v1.1.2：access_token 本身就是 JWT，里面直接写着用户 ID（sub）和邮箱，
  // 所以**直接在本地拆开读**，一个网络请求都不发，彻底不受代理压缩/网络影响。
  function manualLogin(tokens, cb) {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!tokens.access_token) { cb(null, 'URL 里没拿到 access_token'); return; }

    var p = decodeJwtPayload(tokens.access_token);
    if (!p || !p.sub) { cb(null, '凭证格式不对，拆不出用户 ID'); return; }
    if (p.exp && p.exp * 1000 < Date.now()) { cb(null, '登录链接已过期，请回登录页重发一次'); return; }

    var now = Math.floor(Date.now() / 1000);
    var exp = tokens.expires_in || (p.exp ? Math.max(p.exp - now, 0) : 3600) || 3600;
    writeSession({
      provider_token: null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      token_type: tokens.token_type || 'bearer',
      expires_in: exp,
      expires_at: p.exp || (now + exp),
      user: {
        id: p.sub,
        email: p.email || '',
        aud: p.aud || '',
        role: p.role || 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: {}
      }
    });
    cb(p.sub, null);
  }

  function boot() {
    var c = window.supabaseClient;
    if (!c) { hideGate(); init(); return; } // 没接 Supabase 时退回纯本地模式

    var u = window.location;
    // 兜底用：SDK 在手机上初始化可能卡住，凭证我们自己解析、自己登录，不依赖 SDK
    var manual = null;
    try {
      var hh = (u.hash || '').replace(/^#/, '');
      // 有些邮箱 App / 中间页会把 # 后的凭证改写成 ? 后的查询参数，两种都认
      var qs = (u.search || '').replace(/^\?/, '');
      var src = /access_token=/.test(hh) ? hh : (/access_token=/.test(qs) ? qs : '');
      if (src) {
        var p = new URLSearchParams(src);
        var at = p.get('access_token');
        if (at) manual = {
          access_token: at,
          refresh_token: p.get('refresh_token') || '',
          expires_in: parseInt(p.get('expires_in') || '3600', 10) || 3600
        };
      }
    } catch (e) {}
    // 判断当前是不是「刚从魔法链接跳回来」：URL 里带登录凭证
    var hasCallback = !!manual ||
                      /access_token=/.test(u.hash) ||
                      /access_token=/.test(u.search) ||
                      /[?&]code=/.test(u.search) ||
                      /error_description=/.test(u.hash);

    var forwarded = false;
    function goLogin() {
      if (forwarded) return;
      forwarded = true;
      window.location.href = 'login.html';
    }
    function fail(msg) {
      // 带凭证时绝不自动跳走（跳走就永远登不进去了），显示原因 + 「去登录页」按钮
      var t = document.getElementById('gateText');
      if (t) t.textContent = msg;
      var fb = document.getElementById('gateFallback');
      if (fb) fb.style.display = 'inline-block';
      forwarded = true;
    }

    // 1) URL 里有凭证 → 完全绕开 SDK 自己完成登录
    //   （SDK 的 setSession 会等 initializePromise，手机上初始化卡住时永远不返回）
    if (manual) {
      manualLogin(manual, function (userId, err) {
        if (userId) done(userId);
        else fail('登录没完成：' + (err || '未知原因') + '。请回登录页重发一次链接～');
      });
      return;
    }

    // 2) 没有凭证 → 先看我们自己存的会话（完全不依赖 SDK，SDK 卡死也不影响）
    var own = readSession();
    if (own && own.user && own.user.id) { done(own.user.id); return; }

    // 3) 邮件链接带错误信息回来（比如链接过期/被点过一次）→ 直接显示原因
    if (/error_description=|error=/.test(u.hash) || /error_description=|error_code=/.test(u.search)) {
      var ep = new URLSearchParams((u.hash + u.search).replace(/^[#?]/, ''));
      fail('登录链接有问题：' + decodeURIComponent((ep.get('error_description') || ep.get('error') || ep.get('error_code') || '未知').replace(/\+/g, ' ')));
      return;
    }

    // 4) 网址后面带了东西、但我们没认出凭证 → 不跳走，把「网址实况」写在屏幕上供排查
    if (u.hash.length > 1 || u.search.length > 1) {
      var diag = '路径=' + u.pathname +
                 ' | ? 后面=' + (u.search ? u.search.slice(0, 70) : '空') +
                 ' | # 后面长度=' + u.hash.length +
                 ' | # 开头=' + (u.hash ? u.hash.slice(0, 24) : '空');
      fail('网址里有东西但没认出登录凭证（请把这行截图给我）：' + diag);
      return;
    }

    // 5) 干净地直接访问首页且没有会话 → 最后才问 SDK，8 秒拿不到就回登录页
    var guard = setTimeout(goLogin, 8000);
    // 2.5 秒还没结果就别让用户干等：亮出提示
    setTimeout(function () {
      if (forwarded) return;
      var t = document.getElementById('gateText');
      if (t) t.textContent = '还没检测到登录状态…请回登录页用验证码登录～';
    }, 2500);

    function done(uid) {
      if (forwarded) return;
      forwarded = true;
      clearTimeout(guard);
      // 清掉 URL 里的凭证，避免刷新时重复处理
      try { window.history.replaceState(null, '', u.pathname); } catch (e) {}
      startApp(uid);
    }

    try {
      c.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        if (session && session.user) {
          writeSession(session);
          done(session.user.id);
          return;
        }
        goLogin();
      }).catch(function () { goLogin(); });
    } catch (e) {
      goLogin();
    }
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
        } else if (e.target.classList.contains('todo-text')) {
          if (!isToday()) return;
          self.edit(id, item);
        }
        // 勾选框的切换走下面的 change 事件
      });

      $('todoList').addEventListener('change', function (e) {
        if (e.target.type !== 'checkbox') return;
        var item = e.target.closest('.todo-item');
        if (!item) return;
        if (!isToday()) return;
        self.toggle(parseInt(item.dataset.id, 10));
      });

      // 待办字数上限提示
      var todoInputEl = $('todoInput');
      if (todoInputEl) {
        todoInputEl.addEventListener('input', function () {
          if (this.value.length >= 50) showToast('待办最多 50 字哦～');
        });
      }
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

    edit: function (id, li) {
      var self = this;
      var list = this.allTodos[state.currentDate];
      if (!list) return;
      var t = list.find(function (x) { return x.id === id; });
      if (!t) return;
      var textSpan = li.querySelector('.todo-text');
      if (!textSpan) return;
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'todo-edit-input';
      input.value = t.text;
      input.maxLength = 50;
      textSpan.replaceWith(input);
      input.focus();
      input.select();
      var finished = false;
      function finish(saveIt) {
        if (finished) return;
        finished = true;
        var v = input.value.trim();
        if (saveIt && v && v !== t.text) {
          t.text = v;
          save(KEYS.todos, self.allTodos);
          self.render();
        } else {
          self.render();
        }
      }
      input.addEventListener('input', function () {
        if (input.value.length >= 50) showToast('待办最多 50 字哦～');
      });
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
      });
      input.addEventListener('blur', function () { finish(true); });
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
      // 未完成的待办置顶，已完成的排到后面
      var list = this.getCurrentList().slice().sort(function (a, b) {
        return a.completed === b.completed ? 0 : (a.completed ? 1 : -1);
      });
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
            '<span class="todo-text' + (todo.completed ? ' done' : '') + '">' +
              escapeHtml(todo.text) +
            '</span>' +
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

      var habitInputEl = $('habitInput');
      if (habitInputEl) {
        habitInputEl.addEventListener('input', function () {
          if (this.value.length >= 12) showToast('习惯名最多 12 字哦～');
        });
      }
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
      var self = this;
      grid.innerHTML = '';

      if (this.habits.length === 0) {
        grid.innerHTML = '<div class="habit-empty-hint">还没有习惯哦～</div>';
        $('habitCountSnap').textContent = '';
        return;
      }

      var done = this.getDayDone(state.currentDate);

      // 历史视图：显示完整习惯列表，已打卡高亮、未打卡灰显
      this.habits.forEach(function (h) {
        var isDone = done.indexOf(h.id) >= 0;
        var btn = document.createElement('button');
        btn.className = 'habit-btn' + (isDone ? ' habit-done' : ' habit-muted');
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
        if (this.value.length >= 200) showToast('心情最多 200 字哦～');
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

    // 退出登录按钮（带确认弹窗）
    var logoutBtn = $('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        if (!window.confirm('确定要退出登录吗？本地数据仍会保留，下次用同一邮箱登录即可恢复～')) return;
        // 先清掉本地会话，立刻跳走，不 await SDK 的 signOut（它在某些环境会卡住永不返回）
        try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
        var ref = getProjectRef();
        if (ref) { try { localStorage.removeItem('sb-' + ref + '-auth-token'); } catch (e) {} }
        try { window.supabaseClient && window.supabaseClient.auth.signOut(); } catch (e) {}
        window.location.replace('login.html');
      });
    }

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
