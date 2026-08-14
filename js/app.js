/* ===== FAT 2급 문제풀이 엔진 ===== */
(function(){
  "use strict";
  var NUM = ['①','②','③','④','⑤'];
  var STORE_KEY = 'fat2_progress_v1';
  var VIEW_KEY  = 'fat2_view_v1';
  var PER_PAGE = 20;
  var state = { tab:'past', kind:'all', star:0, heart:false, round:'all', page:1 };
  var progress = load();

  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY))||{}; }catch(e){ return {}; } }
  function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }catch(e){} }

  /* 마지막으로 보던 탭/필터/회차/페이지 기억 */
  function saveView(){
    try{ localStorage.setItem(VIEW_KEY, JSON.stringify({tab:state.tab,kind:state.kind,star:state.star,heart:state.heart,round:state.round,page:state.page})); }catch(e){}
  }
  function restoreView(){
    var v; try{ v=JSON.parse(localStorage.getItem(VIEW_KEY)); }catch(e){ v=null; }
    if(!v) return;
    if(v.tab==='past'||v.tab==='deep') state.tab=v.tab;
    if(v.kind && document.querySelector('#filters .chip[data-kind="'+v.kind+'"]')) state.kind=v.kind;
    if(v.star>=0 && v.star<=3) state.star=v.star|0;
    state.heart = !!v.heart;
    if(v.page>0) state.page=v.page;
    if(v.round && v.round!=='all'){
      var has=[].some.call(roundSel.options,function(o){ return o.value===String(v.round); });
      if(has) state.round=String(v.round);
    }
    document.querySelectorAll('#mainTabs .tab').forEach(function(x){ x.classList.toggle('active', x.dataset.tab===state.tab); });
    document.querySelectorAll('#filters .chip[data-kind]').forEach(function(x){ x.classList.toggle('active', x.dataset.kind===state.kind); });
    document.querySelectorAll('#filters .chip[data-star]').forEach(function(x){ x.classList.toggle('active', +x.dataset.star===state.star); });
    document.querySelectorAll('#filters .chip[data-heart]').forEach(function(x){ x.classList.toggle('active', (x.dataset.heart==='1')===state.heart); });
    document.getElementById('roundRow').style.display = state.tab==='past'?'flex':'none';
    roundSel.value = state.round;
  }

  /* ---------- 계정과목/금액 정규화 ---------- */
  var SYN = {
    '접대비':'접대비','기업업무추진비':'접대비','접대비기업업무추진비':'접대비',
    '단기매매증권처분익':'단기매매증권처분이익',
    '단기매매증권처분이익':'단기매매증권처분이익',
    '단기매매증권처분손실':'단기매매증권처분손실',
    '세금과공과':'세금과공과금','세금과공과금':'세금과공과금',
    '급여':'급여','종업원급여':'급여',
    '외상매출금':'외상매출금','외상매입금':'외상매입금',
    '받을어음':'받을어음','지급어음':'지급어음',
    '보통예금':'보통예금','당좌예금':'당좌예금','현금':'현금',
    '단기매매증권':'단기매매증권','상품':'상품','상품매출':'상품매출',
    '상품매출원가':'상품매출원가','매출원가':'상품매출원가',
    '미수금':'미수금','미지급금':'미지급금','미수수익':'미수수익','미지급비용':'미지급비용',
    '선급금':'선급금','선수금':'선수금','선급비용':'선급비용','선수수익':'선수수익',
    '가지급금':'가지급금','가수금':'가수금','예수금':'예수금',
    '이자비용':'이자비용','이자수익':'이자수익','수수료비용':'수수료비용',
    '복리후생비':'복리후생비','여비교통비':'여비교통비','운반비':'운반비',
    '광고선전비':'광고선전비','도서인쇄비':'도서인쇄비','교육훈련비':'교육훈련비',
    '차량유지비':'차량유지비','차량운반구':'차량운반구','소모품비':'소모품비',
    '사무용품비':'사무용품비','통신비':'통신비','보험료':'보험료','수선비':'수선비',
    '대손상각비':'대손상각비','기타의대손상각비':'기타의대손상각비',
    '대손충당금':'대손충당금','감가상각누계액':'감가상각누계액','감가상각비':'감가상각비',
    '비품':'비품','건물':'건물','토지':'토지','소프트웨어':'소프트웨어',
    '단기대여금':'단기대여금','장기대여금':'장기대여금','단기차입금':'단기차입금','장기차입금':'장기차입금',
    '임차보증금':'임차보증금','임대보증금':'임대보증금','장기임대보증금':'임대보증금',
    '기부금':'기부금','잡손실':'잡손실','잡이익':'잡이익','현금과부족':'현금과부족',
    '인출금':'인출금','잡급':'잡급','매출채권처분손실':'매출채권처분손실'
  };
  function normAcc(s){
    if(!s) return '';
    s = String(s).trim().replace(/\s+/g,'');
    s = s.replace(/^\d+[.\s]?/,'');
    s = s.replace(/원$/,'');
    s = s.replace(/[()（）·ㆍ]/g,'');
    if(SYN[s]) return SYN[s];
    return s;
  }
  function normAmt(v){
    if(v===null||v===undefined) return NaN;
    var n = String(v).replace(/[,\s원]/g,'');
    if(n==='') return NaN;
    return parseInt(n,10);
  }

  /* ---------- 데이터 조회 ---------- */
  function currentList(){
    var arr = (window.FAT_DATA||[]).filter(function(q){ return q.tab===state.tab; });
    if(state.kind==='close') arr = arr.filter(function(q){ return q.closing; });        // 결산정리·결산절차만
    else if(state.kind!=='all') arr = arr.filter(function(q){ return q.kind===state.kind; });
    if(state.star>0) arr = arr.filter(function(q){ return (q.star||0) >= state.star; }); // 출제빈도 ★N 이상
    if(state.heart) arr = arr.filter(function(q){ return !!q.heart; });                  // 92회 예상만
    if(state.tab==='past' && state.round!=='all') arr = arr.filter(function(q){ return String(q.round)===String(state.round); });
    return arr;
  }

  /* ---------- 렌더 ---------- */
  var area = document.getElementById('quizArea');

  function render(scrollTop){
    var list = currentList();
    var pages = Math.max(1, Math.ceil(list.length/PER_PAGE));
    if(state.page>pages) state.page=pages;
    if(state.page<1) state.page=1;
    area.innerHTML='';

    var cnt=document.createElement('div'); cnt.className='countline';
    cnt.textContent='총 '+list.length+'문제 · '+state.page+'/'+pages+' 페이지 (한 페이지 '+PER_PAGE+'문제)';
    area.appendChild(cnt);

    if(!list.length){
      var e=document.createElement('div'); e.className='emptymsg'; e.textContent='조회조건에 맞는 문제가 없어요. 위 조건을 바꿔보세요.';
      area.appendChild(e); updateScore(); saveView(); return;
    }
    area.appendChild(pagerEl(pages));
    var start=(state.page-1)*PER_PAGE;
    list.slice(start, start+PER_PAGE).forEach(function(q,idx){
      var card = q.kind==='journal'?journalCard(q):theoryCard(q);
      var order=document.createElement('span'); // 번호 표시용 (선택)
      card.dataset.seq=start+idx+1;
      area.appendChild(card);
    });
    area.appendChild(pagerEl(pages));
    updateScore();
    saveView();
    if(scrollTop) window.scrollTo(0,0);
  }

  function pagerEl(pages){
    var wrap=document.createElement('div'); wrap.className='pager';
    if(pages<=1) return wrap;
    function pbtn(label,page,opts){
      var b=document.createElement('button'); b.textContent=label;
      if(opts&&opts.cur) b.className='cur';
      if(opts&&opts.disabled) b.disabled=true;
      else b.addEventListener('click',function(){ state.page=page; render(true); });
      return b;
    }
    wrap.appendChild(pbtn('‹', state.page-1, {disabled:state.page===1}));
    var nums=[];
    if(pages<=9){ for(var i=1;i<=pages;i++) nums.push(i); }
    else {
      nums.push(1);
      var lo=Math.max(2,state.page-1), hi=Math.min(pages-1,state.page+1);
      if(lo>2) nums.push('…');
      for(var j=lo;j<=hi;j++) nums.push(j);
      if(hi<pages-1) nums.push('…');
      nums.push(pages);
    }
    nums.forEach(function(n){
      if(n==='…'){ var s=document.createElement('span'); s.className='ell'; s.textContent='…'; wrap.appendChild(s); }
      else wrap.appendChild(pbtn(String(n), n, {cur:n===state.page}));
    });
    wrap.appendChild(pbtn('›', state.page+1, {disabled:state.page===pages}));
    return wrap;
  }

  function starStr(n){ n=n||0; var s=''; for(var i=0;i<n;i++) s+='⭐'; return s; }
  function metaRow(q){
    var m=document.createElement('div'); m.className='meta';
    if(q.tab==='past'){ var r=document.createElement('span'); r.className='badge b-round'; r.textContent=q.round+'회'; m.appendChild(r); }
    var k=document.createElement('span'); k.className='badge '+(q.kind==='journal'?'b-kind-j':'b-kind-t'); k.textContent=(q.kind==='journal'?'분개':'이론'); m.appendChild(k);
    var c=document.createElement('span'); c.className='badge b-cat'; c.textContent=q.cat; m.appendChild(c);
    if(q.star){ var s=document.createElement('span'); s.className='b-star'; s.textContent=starStr(q.star); s.title='빈출도 '+q.star; m.appendChild(s); }
    if(q.heart){ var h=document.createElement('span'); h.className='b-heart'; h.textContent='❤️'; h.title='92회 예상'; m.appendChild(h); }
    var no=document.createElement('span'); no.className='qno'; no.textContent=q.no||''; m.appendChild(no);
    return m;
  }

  function dataBox(txt){
    var d=document.createElement('div'); d.className='databox';
    var l=document.createElement('span'); l.className='dlabel'; l.textContent='자료'; d.appendChild(l);
    d.appendChild(document.createTextNode('\n'+txt));
    return d;
  }
  function markAnswered(card,ok){
    card.classList.remove('answered-ok','answered-no','answered-seen');
    if(ok===true) card.classList.add('answered-ok');
    else if(ok===false) card.classList.add('answered-no');
    else card.classList.add('answered-seen');
  }

  /* ----- 이론 카드 (보기 클릭 = 즉시 채점) ----- */
  function theoryCard(q){
    var card=document.createElement('div'); card.className='card'; card.dataset.id=q.id;
    card.appendChild(metaRow(q));
    var qt=document.createElement('div'); qt.className='qtext'; qt.textContent=q.q; card.appendChild(qt);
    if(q.data) card.appendChild(dataBox(q.data));
    var opts=document.createElement('div'); opts.className='opts';
    var res=document.createElement('div'); res.className='result';
    var act=document.createElement('div'); act.className='qactions';
    var dunno=document.createElement('button'); dunno.className='btn btn-ghost'; dunno.textContent='🙈 모르겠어요 · 정답 보기';

    function grade(picked, replay){ // picked: 보기 index, -1이면 '모르겠어요' / replay: 저장된 기록 복원
      if(card.dataset.locked) return;
      card.dataset.locked='1';
      var els=opts.querySelectorAll('.opt');
      els.forEach(function(x){ x.classList.add('locked'); });
      dunno.disabled=true;

      if(picked<0){ // 정답 공개 + 자세한 풀이
        els[q.ans].classList.add('correct');
        res.className='result show reveal'; res.innerHTML='';
        addHead(res,'🙌 정답을 알려줄게요');
        addAnsLine(res,q);
        res.appendChild(whyBox(q.why,'🧒 차근차근 풀이'));
        markAnswered(card,null);
        if(!replay){ record(q.id,null,{pick:-1}); updateScore(); }
        return;
      }
      var ok = picked===q.ans;
      els.forEach(function(x,i){
        if(i===q.ans) x.classList.add('correct');
        if(i===picked && !ok) x.classList.add('wrong');
      });
      res.className='result show '+(ok?'ok':'no'); res.innerHTML='';
      addHead(res, ok?'⭕ 정답이에요!':'❌ 틀렸어요');
      addAnsLine(res,q);
      if(!ok) res.appendChild(whyBox(q.why));
      else {
        var tog=document.createElement('button'); tog.className='btn btn-ghost'; tog.style.marginTop='8px'; tog.textContent='해설 보기';
        tog.addEventListener('click',function(){ if(!res.querySelector('.why')) res.appendChild(whyBox(q.why)); tog.remove(); });
        res.appendChild(tog);
      }
      markAnswered(card,ok);
      if(!replay){ record(q.id,ok,{pick:picked}); updateScore(); }
    }

    q.opts.forEach(function(text,i){
      var o=document.createElement('button'); o.className='opt'; o.type='button';
      var n=document.createElement('span'); n.className='onum'; n.textContent=NUM[i];
      var t=document.createElement('span'); t.textContent=text;
      o.appendChild(n); o.appendChild(t);
      o.addEventListener('click',function(){ grade(i); });
      opts.appendChild(o);
    });
    card.appendChild(opts);
    dunno.addEventListener('click',function(){ grade(-1); });
    act.appendChild(dunno); card.appendChild(act); card.appendChild(res);
    restoreMark(card,q.id);
    var saved=progress[q.id];
    if(saved && typeof saved.pick==='number') grade(saved.pick, true); // 채점 화면 그대로 복원
    return card;
  }
  function addHead(res,txt){ var h=document.createElement('div'); h.className='rhead'; h.textContent=txt; res.appendChild(h); }
  function addAnsLine(res,q){ var a=document.createElement('div'); a.innerHTML='정답: <b>'+NUM[q.ans]+' '+escapeHtml(q.opts[q.ans])+'</b>'; res.appendChild(a); }

  /* ----- 분개 카드 ----- */
  function journalCard(q){
    var card=document.createElement('div'); card.className='card'; card.dataset.id=q.id;
    card.appendChild(metaRow(q));
    var qt=document.createElement('div'); qt.className='qtext';
    qt.textContent=(q.date?('['+q.date+'] '):'')+q.q; card.appendChild(qt);
    if(q.data) card.appendChild(dataBox(q.data));

    var table=document.createElement('div'); table.className='jtable';
    var head=document.createElement('div'); head.className='jrow';
    ['구분','계정과목','거래처','금액',''].forEach(function(t){ var h=document.createElement('div'); h.className='jhead'; h.textContent=t; head.appendChild(h); });
    table.appendChild(head);
    var rowsWrap=document.createElement('div'); table.appendChild(rowsWrap);

    function addRow(side, v, keepOrder){ // v: 저장된 입력값 복원용 / keepOrder: 정렬 없이 그대로 덧붙이기
      var row=document.createElement('div'); row.className='jrow';
      row.innerHTML =
        '<div class="fld"><label>구분</label><select class="side">'+
          '<option value="차"'+(side==='차'?' selected':'')+'>차변</option>'+
          '<option value="대"'+(side==='대'?' selected':'')+'>대변</option></select></div>'+
        '<div class="fld"><label>계정과목</label><input class="acc" type="text" placeholder="예: 보통예금" autocomplete="off"></div>'+
        '<div class="fld"><label>거래처</label><input class="part" type="text" placeholder="(선택)" autocomplete="off"></div>'+
        '<div class="fld"><label>금액</label><input class="amt" type="text" inputmode="numeric" placeholder="0"></div>'+
        '<button class="delrow" type="button" title="행 삭제">✕</button>';
      row.querySelector('.delrow').addEventListener('click',function(){ if(card.dataset.locked) return; if(rowsWrap.children.length>1) row.remove(); });
      var amt=row.querySelector('.amt');
      amt.addEventListener('input',function(){
        var n=amt.value.replace(/[^\d]/g,'');
        amt.value = n? Number(n).toLocaleString('en-US'):'';
      });
      if(v){
        row.querySelector('.side').value = v.s || side;
        row.querySelector('.acc').value  = v.acc || '';
        row.querySelector('.part').value = v.p || '';
        amt.value = v.amt || '';
      }
      if(keepOrder) rowsWrap.appendChild(row); // 저장된 기록 복원: 적어둔 순서 그대로
      else placeRow(row, side);
    }
    /* 차변은 차변끼리, 대변은 대변끼리 모이도록 끼워넣기 */
    function placeRow(row, side){
      var last=null;
      [].forEach.call(rowsWrap.children,function(r){
        var s=r.querySelector('.side');
        if(s && s.value===side) last=r;
      });
      if(last) rowsWrap.insertBefore(row, last.nextSibling);      // 같은 구분의 마지막 행 바로 아래
      else if(side==='차') rowsWrap.insertBefore(row, rowsWrap.firstChild); // 차변이 없으면 맨 위
      else rowsWrap.appendChild(row);                             // 대변이 없으면 맨 아래
    }
    addRow('차'); addRow('대');

    var adds=document.createElement('div'); adds.className='addrows';
    var addD=document.createElement('button'); addD.className='addrow'; addD.type='button'; addD.textContent='＋ 차변 추가';
    var addC=document.createElement('button'); addC.className='addrow'; addC.type='button'; addC.textContent='＋ 대변 추가';
    addD.addEventListener('click',function(){ if(card.dataset.locked) return; addRow('차'); });
    addC.addEventListener('click',function(){ if(card.dataset.locked) return; addRow('대'); });
    adds.appendChild(addD); adds.appendChild(addC);
    table.appendChild(adds);
    card.appendChild(table);

    var res=document.createElement('div'); res.className='result';
    var act=document.createElement('div'); act.className='qactions';
    var chk=document.createElement('button'); chk.className='btn btn-check'; chk.textContent='정답 확인';
    var clr=document.createElement('button'); clr.className='btn btn-ghost'; clr.textContent='지우기';
    act.appendChild(chk); act.appendChild(clr); card.appendChild(act); card.appendChild(res);

    /* 지우기: 입력을 비운다. 이미 채점한 문제면 잠금까지 풀어 다시 풀 수 있게 한다 */
    clr.addEventListener('click',function(){
      rowsWrap.querySelectorAll('input').forEach(function(i){ i.value=''; });
      rowsWrap.querySelectorAll('input,select').forEach(function(x){ x.disabled=false; });
      if(!card.dataset.locked) return;
      delete card.dataset.locked;
      chk.disabled=false;
      res.className='result'; res.innerHTML='';
      card.classList.remove('answered-ok','answered-no','answered-seen');
      forget(q.id); updateScore();
    });

    function doCheck(replay){ // replay: 저장된 기록 복원(재채점·재저장 안 함)
      if(card.dataset.locked) return;
      var user=[], raw=[];
      rowsWrap.querySelectorAll('.jrow').forEach(function(r){
        var side=r.querySelector('.side').value;
        var accRaw=r.querySelector('.acc').value, partRaw=r.querySelector('.part').value, amtRaw=r.querySelector('.amt').value;
        raw.push({s:side,acc:accRaw,p:partRaw,amt:amtRaw});
        var acc=normAcc(accRaw);
        var amt=normAmt(amtRaw);
        if(acc==='' && isNaN(amt)) return;
        user.push({s:side,acc:acc,amt:amt});
      });
      card.dataset.locked='1'; chk.disabled=true;
      rowsWrap.querySelectorAll('input,select').forEach(function(x){ x.disabled=true; });

      if(!user.length){ // 정답 없이 확인 → 정답 공개 + 자세한 풀이(한 줄씩)
        res.className='result show reveal';
        res.innerHTML='';
        addHead(res,'🙌 정답을 알려줄게요');
        res.appendChild(modelTable(q.ans.entries));
        res.appendChild(whyBox(q.why,'🧒 차근차근 풀이'));
        res.appendChild(journalSteps(q.ans.entries));
        markAnswered(card,null);
        if(!replay){ record(q.id,null,{rows:[]}); updateScore(); }
        return;
      }
      var ok = compareEntries(user, q.ans.entries);
      res.className='result show '+(ok?'ok':'no');
      res.innerHTML='';
      addHead(res, ok?'⭕ 정답이에요!':'❌ 다시 볼까요?');
      res.appendChild(modelTable(q.ans.entries));
      if(!ok) res.appendChild(whyBox(q.why));
      else {
        var tog=document.createElement('button'); tog.className='btn btn-ghost'; tog.style.marginTop='8px'; tog.textContent='해설 보기';
        tog.addEventListener('click',function(){ if(!res.querySelector('.why')) res.appendChild(whyBox(q.why)); tog.remove(); });
        res.appendChild(tog);
      }
      markAnswered(card,ok);
      if(!replay){ record(q.id,ok,{rows:raw}); updateScore(); }
    }
    chk.addEventListener('click',function(){ doCheck(false); });

    restoreMark(card,q.id);
    var saved=progress[q.id];
    if(saved && saved.rows){ // 입력값 + 채점 화면 그대로 복원
      if(saved.rows.length){
        rowsWrap.innerHTML='';
        saved.rows.forEach(function(v){ addRow(v.s, v, true); });
      }
      doCheck(true);
    }
    return card;
  }

  function compareEntries(user, ans){
    if(user.length!==ans.length) return false;
    var key=function(e){ return e.s+'|'+normAcc(e.acc)+'|'+normAmt(e.amt); };
    var a=ans.map(key).sort();
    var b=user.map(key).sort();
    for(var i=0;i<a.length;i++){ if(a[i]!==b[i]) return false; }
    return true;
  }
  function modelTable(entries){
    var box=document.createElement('div'); box.className='model';
    var tbl=document.createElement('table');
    entries.forEach(function(e){
      var tr=document.createElement('tr');
      tr.innerHTML='<td class="mside">('+e.s+')</td>'+
        '<td>'+escapeHtml(e.acc)+(e.p?' <span class="mpart">['+escapeHtml(e.p)+']</span>':'')+'</td>'+
        '<td class="mamt">'+Number(e.amt).toLocaleString('en-US')+'원</td>';
      tbl.appendChild(tr);
    });
    box.appendChild(tbl);
    return box;
  }
  function journalSteps(entries){
    var box=document.createElement('div'); box.className='steps';
    var l=document.createElement('span'); l.className='wlabel'; l.textContent='📋 한 줄씩 뜯어보기'; box.appendChild(l);
    var ol=document.createElement('ol'); var d=0,c=0;
    entries.forEach(function(e){
      if(e.s==='차') d+=e.amt; else c+=e.amt;
      var li=document.createElement('li');
      li.textContent='('+e.s+'변) '+e.acc+' '+Number(e.amt).toLocaleString('en-US')+'원 → '+(e.s==='차'?'왼쪽(차변)에 적어요':'오른쪽(대변)에 적어요');
      ol.appendChild(li);
    });
    var sum=document.createElement('li');
    sum.textContent='차변 합계 '+d.toLocaleString('en-US')+'원 = 대변 합계 '+c.toLocaleString('en-US')+'원 (양쪽 금액이 꼭 같아야 해요)';
    ol.appendChild(sum);
    box.appendChild(ol);
    return box;
  }

  function whyBox(txt,label){
    var w=document.createElement('div'); w.className='why';
    var l=document.createElement('span'); l.className='wlabel'; l.textContent=label||'🧒 쉽게 이해하기';
    w.appendChild(l); w.appendChild(document.createTextNode(txt));
    return w;
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  /* ---------- 진행상태 ---------- */
  function record(id,ok,extra){
    var e={ok:ok};
    if(extra) for(var k in extra) e[k]=extra[k];
    progress[id]=e; save();
  }
  function forget(id){ delete progress[id]; save(); }
  function restoreMark(card,id){ var p=progress[id]; if(p) markAnswered(card, p.ok); }
  function updateScore(){
    var done=0, correct=0, seen=0;
    Object.keys(progress).forEach(function(k){
      var p=progress[k];
      if(p.ok===true){ done++; correct++; }
      else if(p.ok===false){ done++; }
      else seen++; // '모르겠어요'로 정답만 본 문제 (정답률에서 제외)
    });
    var t='푼 문제 '+done+' · 정답 '+correct;
    if(seen) t+=' · 👀 정답 본 문제 '+seen;
    document.getElementById('scoreText').textContent=t;
  }

  /* ---------- 컨트롤 ---------- */
  document.getElementById('mainTabs').addEventListener('click',function(e){
    var b=e.target.closest('.tab'); if(!b) return;
    state.tab=b.dataset.tab; state.page=1;
    document.querySelectorAll('#mainTabs .tab').forEach(function(x){x.classList.toggle('active',x===b);});
    document.getElementById('roundRow').style.display = state.tab==='past'?'flex':'none';
    render(true);
  });

  document.getElementById('filters').addEventListener('click',function(e){
    var c=e.target.closest('.chip'); if(!c) return;
    if(c.dataset.kind!==undefined) state.kind=c.dataset.kind;
    else if(c.dataset.star!==undefined) state.star=parseInt(c.dataset.star,10)||0;
    else if(c.dataset.heart!==undefined) state.heart=c.dataset.heart==='1';
    else return;
    state.page=1;
    // 같은 줄 안에서만 선택 표시를 옮긴다
    c.parentNode.querySelectorAll('.chip').forEach(function(x){x.classList.toggle('active',x===c);});
    render(true);
  });

  var roundSel=document.getElementById('roundSelect');
  roundSel.addEventListener('change',function(){ state.round=roundSel.value; state.page=1; render(true); });

  document.getElementById('resetBtn').addEventListener('click',function(){
    if(confirm('풀이 기록을 모두 지울까요?')){ progress={}; save(); render(false); }
  });

  function buildRoundOptions(){
    var rounds={};
    (window.FAT_DATA||[]).forEach(function(q){ if(q.tab==='past'&&q.round) rounds[q.round]=1; });
    Object.keys(rounds).map(Number).sort(function(a,b){return b-a;}).forEach(function(r){
      var o=document.createElement('option'); o.value=r; o.textContent='제'+r+'회'; roundSel.appendChild(o);
    });
  }

  buildRoundOptions();
  restoreView();   // 마지막으로 보던 탭/필터/회차/페이지로 복귀
  render(false);
})();
