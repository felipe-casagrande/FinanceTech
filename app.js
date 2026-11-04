
const API_BASE = 'https://financetech.onrender.com/api';
const API_URL = `${API_BASE}/transacoes`;
const AUTH_URL = `${API_BASE}/auth`;

let token = localStorage.getItem('financeToken');
let usuarioLogado = JSON.parse(localStorage.getItem('financeUsuario') || 'null');

let movimentacoes = [];

let myLineChart;
let myBarChart;
let myTopDespesasChart;
let myDoughnutDespesaChart;
let myDoughnutReceitaChart;


// ==============================
// AUTENTICAÇÃO
// ==============================

function mostrarFormularioAuth(tipo) {
  const login = document.getElementById('form-login');
  const cadastro = document.getElementById('form-cadastro');

  login.hidden = tipo !== 'login';
  cadastro.hidden = tipo !== 'cadastro';

  document.getElementById('btn-login-tab').classList.toggle('active', tipo === 'login');
  document.getElementById('btn-cadastro-tab').classList.toggle('active', tipo === 'cadastro');

  document.getElementById('auth-mensagem').innerText = '';
}


function mostrarAplicativo() {
  document.getElementById('tela-autenticacao').hidden = true;
  document.getElementById('app-container').hidden = false;

  document.getElementById('usuario-nome').innerText =
    `Olá, ${usuarioLogado.nome}`;

  buscarDadosNoBanco();
}


function mostrarLogin() {
  document.getElementById('tela-autenticacao').hidden = false;
  document.getElementById('app-container').hidden = true;
}


async function autenticar(url, dados) {
  const mensagem = document.getElementById('auth-mensagem');

  mensagem.innerText = 'Aguarde...';

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      mensagem.innerText =
        resultado.mensagem || resultado.message || 'Não foi possível realizar a operação.';
      return;
    }

    token = resultado.token;
    usuarioLogado = resultado.usuario;

    localStorage.setItem('financeToken', token);
    localStorage.setItem('financeUsuario', JSON.stringify(usuarioLogado));

    mensagem.innerText = '';

    mostrarAplicativo();

  } catch (erro) {
    console.error('Erro na autenticação:', erro);
    mensagem.innerText = 'Erro ao conectar com o servidor.';
  }
}


// Login
document.getElementById('form-login').addEventListener('submit', function(e) {
  e.preventDefault();

  autenticar(`${AUTH_URL}/login`, {
    email: document.getElementById('login-email').value,
    senha: document.getElementById('login-senha').value
  });
});


// Cadastro
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
  e.preventDefault();

  autenticar(`${AUTH_URL}/cadastro`, {
    nome: document.getElementById('cadastro-nome').value,
    email: document.getElementById('cadastro-email').value,
    senha: document.getElementById('cadastro-senha').value
  });
});


// Sair da conta
function sairConta() {
  localStorage.removeItem('financeToken');
  localStorage.removeItem('financeUsuario');

  token = null;
  usuarioLogado = null;
  movimentacoes = [];

  if (myLineChart) myLineChart.destroy();
  if (myBarChart) myBarChart.destroy();
  if (myTopDespesasChart) myTopDespesasChart.destroy();
  if (myDoughnutDespesaChart) myDoughnutDespesaChart.destroy();
  if (myDoughnutReceitaChart) myDoughnutReceitaChart.destroy();

  mostrarLogin();
}


// ==============================
// NAVEGAÇÃO
// ==============================

function trocarTela(nomeTela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const telaAlvo = document.getElementById(`tela-${nomeTela}`);

  if (telaAlvo) {
    telaAlvo.classList.add('active');
  }

  document.querySelectorAll('.nav-btn').forEach(botao => {
    if (botao.getAttribute('onclick')?.includes(`'${nomeTela}'`)) {
      botao.classList.add('active');
    }
  });

  atualizarDados();
}


// ==============================
// BUSCAR TRANSAÇÕES
// ==============================

async function buscarDadosNoBanco() {
  if (!token) return;

  try {
    console.log('A contactar a API:', API_URL);

    const resposta = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (resposta.status === 401) {
      sairConta();
      return;
    }

    if (resposta.ok) {
      movimentacoes = await resposta.json();

      console.log('Dados recebidos:', movimentacoes);

      renderizarTela();

    } else {
      console.error('Erro ao buscar transações:', resposta.status);
    }

  } catch (erro) {
    console.error('Erro de conexão com a API:', erro);
  }
}


// ==============================
// FORMULÁRIOS DE RECEITA E DESPESA
// ==============================

const formReceita = document.getElementById('form-receita');
const formDespesa = document.getElementById('form-despesa');

if (formReceita) {
  formReceita.addEventListener('submit', salvarMovimentacao);
}

if (formDespesa) {
  formDespesa.addEventListener('submit', salvarMovimentacao);
}


