// =============================================
// app.js — 땡땡이닷컴 메인 로직
// =============================================

// ── 병맛 지문 목록 (긴 버전) ────────────────────
const PROMPTS = [
  "오늘 교수님 수업은 정말 흥미롭다고 생각하면서 타이핑하는 척을 하는 학생은 전 세계 어디에도 없다. 그냥 솔직하게 살자. 우리가 여기 앉아 있는 이유는 단 하나, 출석 때문이다. 키보드 소리만이라도 열심히 내보자. 탁탁탁탁. 적어도 소리는 성실하다.",
  "지금 이 순간 전국 어딘가에서 나와 똑같이 수업을 듣는 척하며 딴짓을 하고 있는 사람이 분명히 있다. 우리는 결코 혼자가 아니다. 연대하라. 우리의 무기는 빠른 손가락과 무표정한 얼굴이다. 교수님이 쳐다봐도 흔들리지 말자. 그냥 고개를 한 번 끄덕여 주면 된다. 탁탁.",
  "교수님은 지금 열심히 강의하고 계신다. 나는 지금 열심히 타자를 치고 있다. 둘 다 나름 최선을 다하고 있는 것이다. 이것이 바로 공존이다. 서로의 영역을 존중하는 아름다운 강의실 생태계. 교수님은 가르치고, 나는 타자 실력을 늘린다. 누이 좋고 매부 좋고. 탁탁탁.",
  "시험에 나올 것 같지 않은 내용을 47분째 설명하고 계신 교수님께 진심으로 경의를 표한다. 그 열정의 반만 있어도 나는 이미 대학원에 입학했을 것이다. 그런데 솔직히 저 내용이 시험에 나오면 어떡하지. 잠깐, 필기해야 하나. 아니다. 어차피 족보 있다. 탁탁탁탁탁.",
  "수업 중에 타자를 치면 필기하는 것처럼 보인다는 사실을 발견한 사람은 노벨 평화상을 받아야 한다. 덕분에 오늘도 평화롭게 살아가고 있다. 이 발견이 없었다면 나는 지금쯤 책상에 엎드려 자고 있었을 것이다. 그러면 교수님도 기분이 나쁘셨을 테니, 결국 모두를 위한 선택이다. 탁탁.",
  "저는 열심히 수업을 듣고 있습니다. 이 화면에 보이는 것은 정교한 필기 프로그램입니다. 의심하지 마세요. 절대로. 지금 당장 이쪽 화면 보지 마세요 제발. 이 글자들은 수업 내용을 정리하는 중입니다. 분명히. 확실히. 저는 모범생입니다. 탁탁탁탁.",
  "강의실 에어컨이 너무 춥다. 근데 졸리기도 하다. 이 두 감각이 동시에 오는 것이 인간의 위대한 모순이다. 철학적으로 깊이 고민하는 중이다. 타자도 친다. 춥고 졸린 상태에서도 손가락만은 멈추지 않는다. 이것이 바로 의지력이다. 나는 강하다. 탁탁탁.",
  "출석은 했다. 자리도 앉았다. 노트북도 켰다. 심지어 강의 자료도 열었다. 이 정도면 충분히 열심히 한 것 아닌가. 나머지는 내일의 내가 알아서 할 것이다. 내일의 나는 분명히 더 똑똑하고 성실할 것이다. 항상 그래왔다. 파이팅 내일의 나. 오늘의 나는 타자나 친다.",
  "교수님이 방금 중요하다고 했다. 분명히 들었다. 그런데 무엇이 중요하다고 했는지 기억이 나지 않는다. 타자 치는 데 집중하느라 내용을 놓쳤다. 이것이 바로 멀티태스킹의 한계다. 인간의 뇌는 두 가지를 동시에 완벽히 할 수 없다. 나는 타자를 선택했다. 탁탁탁탁.",
  "이 수업의 학점은 절대평가다. 즉, 남이 잘해도 내 점수에 영향이 없다. 그렇다면 지금 내가 타자 배틀에서 1등을 하는 것이 훨씬 더 의미 있는 일이다. 학점은 나중에 생각하자. 지금은 이 순위판에서 살아남는 것이 목표다. 탁탁탁탁탁탁.",
];

