// URL da tua API a correr no Render (com o endpoint de transações garantido)
const API_URL = 'https://financetech.onrender.com/api/transacoe';

let movimentacoes = [];
let myLineChart, myBarChart, myTopDespesasChart, myDoughnutDespesaChart, myDoughnutReceitaChart;

function trocarTela(nomeTela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const telaAlvo = document.getElementById(`tela-${nomeTela}`);
  if (telaAlvo) telaAlvo.classList.add('active');
  atualizarDados();
}

async function buscarDadosNoBanco() {
  try {
    console.log("A contactar a API em:", API_URL);
    const resposta = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (resposta.ok) {
      movimentacoes = await resposta.json();
      console.log("Dados recebidos com sucesso:", movimentacoes);
    } else {
      console.warn("A API respondeu, mas com erro:", resposta.status);
    }
  } catch (erro) {
    console.error("FALHA DE LIGAÇÃO COM O RENDER. Erro completo:", erro);
  } finally {
    renderizarTela();
  }
}

// Garante que os formulários existem antes de adicionar os event listeners
const formReceita = document.getElementById('form-receita');
const formDespesa = document.getElementById('form-despesa');

if (formReceita) formReceita.addEventListener('submit', salvarMovimentacao);
if (formDespesa) formDespesa.addEventListener('submit', salvarMovimentacao);

async function salvarMovimentacao(e) {
  e.preventDefault();
  const formId = e.target.id;
  const isReceita = formId === 'form-receita';
  const prefixo = isReceita ? 'rec' : 'desp';
  
  const valorInput = document.getElementById(`${prefixo}-valor`);
  const valor = parseFloat(valorInput ? valorInput.value : 0);
  if (valor <= 0) return alert('O valor deve ser maior que zero.');

  const idInput = document.getElementById(`${prefixo}-id`);
  const id = idInput ? idInput.value : '';
  
  const dados = {
    tipo: isReceita ? 'Receita' : 'Despesa',
    valor: valor,
    data: document.getElementById(`${prefixo}-data`).value,
    categoria: document.getElementById(`${prefixo}-categoria`).value,
    descricao: document.getElementById(`${prefixo}-desc`).value || "Sem descrição" 
  };

  try {
    let resposta;
    if (id) {
      dados.id = parseInt(id);
      resposta = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
    } else {
      resposta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
    }

    // Se o C# recusar gravar (erros 400 ou 500)
    if (!resposta.ok) {
        const erroDetalhado = await resposta.text();
        console.error("Motivo da recusa do C#:", erroDetalhado);
        alert(`O C# recusou gravar os dados! Status: ${resposta.status}. Erro: ${erroDetalhado}`);
        return; 
    }

    // Se correu bem, limpa o ecrã e volta ao Dashboard
    e.target.reset();
    if (idInput) idInput.value = '';
    trocarTela('dashboard');
    buscarDadosNoBanco();
    
  } catch (erro) {
    console.error("Erro de rede ao salvar:", erro);
    alert('Erro de rede: O servidor no Render pode estar a iniciar (Cold Start). Aguarde alguns segundos e tente novamente.');
  }
}

async function excluirMovimentacao(id) {
  if (confirm('Tens a certeza que desejas excluir?')) {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      buscarDadosNoBanco();
    } catch (erro) {
      console.error("Erro ao excluir:", erro);
    }
  }
}

function editarMovimentacao(id) {
  const m = movimentacoes.find(item => item.id === id || item.Id === id);
  if (!m) return;

  const tipoReal = m.tipo || m.Tipo;
  const prefixo = tipoReal === 'Receita' ? 'rec' : 'desp';
  
  const idEl = document.getElementById(`${prefixo}-id`);
  const valEl = document.getElementById(`${prefixo}-valor`);
  const dataEl = document.getElementById(`${prefixo}-data`);
  const catEl = document.getElementById(`${prefixo}-categoria`);
  const descEl = document.getElementById(`${prefixo}-desc`);

  if (idEl) idEl.value = m.id || m.Id;
  if (valEl) valEl.value = m.valor || m.Valor;
  
  const dataReal = m.data || m.Data || "";
  const dataFormatada = dataReal.includes('T') ? dataReal.split('T')[0] : dataReal; 
  if (dataEl) dataEl.value = dataFormatada;
  
  if (catEl) catEl.value = m.categoria || m.Categoria;
  if (descEl) descEl.value = m.descricao || m.Descricao;
  
  trocarTela(tipoReal.toLowerCase());
}

