/* ================================================
   잘잘못 — App Logic  v5.0  (Supabase 연동)
   ================================================ */

// ===== Supabase 설정 =====
const SUPABASE_URL = 'https://jlapeacjftcedarbtppj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsYXBlYWNqZnRjZWRhcmJ0cHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDcxNTcsImV4cCI6MjA4OTQ4MzE1N30.ejbVuvH4Hk9-G5ar33oUytBGIDxuq-93N0pkezZbs5M';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Prefer': 'return=representation',
};

const API_SITUATIONS = SUPABASE_URL + '/rest/v1/situations';
const API_COMMENTS   = SUPABASE_URL + '/rest/v1/comments';

function getDeviceId() {
  let did = localStorage.getItem('jjj_did');
  if (!did) {
    did = 'u_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('jjj_did', did);
  }
  return did;
}

function hasVoted(situationId) { return !!localStorage.getItem('jjj_v_' + situationId); }
function getMyVoteType(situationId) { return localStorage.getItem('jjj_v_' + situationId) || null; }
function saveVoteLocally(situationId, type) { localStorage.setItem('jjj_v_' + situationId, type); }

let state = { view:'list', list:[], total:0, page:1, sort:'latest', category:'all', search:'', detailId:null, detailData:null, writeCategory:'' };

const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(val) {
  const ms = typeof val === 'number' ? val : new Date(val).getTime();
  const diff = Date.now() - ms;
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
  if (m < 1) return '방금 전';
  if (m < 60) return m+'분 전';
  if (h < 24) return h+'시간 전';
  if (d < 7) return d+'일 전';
  const dt = new Date(ms);
  return dt.getFullYear()+'.'+String(dt.getMonth()+1).padStart(2,'0')+'.'+String(dt.getDate()).padStart(2,'0');
}

function totalVotes(s) { return (s.vote_my_fault||0)+(s.vote_their_fault||0); }

function getVerdict(s) {
  const sc = { my:s.vote_my_fault||0, their:s.vote_their_fault||0 };
  const max = Math.max(sc.my, sc.their);
  if (max===0) return {key:'none',label:'아직 투표 없음',emoji:'❓',color:'#999'};
  const tied = sc.my === sc.their && sc.my > 0;
  if (tied) return {key:'tied',label:'팽팽한 대결!',emoji:'⚡',color:'#999'};
  if (sc.my===max) return {key:'my',label:'내 잘못',emoji:'😔',color:'#e74c3c'};
  return {key:'their',label:'상대방 잘못',emoji:'😤',color:'#3498db'};
}

function pct(val,tot) { return tot ? Math.round(val/tot*100) : 0; }

let _toastTimer;
function toast(msg) {
  const el=$('#toast'); if(!el) return;
  el.textContent=msg; el.classList.add('show');
  clearTimeout(_toastTimer); _toastTimer=setTimeout(()=>el.classList.remove('show'),2800);
}

function showModal(emoji,title,sub) {
  $('#modalEmoji').textContent=emoji; $('#modalTitle').textContent=title; $('#modalSub').textContent=sub;
  $('#modalOverlay').classList.add('show');
}
function closeModal() { $('#modalOverlay').classList.remove('show'); }

function switchView(name) {
  $$('.view').forEach(v=>v.classList.remove('active'));
  const el=$('#view-'+name); if(el) el.classList.add('active');
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  state.view=name; window.scrollTo({top:0,behavior:'smooth'});
}

async function loadList() {
  const listEl=$('#cardList');
  listEl.innerHTML='<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>';
  try {
    let url=API_SITUATIONS+'?select=*&order=created_at.desc&limit=100';
    if(state.search) url+='&title=ilike.*'+encodeURIComponent(state.search)+'*';
    if(state.category!=='all') url+='&category=eq.'+encodeURIComponent(state.category);
    const res=await fetch(url,{headers:HEADERS});
    if(!res.ok) throw new Error('HTTP '+res.status);
    let data=await res.json();
    if(state.sort==='hot') data.sort((a,b)=>totalVotes(b)-totalVotes(a));
    else if(state.sort==='views') data.sort((a,b)=>(b.view_count||0)-(a.view_count||0));
    state.list=data; state.total=data.length; renderList(data);
  } catch(e) {
    listEl.innerHTML='<div class="empty-state"><div class="empty-state-emoji">😵</div><div class="empty-state-text">불러오기 실패: '+e.message+'</div></div>';
  }
}