// ── 전역 상태 ────────────────────────────────────
let db = null;
let mySessionId  = null;
let myRoomRef    = null;
let battleRoomId = null;
let rankListener = null;

let myTag  = "[수업선택] 땡땡이";
let myName = "땡땡이";
let currentPrompt    = "";
let currentPromptIdx = 0;

let charIndex       = 0;
let errors          = 0;
let totalTyped      = 0;
let myWpm           = 0;
let myAcc           = 100;
let myCombo         = 0;
let timerSec        = 90;
let timerInterval   = null;
let battleStartTime = null;

// ── Firebase 초기화 ──────────────────────────────
function initFirebase() {
  try {
    if (typeof firebaseConfig === "undefined" ||
        firebaseConfig.apiKey === "YOUR_API_KEY") {
      throw new Error("placeholder config");
    }
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    mySessionId = "u_" + Math.random().toString(36).slice(2, 9) + "_" + Date.now();
    listenOnlineCount();
  } catch (e) {
    console.warn("[Firebase] 오프라인 데모 모드:", e.message);
    db = null;
    fakeCountTick();
  }
}

function listenOnlineCount() {
  if (!db) return;
  const presence = db.ref("presence/" + mySessionId);
  presence.set({ at: Date.now() });
  presence.onDisconnect().remove();
  db.ref("presence").on("value", snap => setLiveCount(snap.numChildren()));
}

function setLiveCount(n) {
  const el = document.getElementById("liveCountText");
  if (el) el.textContent = "현재 " + Number(n).toLocaleString() + "명 땡땡이 중";
}

function fakeCountTick() {
  let base = 2700 + Math.floor(Math.random() * 400);
  setLiveCount(base);
  setInterval(function() {
    base = Math.max(2400, Math.min(3600, base + Math.floor(Math.random() * 20) - 9));
    setLiveCount(base);
  }, 4000);
}

// ── 지문 선택 ────────────────────────────────────
function pickPrompt() {
  currentPromptIdx = Math.floor(Math.random() * PROMPTS.length);
  currentPrompt    = PROMPTS[currentPromptIdx];
  var prev = document.getElementById("promptPreview");
  var idx  = document.getElementById("promptIndex");
  if (prev) prev.textContent = currentPrompt;
  if (idx)  idx.textContent  = currentPromptIdx + 1;
}

// ── 닉네임 프리뷰 ────────────────────────────────
function updatePreview() {
  var cls  = document.getElementById("classSelect").value || "수업선택";
  var nick = (document.getElementById("nicknameInput").value || "").trim() || "땡땡이";
  myTag  = "[" + cls + "] " + nick;
  myName = nick;
  var el = document.getElementById("previewTag");
  if (el) el.textContent = myTag;
}

// ── 로비 탭 ─────────────────────────────────────
function switchLobbyTab(idx) {
  document.querySelectorAll(".tab").forEach(function(t, i) {
    t.classList.toggle("active", i === idx);
  });
  document.getElementById("lobbyTab0").style.display = idx === 0 ? "" : "none";
  document.getElementById("lobbyTab1").style.display = idx === 1 ? "" : "none";
  if (idx === 1) loadRegionMap();
}

