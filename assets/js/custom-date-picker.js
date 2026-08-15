(function(){
  const MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const ISO_RE=/^\d{4}-\d{2}-\d{2}$/;
  let active=null;

  function pad(n){return String(n).padStart(2,'0');}
  function todayIso(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function parseIso(value){
    const text=String(value||'').trim();
    if(!ISO_RE.test(text)) return null;
    const y=Number(text.slice(0,4));
    const m=Number(text.slice(5,7));
    const d=Number(text.slice(8,10));
    const date=new Date(y,m-1,d);
    if(date.getFullYear()!==y || date.getMonth()!==m-1 || date.getDate()!==d) return null;
    return {year:y,month:m,day:d,date,iso:text};
  }
  function toIso(year,month,day){return year+'-'+pad(month)+'-'+pad(day);}
  function displayDate(value,emptyText=''){
    const p=parseIso(value);
    return p ? pad(p.day)+'/'+pad(p.month)+'/'+p.year : emptyText;
  }
  function escapeAttr(value){return String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function icon(name){
    if(name==='calendar') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    if(name==='down') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(name==='prev') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if(name==='next') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '';
  }
  function syncDisplay(input){
    const wrap=input.closest('.custom-date-picker');
    const display=wrap?.querySelector('.custom-date-picker-display');
    if(!display) return;
    display.value=displayDate(input.value,'');
    display.placeholder=input.dataset.customDatePickerPlaceholder || 'dd/MM/yyyy';
    display.disabled=!!input.disabled;
  }
  function createDisplay(input){
    const wrap=document.createElement('span');
    wrap.className='custom-date-picker';
    const display=document.createElement('input');
    display.type='text';
    display.readOnly=true;
    display.inputMode='none';
    display.autocomplete='off';
    display.className='custom-date-picker-display';
    display.setAttribute('aria-label',input.getAttribute('aria-label') || input.dataset.customDatePickerLabel || 'اختيار التاريخ');
    display.setAttribute('aria-haspopup','dialog');
    display.setAttribute('aria-expanded','false');
    const calendar=document.createElement('span');
    calendar.className='custom-date-picker-icon custom-date-picker-calendar';
    calendar.innerHTML=icon('calendar');
    const arrow=document.createElement('span');
    arrow.className='custom-date-picker-icon custom-date-picker-arrow';
    arrow.innerHTML=icon('down');
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);
    wrap.appendChild(display);
    wrap.appendChild(calendar);
    wrap.appendChild(arrow);
    input.type='hidden';
    input.dataset.customDatePickerBound='1';
    display.addEventListener('click',()=>open(input));
    display.addEventListener('keydown',event=>{
      if(event.key==='Enter' || event.key===' ' || event.key==='ArrowDown'){
        event.preventDefault();
        open(input);
      }
    });
    syncDisplay(input);
  }
  function init(root=document){
    const scope=root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('input[data-custom-date-picker]').forEach(input=>{
      if(input.dataset.customDatePickerBound==='1'){
        syncDisplay(input);
        return;
      }
      createDisplay(input);
    });
  }
  function close(commit=false){
    if(!active) return;
    const {input,display,popup,previousValue,previewIso}=active;
    if(commit){
      const nextValue=previewIso || '';
      const changed=input.value!==nextValue;
      input.value=nextValue;
      if(changed){
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }else{
      input.value=previousValue;
    }
    syncDisplay(input);
    display.setAttribute('aria-expanded','false');
    popup.remove();
    active=null;
  }
  function monthAdd(year,month,delta){
    const d=new Date(year,month-1+delta,1);
    return {year:d.getFullYear(),month:d.getMonth()+1};
  }
  function movePreview(days){
    if(!active) return;
    const p=parseIso(active.previewIso) || parseIso(active.input.value) || parseIso(todayIso());
    const d=new Date(p.year,p.month-1,p.day+days);
    active.previewIso=toIso(d.getFullYear(),d.getMonth()+1,d.getDate());
    active.viewYear=d.getFullYear();
    active.viewMonth=d.getMonth()+1;
    render(active);
  }
  function render(state){
    const {popup}=state;
    if(state.display) state.display.value=displayDate(state.previewIso,'');
    const selected=parseIso(state.previewIso);
    const today=parseIso(todayIso());
    const firstDow=new Date(state.viewYear,state.viewMonth-1,1).getDay();
    const daysInMonth=new Date(state.viewYear,state.viewMonth,0).getDate();
    const prevDays=new Date(state.viewYear,state.viewMonth-1,0).getDate();
    const cells=[];
    for(let i=0;i<42;i++){
      const n=i-firstDow+1;
      let y=state.viewYear,m=state.viewMonth,d=n,muted=false;
      if(n<1){const prev=monthAdd(state.viewYear,state.viewMonth,-1);y=prev.year;m=prev.month;d=prevDays+n;muted=true;}
      else if(n>daysInMonth){const next=monthAdd(state.viewYear,state.viewMonth,1);y=next.year;m=next.month;d=n-daysInMonth;muted=true;}
      const iso=toIso(y,m,d);
      const isSelected=selected && selected.iso===iso;
      const isToday=today && today.iso===iso;
      cells.push('<button type="button" class="custom-date-picker-day'+(muted?' is-muted':'')+(isSelected?' is-selected':'')+(isToday?' is-today':'')+'" data-iso="'+escapeAttr(iso)+'" role="gridcell" aria-selected="'+(isSelected?'true':'false')+'">'+d+'</button>');
    }
    popup.innerHTML='<div class="custom-date-picker-panel" role="document">'
      +'<div class="custom-date-picker-head">'
      +'<button type="button" data-cdp="prev-year" aria-label="السنة السابقة">'+icon('prev')+icon('prev')+'</button>'
      +'<button type="button" data-cdp="prev-month" aria-label="الشهر السابق">'+icon('prev')+'</button>'
      +'<strong>'+MONTHS[state.viewMonth-1]+' '+state.viewYear+'</strong>'
      +'<button type="button" data-cdp="next-month" aria-label="الشهر التالي">'+icon('next')+'</button>'
      +'<button type="button" data-cdp="next-year" aria-label="السنة التالية">'+icon('next')+icon('next')+'</button>'
      +'</div>'
      +'<div class="custom-date-picker-weekdays">'+DAYS.map(d=>'<span>'+d+'</span>').join('')+'</div>'
      +'<div class="custom-date-picker-grid" role="grid">'+cells.join('')+'</div>'
      +'<div class="custom-date-picker-footer">'
      +'<button type="button" data-cdp="today">اليوم</button>'
      +'<button type="button" data-cdp="clear">مسح</button>'
      +'<button type="button" data-cdp="cancel">إلغاء</button>'
      +'<button type="button" data-cdp="apply" class="custom-date-picker-apply">تحديد</button>'
      +'</div></div>';
  }
  function position(state){
    const {display,popup}=state;
    const mobile=window.matchMedia('(max-width: 640px)').matches;
    popup.classList.toggle('custom-date-picker-mobile',mobile);
    if(mobile) return;
    const rect=display.getBoundingClientRect();
    const width=Math.min(340,window.innerWidth-24);
    const height=popup.offsetHeight || 390;
    const below=window.innerHeight-rect.bottom;
    const top=below>=height+12 ? rect.bottom+8 : Math.max(12,rect.top-height-8);
    const left=Math.max(12,Math.min(window.innerWidth-width-12,rect.right-width));
    popup.style.width=width+'px';
    popup.style.top=top+'px';
    popup.style.left=left+'px';
  }
  function open(input){
    if(!input || input.disabled) return;
    if(active && active.input===input) return;
    if(active) close(false);
    const wrap=input.closest('.custom-date-picker');
    const display=wrap?.querySelector('.custom-date-picker-display');
    if(!display) return;
    const selected=parseIso(input.value) || parseIso(todayIso());
    const popup=document.createElement('div');
    popup.className='custom-date-picker-popup';
    popup.dir='rtl';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-modal','true');
    popup.setAttribute('aria-label',input.getAttribute('aria-label') || 'اختيار التاريخ');
    document.body.appendChild(popup);
    active={input,display,popup,previousValue:input.value||'',previewIso:input.value||'',viewYear:selected.year,viewMonth:selected.month};
    display.setAttribute('aria-expanded','true');
    render(active);
    position(active);
    popup.addEventListener('click',event=>{
      const day=event.target.closest('[data-iso]');
      const action=event.target.closest('[data-cdp]')?.dataset.cdp;
      if(day){active.previewIso=day.dataset.iso;const p=parseIso(active.previewIso);if(p){active.viewYear=p.year;active.viewMonth=p.month;}if(event.detail>1 && active.input.closest('#inventory_closing')){close(true);return;}render(active);position(active);return;}
      if(action==='prev-month'){const next=monthAdd(active.viewYear,active.viewMonth,-1);active.viewYear=next.year;active.viewMonth=next.month;render(active);position(active);}
      if(action==='next-month'){const next=monthAdd(active.viewYear,active.viewMonth,1);active.viewYear=next.year;active.viewMonth=next.month;render(active);position(active);}
      if(action==='prev-year'){active.viewYear-=1;render(active);position(active);}
      if(action==='next-year'){active.viewYear+=1;render(active);position(active);}
      if(action==='today'){active.previewIso=todayIso();const p=parseIso(active.previewIso);active.viewYear=p.year;active.viewMonth=p.month;render(active);position(active);}
      if(action==='clear'){active.previewIso='';close(true);}
      if(action==='cancel') close(false);
      if(action==='apply') close(true);
    });
    requestAnimationFrame(()=>popup.querySelector('.custom-date-picker-day.is-selected,.custom-date-picker-apply')?.focus({preventScroll:true}));
  }
  document.addEventListener('click',event=>{
    if(!active) return;
    if(active.popup.contains(event.target) || active.display.contains(event.target)) return;
    close(false);
  },true);
  document.addEventListener('keydown',event=>{
    if(!active) return;
    if(event.key==='Escape'){event.preventDefault();close(false);}
    if(event.key==='Tab'){
      const focusable=Array.from(active.popup.querySelectorAll('button:not([disabled])'));
      if(focusable.length){
        const first=focusable[0];
        const last=focusable[focusable.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
      }
    }
    if(event.key==='Enter'){
      if(event.target.closest?.('[data-cdp],[data-iso]')) return;
      event.preventDefault();
      close(true);
    }
    if(event.key==='ArrowRight'){event.preventDefault();movePreview(1);}
    if(event.key==='ArrowLeft'){event.preventDefault();movePreview(-1);}
    if(event.key==='ArrowDown'){event.preventDefault();movePreview(7);}
    if(event.key==='ArrowUp'){event.preventDefault();movePreview(-7);}
  });
  window.addEventListener('resize',()=>{if(active) position(active);});
  window.addEventListener('scroll',()=>{if(active) position(active);},true);
  window.CustomDatePicker={init,refresh(target){if(!target)return init(document);if(target.matches?.('input[data-custom-date-picker]')) syncDisplay(target);else init(target);},formatDisplayDate:displayDate,isValidIso:value=>!!parseIso(value)};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>init(document));
  else init(document);
})();
