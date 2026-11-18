(function(){
var search=document.getElementById('search');
var count=document.getElementById('count');
var sessions=Array.prototype.slice.call(document.querySelectorAll('.session'));
var activeFilter='';
function apply(){
  var q=(search?search.value:'').toLowerCase().trim();
  var shown=0;
  sessions.forEach(function(el){
    var hay=el.getAttribute('data-search')||'';
    var ok=(!q||hay.indexOf(q)>-1)&&(!activeFilter||hay.indexOf(activeFilter.toLowerCase())>-1);
    el.style.display=ok?'':'none';
    if(ok)shown++;
  });
  if(count)count.textContent='Showing '+shown+' of '+sessions.length+' sessions';
}
if(search)search.addEventListener('input',apply);
document.querySelectorAll('#chips .chip').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('#chips .chip').forEach(function(x){x.classList.remove('active')});
    b.classList.add('active');
    activeFilter=b.getAttribute('data-filter')||'';
    apply();
  });
});
function setAll(open){
  sessions.forEach(function(el){ if(el.style.display!=='none') el.open=open; });
}
var ex=document.getElementById('expandAll'); if(ex)ex.addEventListener('click',function(){setAll(true)});
var co=document.getElementById('collapseAll'); if(co)co.addEventListener('click',function(){setAll(false)});
function nextSession(){
  var today=new Date(); today.setHours(0,0,0,0);
  var best=null;
  sessions.forEach(function(el){
    var d=el.getAttribute('data-date'); if(!d)return;
    var dt=new Date(d+'T00:00:00');
    if(dt>=today&&(!best||dt<new Date(best.getAttribute('data-date')+'T00:00:00')))best=el;
  });
  var banner=document.getElementById('nextBanner');
  if(best){
    if(banner){banner.hidden=false;banner.innerHTML='Next session: <strong>'+best.querySelector('.s-title').textContent+'</strong> — '+best.querySelector('.s-date').textContent+' (<a href="#'+best.id+'">open it</a>)';}
    return best;
  }
  if(banner){banner.hidden=false;banner.textContent='All dated sessions in this plan are in the past.';}
  return null;
}
var nb=document.getElementById('nextBtn');
if(nb)nb.addEventListener('click',function(){
  var el=nextSession();
  if(el){el.style.display='';el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});}
});
nextSession();
apply();
// Open a session from a #gin-s12 / #yim-s45 link
if(location.hash){
  var t=document.querySelector(location.hash);
  if(t){t.open=true;}
}
})();
