/* SUSAILUM — scripts compartilhados */
(function(){
  "use strict";

  /* menu mobile */
  var burger=document.querySelector('nav .burger'),links=document.querySelector('nav .links');
  if(burger&&links){
    burger.addEventListener('click',function(){links.classList.toggle('open');
      burger.textContent=links.classList.contains('open')?'✕':'☰';});
    links.addEventListener('click',function(e){if(e.target.tagName==='A'){links.classList.remove('open');burger.textContent='☰';}});
  }

  /* URLs limpas: quando hospedado (http/https), os links perdem o ".html"
     — /trabalhos em vez de /trabalhos.html. Localmente (file://) mantém. */
  var hosted=location.protocol==='http:'||location.protocol==='https:';
  if(hosted){
    document.querySelectorAll('a[href$=".html"]').forEach(function(a){
      var h=a.getAttribute('href');
      if(h.indexOf('//')===-1){a.setAttribute('href',h==='index.html'?'./':h.replace(/\.html$/,''));}
    });
    if(/\.html$/.test(location.pathname)){
      var clean=location.pathname.replace(/index\.html$/,'').replace(/\.html$/,'');
      history.replaceState(null,'',clean+location.hash);
    }
  }

  /* marca a aba atual */
  var here=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'')||'index';
  document.querySelectorAll('nav .links a').forEach(function(a){
    var h=(a.getAttribute('href')||'').replace(/\.html$/,'').replace('./','')||'index';
    if(h===here)a.classList.add('on');
  });

  /* lightbox */
  var lb=document.getElementById('lb'),lbImg=document.getElementById('lbImg');
  if(lb&&lbImg){
    document.addEventListener('click',function(e){
      var c=e.target.closest('[data-full]');
      if(c){lbImg.src=c.dataset.full;lb.classList.add('on');document.body.style.overflow='hidden';}
      else if(e.target.closest('.lb')){lb.classList.remove('on');lbImg.src='';document.body.style.overflow='';}
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){lb.classList.remove('on');lbImg.src='';document.body.style.overflow='';}
    });
  }

  /* reveal on scroll — com fallbacks para nunca deixar conteúdo invisível */
  var rvs=Array.prototype.slice.call(document.querySelectorAll('.rv'));
  function showInView(){
    rvs.forEach(function(el){
      if(el.classList.contains('in'))return;
      var r=el.getBoundingClientRect();
      if(r.top<window.innerHeight*0.96&&r.bottom>0)el.classList.add('in');
    });
  }
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}});
    },{threshold:0,rootMargin:'0px 0px -4% 0px'});
    rvs.forEach(function(el){io.observe(el);});
  }
  /* garantia: checa no load, no scroll e num timer — se algo falhar, aparece mesmo assim */
  showInView();
  window.addEventListener('scroll',showInView,{passive:true});
  window.addEventListener('load',showInView);
  setTimeout(showInView,800);
  setTimeout(function(){rvs.forEach(function(el){
    if(!el.classList.contains('in')&&el.getBoundingClientRect().top<window.innerHeight)el.classList.add('in');
  });},2500);

  /* tonalidade por cliente: observa [data-case-theme] e troca o tema do body */
  var themed=document.querySelectorAll('[data-case-theme]');
  if(themed.length){
    var tio=new IntersectionObserver(function(es){
      es.forEach(function(x){
        if(x.isIntersecting){
          document.body.setAttribute('data-theme',x.target.getAttribute('data-case-theme')||'');
        }
      });
    },{rootMargin:'-42% 0px -42% 0px'});
    themed.forEach(function(el){tio.observe(el);});
  }

  /* formulário de contato: tenta a API, cai para FormSubmit (e-mail direto), depois mailto */
  var form=document.getElementById('contactForm');
  if(form){
    var msg=document.getElementById('formMsg');
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var data={
        nome:form.nome.value.trim(),
        email:form.email.value.trim(),
        assunto:form.assunto.value,
        mensagem:form.mensagem.value.trim(),
        website:form.website.value /* honeypot */
      };
      if(!data.nome||!data.email||!data.mensagem){show('err','Preencha nome, e-mail e mensagem.');return;}
      var btn=form.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Enviando…';
      fetch('/api/contact',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      }).then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});})
      .then(function(res){
        if(res.ok){show('ok','Mensagem enviada! Respondemos rapidinho.');form.reset();}
        else{show('err',res.j.error||'Nao foi possivel enviar. Tente o WhatsApp.');}
      }).catch(function(){
        /* sem backend: envia direto para o e-mail via FormSubmit */
        fetch('https://formsubmit.co/ajax/susailumn@gmail.com',{
          method:'POST',
          headers:{'Content-Type':'application/json','Accept':'application/json'},
          body:JSON.stringify({
            name:data.nome,
            email:data.email,
            _subject:'[site susailum] '+data.assunto+' - '+data.nome,
            mensagem:data.mensagem,
            _template:'table',_captcha:'false'
          })
        }).then(function(r){
          if(r.ok){show('ok','Mensagem enviada direto pro nosso e-mail! Respondemos rapidinho.');form.reset();}
          else{throw new Error();}
        }).catch(function(){
          var body=encodeURIComponent(data.mensagem+'\n\n- '+data.nome+' ('+data.email+')');
          location.href='mailto:susailumn@gmail.com?subject='+encodeURIComponent('[site] '+data.assunto)+'&body='+body;
          show('ok','Abrimos seu app de e-mail com a mensagem pronta.');
        });
      }).finally(function(){btn.disabled=false;btn.textContent='Enviar mensagem';});
    });
    function show(k,t){msg.className='form-msg '+k;msg.textContent=t;}
  }
})();
