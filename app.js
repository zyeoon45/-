// =============================================
// app.js — 땡땡이닷컴 메인 로직
// Firebase Realtime Database + 실시간 멀티플레이
// =============================================

// ── 병맛 지문 목록 ──────────────────────────────
const PROMPTS = [
  "오늘 교수님 수업은 정말 흥미롭다고 생각하면서 타이핑하는 척을 하는 학생은 전 세계 어디에도 없다. 그냥 솔직하게 살자. 키보드 소리만이라도 열심히 내보자. 탁탁탁탁.",
  "지금 이 순간 전국 어딘가에서 나와 똑같이 수업을 듣는 척하며 딴짓을 하고 있는 사람이 분명히 있다. 우리는 결코 혼자가 아니다. 연대하라. 탁탁.",
  "교수님은 지금 열심히 강의하고 계신다. 나는 지금 열심히 타자를 치고 있다. 둘 다 나름 최선을 다하고 있는 것이다. 이것이 바로 공존이다. 탁탁탁.",
  "시험에 나올 것 같지 않은 내용을 45분째 설명하고 계신 교수님께 경의를 표한다. 그 열정의 반만 있어도 나는 이미 졸업을 했을 것이다. 탁탁탁탁탁.",
  "수업 중에 타자를 치면 필기하는 것처럼 보인다는 사실을 발견한 사람은 노벨 평화상을 받아야 한다. 덕분에 오늘도 평화롭게 살아가고 있다. 탁탁.",
  "저는 열심히 수업을 듣고 있습니다. 이 화면에 보이는 것은 필기 프로그램입니다. 의심하지 마세요. 절대로. 지금 당장 화면 보지 마세요 제발.",
  "강의실 에어컨이 너무 춥다. 근데 졸리기도 하다. 이 두 감각이 동시에 오는 것이 인간의 위대한 모순이다. 철학적으로 깊이 고민하는 중이다. 타자도 친다.",
  "출석은 했다. 자리도 앉았다. 노트북도 켰다. 이 정도면 충분히 열심히 한 것 아닌가. 나머지는 내일의 내가 알아서 할 것이다. 파이팅 내일의 나.",
];

// ── Firebase 초기화 ─────────────────────────────
// firebase-config.js 에서 firebaseConfig 를 먼저 로드한 뒤 app.js 실행됨
let db = null;
let mySessionId = null;
let myRoomRef = null;
let rankUnsubscribe = null;
let onlineCountUnsubscribe = null;

function initFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    mySessionId = "user_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();
    console.log("[Firebase] 연결 성공 ✅", mySessionId);
    listenOnlineCount();
  } catch (e) {
    console.warn("[Firebase] 연결 실패 — 오프라인 데모 모드로 실행", e.message);
    db = null;
    setLiveCount(Math.floor(2800 + Math.random() * 200));
  }
}

// ── 온라인 인원 카운트 ───────────────────────────
function listenOnlineCount() {
  if (!db) return;
  const countRef = db.ref("online_count");
  // 내 presence 등록
  const myPresence = db.ref("presence/" + mySessionId);
  myPresence.set({ at: Date.now() });
  myPresence.onDisconnect().remove();

  // 전체 presence 카운트 감시
  db.ref("presence").on("value", snap => {
    const count = snap.numChildren();
    setLiveCount(count);
  });
}

function setLiveCount(n) {
  document.getElementById("liveCountText").textContent =
    `현재 ${n.toLocaleString()}명 땡땡이 중`;
}

// ── 닉네임 / 프리뷰 ────────────────────────────
let myTag = "";
let myName = "";
let currentPrompt = "";
let currentPromptIdx = 0;

function pickPrompt() {
  currentPromptIdx = Math.floor(Math.random() * PROMPTS.length);
  currentPrompt = PROMPTS[currentPromptIdx];
  document.getElementById("promptPreview").textContent = currentPrompt;
  document.getElementById("promptIndex").textContent = currentPromptIdx + 1;
}

document.getElementById("classSelect").addEventListener("change", updatePreview);
document.getElementById("nicknameInput").addEventListener("input", updatePreview);

function updatePreview() {
  const cls  = document.getElementById("classSelect").value || "수업선택";
  const nick = document.getElementById("nicknameInput").value.trim() || "땡땡이";
  myTag  = `[${cls}] ${nick}`;
  myName = nick;
  document.getElementById("previewTag").textContent = myTag;
}

