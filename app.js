(function(){
function init(){
var search=document.getElementById('search');
var count=document.getElementById('count');
/* --- home page: filter the coders table --- */
var coderSearch=document.getElementById('coderSearch');
if(coderSearch){
  coderSearch.addEventListener('input',function(){
    var q=coderSearch.value.toLowerCase().trim();
    document.querySelectorAll('.coders-table tbody tr').forEach(function(r){
      r.style.display=(!q||(r.getAttribute('data-search')||'').indexOf(q)>-1)?'':'none';
    });
  });
}
var sessions=Array.prototype.slice.call(document.querySelectorAll('.session'));
if(!sessions.length) return;
var activeFilter='';
var today=new Date(); today.setHours(0,0,0,0);
function sdate(el){var d=el.getAttribute('data-date');return d?new Date(d+'T00:00:00'):null;}

/* --- group of each session is baked in as data-group (Week / Phase / Unit) --- */
var weeks=[]; var weekOf={};
sessions.forEach(function(el){
  var g=el.getAttribute('data-group')||'Sessions';
  weekOf[el.id]=g; if(weeks.indexOf(g)<0)weeks.push(g);
});
var heads=Array.prototype.slice.call(document.querySelectorAll('#sessions > h3[data-group]'));

/* --- status badges + next session --- */
var nextEl=null;
sessions.forEach(function(el){
  var d=sdate(el); if(!d)return;
  var st=document.createElement('span'); st.className='s-status';
  if(d<today){st.classList.add('done'); st.textContent='Done';}
  else{st.classList.add('upcoming'); st.textContent='Upcoming';}
  var sum=el.querySelector('summary'); if(sum)sum.appendChild(st);
  if(d>=today && (!nextEl || d<sdate(nextEl))) nextEl=el;
});
if(nextEl){
  var st=nextEl.querySelector('.s-status'); if(st){st.className='s-status next'; st.textContent='Next';}
  var banner=document.getElementById('nextBanner');
  if(banner){banner.hidden=false; banner.innerHTML='Next session: <strong>'+nextEl.querySelector('.s-title').textContent+'</strong> \u2014 '+nextEl.querySelector('.s-date').textContent+' (<a href="#" id="nextOpen">open it</a>)';
    var no=document.getElementById('nextOpen'); if(no)no.addEventListener('click',function(e){e.preventDefault(); openModal(nextEl);});}
}
var nb=document.getElementById('nextBtn');
if(nb)nb.addEventListener('click',function(){ if(nextEl){showWeek(weekOf[nextEl.id]); openModal(nextEl);} });

/* --- week navigation: show ONE week at a time --- */
var weekSelect=document.getElementById('weekSelect');
var prevBtn=document.getElementById('prevWeek');
var nextBtn2=document.getElementById('nextWeekBtn');
var allBtn=document.getElementById('allWeeksBtn');
var mode='week'; var currentWeek=nextEl?weekOf[nextEl.id]:weeks[0];
if(weekSelect){
  weeks.forEach(function(w){var o=document.createElement('option'); o.value=w; o.textContent=w; weekSelect.appendChild(o);});
  weekSelect.value=currentWeek;
  weekSelect.addEventListener('change',function(){showWeek(weekSelect.value);});
}
if(prevBtn)prevBtn.addEventListener('click',function(){stepWeek(-1);});
if(nextBtn2)nextBtn2.addEventListener('click',function(){stepWeek(1);});
if(allBtn)allBtn.addEventListener('click',function(){mode='all'; apply();});
function stepWeek(dir){
  var i=weeks.indexOf(currentWeek); var j=i+dir;
  if(j<0||j>=weeks.length)return; showWeek(weeks[j]);
}
function showWeek(w){
  mode='week'; currentWeek=w;
  if(search)search.value=''; activeFilter='';
  document.querySelectorAll('#chips .chip').forEach(function(x){x.classList.toggle('active',!x.getAttribute('data-filter'));});
  if(weekSelect)weekSelect.value=w;
  apply();
}
function searching(){return (search&&search.value.trim())||activeFilter;}

/* --- modal: session details open in a panel, page never grows --- */
var modal=document.getElementById('sessionModal');
var modalBody=document.getElementById('modalBody');
var modalTitle=document.getElementById('modalTitle');
var modalMeta=document.getElementById('modalMeta');
function openModal(el){
  if(!modal||!modalBody)return;
  var body=el.querySelector('.s-body');
  modalTitle.textContent=el.querySelector('.s-title').textContent;
  var num=el.querySelector('.s-num').textContent;
  var meta=el.querySelector('.s-meta')?el.querySelector('.s-meta').textContent:'';
  modalMeta.textContent=num+' \u00b7 '+(meta.split('|')[0].trim());
  modalBody.innerHTML=''; if(body)modalBody.appendChild(body.cloneNode(true));
  modalBody.querySelectorAll('.s-body').forEach(function(b){b.style.display='block';});
  modalBody.scrollTop=0;
  if(typeof modal.showModal==='function')modal.showModal(); else modal.setAttribute('open',''); document.body.style.overflow='hidden';
}
if(modal){
  var closeBtn=document.getElementById('modalClose');
  if(closeBtn)function closeModal(){if(modal.close)modal.close();else modal.removeAttribute('open'); document.body.style.overflow='';}
  modal.addEventListener('close',function(){document.body.style.overflow='';});
  closeBtn.addEventListener('click',closeModal);
  modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});
}
sessions.forEach(function(el){
  var sum=el.querySelector('summary');
  if(sum)sum.addEventListener('click',function(e){e.preventDefault(); openModal(el);});
});

/* --- filtering / visibility --- */
function apply(){
  var q=(search?search.value:'').toLowerCase().trim();
  var shown=0;
  var useAll = mode==='all' || !!q || !!activeFilter;
  sessions.forEach(function(el){
    var hay=el.getAttribute('data-search')||'';
    var match=(!q||hay.indexOf(q)>-1)&&(!activeFilter||hay.indexOf(activeFilter.toLowerCase())>-1);
    var inWeek = weekOf[el.id]===currentWeek;
    var ok = useAll ? match : inWeek;
    el.style.display=ok?'':'none';
    if(ok)shown++;
  });
  heads.forEach(function(h){
    var w=h.getAttribute('data-group');
    var any=sessions.some(function(el){return weekOf[el.id]===w && el.style.display!=='none';});
    h.style.display=any?'':'none';
  });
  if(count){count.textContent = useAll ? ('Showing '+shown+' of '+sessions.length+' sessions'+(q||activeFilter?' (search / filter \u2014 clear to go back to one group at a time)':'')) : ''; count.style.display = useAll ? '' : 'none';}
  if(prevBtn)prevBtn.disabled = weeks.indexOf(currentWeek)<=0;
  if(nextBtn2)nextBtn2.disabled = weeks.indexOf(currentWeek)>=weeks.length-1;
  if(weekSelect)weekSelect.disabled = !!useAll && !!(q||activeFilter);
}
if(search)search.addEventListener('input',apply);
document.querySelectorAll('#chips .chip').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('#chips .chip').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active');
    activeFilter=b.getAttribute('data-filter')||'';
    apply();
  });
});
apply();
/* deep link #yim-s12 opens that session's panel */
if(location.hash){
  var t=document.querySelector(location.hash);
  if(t && t.classList.contains('session')){showWeek(weekOf[t.id]); openModal(t);}
}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();