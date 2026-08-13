/* ===== FAT 2급 문제풀이 엔진 ===== */
(function(){
  "use strict";
  var NUM = ['①','②','③','④','⑤'];
  var STORE_KEY = 'fat2_progress_v1';
  var state = { tab:'past', kind:'all', flag:null, round:'all' };
  var progress = load();

  function load(){ try{ return JSON.parse(localStorage.getItem(STORE_KEY))||{}; }catch(e){ return {}; } }
  function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(progress)); }catch(e){} }

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
    '세금과공과':'세금과공과금','대손상각비':'대손상각비','기타의대손상각비':'기타의대손상각비',
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
    s = s.replace(/^\d+[.\s]?/,'');       // 813. 코드 제거
    s = s.replace(/원$/,'');
    s = s.replace(/[()（）·ㆍ]/g,'');       // 괄호 등 제거
    if(SYN[s]) return SYN[s];
    // 괄호 안 표기까지 붙은 경우 대비
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
    if(state.kind!=='all') arr = arr.filter(function(q){ return q.kind===state.kind; });
    if(state.flag==='heart') arr = arr.filter(function(q){ return q.heart; });
    if(state.flag==='star') arr = arr.filter(function(q){ return (q.star||0)>=2; });
    if(state.tab==='past' && state.round!=='all') arr = arr.filter(function(q){ return String(q.round)===String(state.round); });
    return arr;
  }

  /* ---------- 렌더 ---------- */
  var area = document.getElementById('quizArea');

  function starStr(n){ n=n||0; var s=''; for(var i=0;i<n;i++) s+='★'; return s; }

  function render(){
    var list = currentList();
    area.innerHTML = '';
    var cnt = document.createElement('div');
    cnt.className='countline';
    cnt.textContent = '총 '+list.length+'문제';
    area.appendChild(cnt);
    if(!list.length){
      var e=document.createElement('div'); e.className='emptymsg'; e.textContent='해당 조건의 문제가 없어요.';
      area.appendChild(e); updateScore(); return;
    }
    list.forEach(function(q){ area.appendChild(q.kind==='journal'?journalCard(q):theoryCard(q)); });
    updateScore();
  }

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
    card.classList.remove('answered-ok','answered-no');
    card.classList.add(ok?'answered-ok':'answered-no');
  }

  /* ----- 이론 카드 ----- */
  function theoryCard(q){
    var card=document.createElement('div'); card.className='card'; card.dataset.id=q.id;
    card.appendChild(metaRow(q));
    var qt=document.createElement('div'); qt.className='qtext'; qt.textContent=q.q; card.appendChild(qt);
    if(q.data) card.appendChild(dataBox(q.data));
    var opts=document.createElement('div'); opts.className='opts';
    var picked={v:-1};
    q.opts.forEach(function(text,i){
      var o=document.createElement('button'); o.className='opt'; o.type='button';
      var n=document.createElement('span'); n.className='onum'; n.textContent=NUM[i];
      var t=document.createElement('span'); t.textContent=text;
      o.appendChild(n); o.appendChild(t);
      o.addEventListener('click',function(){
        if(card.dataset.locked) return;
        picked.v=i;
        opts.querySelectorAll('.opt').forEach(function(x){x.classList.remove('sel');});
        o.classList.add('sel');
      });
      opts.appendChild(o);
    });
    card.appendChild(opts);
    var res=document.createElement('div'); res.className='result';
    var act=document.createElement('div'); act.className='qactions';
    var chk=document.createElement('button'); chk.className='btn btn-check'; chk.textContent='정답 확인';
    act.appendChild(chk); card.appendChild(act); card.appendChild(res);

    chk.addEventListener('click',function(){
      if(card.dataset.locked) return;
      if(picked.v<0){ alert('보기를 먼저 선택해 주세요.'); return; }
      card.dataset.locked='1';
      var ok = picked.v===q.ans;
      var optEls=opts.querySelectorAll('.opt');
      optEls.forEach(function(x,i){
        x.classList.add('locked');
        if(i===q.ans) x.classList.add('correct');
        if(i===picked.v && !ok) x.classList.add('wrong');
      });
      res.className='result show '+(ok?'ok':'no');
      res.innerHTML='';
      var h=document.createElement('div'); h.className='rhead'; h.textContent=ok?'⭕ 정답이에요!':'❌ 틀렸어요';
      res.appendChild(h);
      var a=document.createElement('div'); a.innerHTML='정답: <b>'+NUM[q.ans]+' '+escapeHtml(q.opts[q.ans])+'</b>'; res.appendChild(a);
      if(!ok && q.why) res.appendChild(whyBox(q.why));
      else if(q.why){ // 맞아도 해설 보기 토글
        var tog=document.createElement('button'); tog.className='btn btn-ghost'; tog.style.marginTop='8px'; tog.textContent='해설 보기';
        tog.addEventListener('click',function(){ if(!res.querySelector('.why')) res.appendChild(whyBox(q.why)); tog.remove(); });
        res.appendChild(tog);
      }
      chk.disabled=true;
      record(q.id,ok); markAnswered(card,ok); updateScore();
    });
    restoreMark(card,q.id);
    return card;
  }

  /* ----- 분개 카드 ----- */
  function journalCard(q){
    var card=document.createElement('div'); card.className='card'; card.dataset.id=q.id;
    card.appendChild(metaRow(q));
    if(q.date){ var dt=document.createElement('div'); dt.className='qtext'; dt.textContent='['+q.date+'] '+q.q; card.appendChild(dt); }
    else { var qt=document.createElement('div'); qt.className='qtext'; qt.textContent=q.q; card.appendChild(qt); }
    if(q.data) card.appendChild(dataBox(q.data));

    var table=document.createElement('div'); table.className='jtable';
    var head=document.createElement('div'); head.className='jrow';
    ['구분','계정과목','거래처','금액',''].forEach(function(t){ var h=document.createElement('div'); h.className='jhead'; h.textContent=t; head.appendChild(h); });
    table.appendChild(head);
    var rowsWrap=document.createElement('div'); table.appendChild(rowsWrap);
    function addRow(side){
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
      // 금액 콤마 자동
      var amt=row.querySelector('.amt');
      amt.addEventListener('input',function(){
        var caretEnd = amt.selectionStart===amt.value.length;
        var n=amt.value.replace(/[^\d]/g,'');
        amt.value = n? Number(n).toLocaleString('en-US'):'';
      });
      rowsWrap.appendChild(row);
    }
    addRow('차'); addRow('대');
    var add=document.createElement('button'); add.className='addrow'; add.type='button'; add.textContent='＋ 행 추가';
    add.addEventListener('click',function(){ if(card.dataset.locked) return; addRow('차'); });
    table.appendChild(add);
    card.appendChild(table);

    var res=document.createElement('div'); res.className='result';
    var act=document.createElement('div'); act.className='qactions';
    var chk=document.createElement('button'); chk.className='btn btn-check'; chk.textContent='정답 확인';
    var clr=document.createElement('button'); clr.className='btn btn-ghost'; clr.textContent='지우기';
    act.appendChild(chk); act.appendChild(clr); card.appendChild(act); card.appendChild(res);

    clr.addEventListener('click',function(){ if(card.dataset.locked) return; rowsWrap.querySelectorAll('input').forEach(function(i){i.value='';}); });

    chk.addEventListener('click',function(){
      if(card.dataset.locked) return;
      var user=[];
      rowsWrap.querySelectorAll('.jrow').forEach(function(r){
        var side=r.querySelector('.side').value;
        var acc=normAcc(r.querySelector('.acc').value);
        var amt=normAmt(r.querySelector('.amt').value);
        if(acc==='' && isNaN(amt)) return; // 빈 행 무시
        user.push({s:side,acc:acc,amt:amt});
      });
      if(!user.length){ alert('분개를 입력해 주세요.'); return; }
      var ok = compareEntries(user, q.ans.entries);
      card.dataset.locked='1';
      res.className='result show '+(ok?'ok':'no');
      res.innerHTML='';
      var h=document.createElement('div'); h.className='rhead'; h.textContent=ok?'⭕ 정답이에요!':'❌ 다시 볼까요?';
      res.appendChild(h);
      res.appendChild(modelTable(q.ans.entries));
      if(!ok && q.why) res.appendChild(whyBox(q.why));
      else if(q.why){
        var tog=document.createElement('button'); tog.className='btn btn-ghost'; tog.style.marginTop='8px'; tog.textContent='해설 보기';
        tog.addEventListener('click',function(){ if(!res.querySelector('.why')) res.appendChild(whyBox(q.why)); tog.remove(); });
        res.appendChild(tog);
      }
      chk.disabled=true;
      record(q.id,ok); markAnswered(card,ok); updateScore();
    });
    restoreMark(card,q.id);
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
      tr.innerHTML='<td class="mside '+e.s+'">('+e.s+')</td>'+
        '<td>'+escapeHtml(e.acc)+(e.p?' <span class="mpart">['+escapeHtml(e.p)+']</span>':'')+'</td>'+
        '<td class="mamt">'+Number(e.amt).toLocaleString('en-US')+'원</td>';
      tbl.appendChild(tr);
    });
    box.appendChild(tbl);
    return box;
  }

  function whyBox(txt){
    var w=document.createElement('div'); w.className='why';
    var l=document.createElement('span'); l.className='wlabel'; l.textContent='🧒 쉽게 이해하기';
    w.appendChild(l); w.appendChild(document.createTextNode(txt));
    return w;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  /* ---------- 진행상태 ---------- */
  function record(id,ok){ progress[id]={ok:ok}; save(); }
  function restoreMark(card,id){
    var p=progress[id];
    if(p){ /* 이전 결과 표시만 하고, 다시 풀 수 있게 잠그진 않음 */ markAnswered(card, p.ok); }
  }
  function updateScore(){
    var ids=Object.keys(progress); var done=ids.length; var correct=0;
    ids.forEach(function(k){ if(progress[k].ok) correct++; });
    document.getElementById('scoreText').textContent='푼 문제 '+done+' · 정답 '+correct;
  }

  /* ---------- 컨트롤 ---------- */
  document.getElementById('mainTabs').addEventListener('click',function(e){
    var b=e.target.closest('.tab'); if(!b) return;
    state.tab=b.dataset.tab;
    document.querySelectorAll('#mainTabs .tab').forEach(function(x){x.classList.toggle('active',x===b);});
    document.getElementById('roundRow').style.display = state.tab==='past'?'flex':'none';
    render();
  });

  document.getElementById('filters').addEventListener('click',function(e){
    var c=e.target.closest('.chip'); if(!c) return;
    if(c.dataset.kind){
      state.kind=c.dataset.kind; state.flag=null;
      setActive(c,'[data-kind]');
      document.querySelectorAll('#filters .chip[data-flag]').forEach(function(x){x.classList.remove('active');});
    } else if(c.dataset.flag){
      if(c.classList.contains('active')){ c.classList.remove('active'); state.flag=null; }
      else { document.querySelectorAll('#filters .chip[data-flag]').forEach(function(x){x.classList.remove('active');}); c.classList.add('active'); state.flag=c.dataset.flag; }
    }
    render();
  });
  function setActive(el,sel){ document.querySelectorAll('#filters .chip'+sel).forEach(function(x){x.classList.toggle('active',x===el);}); }

  var roundSel=document.getElementById('roundSelect');
  roundSel.addEventListener('change',function(){ state.round=roundSel.value; render(); });

  document.getElementById('resetBtn').addEventListener('click',function(){
    if(confirm('풀이 기록을 모두 지울까요?')){ progress={}; save(); render(); }
  });

  function buildRoundOptions(){
    var rounds={};
    (window.FAT_DATA||[]).forEach(function(q){ if(q.tab==='past'&&q.round) rounds[q.round]=1; });
    Object.keys(rounds).map(Number).sort(function(a,b){return b-a;}).forEach(function(r){
      var o=document.createElement('option'); o.value=r; o.textContent='제'+r+'회'; roundSel.appendChild(o);
    });
  }

  /* ---------- init ---------- */
  buildRoundOptions();
  render();
})();