function renderList(data) {
  const listEl=$('#cardList');
  if(!data.length) { listEl.innerHTML='<div class="empty-state"><div class="empty-state-emoji">🤷</div><div class="empty-state-text">아직 올라온 상황이 없어요</div><div class="empty-state-sub">첫 번째로 상황을 올려보세요!</div></div>'; return; }
  listEl.innerHTML=data.map(s=>{
    const tot=totalVotes(s),v=getVerdict(s);
    const pMy=pct(s.vote_my_fault||0,tot),pTheir=pct(s.vote_their_fault||0,tot),pBoth=pct(s.vote_both_fault||0,tot);
    return `<div class="situation-card" data-id="${s.id}"><div class="card-top"><div class="card-left"><div class="card-category">${escHtml(s.category||'기타')}</div><div class="card-title">${escHtml(s.title)}</div><div class="card-preview">${escHtml((s.content||'').replace(/<[^>]*>/g,'').substring(0,80))}</div></div><div class="verdict-badge" style="color:${v.color};border-color:${v.color}">${v.emoji} ${v.label}</div></div><div class="card-bar"><div class="bar-segment bar-my" style="width:${pMy}%"></div><div class="bar-segment bar-their" style="width:${pTheir}%"></div><div class="bar-segment bar-both" style="width:${pBoth}%"></div></div><div class="card-meta"><span><i class="fas fa-vote-yea"></i> ${tot}표</span><span><i class="fas fa-eye"></i> ${s.view_count||0}</span><span><i class="fas fa-user"></i> ${escHtml(s.author||'익명')}</span><span><i class="fas fa-clock"></i> ${timeAgo(s.created_at||Date.now())}</span></div></div>`;
  }).join('');
}

async function openDetail(id) {
  switchView('detail');
  $('#detailContent').innerHTML='<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>';
  try {
    const res=await fetch(API_SITUATIONS+'?id=eq.'+id+'&select=*',{headers:HEADERS});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const arr=await res.json(); const s=arr[0]; if(!s) throw new Error('데이터 없음');
    state.detailId=id; state.detailData=s;
    const viewed=JSON.parse(localStorage.getItem('jjj_viewed')||'[]');
    if(!viewed.includes(id)) {
      viewed.push(id); localStorage.setItem('jjj_viewed',JSON.stringify(viewed));
      fetch(API_SITUATIONS+'?id=eq.'+id,{method:'PATCH',headers:HEADERS,body:JSON.stringify({view_count:(s.view_count||0)+1})});
      s.view_count=(s.view_count||0)+1;
    }
    renderDetail(s); loadComments(id);
  } catch(e) {
    $('#detailContent').innerHTML='<div class="empty-state"><div class="empty-state-emoji">😵</div><div class="empty-state-text">불러오기 실패</div></div>';
  }
}