async function salvarMovimentacao(e) {
  e.preventDefault();

  const formId = e.target.id;
  const isReceita = formId === 'form-receita';

  const prefixo = isReceita ? 'rec' : 'desp';

  const valorInput = document.getElementById(`${prefixo}-valor`);

  const valor = parseFloat(valorInput ? valorInput.value : 0);

  if (valor <= 0) {
    return alert('O valor deve ser maior que zero.');
  }

  const idInput = document.getElementById(`${prefixo}-id`);
  const id = idInput ? idInput.value : '';

  const dados = {
    tipo: isReceita ? 'Receita' : 'Despesa',
    valor: valor,
    data: document.getElementById(`${prefixo}-data`).value,
    categoria: document.getElementById(`${prefixo}-categoria`).value,
    descricao: document.getElementById(`${prefixo}-desc`).value || 'Sem descrição'
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    let resposta;

    if (id) {
      dados.id = parseInt(id);

      resposta = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(dados)
      });

    } else {
      resposta = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(dados)
      });
    }

    if (resposta.status === 401) {
      sairConta();
      return;
    }

    if (!resposta.ok) {
      const erroDetalhado = await resposta.text();

      console.error('Erro ao salvar:', erroDetalhado);

      alert(`Não foi possível salvar. Status: ${resposta.status}. Erro: ${erroDetalhado}`);

      return;
    }

    e.target.reset();

    if (idInput) {
      idInput.value = '';
    }

    trocarTela('dashboard');

    buscarDadosNoBanco();

  } catch (erro) {
    console.error('Erro de rede ao salvar:', erro);

    alert('Erro de conexão. Aguarde alguns segundos e tente novamente.');
  }
}


// ==============================
// EXCLUIR TRANSAÇÃO
// ==============================

async function excluirMovimentacao(id) {
  if (confirm('Tem certeza que deseja excluir?')) {
    try {
      const resposta = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (resposta.status === 401) {
        sairConta();
        return;
      }

      if (!resposta.ok) {
        alert('Não foi possível excluir a movimentação.');
        return;
      }

      buscarDadosNoBanco();

    } catch (erro) {
      console.error('Erro ao excluir:', erro);
    }
  }
}


// ==============================
// EDITAR TRANSAÇÃO
// ==============================

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

  const dataReal = m.data || m.Data || '';

  const dataFormatada = dataReal.includes('T')
    ? dataReal.split('T')[0]
    : dataReal;

  if (dataEl) dataEl.value = dataFormatada;
  if (catEl) catEl.value = m.categoria || m.Categoria;
  if (descEl) descEl.value = m.descricao || m.Descricao;

  trocarTela(tipoReal.toLowerCase());
}


// ==============================
// ATUALIZAR DADOS
// ==============================

function atualizarDados() {
  if (!token) return;

  renderizarTela();
}