// ── 로비 탭 ────────────────────────────────────
function switchLobbyTab(idx) {
  document.querySelectorAll(".tab").forEach((t, i) =>
    t.classList.toggle("active", i === idx)
  );
  document.getElementById("lobbyTab0").style.display = idx === 0 ? "" : "none";
  document.getElementById("lobbyTab1").style.display = idx === 1 ? "" : "none";
  if (idx === 1) loadRegionMap();
}

// ── 땡땡이 지도 (지역별 접속자) ─────────────────
async function loadRegionMap() {
  const container = document.getElementById("regionList");
  container.innerHTML = "";

  let regions = {};

  if (db) {
    // Firebase 에서 지역 데이터 읽기
    const snap = await db.ref("regions").once("value");
    regions = snap.val() || {};
  } else {
    // 오프라인 데모 데이터
    regions = {
      "서울 관악구": 142, "서울 강남구": 98, "부산 금정구": 67,
      "대전 유성구": 54, "인천 연수구": 43, "대구 북구": 38,
      "광주 북구": 31, "수원 팔달구": 28,
    };
  }

  // 내 위치 등록 (ipapi 로 무료 IP 기반 위치)
  try {
    if (db) {
      const res = await fetch("https://ipapi.co/json/");
      const geo = await res.json();
      const region = (geo.city || "알 수 없음") + " " + (geo.region || "");
      await db.ref("regions/" + encodeRegionKey(region)).transaction(v => (v || 0) + 1);
      // 탭 열 때마다 중복 카운트 방지용 — 실제 프로젝트에선 presence 로 관리
    }
  } catch {}

  // 정렬 후 렌더링
  const sorted = Object.entries(regions).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  if (sorted.length === 0) {
    container.innerHTML = '<div class="map-loading">아직 데이터가 없어요. 첫 번째가 되세요!</div>';
    return;
  }

  sorted.slice(0, 10).forEach(([name, cnt], i) => {
    const pct = Math.round((cnt / max) * 100);
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
    const div = document.createElement("div");
    div.className = "region-item";
    div.innerHTML = `
      <span style="width:20px;font-size:12px">${medal}</span>
      <span class="region-name">${decodeRegionKey(name)}</span>
      <div class="region-bar-wrap">
        <div class="region-bar" style="width:${pct}%"></div>
      </div>
      <span class="region-count">${cnt}명</span>
    `;
    container.appendChild(div);
  });
}