function renderDetail(s) {
  const id=s.id,tot=totalVotes(s),v=getVerdict(s),voted=hasVoted(id),myVote=getMyVoteType(id);
  const VOTE_ITEMS=[
    {key:'my',emoji:'😔',label:'내 잘못',field:'vote_my_fault',color:'#e74c3c'},
    {key:'their',emoji:'😤',label:'상대방 잘못',field:'vote_their_fault',color:'#3498db'},
    {key:'both',emoji:'🤦',label:'둘 다 잘못',field:'vote_both_fault',color:'#f39c12'},
  ];
  let voteBtnsHtml='';
  VOTE_ITEMS.forEach(it=>{
    const val=s[it.field]||0,isMyPick=voted&&myVote===it.key,disabled=voted?'disabled':'',selectedClass=isMyPick?'selected-final':'';
    voteBtnsHtml+=`<button class="vote-btn vote-btn-${it.key} ${selectedClass}" data-type="${it.key}" ${disabled}><span class="vote-btn-emoji">${it.emoji}</span><span class="vote-btn-label">${it.label}</span><span class="vote-btn-count">${val}표</span></button>`;
  });
  const confirmHtml=voted?'':`<button class="vote-confirm-btn" id="voteConfirmBtn" disabled>✅ 투표하기</button>`;
  let barsHtml='';
  VOTE_ITEMS.forEach(it=>{
    const val=s[it.field]||0,p=pct(val,tot);
    barsHtml+=`<div class="result-bar-wrap"><div class="result-bar-label"><span>${it.emoji} ${it.label}</span><span style="color:${it.color};font-weight:600">${p}% (${val}표)</span></div><div class="result-bar-track"><div class="result-bar-fill" style="width:${p}%;background:${it.color}"></div></div></div>`;
  });
  const bgMap={my:'#fff1f1',their:'#eef1ff',both:'#fff8e1',none:'#f5f5f5',tied:'#f5f5f5'};
  $('#detailContent').innerHTML=`<div class="detail-card"><div class="detail-header"><div class="detail-category">${escHtml(s.category||'기타')}</div><div class="detail-title">${escHtml(s.title)}</div><div class="detail-meta"><span><i class="fas fa-user"></i> ${escHtml(s.author||'익명')}</span><span><i class="fas fa-eye"></i> ${s.view_count||0}</span><span><i class="fas fa-clock"></i> ${timeAgo(s.created_at||Date.now())}</span><span><i class="fas fa-vote-yea"></i> ${tot}표</span></div></div><div class="detail-content">${escHtml((s.content||'').replace(/<[^>]*>/g,''))}</div></div><div class="vote-panel"><div class="vote-panel-title">⚖️ 누구 잘못인가요?</div><div class="vote-panel-sub" id="votePanelSub">${voted?'✅ 이미 투표하셨습니다!':'항목을 선택하고 아래 버튼을 눌러주세요'}</div><div class="vote-buttons" id="voteBtns">${voteBtnsHtml}</div><div id="voteConfirmWrap">${confirmHtml}</div><div id="resultBars">${barsHtml}</div><div class="result-total">총 ${tot}명이 투표했어요</div><div class="final-verdict" style="background:${bgMap[v.key]||'#f5f5f5'}"><div class="final-verdict-emoji">${v.emoji}</div><div class="final-verdict-title" style="color:${v.color}">${v.label}</div><div class="final-verdict-sub">${verdictMsg(v.key,tot)}</div></div></div><div class="comment-panel" id="commentPanel"><div class="comment-panel-title"><i class="fas fa-comments"></i> 댓글 <span id="commentCount"></span></div><div class="comment-form"><input type="text" id="cAuthor" placeholder="닉네임 (선택)" maxlength="15" style="width:120px;flex:none" /><input type="text" id="cContent" placeholder="의견을 남겨보세요..." maxlength="200" /><button class="comment-submit" id="commentSubmit"><i class="fas fa-paper-plane"></i></button></div><div class="comment-list" id="commentList"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></div></div>`;
  if(!voted) {
    let selectedType=null;
    $$('#voteBtns .vote-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        $$('#voteBtns .vote-btn').forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected'); selectedType=btn.dataset.type;
        const cb=$('#voteConfirmBtn');
        if(cb){cb.disabled=false;const lm={my:'내 잘못',their:'상대방 잘못',both:'둘 다 잘못'};cb.innerHTML='✅ <strong>'+lm[selectedType]+'</strong> 으로 투표하기';}
      });
    });
    const cb=$('#voteConfirmBtn');
    if(cb){cb.addEventListener('click',()=>{if(!selectedType){toast('항목을 먼저 선택해주세요!');return;}if(hasVoted(state.detailId)){toast('이미 투표하셨습니다!');return;}cb.disabled=true;cb.innerHTML='<i class="fas fa-spinner fa-spin"></i> 투표 중...';doVote(selectedType);});}
  }
  $('#commentSubmit').addEventListener('click',submitComment);
  $('#cContent').addEventListener('keydown',e=>{if(e.key==='Enter')submitComment();});
}

function verdictMsg(key,tot) {
  if(tot===0) return '아직 아무도 투표하지 않았어요. 첫 판단을 내려주세요!';
  const m={my:'다수가 당신의 행동을 되돌아볼 필요가 있다고 생각해요.',their:'다수가 상대방이 잘못했다고 판단했어요.',both:'사실 둘 다 조금씩 잘못이 있는 것 같아요.',tied:'사람마다 판단이 엇갈리는 상황이에요!',none:'아직 결과를 기다리는 중이에요.'};
  return m[key]||'';
}