// ── 땡땡이 지도 ──────────────────────────────────
async function loadRegionMap() {
  var loading = document.getElementById("mapLoading");
  var list    = document.getElementById("regionList");
  if (loading) loading.style.display = "";
  if (list)    list.innerHTML = "";

  var regions = {};
  if (db) {
    try {
      var snap = await db.ref("regions").once("value");
      regions = snap.val() || {};
      var res = await fetch("https://ipapi.co/json/");
      var geo = await res.json();
      var key = ((geo.city || "알수없음") + "_" + (geo.region || "")).replace(/[.#$\/\[\]\s]/g,"_");
      await db.ref("regions/" + key).transaction(function(v) { return (v || 0) + 1; });
      var snap2 = await db.ref("regions").once("value");
      regions = snap2.val() || {};
    } catch(e) {}
  } else {
    regions = {
      "서울_관악구": 138, "서울_강남구": 92, "부산_금정구": 61,
      "대전_유성구": 49, "인천_연수구": 41, "대구_북구": 35,
      "광주_북구": 28, "수원_팔달구": 22,
    };
  }

  if (loading) loading.style.display = "none";
  var sorted = Object.entries(regions).sort(function(a,b){ return b[1]-a[1]; });
  var max = sorted[0] ? sorted[0][1] : 1;

  sorted.slice(0,10).forEach(function(entry, i) {
    var name  = entry[0].replace(/_/g," ");
    var cnt   = entry[1];
    var medal = ["🥇","🥈","🥉"][i] || "  ";
    var pct   = Math.round((cnt/max)*100);
    var div   = document.createElement("div");
    div.className = "region-item";
    div.innerHTML = '<span style="width:20px">' + medal + '</span>' +
      '<span class="region-name">' + name + '</span>' +
      '<div class="region-bar-wrap"><div class="region-bar" style="width:' + pct + '%"></div></div>' +
      '<span class="region-count">' + cnt + '명</span>';
    if (list) list.appendChild(div);
  });
}

// ── 오늘 랭킹 로드 ───────────────────────────────
async function loadLobbyRank() {
  var list = document.getElementById("lobbyRankList");
  if (!list) return;
  if (!db) {
    list.innerHTML = '<div class="rank-empty">Firebase 연결 후 실시간 랭킹이 표시됩니다.</div>';
    return;
  }
  var today = todayKey();
  var snap  = await db.ref("daily/"+today).orderByChild("wpm").limitToLast(10).once("value");
  var rows  = [];
  snap.forEach(function(c){ rows.unshift(c.val()); });
  if (!rows.length) {
    list.innerHTML = '<div class="rank-empty">오늘 기록이 없어요. 첫 배틀러가 되세요!</div>';
    return;
  }
  renderRankItems(list, rows.map(function(r){ return {name: r.tag||"익명", wpm: r.wpm, isMe: false}; }));
}

// ── 배틀 시작 ────────────────────────────────────
function startBattle() {
  var nick = (document.getElementById("nicknameInput").value || "").trim();
  var cls  = document.getElementById("classSelect").value;
  if (!nick || !cls) {
    showToast("닉네임과 수업을 선택하세요!");
    return;
  }

  charIndex = 0; errors = 0; totalTyped = 0;
  myWpm = 0; myAcc = 100; myCombo = 0;
  timerSec = 90; battleStartTime = null;

  pickPrompt();
  buildPromptDisplay();

  document.getElementById("battleMyTag").textContent   = myTag;
  document.getElementById("statWpm").textContent       = "0";
  document.getElementById("statAcc").textContent       = "100";
  document.getElementById("statRank").textContent      = "-";
  document.getElementById("statCombo").textContent     = "0";
  document.getElementById("progressBar").style.width   = "0%";
  document.getElementById("progressLabel").textContent = "0%";
  document.getElementById("timerDisplay").textContent  = "01:30";
  document.getElementById("timerDisplay").classList.remove("danger");
  document.getElementById("battleRankList").innerHTML  = '<div class="rank-empty">상대방 연결 대기 중...</div>';

  setPhase("battle");

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tickTimer, 1000);

  joinBattleRoom();

  setTimeout(function() {
    var inp = document.getElementById("typeInput");
    if (inp) { inp.value = ""; inp.focus(); }
  }, 150);
}

// ── 지문 DOM 빌드 ────────────────────────────────
function buildPromptDisplay() {
  var el = document.getElementById("promptDisplay");
  if (!el) return;
  el.innerHTML = "";
  Array.from(currentPrompt).forEach(function(c, i) {
    var span = document.createElement("span");
    span.className = "ch " + (i === 0 ? "cursor" : "pending");
    span.id = "ch" + i;
    span.textContent = c === " " ? "\u00a0" : c;
    el.appendChild(span);
  });
}

// ── Backspace 처리 ───────────────────────────────
document.addEventListener("keydown", function(e) {
  if (e.key !== "Backspace") return;
  var battle = document.getElementById("phaseBattle");
  if (!battle || !battle.classList.contains("active")) return;
  var inp = document.getElementById("typeInput");
  if (!inp || document.activeElement !== inp) return;

  e.preventDefault();
  if (charIndex === 0) return;

  var curEl = document.getElementById("ch" + charIndex);
  if (curEl) curEl.className = "ch pending";
  charIndex--;
  var prevEl = document.getElementById("ch" + charIndex);
  if (prevEl) prevEl.className = "ch cursor";
  myCombo = 0;
});

// ── 타이핑 처리 ──────────────────────────────────
document.addEventListener("input", function(e) {
  if (!e.target || e.target.id !== "typeInput") return;

  var val = e.target.value;
  if (!val) return;

  if (!battleStartTime) battleStartTime = Date.now();

  var last = val[val.length - 1];
  e.target.value = "";

  var expected = currentPrompt[charIndex];
  if (expected === undefined) return;

  totalTyped++;

  if (last === expected) {
    var el = document.getElementById("ch" + charIndex);
    if (el) el.className = "ch correct";
    charIndex++;
    myCombo++;
    if (charIndex < currentPrompt.length) {
      var next = document.getElementById("ch" + charIndex);
      if (next) next.className = "ch cursor";
    }
  } else {
    var el2 = document.getElementById("ch" + charIndex);
    if (el2) el2.className = "ch wrong";
    errors++;
    myCombo = 0;
  }

  var elapsed = (Date.now() - battleStartTime) / 60000;
  myWpm = elapsed > 0 ? Math.round((charIndex / 5) / elapsed) : 0;
  myAcc = totalTyped > 0 ? Math.round(((totalTyped - errors) / totalTyped) * 100) : 100;

  document.getElementById("statWpm").textContent   = myWpm;
  document.getElementById("statAcc").textContent   = myAcc;
  document.getElementById("statCombo").textContent = myCombo;

  var pct = Math.round((charIndex / currentPrompt.length) * 100);
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressLabel").textContent = pct + "%";

  if (totalTyped % 5 === 0) updateMyRoomData();
  if (charIndex >= currentPrompt.length) endBattle();
});

// ── 타이머 ───────────────────────────────────────
function tickTimer() {
  timerSec--;
  var m = String(Math.floor(timerSec/60)).padStart(2,"0");
  var s = String(timerSec%60).padStart(2,"0");
  document.getElementById("timerDisplay").textContent = m+":"+s;
  if (timerSec <= 10) document.getElementById("timerDisplay").classList.add("danger");
  if (timerSec <= 0)  endBattle();
}

// ── Firebase 배틀방 ───────────────────────────────
function joinBattleRoom() {
  if (!db) return;
  var slot   = Math.floor(Date.now() / 30000);
  battleRoomId = "room_" + slot;
  myRoomRef    = db.ref("rooms/"+battleRoomId+"/players/"+mySessionId);
  myRoomRef.set({ tag: myTag, wpm: 0, acc: 100, progress: 0, at: Date.now() });
  myRoomRef.onDisconnect().remove();
  if (rankListener) db.ref("rooms/"+battleRoomId+"/players").off("value", rankListener);
  rankListener = db.ref("rooms/"+battleRoomId+"/players").on("value", function(snap) {
    var players = [];
    snap.forEach(function(c){ players.push(Object.assign({id: c.key}, c.val())); });
    renderBattleRank(players);
  });
}

function updateMyRoomData() {
  if (!myRoomRef) return;
  myRoomRef.update({ wpm: myWpm, acc: myAcc, progress: Math.round((charIndex/currentPrompt.length)*100) });
}

// ── 배틀 종료 ────────────────────────────────────
async function endBattle() {
  clearInterval(timerInterval);
  timerInterval = null;
  updateMyRoomData();
  if (db) {
    var today = todayKey();
    await db.ref("daily/"+today).push({ tag: myTag, wpm: myWpm, acc: myAcc, promptIdx: currentPromptIdx, at: Date.now() });
    if (myRoomRef) myRoomRef.remove();
  }
  await buildResultScreen();
  setPhase("result");
}

// ── 결과 화면 ─────────────────────────────────────
async function buildResultScreen() {
  document.getElementById("resWpm").textContent    = myWpm;
  document.getElementById("resAcc").textContent    = myAcc + "%";
  document.getElementById("resCombo").textContent  = myCombo;
  document.getElementById("resPrompt").textContent = "지문 " + (currentPromptIdx+1) + "번";

  var myRank = 1, total = 1;
  var resultList = document.getElementById("resultRankList");

  if (db) {
    var today = todayKey();
    var snap  = await db.ref("daily/"+today).orderByChild("wpm").once("value");
    var rows  = [];
    snap.forEach(function(c){ rows.push(c.val()); });
    rows.sort(function(a,b){ return b.wpm-a.wpm; });
    total  = rows.length;
    myRank = rows.findIndex(function(r){ return r.tag===myTag && r.wpm===myWpm; }) + 1 || 1;
    renderRankItems(resultList, rows.slice(0,8).map(function(r){
      return { name: r.tag, wpm: r.wpm, isMe: r.tag===myTag && r.wpm===myWpm };
    }));
  } else {
    if (resultList) resultList.innerHTML = '<div class="rank-empty">Firebase 연결 후 최종 랭킹이 저장됩니다.</div>';
  }

  var msgs = { 1:"🏆 1등! 수업 중 최강 타자 등극!", 2:"🥈 2등! 조금만 더 빨랐으면...", 3:"🥉 3등! 교수님보단 빠르다" };
  document.getElementById("resultBanner").textContent =
    msgs[myRank] || (myRank + "등 / 오늘 " + total + "명 중 — 다음엔 꼭 1등!");

  drawShareCard(myWpm, myAcc, myRank, total);
}

// ── 공유 카드 ─────────────────────────────────────
function drawShareCard(wpm, acc, rank, total) {
  var canvas = document.getElementById("shareCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  canvas.width = 600; canvas.height = 300;
  ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0,0,600,300);
  ctx.strokeStyle = "#e8621a"; ctx.lineWidth = 3; ctx.strokeRect(3,3,594,294);
  ctx.fillStyle = "#ff7a20"; ctx.font = "bold 16px monospace";
  ctx.fillText("땡땡이닷컴 — CLASS ESCAPE TYPING BATTLE", 24, 44);
  ctx.fillStyle = "#ff7a20"; ctx.font = "bold 52px monospace"; ctx.fillText(wpm, 24, 148);
  ctx.fillStyle = "#7a5a30"; ctx.font = "13px monospace"; ctx.fillText("WPM", 24, 170);
  ctx.fillStyle = "#44ffcc"; ctx.font = "bold 28px monospace"; ctx.fillText(acc+"%", 180, 140);
  ctx.fillStyle = "#7a5a30"; ctx.font = "13px monospace"; ctx.fillText("정확도", 180, 162);
  ctx.fillStyle = "#ffcc00"; ctx.font = "bold 28px monospace"; ctx.fillText(rank+"위", 320, 140);
  ctx.fillStyle = "#7a5a30"; ctx.font = "13px monospace"; ctx.fillText("오늘 "+total+"명 중", 320, 162);
  ctx.fillStyle = "#1a1004"; ctx.fillRect(0,240,600,60);
  ctx.fillStyle = "#f0e8d8"; ctx.font = "12px monospace";
  ctx.fillText("수업 중 몰래 즐기는 실시간 타자 배틀", 24, 264);
  ctx.fillStyle = "#e8621a"; ctx.fillText("ddangtangi.netlify.app", 24, 286);
}

function shareTwitter() {
  var wpm  = document.getElementById("resWpm").textContent;
  var text = encodeURIComponent("수업 중에 "+wpm+" WPM 찍었다 \uD83D\uDC80 나도 모르게 열심히 침\n\n땡땡이닷컴에서 타자 배틀하기 \uD83D\uDC49 ddangtangi.netlify.app\n#땡땡이닷컴 #수업중타자배틀");
  window.open("https://twitter.com/intent/tweet?text="+text, "_blank");
}

function copyShareLink() {
  navigator.clipboard.writeText("ddangtangi.netlify.app")
    .then(function(){ showToast("링크 복사 완료! 친구한테 보내세요 🎮"); });
}

function downloadShareImage() {
  var canvas = document.getElementById("shareCanvas");
  var a = document.createElement("a");
  a.download = "ddangtangi_result.png";
  a.href = canvas.toDataURL(); a.click();
}

// ── 배틀 실시간 순위 ──────────────────────────────
function renderBattleRank(players) {
  var sorted = players.slice().sort(function(a,b){ return (b.wpm||0)-(a.wpm||0); });
  var myIdx  = sorted.findIndex(function(p){ return p.id===mySessionId; });
  document.getElementById("statRank").textContent = myIdx>=0 ? (myIdx+1)+"위" : "-";
  renderRankItems(
    document.getElementById("battleRankList"),
    sorted.map(function(p){ return {name:p.tag||"익명", wpm:p.wpm||0, isMe:p.id===mySessionId}; })
  );
}

// ── 공통 랭킹 렌더 ───────────────────────────────
function renderRankItems(container, items) {
  if (!container) return;
  var max = Math.max.apply(null, items.map(function(i){ return i.wpm; }).concat([1]));
  container.innerHTML = "";
  items.forEach(function(item, i) {
    var cls = ["gold","silver","bronze"][i] || "other";
    var pct = Math.round((item.wpm/max)*100);
    var div = document.createElement("div");
    div.className = "rank-item" + (item.isMe?" is-me":"");
    div.innerHTML =
      '<span class="rank-num '+cls+'">'+(i+1)+'</span>'+
      '<span class="rank-name">'+(item.isMe?"⭐ ":"")+esc(item.name)+'</span>'+
      '<div class="rank-bar-wrap"><div class="rank-bar" style="width:'+pct+'%"></div></div>'+
      '<span class="rank-wpm">'+item.wpm+'<br><span style="font-size:6px;opacity:.6">WPM</span></span>';
    container.appendChild(div);
  });
}

// ── Phase 전환 ────────────────────────────────────
function setPhase(name) {
  var target = "phase" + name.charAt(0).toUpperCase() + name.slice(1);
  document.querySelectorAll(".phase").forEach(function(el) {
    var on = el.id === target;
    el.classList.toggle("active", on);
    el.style.display = on ? "" : "none";
  });
}

function backToLobby() {
  setPhase("lobby");
  loadLobbyRank();
  pickPrompt();
}

// ── 유틸 ─────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0,10); }
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function showToast(msg) {
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function(){ t.classList.remove("show"); }, 2500);
}