function encodeRegionKey(s) { return s.replace(/[.#$/[\]]/g, "_"); }
function decodeRegionKey(s) { return s.replace(/_/g, " "); }

// ── 데일리 랭킹 로드 ─────────────────────────────
async function loadLobbyRank() {
  const list = document.getElementById("lobbyRankList");

  if (!db) {
    list.innerHTML = '<div class="rank-empty">Firebase 연결 후 실시간 랭킹이 표시됩니다.</div>';
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const snap = await db.ref("daily/" + today).orderByChild("wpm").limitToLast(10).once("value");
  const rows = [];
  snap.forEach(c => rows.unshift(c.val()));

  if (rows.length === 0) {
    list.innerHTML = '<div class="rank-empty">오늘 기록이 없어요. 첫 배틀러가 되세요!</div>';
    return;
  }

  renderRankItems(list, rows.map((r, i) => ({
    name: r.tag || "익명",
    wpm: r.wpm,
    isMe: false,
  })));
}

// ── 배틀 시작 ───────────────────────────────────
let charIndex = 0, errors = 0, totalTyped = 0;
let myWpm = 0, myAcc = 100, myCombo = 0;
let timerSec = 90;
let timerInterval = null;
let battleStartTime = null;
let battleRoomId = null;

function startBattle() {
  const nick = document.getElementById("nicknameInput").value.trim();
  const cls  = document.getElementById("classSelect").value;

  if (!nick || !cls) {
    showToast("닉네임과 수업을 선택하세요!");
    document.getElementById("nicknameInput").style.borderColor = "#ff4455";
    setTimeout(() => { document.getElementById("nicknameInput").style.borderColor = ""; }, 1000);
    return;
  }

  pickPrompt(); // 랜덤 지문 새로 선택

  // 초기화
  charIndex = 0; errors = 0; totalTyped = 0;
  myWpm = 0; myAcc = 100; myCombo = 0;
  timerSec = 90;
  battleStartTime = null;

  document.getElementById("battleMyTag").textContent = myTag;
  buildPromptDisplay();
  setPhase("battle");

  document.getElementById("typeInput").value = "";
  document.getElementById("typeInput").focus();

  // 타이머 시작
  updateTimerDisplay();
  timerInterval = setInterval(tickTimer, 1000);

  // Firebase 배틀방 입장
  joinBattleRoom();
}

function joinBattleRoom() {
  if (!db) return;

  // 현재 시간 기준 30초 단위 룸 ID (같은 시간대 사람끼리 자동 매칭)
  const slot = Math.floor(Date.now() / 30000);
  battleRoomId = "room_" + slot;

  myRoomRef = db.ref("rooms/" + battleRoomId + "/players/" + mySessionId);
  myRoomRef.set({ tag: myTag, wpm: 0, acc: 100, progress: 0, at: Date.now() });
  myRoomRef.onDisconnect().remove();

  // 상대방 순위 실시간 구독
  rankUnsubscribe = db.ref("rooms/" + battleRoomId + "/players")
    .on("value", snap => {
      const players = [];
      snap.forEach(c => players.push({ id: c.key, ...c.val() }));
      renderBattleRank(players);
    });
}

function updateMyRoomData() {
  if (!myRoomRef) return;
  myRoomRef.update({
    wpm: myWpm,
    acc: myAcc,
    progress: Math.round((charIndex / currentPrompt.length) * 100),
  });
}

// ── 타이머 ──────────────────────────────────────
function tickTimer() {
  timerSec--;
  updateTimerDisplay();
  if (timerSec <= 10) {
    document.getElementById("timerDisplay").classList.add("danger");
  }
  if (timerSec <= 0) endBattle();
}

function updateTimerDisplay() {
  const m = String(Math.floor(timerSec / 60)).padStart(2, "0");
  const s = String(timerSec % 60).padStart(2, "0");
  document.getElementById("timerDisplay").textContent = m + ":" + s;
}

// ── 지문 렌더링 ──────────────────────────────────
function buildPromptDisplay() {
  const el = document.getElementById("promptDisplay");
  el.innerHTML = "";
  [...currentPrompt].forEach((c, i) => {
    const span = document.createElement("span");
    span.className = "ch " + (i === 0 ? "cursor" : "pending");
    span.id = "ch" + i;
    span.textContent = c === " " ? "\u00a0" : c;
    el.appendChild(span);
  });
}

// ── 타이핑 이벤트 ────────────────────────────────
document.getElementById("typeInput").addEventListener("input", function () {
  if (!battleStartTime) {
    battleStartTime = Date.now();
  }

  const val = this.value;
  const last = val[val.length - 1];
  if (!last) return;
  this.value = "";

  const expected = currentPrompt[charIndex];
  totalTyped++;

  if (last === expected) {
    document.getElementById("ch" + charIndex).className = "ch correct";
    charIndex++;
    myCombo++;
    if (charIndex < currentPrompt.length) {
      document.getElementById("ch" + charIndex).className = "ch cursor";
    }
  } else {
    document.getElementById("ch" + charIndex).className = "ch wrong";
    errors++;
    myCombo = 0;
  }

  const elapsed = (Date.now() - battleStartTime) / 60000;
  myWpm = elapsed > 0 ? Math.round((charIndex / 5) / elapsed) : 0;
  myAcc = totalTyped > 0 ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 100;

  document.getElementById("statWpm").textContent   = myWpm;
  document.getElementById("statAcc").textContent   = myAcc;
  document.getElementById("statCombo").textContent = myCombo;

  const pct = Math.round((charIndex / currentPrompt.length) * 100);
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressLabel").textContent = pct + "%";

  // Firebase 업데이트 (throttle: 매 5타마다)
  if (totalTyped % 5 === 0) updateMyRoomData();

  if (charIndex >= currentPrompt.length) endBattle();
});

// ── 배틀 종료 ────────────────────────────────────
async function endBattle() {
  clearInterval(timerInterval);
  updateMyRoomData();

  // Firebase 결과 저장
  if (db) {
    const today = new Date().toISOString().slice(0, 10);
    await db.ref("daily/" + today).push({
      tag: myTag,
      wpm: myWpm,
      acc: myAcc,
      promptIdx: currentPromptIdx,
      at: Date.now(),
    });

    // 랭킹 구독 해제
    if (battleRoomId) {
      db.ref("rooms/" + battleRoomId + "/players").off("value", rankUnsubscribe);
    }
    if (myRoomRef) myRoomRef.remove();
  }

  // 결과 화면
  buildResultScreen();
  setPhase("result");
}

// ── 결과 화면 빌드 ───────────────────────────────
async function buildResultScreen() {
  document.getElementById("resWpm").textContent = myWpm;
  document.getElementById("resAcc").textContent = myAcc + "%";
  document.getElementById("resCombo").textContent = myCombo;
  document.getElementById("resPrompt").textContent = `지문 ${currentPromptIdx + 1}번`;

  // 순위 메시지
  const today = new Date().toISOString().slice(0, 10);
  let myRank = 1;
  let total = 1;

  if (db) {
    const snap = await db.ref("daily/" + today).orderByChild("wpm").once("value");
    const rows = [];
    snap.forEach(c => rows.push(c.val()));
    rows.sort((a, b) => b.wpm - a.wpm);
    total = rows.length;
    myRank = rows.findIndex(r => r.tag === myTag && r.wpm === myWpm) + 1 || 1;
    renderRankItems(
      document.getElementById("resultRankList"),
      rows.slice(0, 8).map(r => ({ name: r.tag, wpm: r.wpm, isMe: r.tag === myTag && r.wpm === myWpm }))
    );
  }

  const msgs = {
    1: `🏆 오늘 1등! 땡땡이 계의 신이 등장했다`,
    2: `🥈 2등! 아깝다... 조금만 더 빨랐으면`,
    3: `🥉 3등! 교수님보다 타자는 빠르다`,
  };
  const banner = msgs[myRank] || `${myRank}등 / 오늘 ${total}명 중 — 다음엔 꼭 1등`;
  document.getElementById("resultBanner").textContent = banner;

  // 공유 이미지 생성
  drawShareCard(myWpm, myAcc, myRank, total);
}

// ── 공유 카드 캔버스 ─────────────────────────────
function drawShareCard(wpm, acc, rank, total) {
  const canvas = document.getElementById("shareCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 600; canvas.height = 300;

  // 배경
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, 600, 300);

  // 픽셀 그리드 선
  ctx.strokeStyle = "rgba(80,60,180,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < 600; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 300); ctx.stroke(); }
  for (let y = 0; y < 300; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y); ctx.stroke(); }

  // 테두리
  ctx.strokeStyle = "#7755ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 594, 294);

  // 타이틀
  ctx.fillStyle = "#ff6fff";
  ctx.font = "bold 18px 'Press Start 2P', monospace";
  ctx.fillText("땡땡이닷컴", 30, 52);

  ctx.fillStyle = "#7060aa";
  ctx.font = "10px 'Share Tech Mono', monospace";
  ctx.fillText("CLASS ESCAPE TYPING BATTLE", 30, 76);

  // WPM
  ctx.fillStyle = "#ff6fff";
  ctx.font = "bold 56px 'Press Start 2P', monospace";
  ctx.fillText(wpm, 30, 170);
  ctx.fillStyle = "#5a4890";
  ctx.font = "12px 'Share Tech Mono', monospace";
  ctx.fillText("WPM", 30, 195);

  // 정확도
  ctx.fillStyle = "#44ffcc";
  ctx.font = "bold 28px 'Press Start 2P', monospace";
  ctx.fillText(acc + "%", 200, 160);
  ctx.fillStyle = "#5a4890";
  ctx.font = "12px 'Share Tech Mono', monospace";
  ctx.fillText("정확도", 200, 185);

  // 순위
  ctx.fillStyle = "#ffcc00";
  ctx.font = "bold 28px 'Press Start 2P', monospace";
  ctx.fillText(rank + "위", 340, 160);
  ctx.fillStyle = "#5a4890";
  ctx.font = "12px 'Share Tech Mono', monospace";
  ctx.fillText("오늘 순위 / " + total + "명", 340, 185);

  // 하단 메시지
  ctx.fillStyle = "#3a2870";
  ctx.fillRect(0, 240, 600, 60);
  ctx.fillStyle = "#c0b8ff";
  ctx.font = "11px 'Share Tech Mono', monospace";
  ctx.fillText("수업 중 몰래 즐기는 실시간 타자 배틀", 30, 266);
  ctx.fillStyle = "#7755ff";
  ctx.fillText("ddangtangi.netlify.app", 30, 288);
}

function shareTwitter() {
  const wpm = document.getElementById("resWpm").textContent;
  const text = encodeURIComponent(`수업 중에 ${wpm} WPM 찍었다 💀 나도 모르게 열심히 침\n\n땡땡이닷컴에서 타자 배틀하기 👉 ddangtangi.netlify.app\n#땡땡이닷컴 #수업중타자배틀`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
}

function copyShareLink() {
  navigator.clipboard.writeText("ddangtangi.netlify.app").then(() => {
    showToast("링크 복사 완료! 친구한테 보내세요 🎮");
  });
}

function downloadShareImage() {
  const canvas = document.getElementById("shareCanvas");
  const link = document.createElement("a");
  link.download = "ddangtangi_result.png";
  link.href = canvas.toDataURL();
  link.click();
}

// ── 배틀 실시간 순위 렌더 ───────────────────────
function renderBattleRank(players) {
  const sorted = [...players].sort((a, b) => b.wpm - a.wpm);
  const list   = document.getElementById("battleRankList");
  const myIdx  = sorted.findIndex(p => p.id === mySessionId);

  // 내 순위 스탯 업데이트
  document.getElementById("statRank").textContent = myIdx >= 0 ? (myIdx + 1) + "위" : "-";

  renderRankItems(list, sorted.map(p => ({
    name: p.tag || "익명",
    wpm:  p.wpm || 0,
    isMe: p.id === mySessionId,
  })));
}

// ── 공통 랭킹 렌더 ──────────────────────────────
function renderRankItems(container, items) {
  const max = Math.max(...items.map(i => i.wpm), 1);
  container.innerHTML = "";

  items.forEach((item, i) => {
    const numClass = ["gold", "silver", "bronze"][i] || "other";
    const pct = Math.round((item.wpm / max) * 100);
    const div = document.createElement("div");
    div.className = "rank-item" + (item.isMe ? " is-me" : "");
    div.innerHTML = `
      <span class="rank-num ${numClass}">${i + 1}</span>
      <span class="rank-name">${item.isMe ? "⭐ " : ""}${escHtml(item.name)}</span>
      <div class="rank-bar-wrap"><div class="rank-bar" style="width:${pct}%"></div></div>
      <span class="rank-wpm">${item.wpm}<br><span style="font-size:6px;opacity:.6">WPM</span></span>
    `;
    container.appendChild(div);
  });
}

// ── Phase 전환 ───────────────────────────────────
function setPhase(name) {
  document.querySelectorAll(".phase").forEach(el =>
    el.classList.toggle("active", el.id === "phase" + capitalize(name))
  );
}

// ── 뒤로가기 (결과 → 로비) ──────────────────────
function backToLobby() {
  setPhase("lobby");
  loadLobbyRank();
  pickPrompt();
}

// ── 유틸 ─────────────────────────────────────────
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function escHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ── 배경 별 ─────────────────────────────────────
function initStars() {
  const canvas = document.getElementById("starCanvas");
  const ctx = canvas.getContext("2d");
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.65,
      r: Math.random() < 0.2 ? 2 : 1,
      alpha: Math.random(),
      speed: 0.003 + Math.random() * 0.008,
      phase: Math.random() * Math.PI * 2,
    }));
  }
  window.addEventListener("resize", resize);
  resize();

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    stars.forEach(s => {
      s.alpha = 0.3 + 0.5 * Math.sin(frame * s.speed + s.phase);
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x, s.y, s.r, s.r);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── 도시 스카이라인 생성 ─────────────────────────
function initSkyline() {
  const sky = document.getElementById("skyline");
  const configs = [
    {w:55,h:75},{w:35,h:55},{w:80,h:105},{w:28,h:45},{w:68,h:92},
    {w:45,h:68},{w:92,h:115},{w:32,h:52},{w:60,h:82},{w:40,h:60},
    {w:72,h:98},{w:50,h:72},{w:85,h:108},{w:38,h:58},{w:62,h:84},
    {w:28,h:48},{w:70,h:94},{w:48,h:70},{w:78,h:102},{w:44,h:66},
    {w:90,h:112},{w:36,h:56},{w:58,h:80},{w:42,h:62},{w:76,h:100},
  ];
  configs.forEach(c => {
    const b = document.createElement("div");
    b.className = "building";
    b.style.width = c.w + "px";
    b.style.height = c.h + "px";
    // 랜덤 창문 불빛
    const numLights = Math.floor(Math.random() * 4);
    for (let i = 0; i < numLights; i++) {
      const light = document.createElement("div");
      light.className = "building-light";
      light.style.left = (6 + Math.random() * (c.w - 16)) + "px";
      light.style.top  = (8 + Math.random() * (c.h - 20)) + "px";
      light.style.animationDelay = (Math.random() * 4) + "s";
      light.style.animationDuration = (2 + Math.random() * 4) + "s";
      b.appendChild(light);
    }
    sky.appendChild(b);
  });
}

// ── 라이브 카운트 가짜 변동 (Firebase 없을 때) ──
function initFakeCount() {
  if (db) return;
  let base = Math.floor(2700 + Math.random() * 300);
  setInterval(() => {
    base += Math.floor(Math.random() * 15) - 6;
    base = Math.max(2500, Math.min(3500, base));
    setLiveCount(base);
  }, 3500);
}

// ── 앱 초기화 ────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  initStars();
  initSkyline();
  initFirebase();
  initFakeCount();
  updatePreview();
  pickPrompt();
  loadLobbyRank();
});