async function doVote(type) {
  const id=state.detailId,s=state.detailData; if(!id||!s) return;
  const fieldMap={my:'vote_my_fault',their:'vote_their_fault',both:'vote_both_fault'};
  const field=fieldMap[type],newVal=(s[field]||0)+1;
  try {
    const res=await fetch(API_SITUATIONS+'?id=eq.'+id,{method:'PATCH',headers:HEADERS,body:JSON.stringify({[field]:newVal})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const arr=await res.json(),updated=arr[0];
    saveVoteLocally(id,type); state.detailData=updated;
    const infoMap={my:{emoji:'😔',label:'내 잘못이라고 판단하셨군요!',sub:'용기 있는 인정! 반성은 성장의 시작입니다.'},their:{emoji:'😤',label:'상대방 잘못이라고 판단하셨군요!',sub:'답답하셨겠어요. 잘 해결되길 바랍니다!'},both:{emoji:'🤦',label:'둘 다 잘못이라고 판단하셨군요!',sub:'서로 한 발씩 양보하면 어떨까요?'}};
    const info=infoMap[type]; showModal(info.emoji,info.label,info.sub); renderDetail(updated); loadComments(id);
  } catch(e) {
    alert('투표 오류: '+e.message);
    const cb=$('#voteConfirmBtn'); if(cb){cb.disabled=false;cb.innerHTML='✅ 투표하기';}
  }
}

async function loadComments(situationId) {
  const listEl=$('#commentList'); if(!listEl) return;
  try {
    const res=await fetch(API_COMMENTS+'?situation_id=eq.'+situationId+'&order=created_at.asc&limit=200',{headers:HEADERS});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const all=await res.json();
    const countEl=$('#commentCount'); if(countEl) countEl.textContent='('+all.length+')';
    if(!all.length){listEl.innerHTML='<div class="no-comments">아직 댓글이 없어요. 첫 댓글을 남겨보세요! 💬</div>';return;}
    listEl.innerHTML=all.map(c=>`<div class="comment-item"><div class="comment-item-top"><span class="comment-author">${escHtml(c.author||'익명')}</span><span class="comment-time">${timeAgo(c.created_at||Date.now())}</span></div><div class="comment-body">${escHtml(c.content)}</div></div>`).join('');
  } catch(e) { if(listEl) listEl.innerHTML='<div class="no-comments">댓글을 불러오지 못했어요.</div>'; }
}

async function submitComment() {
  const author=($('#cAuthor')?.value||'').trim()||'익명',content=($('#cContent')?.value||'').trim();
  if(!content){toast('댓글 내용을 입력해주세요.');return;}
  try {
    await fetch(API_COMMENTS,{method:'POST',headers:HEADERS,body:JSON.stringify({situation_id:state.detailId,author,content})});
    if($('#cContent')) $('#cContent').value=''; toast('댓글이 등록됐어요! 💬'); loadComments(state.detailId);
  } catch(e){toast('댓글 등록에 실패했어요.');}
}

async function handleWriteSubmit(e) {
  e.preventDefault();
  const author=($('#fAuthor')?.value||'').trim()||'익명',category=state.writeCategory;
  const title=($('#fTitle')?.value||'').trim(),content=($('#fContent')?.value||'').trim();
  if(!category){toast('카테고리를 선택해주세요!');return;}
  if(!title){toast('제목을 입력해주세요!');return;}
  if(!content){toast('상황 설명을 입력해주세요!');return;}
  if(content.length<20){toast('상황을 20자 이상 작성해주세요.');return;}
  const submitBtn=$('.btn-submit'); submitBtn.disabled=true; submitBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> 등록 중...';
  try {
    const res=await fetch(API_SITUATIONS,{method:'POST',headers:HEADERS,body:JSON.stringify({author,category,title,content,vote_my_fault:0,vote_their_fault:0,vote_both_fault:0,view_count:0})});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const arr=await res.json(),created=arr[0];
    toast('🎉 상황이 등록됐어요!'); $('#writeForm').reset(); state.writeCategory='';
    $$('.cat-select-btn').forEach(b=>b.classList.remove('selected'));
    submitBtn.disabled=false; submitBtn.innerHTML='<i class="fas fa-paper-plane"></i> 판단 받기';
    await loadList(); switchView('list'); setTimeout(()=>openDetail(created.id),300);
  } catch(e) {
    alert('등록 오류: '+e.message); submitBtn.disabled=false; submitBtn.innerHTML='<i class="fas fa-paper-plane"></i> 판단 받기';
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  $$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{const v=btn.dataset.view;if(v==='list')loadList();switchView(v);}));
  $('#logoBtn')?.addEventListener('click',()=>{loadList();switchView('list');});
  $$('.cat-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.cat-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.category=btn.dataset.cat;state.page=1;loadList();}));
  $$('.sort-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.sort-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.sort=btn.dataset.sort;loadList();}));
  let _searchTimer;
  $('#searchInput')?.addEventListener('input',e=>{clearTimeout(_searchTimer);_searchTimer=setTimeout(()=>{state.search=e.target.value.trim();state.page=1;loadList();},400);});
  $('#cardList')?.addEventListener('click',e=>{const card=e.target.closest('.situation-card');if(card)openDetail(card.dataset.id);});
  $('#backBtn')?.addEventListener('click',()=>{switchView('list');loadList();});
  $('#writeForm')?.addEventListener('submit',handleWriteSubmit);
  $$('.cat-select-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.cat-select-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');state.writeCategory=btn.dataset.cat;if($('#fCategory'))$('#fCategory').value=btn.dataset.cat;}));
  $('#fContent')?.addEventListener('input',e=>{const cc=$('#charCount');if(cc)cc.textContent=e.target.value.length;});
  $('#cancelWrite')?.addEventListener('click',()=>switchView('list'));
  $('#modalClose')?.addEventListener('click',closeModal);
  $('#modalOverlay')?.addEventListener('click',e=>{if(e.target===$('#modalOverlay'))closeModal();});
  loadList();
});