function atualizarDados() {
  buscarDadosNoBanco();
}

function renderizarTela() {
  let recTotal = 0;
  let despTotal = 0;
  
  const despesasPorCategoria = {};
  const receitasPorCategoria = {};
  const evolucaoTempo = {};
  const todasDespesas = [];

  const tbodyHistorico = document.getElementById('tabela-historico');
  const tbodyRecente = document.getElementById('dash-tabela-recente');
  
  const filtroCat = document.getElementById('filtro-categoria')?.value || 'TODAS';
  const dataInicio = document.getElementById('filtro-data-inicio')?.value;
  const dataFim = document.getElementById('filtro-data-fim')?.value;

  if (tbodyHistorico) tbodyHistorico.innerHTML = '';
  if (tbodyRecente) tbodyRecente.innerHTML = '';

  const movFiltradas = movimentacoes.filter(m => {
    const dataReal = m.data || m.Data || "";
    const categoriaReal = m.categoria || m.Categoria || "";
    
    const dataTransacao = dataReal.includes('T') ? dataReal.split('T')[0] : dataReal;
    
    let passaData = true;
    if (dataInicio && dataTransacao < dataInicio) passaData = false;
    if (dataFim && dataTransacao > dataFim) passaData = false;
    let passaCat = (filtroCat === 'TODAS' || categoriaReal === filtroCat);
    
    return passaData && passaCat;
  });

  movFiltradas.forEach((m) => {
    const dataReal = m.data || m.Data || "";
    const tipoReal = m.tipo || m.Tipo;
    const valorReal = m.valor || m.Valor || 0;
    const categoriaReal = m.categoria || m.Categoria;
    const descReal = m.descricao || m.Descricao || '-';
    const idReal = m.id || m.Id;

    const dataSimples = dataReal.includes('T') ? dataReal.split('T')[0] : dataReal;

    if (!evolucaoTempo[dataSimples]) {
      evolucaoTempo[dataSimples] = { rec: 0, desp: 0 };
    }

    if (tipoReal === 'Receita') {
      recTotal += valorReal;
      receitasPorCategoria[categoriaReal] = (receitasPorCategoria[categoriaReal] || 0) + valorReal;
      evolucaoTempo[dataSimples].rec += valorReal;
    }
    
    if (tipoReal === 'Despesa') {
      despTotal += valorReal;
      despesasPorCategoria[categoriaReal] = (despesasPorCategoria[categoriaReal] || 0) + valorReal;
      evolucaoTempo[dataSimples].desp += valorReal;
      todasDespesas.push(m);
    }

    if (tbodyHistorico) {
      const row = document.createElement('tr');
      const dataPtBR = dataSimples ? dataSimples.split('-').reverse().join('/') : '';
      
      row.innerHTML = `
        <td>${dataPtBR}</td>
        <td style="color: ${tipoReal === 'Receita' ? '#05cd99' : '#ee5d50'}; font-weight: 700;">${tipoReal}</td>
        <td>${categoriaReal}</td>
        <td>${descReal}</td>
        <td>R$ ${valorReal.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-edit" onclick="editarMovimentacao(${idReal})">Editar</button>
          <button class="btn btn-sm btn-delete" onclick="excluirMovimentacao(${idReal})">Excluir</button>
        </td>
      `;
      tbodyHistorico.appendChild(row);
    }
  });

  const ultimos = [...movimentacoes].reverse().slice(0, 5);
  ultimos.forEach((m) => {
    if (tbodyRecente) {
      const dataReal = m.data || m.Data || "";
      const tipoReal = m.tipo || m.Tipo;
      const valorReal = m.valor || m.Valor || 0;
      const categoriaReal = m.categoria || m.Categoria;
      const descReal = m.descricao || m.Descricao || '-';
      
      const dataSimples = dataReal.includes('T') ? dataReal.split('T')[0] : dataReal;
      const dataPtBR = dataSimples ? dataSimples.split('-').reverse().join('/') : '';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${dataPtBR}</td>
        <td style="color: ${tipoReal === 'Receita' ? '#05cd99' : '#ee5d50'}; font-weight: 700;">${tipoReal}</td>
        <td>${categoriaReal}</td>
        <td>${descReal}</td>
        <td>R$ ${valorReal.toFixed(2)}</td>
      `;
      tbodyRecente.appendChild(row);
    }
  });

  const saldo = recTotal - despTotal;
  const saldoEl = document.getElementById('dash-saldo');
  const recEl = document.getElementById('dash-receita');
  const despEl = document.getElementById('dash-despesa');

  if (saldoEl) saldoEl.innerText = `R$ ${saldo.toFixed(2)}`;
  if (recEl) recEl.innerText = `R$ ${recTotal.toFixed(2)}`;
  if (despEl) despEl.innerText = `R$ ${despTotal.toFixed(2)}`;

  todasDespesas.sort((a, b) => (b.valor || b.Valor || 0) - (a.valor || a.Valor || 0));
  const top5Despesas = todasDespesas.slice(0, 5);

  const datasOrdenadas = Object.keys(evolucaoTempo).sort();
  const linhaLabels = [];
  const linhaSaldo = [];
  let saldoAcumulado = 0;

  datasOrdenadas.forEach(data => {
    if(!data) return;
    const p = data.split('-');
    if(p.length >= 3) {
        linhaLabels.push(`${p[2]}/${p[1]}`);
        const saldoDiario = evolucaoTempo[data].rec - evolucaoTempo[data].desp;
        saldoAcumulado += saldoDiario;
        linhaSaldo.push(saldoAcumulado);
    }
  });

  atualizarGraficos({
    recTotal, despTotal,
    despesasPorCategoria, receitasPorCategoria,
    top5Despesas,
    linhaLabels, linhaSaldo
  });
}

function atualizarGraficos(dados) {
  const coresPadrao = ['#4318ff', '#05cd99', '#ee5d50', '#ffb547', '#39b8ff', '#8f9bba'];

  if (myLineChart) myLineChart.destroy();
  if (myBarChart) myBarChart.destroy();
  if (myTopDespesasChart) myTopDespesasChart.destroy();
  if (myDoughnutDespesaChart) myDoughnutDespesaChart.destroy();
  if (myDoughnutReceitaChart) myDoughnutReceitaChart.destroy();

  const ctxLine = document.getElementById('lineChart');
  if (ctxLine) {
    myLineChart = new Chart(ctxLine.getContext('2d'), {
      type: 'line',
      data: { labels: dados.linhaLabels, datasets: [{ label: 'Saldo Acumulado (R$)', data: dados.linhaSaldo, borderColor: '#4318ff', backgroundColor: 'rgba(67, 24, 255, 0.1)', fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
  }

  const ctxBar = document.getElementById('barChart');
  if (ctxBar) {
    myBarChart = new Chart(ctxBar.getContext('2d'), {
      type: 'bar',
      data: { labels: ['Balanço Total'], datasets: [
          { label: 'Receitas', data: [dados.recTotal], backgroundColor: '#05cd99', borderRadius: 8, maxBarThickness: 80 },
          { label: 'Despesas', data: [dados.despTotal], backgroundColor: '#ee5d50', borderRadius: 8, maxBarThickness: 80 }
      ]}, options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const ctxTop = document.getElementById('topDespesasChart');
  if (ctxTop && dados.top5Despesas.length > 0) {
    myTopDespesasChart = new Chart(ctxTop.getContext('2d'), {
      type: 'bar',
      data: {
        labels: dados.top5Despesas.map(d => d.descricao || d.Descricao || d.categoria || d.Categoria),
        datasets: [{ label: 'Valor (R$)', data: dados.top5Despesas.map(d => d.valor || d.Valor), backgroundColor: '#ee5d50', borderRadius: 6 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const ctxPieD = document.getElementById('doughnutDespesaChart');
  if (ctxPieD && Object.keys(dados.despesasPorCategoria).length > 0) {
    myDoughnutDespesaChart = new Chart(ctxPieD.getContext('2d'), {
      type: 'doughnut',
      data: { labels: Object.keys(dados.despesasPorCategoria), datasets: [{ data: Object.values(dados.despesasPorCategoria), backgroundColor: coresPadrao, borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right' } } }
    });
  }

  const ctxPieR = document.getElementById('doughnutReceitaChart');
  if (ctxPieR && Object.keys(dados.receitasPorCategoria).length > 0) {
    myDoughnutReceitaChart = new Chart(ctxPieR.getContext('2d'), {
      type: 'doughnut',
      data: { labels: Object.keys(dados.receitasPorCategoria), datasets: [{ data: Object.values(dados.receitasPorCategoria), backgroundColor: ['#05cd99', '#4318ff', '#ffb547'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right' } } }
    });
  }
}

// Inicia a aplicação a tentar ir buscar os dados ao carregar
buscarDadosNoBanco();