// ── 별 캔버스 ─────────────────────────────────────
function initStars() {
  var canvas = document.getElementById("starCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var stars = [];
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    stars = Array.from({length:80}, function() { return {
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height*0.65,
      r: Math.random()<0.2?2:1,
      alpha: Math.random(),
      speed: 0.003+Math.random()*0.008,
      phase: Math.random()*Math.PI*2,
    }; });
  }
  window.addEventListener("resize", resize);
  resize();
  var frame = 0;
  (function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    frame++;
    stars.forEach(function(s) {
      s.alpha = 0.3+0.5*Math.sin(frame*s.speed+s.phase);
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x,s.y,s.r,s.r);
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  })();
}

// ── 도시 스카이라인 ───────────────────────────────
function initSkyline() {
  var sky = document.getElementById("skyline");
  if (!sky) return;
  var configs = [
    {w:55,h:75},{w:35,h:55},{w:80,h:105},{w:28,h:45},{w:68,h:92},
    {w:45,h:68},{w:92,h:115},{w:32,h:52},{w:60,h:82},{w:40,h:60},
    {w:72,h:98},{w:50,h:72},{w:85,h:108},{w:38,h:58},{w:62,h:84},
    {w:28,h:48},{w:70,h:94},{w:48,h:70},{w:78,h:102},{w:44,h:66},
  ];
  configs.forEach(function(c) {
    var b = document.createElement("div");
    b.className = "building";
    b.style.width = c.w+"px";
    b.style.height = c.h+"px";
    for (var i=0; i<Math.floor(Math.random()*4); i++) {
      var light = document.createElement("div");
      light.className = "building-light";
      light.style.left = (6+Math.random()*(c.w-16))+"px";
      light.style.top  = (8+Math.random()*(c.h-20))+"px";
      light.style.animationDelay    = (Math.random()*4)+"s";
      light.style.animationDuration = (2+Math.random()*4)+"s";
      b.appendChild(light);
    }
    sky.appendChild(b);
  });
}

// ── 앱 시작 ──────────────────────────────────────
window.addEventListener("DOMContentLoaded", function() {
  initStars();
  initSkyline();
  initFirebase();
  updatePreview();
  pickPrompt();
  loadLobbyRank();

  document.getElementById("classSelect").addEventListener("change", updatePreview);
  document.getElementById("nicknameInput").addEventListener("input", updatePreview);

  // 초기 phase — lobby만 보이게
  setPhase("lobby");
});