// ==============================
// RENDERIZAR DASHBOARD E HISTÓRICO
// ==============================

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
    const dataReal = m.data || m.Data || '';
    const categoriaReal = m.categoria || m.Categoria || '';

    const dataTransacao = dataReal.includes('T')
      ? dataReal.split('T')[0]
      : dataReal;

    let passaData = true;

    if (dataInicio && dataTransacao < dataInicio) passaData = false;
    if (dataFim && dataTransacao > dataFim) passaData = false;

    const passaCat = filtroCat === 'TODAS' || categoriaReal === filtroCat;

    return passaData && passaCat;
  });

  movFiltradas.forEach(m => {
    const dataReal = m.data || m.Data || '';
    const tipoReal = m.tipo || m.Tipo;
    const valorReal = Number(m.valor ?? m.Valor ?? 0);
    const categoriaReal = m.categoria || m.Categoria;
    const descReal = m.descricao || m.Descricao || '-';
    const idReal = m.id || m.Id;

    const dataSimples = dataReal.includes('T')
      ? dataReal.split('T')[0]
      : dataReal;

    if (!evolucaoTempo[dataSimples]) {
      evolucaoTempo[dataSimples] = { rec: 0, desp: 0 };
    }

    if (tipoReal === 'Receita') {
      recTotal += valorReal;

      receitasPorCategoria[categoriaReal] =
        (receitasPorCategoria[categoriaReal] || 0) + valorReal;

      evolucaoTempo[dataSimples].rec += valorReal;
    }

    if (tipoReal === 'Despesa') {
      despTotal += valorReal;

      despesasPorCategoria[categoriaReal] =
        (despesasPorCategoria[categoriaReal] || 0) + valorReal;

      evolucaoTempo[dataSimples].desp += valorReal;

      todasDespesas.push(m);
    }

    if (tbodyHistorico) {
      const row = document.createElement('tr');

      const dataPtBR = dataSimples
        ? dataSimples.split('-').reverse().join('/')
        : '';

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


  // Movimentações recentes
  const ultimos = [...movimentacoes].reverse().slice(0, 5);

  ultimos.forEach(m => {
    if (tbodyRecente) {
      const dataReal = m.data || m.Data || '';
      const tipoReal = m.tipo || m.Tipo;
      const valorReal = Number(m.valor ?? m.Valor ?? 0);
      const categoriaReal = m.categoria || m.Categoria;
      const descReal = m.descricao || m.Descricao || '-';

      const dataSimples = dataReal.includes('T')
        ? dataReal.split('T')[0]
        : dataReal;

      const dataPtBR = dataSimples
        ? dataSimples.split('-').reverse().join('/')
        : '';

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


  // Atualizar valores do dashboard
  const saldo = recTotal - despTotal;

  const saldoEl = document.getElementById('dash-saldo');
  const recEl = document.getElementById('dash-receita');
  const despEl = document.getElementById('dash-despesa');

  if (saldoEl) saldoEl.innerText = `R$ ${saldo.toFixed(2)}`;
  if (recEl) recEl.innerText = `R$ ${recTotal.toFixed(2)}`;
  if (despEl) despEl.innerText = `R$ ${despTotal.toFixed(2)}`;


  // Maiores despesas
  todasDespesas.sort((a, b) =>
    Number(b.valor ?? b.Valor ?? 0) - Number(a.valor ?? a.Valor ?? 0)
  );

  const top5Despesas = todasDespesas.slice(0, 5);


  // Evolução do saldo
  const datasOrdenadas = Object.keys(evolucaoTempo).sort();

  const linhaLabels = [];
  const linhaSaldo = [];

  let saldoAcumulado = 0;

  datasOrdenadas.forEach(data => {
    if (!data) return;

    const p = data.split('-');

    if (p.length >= 3) {
      linhaLabels.push(`${p[2]}/${p[1]}`);

      const saldoDiario =
        evolucaoTempo[data].rec - evolucaoTempo[data].desp;

      saldoAcumulado += saldoDiario;

      linhaSaldo.push(saldoAcumulado);
    }
  });


  atualizarGraficos({
    recTotal,
    despTotal,
    despesasPorCategoria,
    receitasPorCategoria,
    top5Despesas,
    linhaLabels,
    linhaSaldo
  });
}


// ==============================
// GRÁFICOS
// ==============================

function atualizarGraficos(dados) {
  const coresPadrao = [
    '#4318ff',
    '#05cd99',
    '#ee5d50',
    '#ffb547',
    '#39b8ff',
    '#8f9bba'
  ];

  if (myLineChart) myLineChart.destroy();
  if (myBarChart) myBarChart.destroy();
  if (myTopDespesasChart) myTopDespesasChart.destroy();
  if (myDoughnutDespesaChart) myDoughnutDespesaChart.destroy();
  if (myDoughnutReceitaChart) myDoughnutReceitaChart.destroy();


  // Gráfico de linha
  const ctxLine = document.getElementById('lineChart');

  if (ctxLine) {
    myLineChart = new Chart(ctxLine.getContext('2d'), {
      type: 'line',
      data: {
        labels: dados.linhaLabels,
        datasets: [{
          label: 'Saldo Acumulado (R$)',
          data: dados.linhaSaldo,
          borderColor: '#4318ff',
          backgroundColor: 'rgba(67, 24, 255, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  }


  // Gráfico de barras
  const ctxBar = document.getElementById('barChart');

  if (ctxBar) {
    myBarChart = new Chart(ctxBar.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Balanço Total'],
        datasets: [
          {
            label: 'Receitas',
            data: [dados.recTotal],
            backgroundColor: '#05cd99',
            borderRadius: 8,
            maxBarThickness: 80
          },
          {
            label: 'Despesas',
            data: [dados.despTotal],
            backgroundColor: '#ee5d50',
            borderRadius: 8,
            maxBarThickness: 80
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }


  // Top 5 despesas
  const ctxTop = document.getElementById('topDespesasChart');

  if (ctxTop && dados.top5Despesas.length > 0) {
    myTopDespesasChart = new Chart(ctxTop.getContext('2d'), {
      type: 'bar',
      data: {
        labels: dados.top5Despesas.map(d =>
          d.descricao || d.Descricao || d.categoria || d.Categoria
        ),
        datasets: [{
          label: 'Valor (R$)',
          data: dados.top5Despesas.map(d =>
            Number(d.valor ?? d.Valor ?? 0)
          ),
          backgroundColor: '#ee5d50',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }


  // Despesas por categoria
  const ctxPieD = document.getElementById('doughnutDespesaChart');

  if (ctxPieD && Object.keys(dados.despesasPorCategoria).length > 0) {
    myDoughnutDespesaChart = new Chart(ctxPieD.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(dados.despesasPorCategoria),
        datasets: [{
          data: Object.values(dados.despesasPorCategoria),
          backgroundColor: coresPadrao,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }


  // Receitas por categoria
  const ctxPieR = document.getElementById('doughnutReceitaChart');

  if (ctxPieR && Object.keys(dados.receitasPorCategoria).length > 0) {
    myDoughnutReceitaChart = new Chart(ctxPieR.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(dados.receitasPorCategoria),
        datasets: [{
          data: Object.values(dados.receitasPorCategoria),
          backgroundColor: ['#05cd99', '#4318ff', '#ffb547'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
}


// ==============================
// INICIALIZAÇÃO
// ==============================

if (token && usuarioLogado) {
  mostrarAplicativo();
} else {
  mostrarLogin();
}
