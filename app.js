// Registro do Service Worker para suporte PWA e modo Offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker registrado com sucesso!'))
    .catch((err) => console.log('Falha ao registrar Service Worker:', err));
}

let movimentacoes = JSON.parse(localStorage.getItem('movimentacoes')) || [];

function trocarTela(nomeTela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(`tela-${nomeTela}`).classList.add('active');
  atualizarDados();
}

// Salvar / Editar Receita (RF01, RF03, RN02)
document.getElementById('form-receita').addEventListener('submit', (e) => {
  e.preventDefault();
  const valor = parseFloat(document.getElementById('rec-valor').value);
  if (valor <= 0) return alert('RN02: O valor da receita deve ser maior que zero.');

  const id = document.getElementById('rec-id').value;
  const dados = {
    id: id ? parseInt(id) : Date.now(),
    tipo: 'Receita',
    valor: valor,
    data: document.getElementById('rec-data').value,
    categoria: document.getElementById('rec-categoria').value,
    descricao: document.getElementById('rec-desc').value
  };

  if (id) {
    const idx = movimentacoes.findIndex(m => m.id === parseInt(id));
    movimentacoes[idx] = dados;
  } else {
    movimentacoes.push(dados);
  }

  localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));
  e.target.reset();
  document.getElementById('rec-id').value = '';
  trocarTela('dashboard');
});

// Salvar / Editar Despesa (RF02, RF03, RN02)
document.getElementById('form-despesa').addEventListener('submit', (e) => {
  e.preventDefault();
  const valor = parseFloat(document.getElementById('desp-valor').value);
  if (valor <= 0) return alert('RN02: O valor da despesa deve ser maior que zero.');

  const id = document.getElementById('desp-id').value;
  const dados = {
    id: id ? parseInt(id) : Date.now(),
    tipo: 'Despesa',
    valor: valor,
    data: document.getElementById('desp-data').value,
    categoria: document.getElementById('desp-categoria').value,
    descricao: document.getElementById('desp-desc').value
  };

  if (id) {
    const idx = movimentacoes.findIndex(m => m.id === parseInt(id));
    movimentacoes[idx] = dados;
  } else {
    movimentacoes.push(dados);
  }

  localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));
  e.target.reset();
  document.getElementById('desp-id').value = '';
  trocarTela('dashboard');
});

// Excluir Movimentação (RF04, RN04)
function excluirMovimentacao(id) {
  if (confirm('Tem certeza que deseja excluir esta movimentação?')) {
    movimentacoes = movimentacoes.filter(m => m.id !== id);
    localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));
    atualizarDados();
  }
}

// Preparar Edição (RF03)
function editarMovimentacao(id) {
  const m = movimentacoes.find(item => item.id === id);
  if (!m) return;

  if (m.tipo === 'Receita') {
    document.getElementById('rec-id').value = m.id;
    document.getElementById('rec-valor').value = m.valor;
    document.getElementById('rec-data').value = m.data;
    document.getElementById('rec-categoria').value = m.categoria;
    document.getElementById('rec-desc').value = m.descricao;
    trocarTela('receita');
  } else {
    document.getElementById('desp-id').value = m.id;
    document.getElementById('desp-valor').value = m.valor;
    document.getElementById('desp-data').value = m.data;
    document.getElementById('desp-categoria').value = m.categoria;
    document.getElementById('desp-desc').value = m.descricao;
    trocarTela('despesa');
  }
}

// Renderização e Atualização do Saldo (RF06, RF07, RF08, RN01)
function atualizarDados() {
  let recTotal = 0;
  let despTotal = 0;

  const tbodyHistorico = document.getElementById('tabela-historico');
  const tbodyRecente = document.getElementById('dash-tabela-recente');
  const filtroCat = document.getElementById('filtro-categoria')?.value || 'TODAS';

  tbodyHistorico.innerHTML = '';
  if (tbodyRecente) tbodyRecente.innerHTML = '';

  movimentacoes.forEach((m) => {
    if (m.tipo === 'Receita') recTotal += m.valor;
    if (m.tipo === 'Despesa') despTotal += m.valor;

    // Aplicar Filtro de Categoria no Histórico (RF08)
    if (filtroCat === 'TODAS' || m.categoria === filtroCat) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${m.data}</td>
        <td style="color: ${m.tipo === 'Receita' ? '#16a34a' : '#dc2626'}; font-weight: 600;">${m.tipo}</td>
        <td>${m.categoria}</td>
        <td>${m.descricao || '-'}</td>
        <td>R$ ${m.valor.toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-edit" onclick="editarMovimentacao(${m.id})">Editar</button>
          <button class="btn btn-sm btn-delete" onclick="excluirMovimentacao(${m.id})">Excluir</button>
        </td>
      `;
      tbodyHistorico.appendChild(row);
    }
  });

  // Tabela Recente do Dashboard
  const ultimos = [...movimentacoes].reverse().slice(0, 5);
  ultimos.forEach((m) => {
    if (tbodyRecente) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${m.data}</td>
        <td style="color: ${m.tipo === 'Receita' ? '#16a34a' : '#dc2626'}; font-weight: 600;">${m.tipo}</td>
        <td>${m.categoria}</td>
        <td>${m.descricao || '-'}</td>
        <td>R$ ${m.valor.toFixed(2)}</td>
      `;
      tbodyRecente.appendChild(row);
    }
  });

  // Cálculo Automático do Saldo (RN01)
  const saldo = recTotal - despTotal;
  document.getElementById('dash-saldo').innerText = `R$ ${saldo.toFixed(2)}`;
  document.getElementById('dash-receita').innerText = `R$ ${recTotal.toFixed(2)}`;
  document.getElementById('dash-despesa').innerText = `R$ ${despTotal.toFixed(2)}`;
}

atualizarDados();