// ================================================
// 음성 인식 기능
// ================================================
(function() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return; // 지원 안하는 브라우저 무시

  function createRecognition(targetEl, btnEl) {
    const rec = new SpeechRecognition();
    rec.lang = 'ko-KR';
    rec.continuous = true;       // 계속 인식
    rec.interimResults = true;   // 중간 결과도 표시

    let finalText = '';
    let isRecording = false;

    btnEl.addEventListener('click', () => {
      if (isRecording) {
        rec.stop();
      } else {
        finalText = targetEl.value || '';
        rec.start();
      }
    });

    rec.onstart = () => {
      isRecording = true;
      btnEl.classList.add('recording');
      btnEl.innerHTML = '<i class="fas fa-stop"></i>';
      btnEl.title = '누르면 중지';
    };

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript;
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      targetEl.value = finalText + interim;
      // 글자수 카운터 업데이트
      const cc = document.getElementById('charCount');
      if (cc) cc.textContent = targetEl.value.length;
    };

    rec.onend = () => {
      isRecording = false;
      btnEl.classList.remove('recording');
      btnEl.innerHTML = '<i class="fas fa-microphone"></i>';
      btnEl.title = '음성 입력';
      targetEl.value = finalText;
    };

    rec.onerror = (e) => {
      isRecording = false;
      btnEl.classList.remove('recording');
      btnEl.innerHTML = '<i class="fas fa-microphone"></i>';
      if (e.error === 'not-allowed') {
        alert('마이크 권한을 허용해주세요!\n설정 > 앱 > 잘잘못 > 권한 > 마이크');
      }
    };
  }

  // DOM 로드 후 연결
  document.addEventListener('DOMContentLoaded', () => {
    const titleInput   = document.getElementById('fTitle');
    const contentInput = document.getElementById('fContent');
    const micTitle     = document.getElementById('micTitle');
    const micContent   = document.getElementById('micContent');

    if (titleInput && micTitle)     createRecognition(titleInput, micTitle);
    if (contentInput && micContent) createRecognition(contentInput, micContent);
  });
})();

// ================================================
// AI 다듬기 기능 (OpenAI GPT)
// ================================================
(function() {
  const OPENAI_KEY = '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';

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('aiRefineBtn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const titleEl   = document.getElementById('fTitle');
      const contentEl = document.getElementById('fContent');
      const title   = (titleEl?.value || '').trim();
      const content = (contentEl?.value || '').trim();

      if (!content) { toast('먼저 상황 내용을 입력해주세요!'); return; }

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-circle-notch ai-spinner"></i> AI가 다듬는 중...';

      try {
        const res = await fetch('/.netlify/functions/ai-refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        });

        if (!res.ok) throw new Error('API 오류: ' + res.status);
        const parsed = await res.json();

        if (parsed.title && titleEl)   titleEl.value   = parsed.title;
        if (parsed.content && contentEl) {
          contentEl.value = parsed.content;
          const cc = document.getElementById('charCount');
          if (cc) cc.textContent = contentEl.value.length;
        }

        toast('✨ AI가 내용을 다듬었어요!');

      } catch(e) {
        console.error('AI 오류:', e);
        toast('AI 다듬기에 실패했어요. 다시 시도해주세요.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '✨ AI로 내용 다듬기';
      }
    });
  });
})();
