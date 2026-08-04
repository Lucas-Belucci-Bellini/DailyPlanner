const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function carregarTarefas(){
  try{
    const res = await fetch(`${API}/api/horarios`);
    const tarefas = await res.json();
    const div = document.getElementById('listaTarefas');
    div.innerHTML = '';
    if(!tarefas.length){ div.innerHTML = '<p style="color:#666">Nenhuma tarefa cadastrada.</p>'; return }
    tarefas.forEach(t=>{
      const card = document.createElement('div');
      card.style = 'border:1px solid #ddd;padding:12px;margin-bottom:8px;border-radius:6px;background:#fff'
      const horaFim = t.horaFim ? ` até ${t.horaFim.substring(0,5)}` : '';
      const status = t.notificado ? '<span style="color:green">✅ Alarme enviado</span>' : '<span style="color:#d97706">⏳ Aguardando</span>'
      card.innerHTML = `<h3 style="margin:0">${t.titulo}</h3><p style="margin:6px 0">📅 <strong>${t.data}</strong> | ⏰ <strong>${t.horaInicio.substring(0,5)}</strong>${horaFim}</p>${status}`
      div.appendChild(card);
    })
  }catch(e){
    document.getElementById('listaTarefas').innerHTML = '<p style="color:red">Erro ao conectar ao servidor.</p>';
    console.error(e)
  }
}

document.getElementById('formHorario').addEventListener('submit', async (ev)=>{
  ev.preventDefault();
  const novo = {
    titulo: document.getElementById('titulo').value,
    data: document.getElementById('data').value,
    horaInicio: document.getElementById('horaInicio').value + ':00',
    horaFim: document.getElementById('horaFim').value ? document.getElementById('horaFim').value + ':00' : null
  };
  try{
    const res = await fetch(`${API}/api/horarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novo)
    });
    if(res.ok){
      alert('Tarefa salva!');
      document.getElementById('formHorario').reset();
      carregarTarefas();
    }else{
      alert('Erro ao salvar');
    }
  }catch(e){
    console.error(e); alert('Erro de rede')
  }
})

carregarTarefas();
