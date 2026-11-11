// Interface de carteiras e cofrinhos. Usa a API local configurada em app.js.
(() => {
  const $ = id => document.getElementById(id);
  const dinheiro = n => Number(n || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const state = {carteiras:[],cofrinhos:[],loading:false};
  function message(id,text){const el=$(id);if(el)el.textContent=text;}
  async function api(path,options={}){
    const res=await fetch(`${API_BASE}${path}`,{
      ...options,
      headers:{'Authorization':`Bearer ${token}`,'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}
    });
    if(res.status===401){throw Error('Sessão expirada. Entre novamente.');}
    if(!res.ok){let detail=await res.text();try{let obj=JSON.parse(detail);detail=obj.mensagem||obj.message||obj.title||detail;}catch{}throw Error(`${res.status}: ${String(detail).slice(0,220)}`);}
    if(res.status===204)return null;
    const t=await res.text();return t?JSON.parse(t):null;
  }
  function select(id,items,selected){
    const el=$(id);if(!el)return;const old=selected??el.value;el.replaceChildren();
    for(const x of items)el.add(new Option(x.nome,String(x.id)));
    if(items.some(x=>String(x.id)===String(old)))el.value=String(old);
    if(!items.length)el.add(new Option('Nenhuma opção disponível',''));
  }
  function fillSelects(){
    const active=state.carteiras.filter(x=>!x.arquivada);
    for(const id of ['rec-carteira','desp-carteira','import-carteira','form-transferencia-origem','form-transferencia-destino','form-cofrinho-carteira'])select(id,active);
    const tf=$('form-transferencia');if(tf){selectElement(tf.elements.namedItem('carteiraOrigemId'),active);selectElement(tf.elements.namedItem('carteiraDestinoId'),active);}
    const cf=$('form-cofrinho');if(cf)selectElement(cf.elements.namedItem('carteiraId'),active);
    const mf=$('form-movimentacao-cofrinho');if(mf)selectElement(mf.elements.namedItem('cofrinhoId'),state.cofrinhos);
  }
  function selectElement(el,items){if(!el)return;const prev=el.value;el.replaceChildren();items.forEach(x=>el.add(new Option(x.nome,String(x.id))));if(items.some(x=>String(x.id)===prev))el.value=prev;if(!items.length)el.add(new Option('Nenhuma opção disponível',''));}
  function renderWallets(){
    const root=$('lista-carteiras'),totals=$('carteiras-totais');if(!root||!totals)return;
    root.replaceChildren();totals.replaceChildren();
    const active=state.carteiras.filter(x=>!x.arquivada);
    for(const [label,key] of [['Saldo total','saldoAtual'],['Reservado','saldoReservado'],['Disponível','saldoDisponivel']]){
      const div=document.createElement('div');div.className='ft-total-card';const title=document.createElement('span');title.textContent=label;
      const value=document.createElement('strong');value.textContent=dinheiro(active.reduce((sum,x)=>sum+Number(x[key]??0),0));div.append(title,value);totals.append(div);
    }
    if(!active.length){root.textContent='Nenhuma carteira cadastrada.';return;}
    for(const x of active){
      const el=document.createElement('article');el.className='ft-wallet-item';
      const title=document.createElement('h3');title.textContent=x.nome;
      const total=document.createElement('p');total.textContent=`Saldo atual: ${dinheiro(x.saldoAtual)}`;
      const reserved=document.createElement('p');reserved.textContent=`Reservado: ${dinheiro(x.saldoReservado)}`;
      const available=document.createElement('p');available.className='ft-available';available.textContent=`Disponível: ${dinheiro(x.saldoDisponivel)}`;
      el.append(title,total,reserved,available);
      const details=document.createElement('details');details.className='ft-wallet-history';
      const heading=document.createElement('summary');heading.textContent='Ver histórico desta carteira';details.append(heading);
      const note=document.createElement('p');note.className='ft-wallet-history-note';
      note.textContent='O saldo inicial é um valor de abertura, não uma receita. Receitas e despesas aparecem abaixo; transferências e movimentações de cofrinhos já estão refletidas no saldo atual, mas não são listadas neste histórico.';
      details.append(note);
      const table=document.createElement('table');table.className='ft-wallet-history-table';
      const thead=table.createTHead(),head=thead.insertRow();
      for(const label of ['Data','Tipo','Descrição','Valor']){const th=document.createElement('th');th.textContent=label;head.append(th);}
      const tbody=table.createTBody();
      const initial=x.saldoInicial??x.SaldoInicial;
      if(initial!==null&&initial!==undefined&&Number.isFinite(Number(initial))){
        const tr=tbody.insertRow();tr.className='ft-opening-row';
        for(const value of ['Abertura','Saldo inicial','Valor informado ao cadastrar a carteira',dinheiro(initial)])tr.insertCell().textContent=value;
      }else{
        const tr=tbody.insertRow();const td=tr.insertCell();td.colSpan=4;
        td.textContent='Saldo inicial não informado pela API de carteiras.';
      }
      const transactions=(typeof movimentacoes!=='undefined'&&Array.isArray(movimentacoes)?movimentacoes:[])
        .filter(m=>String(m.carteiraId??m.CarteiraId??'')===String(x.id))
        .sort((a,b)=>String(b.data??b.Data??'').localeCompare(String(a.data??a.Data??'')));
      for(const m of transactions){
        const tr=tbody.insertRow(),tipo=m.tipo??m.Tipo??'',valor=Number(m.valor??m.Valor??0);
        const data=String(m.data??m.Data??'').slice(0,10);
        for(const value of [data?data.split('-').reverse().join('/'):'—',tipo,String(m.descricao??m.Descricao??'—'),`${tipo==='Despesa'?'−':'+'} ${dinheiro(valor)}`])tr.insertCell().textContent=value;
      }
      if(!transactions.length){const tr=tbody.insertRow(),td=tr.insertCell();td.colSpan=4;td.textContent='Nenhuma receita ou despesa registrada nesta carteira.';}
      const scroll=document.createElement('div');scroll.className='ft-wallet-history-scroll';scroll.append(table);details.append(scroll);
      el.append(details);root.append(el);
    }
  }
  function button(label,kind,handler){const el=document.createElement('button');el.type='button';el.className='ft-jar-action '+(kind==='primary'?'ft-jar-action-primary':'');el.textContent=label;el.addEventListener('click',handler);return el;}
  function abrirMovimentacao(id,tipo){
    const panel=$('painel-movimentar-cofrinho'),form=$('form-movimentacao-cofrinho');if(!panel||!form)return;
    panel.hidden=false;form.elements.namedItem('cofrinhoId').value=String(id);form.elements.namedItem('tipo').value=tipo;
    $('titulo-movimentacao-cofrinho').textContent=(tipo==='Deposito'?'Guardar dinheiro em ':'Retirar dinheiro de ')+(state.cofrinhos.find(x=>x.id===id)?.nome||'cofrinho');
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});form.elements.namedItem('valor').focus();
  }
  function renderJars(){
    const root=$('lista-cofrinhos');if(!root)return;root.replaceChildren();
    const active=state.cofrinhos.filter(x=>!x.arquivado);
    if(!active.length){const empty=document.createElement('p');empty.className='ft-jar-empty';empty.textContent='Nenhum cofrinho ainda. Crie seu primeiro objetivo!';root.append(empty);}
    for(const x of active){
      const el=document.createElement('article');el.className='ft-jar-card';
      const title=document.createElement('h3');title.textContent=x.nome;
      const wallet=state.carteiras.find(w=>w.id===x.carteiraId);
      const desc=document.createElement('p');desc.className='ft-jar-wallet';desc.textContent=`Carteira: ${wallet?.nome||x.carteiraNome||'—'}`;
      const saldo=document.createElement('strong');saldo.className='ft-jar-balance';saldo.textContent=dinheiro(x.saldo??x.saldoAtual??x.valorAtual);
      const caption=document.createElement('span');caption.className='ft-jar-caption';caption.textContent='Guardado';
      el.append(title,desc,caption,saldo);
      const meta=Number(x.valorObjetivo??x.valorMeta??x.meta??0),atual=Number(x.saldo??x.saldoAtual??x.valorAtual??0);
      const info=document.createElement('p');info.className='ft-jar-progress-label';
      if(meta>0){const progresso=Math.min(100,Math.max(0,atual/meta*100));info.textContent=`${progresso.toFixed(0)}% de ${dinheiro(meta)}`;const track=document.createElement('div');track.className='feature-progress';const fill=document.createElement('span');fill.style.width=`${progresso}%`;track.append(fill);el.append(info,track);}
      else {info.textContent='Sem objetivo definido';el.append(info);}
      const actions=document.createElement('div');actions.className='ft-jar-actions';
      actions.append(button('Guardar','primary',()=>abrirMovimentacao(x.id,'Deposito')),button('Retirar','',()=>abrirMovimentacao(x.id,'Retirada')));
      el.append(actions);root.append(el);
    }
  }
  async function load(){
    if(!token||state.loading)return;
    state.loading=true;
    try{
      const wallets=await api('/carteiras');state.carteiras=Array.isArray(wallets)?wallets:[];
      window.atualizarSaldoConsolidado?.(state.carteiras);
      message('carteiras-mensagem','');renderWallets();fillSelects();
    }catch(e){window.invalidarSaldoConsolidado?.();message('carteiras-mensagem',`Não foi possível carregar carteiras: ${e.message}`);}
    try{
      const jars=await api('/cofrinhos');state.cofrinhos=Array.isArray(jars)?jars:[];
      message('cofrinhos-mensagem','');renderJars();fillSelects();
    }catch(e){message('cofrinhos-mensagem',`Não foi possível carregar cofrinhos: ${e.message}`);}
    state.loading=false;
  }
  window.carregarFinanceiroCarteiras=load;
  function form(id,handler){const el=$(id);if(!el)return;el.addEventListener('submit',async e=>{
    e.preventDefault();const btn=el.querySelector('button[type=submit]');if(btn.disabled)return;btn.disabled=true;
    try{await handler(el);el.reset();await load();await buscarDadosNoBanco();}
    catch(err){const target=id.includes('cofrinho')?'cofrinhos-mensagem':'carteiras-mensagem';message(target,err.message);alert(err.message);}
    finally{btn.disabled=false;}
  });}
  form('form-carteira',async el=>{
    const d=new FormData(el);await api('/carteiras',{method:'POST',body:JSON.stringify({nome:d.get('nome'),saldoInicial:Number(d.get('saldoInicial'))})});
    message('carteiras-mensagem','Carteira criada com sucesso.');
  });
  form('form-transferencia',async el=>{
    const d=new FormData(el),origem=Number(d.get('carteiraOrigemId')),destino=Number(d.get('carteiraDestinoId'));
    if(origem===destino)throw Error('Selecione carteiras diferentes.');
    if(!origem||!destino)throw Error('Selecione origem e destino.');
    if(!confirm('Confirmar transferência entre carteiras?'))return;
    await api('/transferencias',{method:'POST',body:JSON.stringify({carteiraOrigemId:origem,carteiraDestinoId:destino,valor:Number(d.get('valor')),descricao:String(d.get('descricao')||'')})});
    message('carteiras-mensagem','Transferência realizada.');
  });
  form('form-cofrinho',async el=>{
    const d=new FormData(el);await api('/cofrinhos',{method:'POST',body:JSON.stringify({nome:d.get('nome'),carteiraId:Number(d.get('carteiraId')),valorObjetivo:d.get('valorObjetivo')?Number(d.get('valorObjetivo')):null})});
    message('cofrinhos-mensagem','Cofrinho criado.');$('painel-criar-cofrinho').hidden=true;
  });
  form('form-movimentacao-cofrinho',async el=>{
    const d=new FormData(el),id=Number(d.get('cofrinhoId')),tipo=d.get('tipo'),valor=Number(d.get('valor'));
    if(!id||!Number.isFinite(valor)||valor<=0)throw Error('Informe cofrinho e valor válido.');
    if(!confirm(`${tipo==='Deposito'?'Guardar':'Retirar'} ${dinheiro(valor)}?`))return;
    await api(`/cofrinhos/${id}/${tipo==='Deposito'?'depositar':'retirar'}`,{method:'POST',body:JSON.stringify({valor})});
    message('cofrinhos-mensagem','Cofrinho atualizado.');$('painel-movimentar-cofrinho').hidden=true;
  });
  $('abrir-criar-cofrinho')?.addEventListener('click',()=>{$('painel-criar-cofrinho').hidden=false;$('painel-criar-cofrinho').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('fechar-criar-cofrinho')?.addEventListener('click',()=>{$('painel-criar-cofrinho').hidden=true;});
  $('fechar-movimentacao-cofrinho')?.addEventListener('click',()=>{$('painel-movimentar-cofrinho').hidden=true;});
  if(token)load();
})();
