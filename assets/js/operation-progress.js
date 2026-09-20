(function operationProgressFactory(globalScope){
  'use strict';
  const tasks=new Map();
  let last=null,hideTimer=null;
  function elements(){
    let root=document.getElementById('applicationOperationProgress');
    if(!root){
      root=document.createElement('aside');root.id='applicationOperationProgress';root.className='application-operation-progress';root.hidden=true;root.dir='rtl';root.setAttribute('data-html2canvas-ignore','true');
      root.innerHTML='<div class="operation-progress-heading"><span data-operation-label></span><b data-operation-percent dir="ltr"></b><button type="button" data-operation-close aria-label="إغلاق التنبيه" hidden>×</button></div><div class="operation-progress-track" role="progressbar" aria-label="تقدم تحميل البيانات" aria-valuemin="0" aria-valuemax="100"><i></i></div><small data-operation-detail role="status" aria-live="polite"></small>';
      document.body.appendChild(root);
      root.querySelector('[data-operation-close]').onclick=()=>{if(!tasks.size){last=null;root.hidden=true;}};
    }
    return root;
  }
  function render(){
    const task=[...tasks.values()].at(-1)||last,root=elements();
    root.hidden=!task;if(!task)return;
    root.dataset.state=task.state;root.querySelector('[data-operation-label]').textContent=task.label;
    root.querySelector('[data-operation-detail]').textContent=task.detail+(tasks.size>1?' — عمليات جارية: '+tasks.size:'');
    root.querySelector('[data-operation-close]').hidden=tasks.size>0;
    const bar=root.querySelector('[role="progressbar"]'),known=Number.isFinite(task.percent);
    root.querySelector('[data-operation-percent]').textContent=known?task.percent+'%':'…';
    if(known)bar.setAttribute('aria-valuenow',String(task.percent));else bar.removeAttribute('aria-valuenow');
    bar.classList.toggle('is-indeterminate',!known);bar.querySelector('i').style.width=(known?task.percent:35)+'%';
  }
  function release(task){
    task.controls.forEach(([element,disabled,busy])=>{element.disabled=disabled;element.removeAttribute('data-operation-locked');if(busy==null)element.removeAttribute('aria-busy');else element.setAttribute('aria-busy',busy);});
    task.scope?.removeAttribute('aria-busy');
  }
  function run(key,label,work,options={}){
    if(tasks.has(key))return tasks.get(key).promise;
    clearTimeout(hideTimer);last=null;
    const controller=new AbortController();
    const task={key,label,detail:'جاري تجهيز البيانات…',percent:null,state:'loading',controls:[],scope:document.querySelector(options.scope||'.__no_operation_scope'),controller};
    const selected=options.controls?document.querySelectorAll(options.controls):[];
    selected.forEach(element=>{task.controls.push([element,element.disabled,element.getAttribute('aria-busy')]);element.disabled=true;element.dataset.operationLocked='1';element.setAttribute('aria-busy','true');});
    task.scope?.setAttribute('aria-busy','true');
    const context={
      signal:controller.signal,
      report(done,total,detail){if(controller.signal.aborted||tasks.get(key)!==task)return;task.percent=total>0?Math.min(99,Math.max(0,Math.floor(done*100/total))):null;task.detail=detail||'جاري تحميل البيانات…';render();},
      stage(detail){if(controller.signal.aborted||tasks.get(key)!==task)return;task.percent=null;task.detail=detail;render();},
      fail(error){if(controller.signal.aborted||tasks.get(key)!==task)return;task.state='error';task.percent=null;task.detail='تعذر إكمال العملية. '+(error?.code==='57014'?'استغرق تحميل البيانات وقتًا أطول من المهلة المتاحة. جرّب فترة أصغر.':'أعد المحاولة بعد التحقق من الاتصال.');render();}
    };
    tasks.set(key,task);
    task.promise=Promise.resolve().then(()=>work(context)).then(result=>{
      if(!controller.signal.aborted&&task.state!=='error'){task.state='complete';task.percent=100;task.detail='اكتمل تحميل البيانات.';}
      return result;
    },error=>{context.fail(error);throw error;}).finally(()=>{
      if(tasks.get(key)!==task)return;
      tasks.delete(key);release(task);
      if(!controller.signal.aborted)last=task;
      render();
      if(!tasks.size&&task.state==='complete')hideTimer=setTimeout(()=>{last=null;render();},2200);
    });
    render();return task.promise;
  }
  function cancelAll(){
    clearTimeout(hideTimer);tasks.forEach(task=>{task.controller.abort();release(task);});tasks.clear();last=null;
    const root=document.getElementById('applicationOperationProgress');if(root)root.hidden=true;
  }
  // Blocks pointer, keyboard and synthetic duplicate actions while preserving permission ownership.
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-operation-locked="1"]') || [...tasks.values()].some(task=>task.scope?.contains(event.target)&&event.target.closest?.('button,input,select'))){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('submit',event=>{if(event.target.querySelector?.('[data-operation-locked="1"][type="submit"]')){event.preventDefault();event.stopImmediatePropagation();}},true);
  const INLINE_PROGRESS_SELECTOR=[
    '[data-report-tools-status]','[role="status"]','[aria-live]',
    '.upload-status','.department-loading-errors-status','.department-loading-error-modal-status',
    '.department-weekly-status','.department-hr-report-status','.department-hr-state.loading',
    '.inventory-production-state.loading','.inventory-production-screen-status',
    '.inventory-review-history-status','.inventory-count-status','.inventory-difference-status',
    '.permissions-empty-state','.empty-row','.empty-state'
  ].join(',');
  const INLINE_LOADING_RE=/(?:جاري|جارٍ)\s+(?:إعداد|تحميل|تجهيز|إنشاء|تصدير|قراءة|معالجة|حفظ|تحديث|استيراد)|(?:loading|preparing|processing|exporting|importing)\b/i;
  function decorateInlineProgress(node){
    if(!node||node.nodeType!==1||!node.matches?.(INLINE_PROGRESS_SELECTOR)) return;
    const message=String(node.textContent||'').replace(/\s+/g,' ').trim();
    const loading=INLINE_LOADING_RE.test(message)||node.classList.contains('loading')||node.dataset.type==='busy'||node.getAttribute('aria-busy')==='true';
    if(!loading){
      node.removeAttribute('data-inline-operation-progress');
      node.removeAttribute('data-inline-progress-known');
      node.style.removeProperty('--inline-operation-percent');
      return;
    }
    node.setAttribute('data-inline-operation-progress','1');
    const match=message.match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)\s*%/);
    if(match){
      const percent=Math.max(0,Math.min(100,Number(match[1])||0));
      node.setAttribute('data-inline-progress-known','1');
      node.style.setProperty('--inline-operation-percent',percent+'%');
    }else{
      node.removeAttribute('data-inline-progress-known');
      node.style.removeProperty('--inline-operation-percent');
    }
  }
  function scanInlineProgress(root){
    if(!root) return;
    if(root.nodeType===1) decorateInlineProgress(root);
    root.querySelectorAll?.(INLINE_PROGRESS_SELECTOR).forEach(decorateInlineProgress);
  }
  function startInlineProgressObserver(){
    if(document.documentElement.dataset.inlineOperationProgressBound==='1') return;
    document.documentElement.dataset.inlineOperationProgressBound='1';
    scanInlineProgress(document);
    const observer=new MutationObserver(records=>{
      const candidates=new Set();
      records.forEach(record=>{
        const target=record.type==='characterData'?record.target.parentElement:record.target;
        if(target?.nodeType===1){
          const match=target.matches?.(INLINE_PROGRESS_SELECTOR)?target:target.closest?.(INLINE_PROGRESS_SELECTOR);
          if(match)candidates.add(match);
          record.addedNodes?.forEach(node=>{if(node.nodeType===1)candidates.add(node);});
        }
      });
      candidates.forEach(node=>scanInlineProgress(node));
    });
    observer.observe(document.body||document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','data-type','data-state','hidden','aria-busy']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startInlineProgressObserver,{once:true});
  else startInlineProgressObserver();
  globalScope.AppOperationProgress=Object.freeze({run,cancelAll,isBusy:key=>tasks.has(key),refreshInlineProgress:()=>scanInlineProgress(document)});
})(window);
