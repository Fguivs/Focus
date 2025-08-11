import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { 
    getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, 
    increment, writeBatch, query, where, onSnapshot, runTransaction, deleteField, orderBy
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDoncRn8ikIdij8aXC0OUeqdqnLITrhmPc",
    authDomain: "foco-diario-75630.firebaseapp.com",
    projectId: "foco-diario-75630",
    storageBucket: "foco-diario-75630.appspot.com",
    messagingSenderId: "1040579676771",
    appId: "1:1040579676771:web:ca12f964d8adb3778e4656"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  // Configurar fuso horário para Brasília
Date.prototype.getBrasiliaHours = function() {
  const offset = this.getTimezoneOffset() + 180; // UTC-3 (Brasília)
  return (this.getHours() + Math.floor(offset / 60)) % 24;
};
  
  // Variáveis atualizadas para membros dinâmicos
  let streaksCache = {};
  let todosMembros = [];
  let equipes = {
    abelha: { membros: [], lider: null },
    joaninha: { membros: [], lider: null },
    vagalume: { membros: [], lider: null }
  };
  let liderGeral = null;
  
  let currentUser = null;
  let userRole = null;
  let userTeam = null;
  
  
  // Variáveis para controle do carrossel
  let currentCarrosselIndex = 0;
  let carrosselInterval;
  let carrosselPausado = false;
  let progressoBarra;
  
  let totalSlides = 0;
  
  let membroParaExpulsar = null;

  const medalhas = {
    3: { emoji: "🔥", nome: "Fagulha" },
    10: { emoji: "👑", nome: "Lenda" },
    30: { emoji: "🌟", nome: "Constante" },
    60: { emoji: "💎", nome: "Diamante" },
    120: { emoji: "🚀", nome: "Foguete" },
    150: { emoji: "🏆", nome: "Troféu" },
    240: { emoji: "🔮", nome: "Bola de cristal" },
    365: { emoji: "🌞", nome: "Solar" }
  };
  const totalDiasMembros = {};
  const pontosSemanais = { abelha: 0, joaninha: 0, vagalume: 0 };
  const rankingGeral = { abelha: 0, joaninha: 0, vagalume: 0 };
  const historicoAcoes = {};
  
  // Variável de controle para evitar duplicação
  let atualizando = false;
  
  // Variável para acompanhar a data atual
  let dataAtual = '';
  
  // Sistema de fila para atualizações rápidas
  let filaAtualizacao = Promise.resolve();
  
  // Variáveis para controle do painel secreto
  let cliqueCount = 0;
  let timeoutClique;
  
  let composerSelectedColor = '#CAFFBF'; // Cor padrão
let composerTimestampInterval = null;
let composerEditMode = false;
let editingMessageId = null;
let messageIdToDelete = null;
let unsubscribeViewerListener = null; 

let checkboxLocks = {};
  
  // Variáveis para autenticação
  let authContainer, mainContent, logoutBtn;
  let loginForm, changePasswordForm, forgotPasswordForm, secretQuestionForm;
  let loginBtn, loginUsernameInput, loginPasswordInput;
  
  let currentUserRole = 'membro'; // Inicializa com o papel padrão 'membro'
  let currentUserTeam = null; // Inicializa com a equipe padrão null
  let memberIdToRemove = null;
  
  let lastRefreshTimestamp = null;
  let officialAppVersion = null;
  const EMOJIS_MURAL = ['👍', '💖', '😂', '🎉', '🔥', '🎯', '😭', '😡'];
  
function formatarDataISO(date) {
    if (!date) return '';
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // Funções dinâmicas para data
  function getHoje() {
    return new Date();
  }

  function getHojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function formatarData(date) {
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }

  function getSemanaAtual(dateInput = null) {
    const data = dateInput || getHoje();
    const diaSemana = data.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    // Se for domingo, usar a semana anterior (já que terminou no sábado)
    if (diaSemana === 0) {
      const sabadoAnterior = new Date(data);
      sabadoAnterior.setDate(data.getDate() - 1);
      const segundaAnterior = new Date(sabadoAnterior);
      segundaAnterior.setDate(sabadoAnterior.getDate() - 6);
      
      return {
        inicio: segundaAnterior,
        fim: sabadoAnterior,
        numero: Math.ceil((segundaAnterior - new Date(segundaAnterior.getFullYear(), 0, 1)) / (24*60*60*1000) / 7),
        inicioFormatado: formatarData(segundaAnterior),
        fimFormatado: formatarData(sabadoAnterior),
        fimCompeticao: formatarData(sabadoAnterior).slice(0, 5)
      };
    }

    // Calcula a segunda-feira da semana atual
    const segunda = new Date(data);
    segunda.setDate(data.getDate() - (diaSemana - 1));
    
    // Calcula o sábado (5 dias após segunda)
    const sabado = new Date(segunda);
    sabado.setDate(segunda.getDate() + 5);
    
    // Calcula o número da semana
    const primeiroDiaAno = new Date(segunda.getFullYear(), 0, 1);
    const diferencaDias = Math.floor((segunda - primeiroDiaAno) / (24*60*60*1000));
    const semanaNumero = Math.ceil((diferencaDias + primeiroDiaAno.getDay() + 1) / 7);
    
    return {
      inicio: segunda,
      fim: sabado,
      numero: semanaNumero,
      inicioFormatado: formatarData(segunda),
      fimFormatado: formatarData(sabado),
      fimCompeticao: formatarData(sabado).slice(0, 5)
    };
  }

  // ATUALIZADA: Agora salva um timestamp em vez de 'true'
  async function salvarPresenca() {
    const hoje = getHoje();

    // Adicione esta linha para definir hojeISO
    const hojeISO = getHojeISO();
    
    const presencas = {};
    
    todosMembros.forEach(membro => {
      const nome = membro.nome;
      const checkbox = document.getElementById(nome);
      if (checkbox) {
        // MUDANÇA PRINCIPAL AQUI:
        // Se a caixa estiver marcada, salvamos o objeto de data atual.
        // Se não estiver, não salvamos nada para aquele membro no documento do dia.
        if (checkbox.checked) {
          presencas[nome] = new Date(); // Salva a data e hora exatas
        }
      }
    });
    
    // Usamos 'setDoc' com 'merge: true' para não sobrescrever focos
    // de outros usuários que possam ter sido registrados momentos antes.
    await setDoc(doc(db, "presencas", hojeISO), presencas, { merge: true });
  }

    // ATUALIZADA: Entende o timestamp como um check-in válido
  async function carregarPresenca() {
    const hojeISO = getHojeISO();
    const docSnap = await getDoc(doc(db, "presencas", hojeISO));

    if (docSnap.exists()) {
      const data = docSnap.data();
      todosMembros.forEach(membro => {
        const nome = membro.nome;
        const checkbox = document.getElementById(nome);
        // MUDANÇA AQUI:
        // A condição `data[nome]` continuará funcionando, pois um objeto de data é "truthy".
        // Apenas garantimos que `checkbox.checked` receba um booleano `true`.
        if (checkbox && data[nome]) {
          checkbox.checked = true;
        }
      });
    }
  }

  // ATUALIZADA: Cálculo correto dos dias totais
  async function carregarTotalDias() {
    const querySnapshot = await getDocs(collection(db, "presencas"));
    
    // Resetar contagem
    todosMembros.forEach(membro => {
      totalDiasMembros[membro.nome] = 0;
    });
    
    // Contar dias para cada membro
    querySnapshot.forEach(doc => {
      const data = doc.data();
      Object.keys(data).forEach(nome => {
        // CORREÇÃO: Usar .some() para verificar se o membro existe na lista de objetos
        if (data[nome] && todosMembros.some(m => m.nome === nome)) {
          totalDiasMembros[nome] = (totalDiasMembros[nome] || 0) + 1;
        }
      });
    });
    
    atualizarMedalhas();
  }

  async function carregarPontosSemanais() {
    const hoje = getHoje();
    
    // O bloco de código que apagava os pontos no domingo foi REMOVIDO.

    // Carregar pontos do documento único
    const pontosRef = doc(db, "semanas", "pontosSemanais");
    const docSnap = await getDoc(pontosRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      pontosSemanais.abelha = data.abelha || 0;
      pontosSemanais.joaninha = data.joaninha || 0;
      pontosSemanais.vagalume = data.vagalume || 0;
    } else {
      // Se não existe e não for domingo (dia de reset), cria um novo.
      if (hoje.getDay() !== 0) {
          await setDoc(pontosRef, {
            abelha: 0,
            joaninha: 0,
            vagalume: 0
          });
      }
      // Se for domingo e não existe, está correto, pois a semana ainda vai começar.
      pontosSemanais.abelha = 0;
      pontosSemanais.joaninha = 0;
      pontosSemanais.vagalume = 0;
    }
  }

  async function carregarRankingGeral() {
    const rankingDoc = await getDoc(doc(db, "ranking", "geral"));
    if (rankingDoc.exists()) {
      const data = rankingDoc.data();
      rankingGeral.abelha = data.abelha || 0;
      rankingGeral.joaninha = data.joaninha || 0;
      rankingGeral.vagalume = data.vagalume || 0;
    }
    atualizarRankingGeral();
  }

  async function finalizarSemana() {
    const hoje = getHoje();

    // A lógica de premiação agora roda no SÁBADO, às 23:59.
    // A lógica de apagar o placar antigo e resetar, roda no DOMINGO.

    // LÓGICA DE PREMIAÇÃO (SÁBADO - CORRIGIDA PARA RODAR UMA ÚNICA VEZ)
if (hoje.getDay() === 6) { // 6 = Sábado
    const semana = getSemanaAtual();
    const docId = `semana_${semana.numero}_${semana.inicio.getFullYear()}`;
    const advantageRef = doc(db, "vantagemSemanal", docId);
    const pontosRef = doc(db, "semanas", "pontosSemanais");

    try {
        await runTransaction(db, async (transaction) => {
            const advantageDoc = await transaction.get(advantageRef);

            // 1. VERIFICA O "TRAVÃO": Se o bônus já foi aplicado, interrompe a execução.
            if (advantageDoc.exists() && advantageDoc.data().bonusAplicado) {
                console.log("Bônus da vantagem já foi aplicado esta semana.");
                return; 
            }

            const pontosBonus = { abelha: 0, joaninha: 0, vagalume: 0 };
            let bonusSeraAplicado = false;

            if (advantageDoc.exists()) {
                const completadoPor = advantageDoc.data().completadoPor || {};
                for (const nomeMembro in completadoPor) {
                    const membro = todosMembros.find(m => m.nome === nomeMembro);
                    if (membro && membro.equipe) {
                        pontosBonus[membro.equipe] += 3; // +3 pontos por conclusão
                        bonusSeraAplicado = true;
                    }
                }
            }

            if (bonusSeraAplicado) {
    // 2. ATUALIZA OS PONTOS, REGISTRA EVENTOS E ATIVA O "TRAVÃO"
    transaction.update(pontosRef, {
        abelha: increment(pontosBonus.abelha),
        joaninha: increment(pontosBonus.joaninha),
        vagalume: increment(pontosBonus.vagalume)
    });

    // Ativa o "travão" para não rodar de novo
    transaction.set(advantageRef, { bonusAplicado: true }, { merge: true });

                // Atualiza as variáveis locais para refletir na interface imediatamente
                pontosSemanais.abelha += pontosBonus.abelha;
                pontosSemanais.joaninha += pontosBonus.joaninha;
                pontosSemanais.vagalume += pontosBonus.vagalume;
                
                // Exibe o popup de sucesso
            mostrarPopup("✨ Bônus Aplicado!", "Pontos do Jogo da Vantagem foram adicionados!", 6000);

            // ===== INÍCIO DA NOVA LÓGICA PARA O FEED =====
            const nomesEquipes = { abelha: "Abelha", joaninha: "Joaninha", vagalume: "Vaga-lume" };
            const mensagensEquipes = [];

            // Cria uma mensagem para cada equipe que pontuou
            for (const equipe in pontosBonus) {
                if (pontosBonus[equipe] > 0) {
                    mensagensEquipes.push(`A equipe <strong>${nomesEquipes[equipe]}</strong> garantiu <strong>${pontosBonus[equipe]}</strong> pontos`);
                }
            }

            if (mensagensEquipes.length > 0) {
                const textoFeed = mensagensEquipes.join('. ') + '.';
                await adicionarEventoAoFeed(
                    'vantagem',
                    '✨ Bônus do Jogo da Vantagem!',
                    `Os pontos extras foram distribuídos! ${textoFeed}`
                );
            }
            // ===== FIM DA NOVA LÓGICA PARA O FEED =====

        }
    });
} catch (error) {
    console.error("Erro na transação de bônus da vantagem:", error);
}
}

    // LÓGICA DE FINALIZAÇÃO E RESET (DOMINGO)
    if (hoje.getDay() === 0 && hoje.getBrasiliaHours() >= 0) {
        const pontosRef = doc(db, "semanas", "pontosSemanais");
        const docSnap = await getDoc(pontosRef);

        if (docSnap.exists()) {
            const pontos = docSnap.data();
            let vencedora = null;
            let maxPontos = -1; // Inicia com -1 para funcionar corretamente
            const equipesComPontuacao = [];

            if (pontos.abelha > maxPontos) { maxPontos = pontos.abelha; }
            if (pontos.joaninha > maxPontos) { maxPontos = pontos.joaninha; }
            if (pontos.vagalume > maxPontos) { maxPontos = pontos.vagalume; }

            if (pontos.abelha === maxPontos) equipesComPontuacao.push("abelha");
            if (pontos.joaninha === maxPontos) equipesComPontuacao.push("joaninha");
            if (pontos.vagalume === maxPontos) equipesComPontuacao.push("vagalume");

            const empate = equipesComPontuacao.length > 1;
            const vencedoras = equipesComPontuacao.filter(eq => pontos[eq] === maxPontos);

            if (vencedoras.length > 0 && maxPontos > 0) {
                const rankingRef = doc(db, "ranking", "geral");
                const atualizacoes = {};
                vencedoras.forEach(equipe => {
                    atualizacoes[equipe] = increment(1);
                    rankingGeral[equipe]++;
                });
                await updateDoc(rankingRef, atualizacoes);
                atualizarRankingGeral();

                const nomesEquipes = { abelha: "Abelha", joaninha: "Joaninha", vagalume: "Vaga-lume" };
                const nomesVencedoras = vencedoras.map(eq => nomesEquipes[eq]).join(" e ");

                if (empate) {
                    mostrarPopup("🏆 Empate Semanal", `As equipes ${nomesVencedoras} empataram com ${maxPontos} pontos! Todas ganham um ponto no ranking.`, 8000);
					
					await adicionarEventoAoFeed(
        'vitoria',
        '🏆 Empate na Competição Semanal!',
        `Que disputa acirrada! As equipes <strong>${nomesVencedoras}</strong> empataram com incríveis <strong>${maxPontos}</strong> pontos. Todas foram coroadas campeãs!`,
        { vencedoras: vencedoras }
    );
					
                } else {
                    mostrarPopup("🏆 Vitória Semanal", `Equipe ${nomesVencedoras} venceu a semana com ${maxPontos} pontos!`, 8000);
					
					await adicionarEventoAoFeed(
        'vitoria',
        '🏆 Temos uma Campeã Semanal!',
        `Com uma performance espetacular, a equipe <strong>${nomesVencedoras}</strong> venceu a competição com <strong>${maxPontos}</strong> pontos! Parabéns a todos os membros!`,
        { vencedoras: vencedoras }
    );
					
                }
				
				// NOVO BLOCO: Salva o resultado da semana para o resumo de ontem
const semanaPassada = getSemanaAtual(new Date(hoje.setDate(hoje.getDate() - 1)));
const resultadoSemanalId = `resultado_${semanaPassada.numero}_${semanaPassada.inicio.getFullYear()}`;
await setDoc(doc(db, "resultadosSemanais", resultadoSemanalId), {
    vencedoras: vencedoras,
    pontuacao: maxPontos,
    empate: empate
});
				
            }
			
			await calcularMembrosOciosos();

            // Apagar documento de pontos semanais para a próxima semana
            await deleteDoc(pontosRef);
            pontosSemanais.abelha = 0;
            pontosSemanais.joaninha = 0;
            pontosSemanais.vagalume = 0;
            atualizarPlacarSemanal();
        }
    }
}

  function getMedalha(totalDias) {
    const niveis = Object.keys(medalhas).map(Number).sort((a, b) => b - a);
    for (const nivel of niveis) {
      if (totalDias >= nivel) {
        return medalhas[nivel];
      }
    }
    return null;
  }

  async function atualizarMedalhas() {
    // Esta função agora é super rápida, pois lê do cache local, e não do banco de dados.
    for (const nome in streaksCache) {
        if (Object.hasOwnProperty.call(streaksCache, nome)) {
            atualizarStreakVisualMembro(nome, streaksCache[nome]);
        }
    }
  }

  function atualizarPlacarSemanal() {
    if (document.getElementById("resumo-abelha")) {
      document.getElementById("resumo-abelha").innerHTML = `
        <div>${document.querySelectorAll('#equipe-abelha input:checked').length} focaram hoje!</div>
        <div>${pontosSemanais.abelha} pontos na semana</div>
      `;
    }
    
    if (document.getElementById("resumo-joaninha")) {
      document.getElementById("resumo-joaninha").innerHTML = `
        <div>${document.querySelectorAll('#equipe-joaninha input:checked').length} focaram hoje!</div>
        <div>${pontosSemanais.joaninha} pontos na semana</div>
      `;
    }
    
    if (document.getElementById("resumo-vagalume")) {
      document.getElementById("resumo-vagalume").innerHTML = `
        <div>${document.querySelectorAll('#equipe-vagalume input:checked').length} focaram hoje!</div>
        <div>${pontosSemanais.vagalume} pontos na semana</div>
      `;
    }
  }

  function atualizarRankingGeral() {
    if (document.getElementById("ranking-abelha")) {
      document.getElementById("ranking-abelha").textContent = rankingGeral.abelha;
    }
    if (document.getElementById("ranking-joaninha")) {
      document.getElementById("ranking-joaninha").textContent = rankingGeral.joaninha;
    }
    if (document.getElementById("ranking-vagalume")) {
      document.getElementById("ranking-vagalume").textContent = rankingGeral.vagalume;
    }
	atualizarPodioEquipes()
  }

  // ATUALIZADA: Verificação inicial de membros
  window.atualizarResumo = async function () {
    if (todosMembros.length === 0) return;

    filaAtualizacao = filaAtualizacao.then(async () => {
      const hoje = getHoje();
      const hojeISO = getHojeISO();
      
      const total = todosMembros.filter(membro => document.getElementById(membro.nome)?.checked).length;
      const totalMembrosContagem = todosMembros.length; // Usamos uma variável para o total
      
      if (document.getElementById("contadorGeral")) {
        document.getElementById("contadorGeral").textContent = `${total} épicos focaram hoje!`;
        const porcentagem = totalMembrosContagem > 0 ? (total / totalMembrosContagem) * 100 : 0;
        const barraProgresso = document.getElementById("progresso-barra");
        barraProgresso.style.width = `${porcentagem}%`;
        
        // --- INÍCIO DO NOVO CÓDIGO DO MARCADOR ---
        const marcadorArvore = document.getElementById('marcador-arvore');
        if (marcadorArvore && totalMembrosContagem > 0) {
          const posicaoMeta = (10 / totalMembrosContagem) * 100;
          if (posicaoMeta <= 100) {
            marcadorArvore.style.left = `${posicaoMeta}%`;
            marcadorArvore.style.display = 'flex';
          } else {
            marcadorArvore.style.display = 'none'; // Esconde se a meta for inatingível
          }
        }
        // --- FIM DO NOVO CÓDIGO DO MARCADOR ---

        const todosFocados = total === totalMembrosContagem;
        const globalStats = document.querySelector(".global-stats");
		
		    const mensagemTodosFocados = document.getElementById("mensagem-todos-focados");

        if (todosFocados) {
          barraProgresso.classList.add("rainbow-progress");
          globalStats.classList.add("rainbow-border");
          if (mensagemTodosFocados) {
              mensagemTodosFocados.textContent = "Todos focaram hoje, estamos de parabéns!!";
              mensagemTodosFocados.classList.remove("hidden");
          }
        } else {
          barraProgresso.classList.remove("rainbow-progress");
          globalStats.classList.remove("rainbow-border");
          if (mensagemTodosFocados) {
              mensagemTodosFocados.classList.add("hidden");
          }
        }
      }
      
      atualizarPlacarSemanal();
      verificarEquipeCompleta();
      await verificarArvoreEpica(total);
      await carregarTop5Semana();
    }).catch(error => {
      console.error("Erro na atualização:", error);
    });
    
    await filaAtualizacao;
    await carregarStreaks();
  }

  // Verificar se todos os membros de uma equipe estão focados
  function verificarEquipeCompleta() {
    for (const equipeNome in equipes) {
      const grupo = document.getElementById(`equipe-${equipeNome}`);
      const mensagemEl = document.getElementById(`msg-equipe-${equipeNome}`);
      if (!grupo || !mensagemEl) continue;

      const todosFocados = equipes[equipeNome].membros.every(membroObj => 
        document.getElementById(membroObj.nome)?.checked
      );
      
      // --- INÍCIO DA MODIFICAÇÃO: Aplicar/Remover brilho dos membros ---
      const classeBrilho = `membro-completo-${equipeNome}`;
      equipes[equipeNome].membros.forEach(membroObj => {
        const membroEl = document.getElementById(membroObj.nome)?.parentElement; // Pega o <div class="membro">
        if (membroEl) {
          if (todosFocados && equipes[equipeNome].membros.length > 0) {
            membroEl.classList.add(classeBrilho);
          } else {
            membroEl.classList.remove(classeBrilho);
          }
        }
      });
      // --- FIM DA MODIFICAÇÃO ---
      
      mensagemEl.classList.remove('abelha', 'joaninha', 'vagalume');

      if (todosFocados && equipes[equipeNome].membros.length > 0) {
        grupo.classList.add('equipe-completa', equipeNome); // Mantém o brilho no container da equipe
        const nomeCapitalizado = equipeNome.charAt(0).toUpperCase() + equipeNome.slice(1);
        mensagemEl.textContent = `Parabéns, equipe ${nomeCapitalizado}!! Vocês gabaritaram hoje!!!`;
        mensagemEl.classList.add(equipeNome);
        mensagemEl.classList.remove('hidden');
      } else {
        grupo.classList.remove('equipe-completa', equipeNome); // Remove o brilho do container da equipe
        mensagemEl.classList.add('hidden');
      }
    }
  }
  
  // NOVA FUNÇÃO: Para exibir o popup em formato de card
function mostrarCardPopup(titulo, mensagem) {
  const overlay = document.getElementById('custom-card-popup');
  const popupTitle = document.getElementById('card-popup-title');
  const popupMessage = document.getElementById('card-popup-message');
  const closeBtn = document.getElementById('card-popup-close-btn');

  popupTitle.textContent = titulo;
  popupMessage.innerHTML = mensagem; // Usamos innerHTML para renderizar quebras de linha <br>

  // Adiciona a classe do tema atual para o popup
  const bodyClass = document.body.className;
  if (bodyClass.includes('tema-noite')) {
    overlay.classList.add('tema-noite');
  } else {
    overlay.classList.remove('tema-noite');
  }

  overlay.classList.add('show');

  // Função para fechar o popup
  const fecharPopup = () => {
    overlay.classList.remove('show');
  };

  // Fecha ao clicar no botão ou no overlay
  closeBtn.onclick = fecharPopup;
  overlay.onclick = (event) => {
    if (event.target === overlay) {
      fecharPopup();
    }
  };
}

  window.mostrarPopup = function (titulo, mensagem, duracao = 8000) {
    const popup = document.getElementById("popup-message");
    if (!popup) return;
    
    popup.innerHTML = `<strong>${titulo}</strong><br>${mensagem}`;
    popup.classList.add("show"); 
    clearTimeout(window.popupTimeout);
    window.popupTimeout = setTimeout(() => {
      popup.classList.remove("show");
    }, duracao);
  }

  const conquistas = {
    5: "🏆 5 dias consecutivos!",
    10: "🔥 Fogo Sagrado! 10 dias!",
    15: "🚀 Nível Épico! 15 dias!"
  };

  const medalhasConcedidas = {};
  
   async function verificarConquista(nome, acao) {
    const hoje = getHoje();
    const hojeISO = getHojeISO();
    let conquistaOcorrida = false; // Variável para rastrear se um pop-up foi mostrado
    let streakAtual = 0; // Variável para armazenar o streak final

    await (filaAtualizacao = filaAtualizacao.then(async () => {
      const docRef = doc(db, "streak", nome);
      
      try {
        let streakAntesDaAcao = 0;
        const docSnapAntes = await getDoc(docRef);
        if (docSnapAntes.exists()) {
            streakAntesDaAcao = docSnapAntes.data().streak || 0;
        }

        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(docRef);
          let streak = docSnap.exists() ? docSnap.data().streak : 0;
          let ultimoDia = docSnap.exists() ? docSnap.data().ultimoDia : null;

          const ontem = new Date(hoje);
          ontem.setDate(ontem.getDate() - 1);
          const ontemISO = ontem.toISOString().slice(0,10);

          if (acao === 'adicionar') {
            // Apenas incrementa o streak se o foco de hoje ainda não foi registrado.
            // Isso previne que o streak aumente múltiplas vezes no mesmo dia.
            if (ultimoDia !== hojeISO) {
                streak += 1;
            }
            // Define o último dia de foco como hoje para registrar a presença.
            ultimoDia = hojeISO;
           } else if (acao === 'remover') {
            // Apenas decrementa o streak se o foco de hoje *tinha sido* registrado.
            if (ultimoDia === hojeISO) {
                streak = Math.max(0, streak - 1); // Garante que o streak nunca seja menor que zero.
                
                // O último dia de foco volta a ser o dia anterior (ontem),
                // apenas se o streak for maior que zero, para manter a 
                // consistência da contagem de dias consecutivos.
                // Se o streak se tornar zero, o último dia é resetado.
                ultimoDia = ontemISO;
            }
          }
          
          transaction.set(docRef, { streak, ultimoDia });
        });

        const docSnapDepois = await getDoc(docRef);
        streakAtual = docSnapDepois.exists() ? docSnapDepois.data().streak : 0; // Atualiza a variável

        const medalhaConquistada = getMedalha(streakAtual);
        const medalhaAnterior = getMedalha(streakAntesDaAcao);

        if (acao === 'adicionar' && medalhaConquistada && (!medalhaAnterior || medalhaConquistada.nome !== medalhaAnterior.nome)) {
          const somConquista = document.getElementById("som-conquista");
          if (somConquista) {
            somConquista.currentTime = 0;
            somConquista.play();
          }
          mostrarPopup("🏅 Nova Medalha", `${nome} conquistou:<br>${medalhaConquistada.emoji} ${medalhaConquistada.nome}!`, 8000);
          dispararConfete();
          conquistaOcorrida = true; // AVISO: uma conquista aconteceu
		  
		   await adicionarEventoAoFeed(
    'medalha', 
    '🏅 Nova Medalha!', 
    `<strong>${nome}</strong> alcançou um novo patamar e conquistou a medalha ${medalhaConquistada.emoji} <strong>${medalhaConquistada.nome}</strong>. Parabéns!`,
    { nomeMembro: nome }
  );
		  
}

        if (conquistas[streakAtual] && aco === 'adicionar' && streakAtual > streakAntesDaAcao) {
          const somConquista = document.getElementById("som-conquista");
          if (somConquista) {
            somConquista.currentTime = 0;
            somConquista.play();
          }
          mostrarPopup("🌟 Conquista", `${nome} conquistou:<br>${conquistas[streakAtual]}`, 8000);
          dispararConfete();
          conquistaOcorrida = true; // AVISO: uma conquista aconteceu
        }

      } catch (error) {
        console.error("Falha na transação:", error);
      }
    }));
    
    // Retorna o valor do streak após a transação ser concluída
    return { conquistaOcorrida, streakAtual };
  }
  
  function atualizarStreakVisualMembro(nome, streak) {
    const diasElement = document.getElementById(`dias-${nome}`);
    if (diasElement) {
        diasElement.textContent = streak;
        diasElement.title = `${streak} dias de foco consecutivos`;
    }

    const medalhaElement = document.getElementById(`medalha-${nome}`);
    if (medalhaElement) {
        const medalha = getMedalha(streak);
        if (medalha) {
            medalhaElement.innerHTML = medalha.emoji;
            medalhaElement.title = `${medalha.nome} - ${streak} dias de foco consecutivos`;
            medalhaElement.classList.add('com-medalha');
            medalhaElement.classList.remove('escondido');
        } else {
            medalhaElement.innerHTML = '';
            medalhaElement.classList.remove('com-medalha');
            medalhaElement.classList.add('escondido');
        }
    }
  }

  function dispararConfete() {
    const confettiCanvas = document.getElementById("confetti-canvas");
    if (!confettiCanvas) return;
    
    const confettiCtx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const confettiParticles = [];
    const particleCount = 200; // Mais partículas para um efeito mais cheio
    const colors = ["#FFD700", "#FF6B6B", "#2ECC71", "#3498DB", "#9B59B6", "#FAD390"];

    for (let i = 0; i < particleCount; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: -Math.random() * confettiCanvas.height, // Começam de alturas variadas acima da tela
        w: Math.random() * 8 + 5,  // Largura do retângulo
        h: Math.random() * 15 + 8, // Altura do retângulo
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2, // Ângulo inicial de rotação
        speed: Math.random() * 4 + 2,       // Velocidade de queda
        spin: Math.random() * 0.4 - 0.2,    // Velocidade de rotação
        drift: Math.random() * 2 - 1        // Movimento lateral (deriva)
      });
    }
    
    let lastTime = 0;
    function animateConfetti(time) {
      const deltaTime = time - lastTime;
      lastTime = time;

      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      
      let particlesAlive = 0;
      for (let i = 0; i < confettiParticles.length; i++) {
        const p = confettiParticles[i];
        
        // Atualiza a posição e rotação
        p.y += p.speed;
        p.x += p.drift;
        p.angle += p.spin;

        // Desenha o retângulo rotacionado
        confettiCtx.save(); // Salva o estado atual do canvas
        confettiCtx.translate(p.x + p.w / 2, p.y + p.h / 2); // Move o ponto de origem para o centro da partícula
        confettiCtx.rotate(p.angle); // Rotaciona o canvas
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); // Desenha o retângulo a partir do centro
        confettiCtx.restore(); // Restaura o estado original do canvas

        // Verifica se a partícula ainda está na tela
        if (p.y < confettiCanvas.height) {
          particlesAlive++;
        }
      }
      
      if (particlesAlive > 0) {
        requestAnimationFrame(animateConfetti);
      } else {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }
    
    requestAnimationFrame(animateConfetti);
  }
  
  function iniciarConfeteAniversarioContinuo() {
    // Se já estiver rodando, não faz nada
    if (animacaoConfeteAniversarioId) return;

    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ["#FFD700", "#FF6B6B", "#2ECC71", "#3498DB", "#9B59B6", "#FAD390"];

    // 1. GERADOR DE PARTÍCULAS: Cria 1 nova partícula a cada 200ms
    geradorDeParticulasId = setInterval(() => {
      particulasAniversario.push({
        x: Math.random() * canvas.width,
        y: -20, // Começa um pouco acima da tela
        w: Math.random() * 6 + 4,  // Tamanho um pouco menor
        h: Math.random() * 12 + 6, // Tamanho um pouco menor
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 2 + 1, // Velocidade de queda menor
        spin: Math.random() * 0.2 - 0.1,
        drift: Math.random() * 1 - 0.5 
      });
    }, 200); // Intervalo maior para menos partículas

    // 2. LOOP DE ANIMAÇÃO: Apenas desenha e move as partículas existentes
    function animarConfeteContinuo() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Itera de trás para frente para poder remover itens do array sem problemas
      for (let i = particulasAniversario.length - 1; i >= 0; i--) {
        const p = particulasAniversario[i];
        
        p.y += p.speed;
        p.x += p.drift;
        p.angle += p.spin;

        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();

        // Remove a partícula se ela já saiu da tela
        if (p.y > canvas.height + 20) {
          particulasAniversario.splice(i, 1);
        }
      }
      
      // Continua o loop de animação
      animacaoConfeteAniversarioId = requestAnimationFrame(animarConfeteContinuo);
    }

    // Inicia a animação
    animarConfeteContinuo();
  }
  
  function pararConfeteAniversarioContinuo() {
    if (geradorDeParticulasId) {
      clearInterval(geradorDeParticulasId);
      geradorDeParticulasId = null;
    }
    if (animacaoConfeteAniversarioId) {
      cancelAnimationFrame(animacaoConfeteAniversarioId);
      animacaoConfeteAniversarioId = null;
    }
    // Limpa o array e o canvas para garantir que tudo pare
    particulasAniversario = [];
    const canvas = document.getElementById("confetti-canvas");
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

 window.marcarCheckbox = async function (nome) {
    if (checkboxLocks[nome]) {
      console.warn(`Ação para '${nome}' já está em andamento. Clique ignorado.`);
      const checkboxOriginal = document.getElementById(nome);
      if (checkboxOriginal) {
          checkboxOriginal.checked = !checkboxOriginal.checked;
      }
      return; 
    }

    checkboxLocks[nome] = true;

    const checkbox = document.getElementById(nome);
    if (!checkbox) {
        checkboxLocks[nome] = false;
        return;
    }

    const membroAlvo = todosMembros.find(m => m.nome === nome);
    if (!membroAlvo) { 
        checkboxLocks[nome] = false;
        return;
    }

    const podeMarcar = () => {
      if (userRole === 'lider') return true;
      if (userRole === 'lider-equipe' && membroAlvo.equipe === userTeam) return true;
      if (userRole === 'membro' && currentUser === nome) return true;
      return false;
    };

    if (!podeMarcar()) {
      checkbox.checked = !checkbox.checked;
      mostrarPopup("🚫 Acesso Negado", "Você não tem permissão para alterar o foco de outro membro.", 4000);
      checkboxLocks[nome] = false;
      return; 
    }

    const hoje = getHoje();
    const isDomingo = hoje.getDay() === 0;
    const acao = checkbox.checked ? 'adicionar' : 'remover';
   
    if (acao === 'adicionar') {
        mostrarPopup("🎉 Foco Registrado", `${nome}, parabéns por ter focado hoje!`, 3000);
        if (isDomingo) {
            setTimeout(() => {
                mostrarPopup("⚠️ Aviso", "Pontos semanais não são contabilizados aos domingos", 5000);
            }, 3000);
        }
    } else {
        mostrarPopup("ℹ️ Foco Removido", `${nome}, seu foco de hoje foi removido`, 3000);
    }

    let equipeDoMembro = membroAlvo.equipe;
    if (!isDomingo && equipeDoMembro) {
        const valorIncremento = checkbox.checked ? 1 : -1;
        pontosSemanais[equipeDoMembro] += valorIncremento;
    }
    await atualizarResumo();

    (async () => {
	
	  const hojeISO = getHojeISO();
      const presencaRef = doc(db, "presencas", hojeISO);

      if (acao === 'adicionar') {
        await setDoc(presencaRef, { [nome]: new Date() }, { merge: true });
      } else {
        await updateDoc(presencaRef, { [nome]: deleteField() });
      }
	
      if (!isDomingo && equipeDoMembro) {
        const pontosRef = doc(db, "semanas", "pontosSemanais");
        const valorIncremento = checkbox.checked ? 1 : -1;
        try {
          await updateDoc(pontosRef, { [equipeDoMembro]: increment(valorIncremento) });

          // ===== INÍCIO DA NOVA LÓGICA PARA O FEED (COM CORREÇÃO) =====
if (acao === 'adicionar') {
    // Verifica se o membro é o Líder Geral
    if (liderGeral && nome === liderGeral.nome) {
        // Se for o líder, cria a mensagem personalizada
        await adicionarEventoAoFeed(
            'geral',
            '👑 Foco do Líder',
            `O líder geral <strong>${nome}</strong> acabou de registrar seu foco do dia.`,
            { nomeMembro: nome }
        );
    } else {
        // Se for qualquer outro membro, mantém a lógica original
        const totalPontosEquipe = pontosSemanais[equipeDoMembro];
        const nomeEquipeCapitalizado = equipeDoMembro.charAt(0).toUpperCase() + equipeDoMembro.slice(1);

        await adicionarEventoAoFeed(
            'geral',
            `📈 Ponto para a ${nomeEquipeCapitalizado}!`,
            `A equipe <strong>${nomeEquipeCapitalizado}</strong> avança na competição com +1 ponto de <strong>${nome}</strong>, totalizando <strong>${totalPontosEquipe}</strong> pontos na semana!`,
            { nomeMembro: nome, equipe: equipeDoMembro }
        );
    }
}
// ===== FIM DA NOVA LÓGICA PARA O FEED (COM CORREÇÃO) =====

        } catch (error) {
          console.error("Erro ao atualizar pontos semanais:", error);
          if (error.code === 'not-found') {
            await setDoc(pontosRef, { abelha: 0, joaninha: 0, vagalume: 0, [equipeDoMembro]: valorIncremento });
          }
        }
      }
      
      const { streakAtual } = await verificarConquista(nome, acao);
      streaksCache[nome] = streakAtual;
      atualizarStreakVisualMembro(nome, streakAtual);
      
    })().finally(() => {
        console.log(`Ação para '${nome}' concluída. Trava liberada.`);
        checkboxLocks[nome] = false;
    });
    
    if (liderGeral?.nome !== nome && !isDomingo) {
        let equipeNome = membroAlvo.equipe;
        if (equipeNome) {
            const resumo = document.getElementById(`resumo-${equipeNome}`);
            if (resumo) {
                resumo.classList.add('destaque');
                setTimeout(() => resumo.classList.remove('destaque'), 500);
            }
        }
    }
}
  
  window.resetarTudo = async function() {
    if (!confirm('⚠️ ATENÇÃO: Você está prestes a resetar TODOS os dados!\nIsso apagará todo o histórico e pontos.\n\nDeseja continuar?')) return;
    try {
      // Resetar dados no Firebase
      const presencasSnapshot = await getDocs(collection(db, "presencas"));
      for (const doc of presencasSnapshot.docs) await deleteDoc(doc.ref);
      
      // Apagar documento de pontos semanais
      const pontosRef = doc(db, "semanas", "pontosSemanais");
      const pontosSnap = await getDoc(pontosRef);
      if (pontosSnap.exists()) {
        await deleteDoc(pontosRef);
      }
      
      // ADICIONAR RESET DO RANKING GERAL
      const rankingRef = doc(db, "ranking", "geral");
      await setDoc(rankingRef, { abelha: 0, joaninha: 0, vagalume: 0 });
      
      // Resetar Árvore Épica
      const arvoreRef = doc(db, "arvoreEpica", "progresso");
      await deleteDoc(arvoreRef);
      
      // Resetar streaks
      const streaksSnapshot = await getDocs(collection(db, "streak"));
      for (const doc of streaksSnapshot.docs) await deleteDoc(doc.ref);
      
      // Resetar variáveis locais
      pontosSemanais.abelha = 0;
      pontosSemanais.joaninha = 0;
      pontosSemanais.vagalume = 0;
      
      // RESETAR RANKING GERAL LOCAL
      rankingGeral.abelha = 0;
      rankingGeral.joaninha = 0;
      rankingGeral.vagalume = 0;
      
      // Recarregar dados atualizados
      await carregarPresenca();
      await carregarTotalDias();
      await carregarPontosSemanais();
      await carregarRankingGeral();
      await carregarArvoreEpica();
      
      // Atualizar UI
      atualizarPlacarSemanal();
      atualizarRankingGeral();
      atualizarMedalhas();
      atualizarExibicaoArvore();
      
      mostrarPopup("✅ Reset Completo", "Todos os dados foram resetados com sucesso!", 5000);
    } catch (error) {
      console.error("Erro ao resetar dados:", error);
      mostrarPopup("❌ Erro no Reset", "Ocorreu um erro ao tentar resetar os dados.", 5000);
    }
  }

  window.resetarDia = async function(automatico = false) {
    if (resetEmAndamento) return;
    resetEmAndamento = true;
    
    if (!automatico && !confirm('⚠️ ATENÇÃO: Você está prestes a desmarcar TODOS os checkboxes do dia atual e zerar o contador do dia.\n\nIsso não afetará os pontos semanais ou streaks.\n\nDeseja continuar?')) {
      resetEmAndamento = false;
      return;
    }
    
    try {
      // Desmarcar todas as checkboxes
      todosMembros.forEach(membro => { const nome = membro.nome;
        const checkbox = document.getElementById(nome);
        if (checkbox) {
          checkbox.checked = false;
          const label = checkbox.nextElementSibling;
          if (label) {
            label.classList.remove('checked');
          }
        }
      });
      
      // Apagar o documento de presenças do dia atual
      const hojeISO = getHojeISO();
      const presencaRef = doc(db, "presencas", hojeISO);
      await deleteDoc(presencaRef);
      
      // Atualizar a interface
      if (document.getElementById("contadorGeral")) {
        document.getElementById("contadorGeral").textContent = "0 épicos focaram hoje!";
        document.getElementById("progresso-barra").style.width = "0%";
      }
      
      // Atualizar resumos das equipes
      atualizarPlacarSemanal();
      
      // CORREÇÃO: Recarregar streaks e total de dias
      await Promise.all([
        carregarStreaks(),
        carregarTotalDias(),
      ]);
      
      if (!automatico) {
        mostrarPopup("✅ Dia Resetado", "Todos os checkboxes foram desmarcados e o dia foi zerado.", 5000);
      }
    } catch (error) {
      console.error("Erro ao resetar o dia:", error);
      mostrarPopup("❌ Erro", "Ocorreu um erro ao resetar o dia.", 5000);
    }
  }

  async function carregarStreaks() {
    const promises = todosMembros.map(async (membro) => {
      try {
        const docRef = doc(db, "streak", membro.nome);
        const docSnap = await getDoc(docRef);
        streaksCache[membro.nome] = docSnap.exists() ? docSnap.data().streak : 0;
      } catch (error) {
        console.error(`Erro ao carregar streak para ${membro.nome}:`, error);
        streaksCache[membro.nome] = 0; // Garante um valor padrão em caso de erro
      }
    });
    await Promise.all(promises);
    
    // Depois que todos os streaks forem carregados para o cache,
    // atualizamos a interface de uma só vez.
    atualizarMedalhas();
  }
  
  async function limparColecaoSemanas() {
    try {
      const semanasRef = collection(db, "semanas");
      const querySnapshot = await getDocs(semanasRef);
      querySnapshot.forEach(async (docSnap) => {
        if (docSnap.id !== "pontosSemanais") {
          console.warn(`Apagando documento indesejado na coleção 'semanas': ${docSnap.id}`);
          await deleteDoc(doc(db, "semanas", docSnap.id));
        }
      });
    } catch (error) {
      console.error("Erro ao limpar coleção 'semanas':", error);
    }
  }

  async function limparMuralSemanal() {
    try {
      // Verificar se é segunda-feira
      const hoje = getHoje();
      if (hoje.getDay() !== 1) return;

      // Obter a semana passada
      const semanaPassada = new Date(hoje);
      semanaPassada.setDate(semanaPassada.getDate() - 7);
      const numeroSemanaPassada = getSemanaAtual(semanaPassada).numero;

      // Buscar mensagens antigas
      const q = query(collection(db, "mural"), 
                    where("semana", "<", numeroSemanaPassada));
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Mural limpo: ${querySnapshot.size} mensagens antigas removidas`);
    } catch (error) {
      console.error("Erro ao limpar mural:", error);
    }
  }

  // ===== FUNÇÕES PARA A ÁRVORE ÉPICA =====
  const fasesArvore = [
    { dias: 1, nome: "Semente", emoji: "🌱", desc: "A jornada começa com um único dia de foco. Vamos plantar nossa semente e cultivar nossa dedicação diária!" },
    { dias: 15, nome: "Broto", emoji: "🌿", desc: "Com 15 dias consecutivos, nosso esforço começa a brotar. Vamos continuar regando nossa determinação!" },
    { dias: 60, nome: "Árvore", emoji: "🌳", desc: "60 dias de foco ininterrupto! Nossa árvore cresce forte, simbolizando nossa consistência e perseverança." },
    { dias: 180, nome: "Flores", emoji: "🌸", desc: "180 dias de dedicação fazem florescer resultados. Cada flor representa uma conquista em nossa jornada!" },
    { dias: 365, nome: "Frutos", emoji: "🍎", desc: "365 dias de foco contínuo! Agora colhemos os frutos do nosso trabalho árduo e da nossa dedicação inabalável." }
  ];
  
  let arvoreEpica = {
    consecutivos: 0,
    ultimoDia: null,
    faseAtual: 0
  };
  
  async function carregarEstadoArvore() {
    const arvoreRef = doc(db, "arvoreEpica", "progresso");
    const docSnap = await getDoc(arvoreRef);
    
    if (docSnap.exists()) {
      arvoreEpica = docSnap.data();
    } else {
      arvoreEpica = {
        consecutivos: 0,
        ultimoDia: null,
        faseAtual: 0
      };
      await setDoc(arvoreRef, arvoreEpica);
    }
  }
  
  async function verificarArvoreEpica(totalCheckins) {
    const hojeISO = getHojeISO();
    await carregarEstadoArvore();

    // Se for domingo, não faz nada
    const hoje = getHoje();
	
	// =======================================================
    //  INÍCIO DA LÓGICA ADICIONADA
    // =======================================================
    const totalMembros = todosMembros.length;
    const naoFocaram = totalMembros - totalCheckins;

    const statusFocadoEl = document.getElementById('status-focado');
    const statusNaoFocadoEl = document.getElementById('status-nao-focado');

    if (statusFocadoEl) {
      statusFocadoEl.textContent = `✅ ${totalCheckins} épicos focaram hoje`;
    }
    if (statusNaoFocadoEl) {
      statusNaoFocadoEl.textContent = `❌ ${naoFocaram} épicos ainda não focaram`;
    }
    // =======================================================
    //  FIM DA LÓGICA ADICIONADA
    // =======================================================

    const ultimoDia = arvoreEpica.ultimoDia;
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const ontemISO = formatarDataISO(ontem);

    // Verificar se o dia atual já foi contabilizado
    const diaAtualContabilizado = (ultimoDia === hojeISO);
    
    // SÓ ATUALIZA SE ATINGIU O MÍNIMO DE 10 CHECKINS
    if (totalCheckins >= 10) {
      if (!diaAtualContabilizado) {
        if (!ultimoDia) {
          // Primeiro dia válido
          arvoreEpica.consecutivos = 1;
        } else if (ultimoDia === ontemISO) {
          // Dia consecutivo
          arvoreEpica.consecutivos++;
        } else {
          // Quebrou a sequência - reinicia
          arvoreEpica.consecutivos = 1;
        }
        
        arvoreEpica.ultimoDia = hojeISO;
        
        // Atualizar fase atual
        let novaFase = 0;
        for (let i = fasesArvore.length - 1; i >= 0; i--) {
          if (arvoreEpica.consecutivos >= fasesArvore[i].dias) {
            novaFase = i;
            break;
          }
        }
        arvoreEpica.faseAtual = novaFase;
        
        // Salvar no Firestore
        const arvoreRef = doc(db, "arvoreEpica", "progresso");
        await setDoc(arvoreRef, arvoreEpica);
        
        // Atualizar a exibição
        atualizarExibicaoArvore();
        
        // Mostrar notificação se mudou de fase
        if (novaFase > 0 && arvoreEpica.consecutivos === fasesArvore[novaFase].dias) {
          const somConquista = document.getElementById("som-conquista");
          if (somConquista) {
            somConquista.currentTime = 0;
            somConquista.play();
          }
          mostrarPopup("🌳 Árvore Épica", `Parabéns! A árvore evoluiu para: ${fasesArvore[novaFase].nome} ${fasesArvore[novaFase].emoji}`, 5000);
          dispararConfete();
		  
		  await adicionarEventoAoFeed(
    'arvore',
    '🌳 A Árvore Evoluiu!',
    `Com o esforço de todos, nossa Árvore Épica alcançou a fase de ${fasesArvore[novaFase].emoji} <strong>${fasesArvore[novaFase].nome}</strong>! Continuem focando!`,
    { fase: fasesArvore[novaFase].nome }
  );
        }
      }
    } else {
      // REMOVER CONTAGEM SE O DIA ATUAL JÁ FOI CONTABILIZADO
      if (diaAtualContabilizado) {
        // Quebrou a sequência - reinicia
        arvoreEpica.consecutivos = Math.max(0, arvoreEpica.consecutivos - 1);
        arvoreEpica.ultimoDia = (arvoreEpica.consecutivos > 0) ? ontemISO : null;
        
        // Atualizar fase atual
        let novaFase = 0;
        for (let i = fasesArvore.length - 1; i >= 0; i--) {
          if (arvoreEpica.consecutivos >= fasesArvore[i].dias) {
            novaFase = i;
            break;
          }
        }
        arvoreEpica.faseAtual = novaFase;
        
        // Salvar no Firestore
        const arvoreRef = doc(db, "arvoreEpica", "progresso");
        await setDoc(arvoreRef, arvoreEpica);
        
        atualizarExibicaoArvore();
      }
    }
  }
  
  async function carregarArvoreEpica() {
    await carregarEstadoArvore();
    atualizarExibicaoArvore();
  }
  
  function criarEstrelas() {
    const starsContainer = document.querySelector('.stars-container');
    if (!starsContainer) return;
    
    const starCount = 150;
    starsContainer.innerHTML = '';
    
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      
      // Tamanho aleatório
      const size = Math.random() * 3 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      
      // Posição aleatória
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      
      // Atraso de animação
      star.style.animationDelay = `${Math.random() * 4}s`;
      
      // Duração da animação
      star.style.animationDuration = `${2 + Math.random() * 3}s`;
      
      starsContainer.appendChild(star);
    }
  }
  
  function atualizarExibicaoArvore() {
    if (!document.getElementById("stage-name")) return;
    
    const fase = fasesArvore[arvoreEpica.faseAtual];
    document.getElementById("stage-name").textContent = fase.nome + " " + fase.emoji;
    document.getElementById("stage-desc").textContent = fase.desc;
    document.getElementById("dias-consecutivos").textContent = arvoreEpica.consecutivos;
    
    // Mostrar a imagem da fase atual e esconder as outras
    const imagens = ["seed", "sprout", "tree", "flowers", "fruits"];
    imagens.forEach((img, index) => {
      const el = document.getElementById(img);
      if (el) {
        if (index === arvoreEpica.faseAtual) {
          el.style.display = "block";
        } else {
          el.style.display = "none";
        }
      }
    });
    
    // Próxima fase
    const proximaFase = arvoreEpica.faseAtual < fasesArvore.length - 1 ? fasesArvore[arvoreEpica.faseAtual + 1] : null;
    const proximaFaseEl = document.getElementById("proxima-fase");
    if (proximaFaseEl) {
      if (proximaFase) {
        const diasFaltando = proximaFase.dias - arvoreEpica.consecutivos;
        proximaFaseEl.textContent = `Faltam ${diasFaltando} dias para ${proximaFase.nome} ${proximaFase.emoji}`;
      } else {
        proximaFaseEl.textContent = "Você alcançou o nível máximo!";
      }
    }
    
    // Verificar modo noite (após 18h)
    const agora = getHoje();
    const horas = agora.getHours();
    const modoNoite = horas >= 18 || horas < 6;
    
    // Aplicar modo noite
    const treeSky = document.querySelector(".tree-sky");
    if (treeSky) {
      if (modoNoite) {
        treeSky.classList.add("night-mode");
        treeSky.classList.remove("day-mode");
        // Criar estrelas se necessário
        if (document.querySelector('.stars-container')?.children.length === 0) {
          criarEstrelas();
        }
        document.querySelector('.stars-container').style.opacity = "1";
      } else {
        treeSky.classList.remove("night-mode");
        treeSky.classList.add("day-mode");
        if (document.querySelector('.stars-container')) {
          document.querySelector('.stars-container').style.opacity = "0";
        }
      }
    }
    
    // Controle de visibilidade sol/lua
    const solEl = document.getElementById("sol");
    const luaEl = document.getElementById("lua");
    if (solEl && luaEl) {
      solEl.style.opacity = modoNoite ? "0" : "1";
      luaEl.style.opacity = modoNoite ? "1" : "0";
    }
  }
  
  // FUNÇÃO ATUALIZADA: Agora apenas detecta a mudança e chama a rotina principal.
  async function verificarMudancaData() {
    const novaData = getHojeISO();
    
    // Verifica se a data do sistema mudou desde a última checagem.
    if (dataAtual !== novaData) {
      // O dia mudou! Atualiza a variável de controle.
      dataAtual = novaData;
      
      // Chama a nossa nova função "mestre" para fazer todo o trabalho pesado.
      await executarRotinaDeMeiaNoite();

    } else {
      // Se o dia não mudou, apenas garantimos que o cabeçalho de data está visível.
      // Isso é útil caso o usuário recarregue a página e o cabeçalho não tenha sido renderizado.
      atualizarDataCabecalho();
    }
  }
  
  let resetEmAndamento = false;
  
  // NOVA FUNÇÃO: Rotina centralizada para a virada do dia
  async function executarRotinaDeMeiaNoite() {
    console.log("🕛 Executando rotina da meia-noite...");
	
	// Verifica se é segunda-feira (getDay() === 1)
  const hoje = getHoje();
  if (hoje.getDay() === 1) {
    await limparFeedSemanal(); 
	 await limparTodoOMural();
  }

    // 1. Reseta o dia: desmarca todos os checkboxes e apaga o registro de presença do dia.
    // O parâmetro 'true' garante que não haverá pop-up de confirmação.
    await resetarDia(true);

    // 2. Verifica se é domingo para finalizar a competição da semana anterior.
    // A função finalizarSemana() já contém a lógica para rodar apenas aos domingos.
    await finalizarSemana();

    // 3. Recarrega e atualiza todos os componentes da interface para o novo dia.
    // Isso garante que a tela do usuário reflita imediatamente o estado de um novo dia.
    
    // Atualiza a data no cabeçalho.
    atualizarDataCabecalho();      
    
    // Atualiza o número e as datas da semana.
    atualizarInfoSemana();         
    
    // Carrega (ou zera no domingo) os pontos da semana.
    await carregarPontosSemanais(); 
    
    // Exibe os pontos semanais na tela.
    atualizarPlacarSemanal();     
    
    // Verifica o estado da árvore épica (para o caso de quebra de sequência).
    await carregarArvoreEpica();   
    
    // ATUALIZA O CONTADOR GERAL, BARRA DE PROGRESSO e outros resumos, zerando-os.
    await atualizarResumo();      
    
    console.log("✅ Rotina da meia-noite concluída. A interface foi atualizada.");
  }
  
  // Função para atualizar o cabeçalho com a data
  function atualizarDataCabecalho() {
    const hoje = getHoje();
    const dataHoje = hoje.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long'
    });
    
    const dataHojeEl = document.getElementById("dataHoje");
    if (dataHojeEl) {
      // Correção: Capitaliza a primeira letra corretamente
      dataHojeEl.textContent = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);
    }
  }
  
  // Função para atualizar informações da semana
  function atualizarInfoSemana() {
    const semanaAtual = getSemanaAtual();
    const infoSemanaEl = document.getElementById("info-semana");
    if (infoSemanaEl) {
      infoSemanaEl.innerHTML = `
        <div style="font-weight:bold"><span class="destaque-semana">Semana ${semanaAtual.numero}</span></div>
        <div>(${semanaAtual.inicioFormatado} a ${semanaAtual.fimFormatado})</div>
        <div style="font-size:0.9rem;margin-top:5px;color:#7f8c8d">
          A competição será encerrada sábado (${semanaAtual.fimCompeticao}), às 23:59h.
        </div>
      `;
    }
  }
  
  // ===== FUNCIONALIDADES DO MURAL =====
  
  // Função "ajudante" que verifica se uma cor é escura ou clara
function isColorDark(hexColor) {
  const color = (hexColor.charAt(0) === '#') ? hexColor.substring(1, 7) : hexColor;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}

// Abre o modal de visualização com a mensagem completa
async function openMessageViewer(messageId) {
  if (unsubscribeViewerListener) {
    unsubscribeViewerListener();
    unsubscribeViewerListener = null;
  }

  const viewerModal = document.getElementById('message-viewer-modal');
  openModal('message-viewer-modal');
  viewerModal.dataset.activeMessageId = messageId;

  const mensagemRef = doc(db, "mural", messageId);

  unsubscribeViewerListener = onSnapshot(mensagemRef, (docSnap) => {
    if (!docSnap.exists()) {
      closeModal('message-viewer-modal');
      return;
    }

    const mensagem = docSnap.data();
    const viewerCard = document.getElementById('viewer-card');
    const viewerText = document.getElementById('viewer-text');
    const viewerAuthor = document.getElementById('viewer-author');
    const viewerTimestamp = document.getElementById('viewer-timestamp');
    const viewerReacoesContainer = document.getElementById('viewer-reacoes-container');

    const timestampDate = mensagem.timestamp?.toDate ? mensagem.timestamp.toDate() : new Date();
    viewerCard.style.backgroundColor = mensagem.cor;
    viewerAuthor.textContent = mensagem.nome;
    viewerTimestamp.textContent = `${timestampDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${timestampDate.toLocaleDateString('pt-BR')}`;
    viewerText.innerHTML = (mensagem.texto || "").replace(/\n/g, '<br>');

    if (isColorDark(mensagem.cor)) {
      viewerCard.classList.add('text-light');
    } else {
      viewerCard.classList.remove('text-light');
    }

    // ===== INÍCIO DA LÓGICA DE REAÇÃO ATUALIZADA PARA O MODAL =====
    const reacoes = mensagem.reacoes || {};
    let reacoesHTML = '';
    let temReacoes = false;

    // Ordena os emojis para que os mais reagidos apareçam primeiro
    const emojisOrdenados = Object.keys(reacoes).sort((a, b) => {
        const countA = Array.isArray(reacoes[a]) ? reacoes[a].length : 0;
        const countB = Array.isArray(reacoes[b]) ? reacoes[b].length : 0;
        return countB - countA;
    });

    for (const emoji of emojisOrdenados) {
      const reagentes = Array.isArray(reacoes[emoji]) ? reacoes[emoji] : [];
      const count = reagentes.length;
      if (count > 0) {
        temReacoes = true;
        const userHasReacted = reagentes.includes(currentUser);
        const reactedClass = userHasReacted ? 'reacted' : '';
        const tooltipText = reagentes.length > 0 ? `Reagido por: ${reagentes.join(', ')}` : `Reagir com ${emoji}`;
        
        reacoesHTML += `
  <div 
    class="reacao-display ${reactedClass}" 
    title="${tooltipText}"
    data-emoji="${emoji}" onclick="window.abrirModalReagentes('${messageId}', '${emoji}')">
    ${emoji} <span class="contador-display">${count}</span>
  </div>
`;
      }
    }
    // ===== FIM DA LÓGICA DE REAÇÃO ATUALIZADA PARA O MODAL =====

    viewerReacoesContainer.innerHTML = reacoesHTML;
    viewerReacoesContainer.style.display = temReacoes ? 'flex' : 'none';

    const viewerSeletorBar = viewerModal.querySelector('.reacao-seletor-bar');
    viewerSeletorBar.innerHTML = '';

    const emojis = EMOJIS_MURAL;
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.textContent = emoji;
      btn.onclick = (e) => {
        e.stopPropagation();
        window.toggleReacao(messageId, emoji, e);
      };
      viewerSeletorBar.appendChild(btn);
    });
    viewerSeletorBar.style.display = 'flex';
  });
}

// Confirma e executa a exclusão da mensagem
async function confirmDelete() {
  if (!messageIdToDelete) return;
  try {
    await deleteDoc(doc(db, "mural", messageIdToDelete));
    mostrarPopup("✅ Sucesso", "Mensagem excluída!", 3000);
  } catch (error) {
    mostrarPopup("❌ Erro", "Falha ao excluir a mensagem.", 3000);
    console.error("Erro ao excluir:", error);
  } finally {
    closeModal('confirm-delete-modal');
    messageIdToDelete = null;
  }
}

// Abre o compositor para criar ou editar uma mensagem
function openMessageComposer(messageData = null) {
  const sendBtn = document.getElementById('composer-send-btn');

  if (messageData) { // Modo Edição
    document.getElementById('composer-textarea').value = messageData.texto;
    const isAnon = messageData.nome === "Anônimo";
    document.getElementById('composer-anonymous-check').checked = isAnon;
    document.getElementById('composer-author').textContent = isAnon ? "Anônimo" : currentUser;
    selectComposerColor(messageData.cor);
    sendBtn.textContent = 'Salvar Alterações';
  } else { // Modo Criação
    document.getElementById('composer-textarea').value = '';
    document.getElementById('composer-anonymous-check').checked = false;
    document.getElementById('composer-author').textContent = currentUser;
    selectComposerColor('#CAFFBF'); // Cor padrão
    sendBtn.textContent = 'Enviar';
    composerEditMode = false;
    editingMessageId = null;
  }

  updateComposerTimestamp();
  composerTimestampInterval = setInterval(updateComposerTimestamp, 1000);
  openModal('message-composer-modal');
}

function closeMessageComposer() {
  clearInterval(composerTimestampInterval);
  closeModal('message-composer-modal');
  composerEditMode = false;
  editingMessageId = null;
}

function updateComposerTimestamp() {
  const agora = new Date();
  const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const data = agora.toLocaleDateString('pt-BR');
  document.getElementById('composer-timestamp').textContent = `${hora} - ${data}`;
}

function selectComposerColor(color) {
  composerSelectedColor = color;
  const composerCard = document.getElementById('composer-card');
  const colorBtn = document.getElementById('composer-color-btn');

  composerCard.style.backgroundColor = color;
  colorBtn.style.backgroundColor = color;

  if (isColorDark(color)) {
    composerCard.classList.add('text-light');
    colorBtn.classList.add('text-light');
  } else {
    composerCard.classList.remove('text-light');
    colorBtn.classList.remove('text-light');
  }
  document.getElementById('composer-color-palette').classList.add('hidden');
}

// Função principal para ENVIAR ou ATUALIZAR uma mensagem
window.enviarMensagem = async function() {
  const isAnonymous = document.getElementById('composer-anonymous-check').checked;
  const nome = isAnonymous ? "Anônimo" : currentUser;
  const texto = document.getElementById('composer-textarea').value.trim();

  if (!texto) {
    mostrarPopup("✍️ Atenção", "Digite uma mensagem.", 3000);
    return;
  }

  const dadosMensagem = {
    nome: nome,
    texto: texto,
    cor: composerSelectedColor,
    userId: currentUser // Sempre salva o ID de quem escreveu
  };

  try {
    if (composerEditMode && editingMessageId) { // Atualiza mensagem existente
      const mensagemRef = doc(db, "mural", editingMessageId);
      await updateDoc(mensagemRef, dadosMensagem);
      mostrarPopup("✅ Sucesso", "Mensagem editada!", 3000);
   } else { // Cria nova mensagem
  dadosMensagem.timestamp = new Date();
  // Usa a nova lista central para criar o objeto de reações dinamicamente
  dadosMensagem.reacoes = EMOJIS_MURAL.reduce((acc, emoji) => ({...acc, [emoji]: []}), {});
  dadosMensagem.semana = getSemanaAtual().numero;
  const mensagemRef = doc(collection(db, "mural"));
  await setDoc(mensagemRef, dadosMensagem);
      mostrarPopup("✅ Sucesso", "Mensagem enviada!", 3000);
	  
	  const tituloFeed = '✍️ Nova Mensagem no Mural!';
      const textoFeed = isAnonymous 
        ? '<strong>Um anônimo</strong> compartilhou uma nova mensagem no mural. Dê uma olhada!'
        : `<strong>${nome}</strong> compartilhou uma nova mensagem no mural. Dê uma olhada!`;

      await adicionarEventoAoFeed(
        'geral',          // Tipo do evento
        tituloFeed,       // Título do card
        textoFeed,        // Texto do card
        { nomeMembro: nome } // Dados extras
      );
	  
    }
    closeMessageComposer();
  } catch (error) {
    console.error("Erro:", error);
    mostrarPopup("❌ Erro", "Ocorreu um erro.", 3000);
  } finally {
    composerEditMode = false;
    editingMessageId = null;
  }
}

// Nova função de EDIÇÃO que abre o compositor
window.editarMensagem = async function(event, messageId) {
  event.stopPropagation();
  composerEditMode = true;
  editingMessageId = messageId;
  try {
    const docSnap = await getDoc(doc(db, "mural", messageId));
    if (docSnap.exists()) {
      openMessageComposer(docSnap.data());
    }
  } catch (error) {
    console.error("Erro ao buscar mensagem para editar:", error);
  }
}

// Nova função de EXCLUSÃO que abre o modal de confirmação
window.excluirMensagem = function(event, messageId) {
  event.stopPropagation();
  messageIdToDelete = messageId;
  openModal('confirm-delete-modal');
}

function createColorPalette() {
  const colors = [
     '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF', '#FFFFFC','#EAE4E9',
	 '#F38375','#F9A384', '#FBC42C', '#57C479', '#57C5C8', '#578DC8', '#8A57C8', '#C857B2', '#4B4A49', '#ACACAC' 
  ];

  const palette = document.getElementById('composer-color-palette');
  if (!palette) return;

  palette.innerHTML = ''; // Limpa a paleta para evitar duplicatas

  colors.forEach(color => {
    const colorOption = document.createElement('div');
    colorOption.className = 'composer-color-option';
    colorOption.style.backgroundColor = color;
    colorOption.title = color; // Mostra o código da cor ao passar o mouse
    
    // Adiciona o evento de clique que chama a função já existente
    colorOption.onclick = () => selectComposerColor(color);
    
    palette.appendChild(colorOption);
  });
}

// Função que constrói os cards de mensagem (ATUALIZADA)
function criarElementoMensagem(mensagem) {
  const cor = mensagem.cor || "#ffdde1";
  const timestampDate = mensagem.timestamp?.toDate ? mensagem.timestamp.toDate() : new Date();
  const hora = timestampDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const data = timestampDate.toLocaleDateString('pt-BR');

  const mensagemEl = document.createElement('div');
  mensagemEl.className = 'mensagem';
  mensagemEl.style.backgroundColor = cor;
  mensagemEl.dataset.id = mensagem.id;
  mensagemEl.dataset.fullText = mensagem.texto || "";

  if (isColorDark(cor)) {
    mensagemEl.classList.add('text-light');
  }

  // ===== INÍCIO DA LÓGICA DE REAÇÃO ATUALIZADA =====
  const reacoes = mensagem.reacoes || {};
  let reacoesVisiveisHTML = '';
  let temReacoes = false;

  // Ordena os emojis para que os mais reagidos apareçam primeiro
  const emojisOrdenados = Object.keys(reacoes).sort((a, b) => {
    const countA = Array.isArray(reacoes[a]) ? reacoes[a].length : 0;
    const countB = Array.isArray(reacoes[b]) ? reacoes[b].length : 0;
    return countB - countA;
  });

  for (const emoji of emojisOrdenados) {
    const reagentes = Array.isArray(reacoes[emoji]) ? reacoes[emoji] : [];
    const count = reagentes.length;
    
    if (count > 0) {
      temReacoes = true;
      // Verifica se o usuário atual reagiu para adicionar a classe 'reacted'
      const userHasReacted = reagentes.includes(currentUser);
      const reactedClass = userHasReacted ? 'reacted' : '';
      const tooltipText = reagentes.length > 0 ? `Reagido por: ${reagentes.join(', ')}` : `Seja o primeiro a reagir com ${emoji}`;

      reacoesVisiveisHTML += `
  <div 
    class="reacao-display ${reactedClass}" 
    title="${tooltipText}"
    data-emoji="${emoji}"  onclick="window.abrirModalReagentes('${mensagem.id}', '${emoji}')">
    ${emoji} <span class="contador-display">${count}</span>
  </div>
`;
    }
  }
  // ===== FIM DA LÓGICA DE REAÇÃO ATUALIZADA =====

  const reacoesDisplayContainer = temReacoes ? `<div class="reacoes-display-container">${reacoesVisiveisHTML}</div>` : '';

  let optionsHTML = '';
  if (mensagem.userId === currentUser || userRole === 'lider') {
    optionsHTML = `
      <div class="message-options-container">
        <button class="options-btn">⋮</button>
        <div class="options-dropdown hidden">
          <button onclick="editarMensagem(event, '${mensagem.id}')">Editar</button>
          <button onclick="excluirMensagem(event, '${mensagem.id}')">Excluir</button>
        </div>
      </div>
    `;
  }

  const textoMensagem = (mensagem.texto || "").replace(/\n/g, '<br>');

  // O HTML gerado agora inclui o container de reações atualizado
  mensagemEl.innerHTML = `
    <div class="mensagem-texto">${textoMensagem}</div>
    ${reacoesDisplayContainer}
    <div class="mensagem-info">
      <div>
        <div class="mensagem-autor">${mensagem.nome}</div>
        <div class="mensagem-data">${hora} - ${data}</div>
      </div>
      ${optionsHTML}
    </div>
<div class="reacao-seletor-bar hidden">
  ${EMOJIS_MURAL.map(emoji => `
    <button onclick="event.stopPropagation(); window.toggleReacao('${mensagem.id}', '${emoji}', event)">${emoji}</button>
  `).join('')}
</div>
  `;

  // O restante da função (event listeners para clique longo, etc.) permanece o mesmo...
  let pressTimer = null;
  let longPressTriggered = false;
  let hasScrolled = false;

  const startPress = (e) => {
    if (e.target.closest('button, a, .reacao-display')) return;
    longPressTriggered = false;
    hasScrolled = false;
    pressTimer = setTimeout(() => {
      longPressTriggered = true;
      const seletorBar = mensagemEl.querySelector('.reacao-seletor-bar');
      if (seletorBar) {
        seletorBar.classList.remove('hidden');
        const closeReactionBar = (event) => {
          if (!mensagemEl.contains(event.target) || event.target.closest('.reacao-seletor-bar button')) {
            seletorBar.classList.add('hidden');
            document.removeEventListener('click', closeReactionBar);
          }
        };
        setTimeout(() => { document.addEventListener('click', closeReactionBar); }, 100);
      }
    }, 500);
  };

  const cancelPress = () => clearTimeout(pressTimer);

  const endPress = (e) => {
    clearTimeout(pressTimer);
    if (!longPressTriggered && !hasScrolled) {
      if (!e.target.closest('button, a, .reacao-display')) {
        openMessageViewer(mensagem.id);
      }
    }
  };
  
  const handleTouchMove = () => {
    clearTimeout(pressTimer); // Continua cancelando o clique longo
    hasScrolled = true;      // Marca que o usuário está rolando
  };

  mensagemEl.addEventListener('mousedown', startPress);
  mensagemEl.addEventListener('mouseup', endPress);
  mensagemEl.addEventListener('mouseleave', cancelPress);
  mensagemEl.addEventListener('touchstart', startPress, { passive: true });
  mensagemEl.addEventListener('touchend', endPress);
  mensagemEl.addEventListener('touchmove', handleTouchMove);

  const optionsBtn = mensagemEl.querySelector('.options-btn');
  if (optionsBtn) {
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = e.target.nextElementSibling;
      const isHidden = dropdown.classList.contains('hidden');
      document.querySelectorAll('.options-dropdown').forEach(d => { d.classList.add('hidden'); });
      if (isHidden) {
        dropdown.classList.remove('hidden');
        const closeOnClickOutside = (event) => {
          if (!dropdown.contains(event.target) && !optionsBtn.contains(event.target)) {
            dropdown.classList.add('hidden');
            document.removeEventListener('click', closeOnClickOutside);
          }
        };
        document.addEventListener('click', closeOnClickOutside);
      }
    });
  }
  
  return mensagemEl;
}
  
  function configurarMuralTempoReal() {
    const muralContainer = document.getElementById('mural-mensagens');
    if (!muralContainer) return;

    muralContainer.innerHTML = '<div class="carregando">Carregando mensagens...</div>';

    const q = collection(db, "mural");
    
    // Ouvinte em tempo real
    onSnapshot(q, (querySnapshot) => {
      const mensagens = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        mensagens.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp.seconds * 1000)
        });
      });

      // Ordenar por data (mais recente primeiro)
      mensagens.sort((a, b) => b.timestamp - a.timestamp);
      
      muralContainer.innerHTML = '';
      
      if (mensagens.length === 0) {
        muralContainer.innerHTML = '<div class="sem-mensagens">Nenhuma mensagem ainda. Seja o primeiro a escrever!</div>';
        return;
      }

      // Exibir todas as mensagens
      mensagens.forEach(msg => {
        muralContainer.appendChild(criarElementoMensagem(msg));
      });
    });
  }
  
  function atualizarReacaoOtimista(mensagemId, emoji) {
  if (!currentUser) return;

  // Encontra o card da mensagem e o container de reações na tela
  const mensagemEl = document.querySelector(`.mensagem[data-id="${mensagemId}"]`);
  if (!mensagemEl) return;

  const reacoesContainer = mensagemEl.querySelector('.reacoes-display-container');
  if (!reacoesContainer) return;

  const nomeUsuario = currentUser;
  let reacaoAntigaEl = reacoesContainer.querySelector('.reacao-display.reacted');
  let reacaoClicadaEl = reacoesContainer.querySelector(`.reacao-display[data-emoji="${emoji}"]`);

  // --- LÓGICA DE REMOÇÃO DA REAÇÃO ANTIGA (SE HOUVER) ---
  if (reacaoAntigaEl && reacaoAntigaEl !== reacaoClicadaEl) {
    reacaoAntigaEl.classList.remove('reacted');
    const contadorAntigoEl = reacaoAntigaEl.querySelector('.contador-display');
    let contagemAntiga = parseInt(contadorAntigoEl.textContent);
    
    // Diminui o contador ou remove a reação antiga se for a última
    if (contagemAntiga > 1) {
      contadorAntigoEl.textContent = contagemAntiga - 1;
    } else {
      reacaoAntigaEl.remove();
    }
  }

  // --- LÓGICA DA REAÇÃO ATUAL ---
  if (reacaoClicadaEl) {
    // Se o usuário já tinha clicado neste emoji, remove a reação
    if (reacaoClicadaEl.classList.contains('reacted')) {
      reacaoClicadaEl.classList.remove('reacted');
      const contadorEl = reacaoClicadaEl.querySelector('.contador-display');
      let contagem = parseInt(contadorEl.textContent);
      if (contagem > 1) {
        contadorEl.textContent = contagem - 1;
      } else {
        reacaoClicadaEl.remove();
      }
    } else { // Se está adicionando ou trocando para esta reação
      reacaoClicadaEl.classList.add('reacted');
      const contadorEl = reacaoClicadaEl.querySelector('.contador-display');
      contadorEl.textContent = parseInt(contadorEl.textContent) + 1;
    }
  } else {
    // Se o emoji não tinha nenhuma reação antes, cria um novo elemento
    const novaReacaoEl = document.createElement('div');
    novaReacaoEl.className = 'reacao-display reacted';
    novaReacaoEl.dataset.emoji = emoji;
    novaReacaoEl.innerHTML = `${emoji} <span class="contador-display">1</span>`;
    novaReacaoEl.onclick = () => window.abrirModalReagentes(mensagemId, emoji);
    reacoesContainer.appendChild(novaReacaoEl);
  }
}
  
  window.toggleReacao = function(mensagemId, emoji, event) {
  if (event) {
    event.stopPropagation();
  }

  if (!currentUser) {
    mostrarPopup("🚫 Erro", "Você precisa estar logado para reagir.", 3000);
    return;
  }
  
  // ==========================================================
  // ATUALIZAÇÃO OTIMISTA - PASSO 1: A MÁGICA ACONTECE AQUI!
  // Chamamos a função para atualizar a UI imediatamente.
  // Isso faz com que a reação pareça instantânea para o usuário.
  // (OBS: Esta é uma função customizada que você precisará criar, 
  // ela manipula o DOM para refletir a mudança visualmente).
  //
  // Por simplicidade neste exemplo, vamos pular a criação da função
  // `atualizarReacaoOtimista` e focar na lógica do Firebase.
  // A UI será atualizada pelo onSnapshot, mas o processo em 
  // background agora é "fire-and-forget".
  // ==========================================================

  const mensagemRef = doc(db, "mural", mensagemId);

  // Executa a transação do Firebase em segundo plano, sem esperar (sem 'await')
  runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(mensagemRef);
    if (!docSnap.exists()) {
      throw "Documento não existe!";
    }

    const dados = docSnap.data();
    let reacoes = dados.reacoes || {};
    const nomeUsuario = currentUser;
    let reacaoAntiga = null;

    // Itera por todas as reações para encontrar a reação anterior do usuário
    for (const emojiExistente in reacoes) {
      if (Array.isArray(reacoes[emojiExistente])) {
        const userIndex = reacoes[emojiExistente].indexOf(nomeUsuario);
        if (userIndex > -1) {
          reacaoAntiga = emojiExistente;
          break;
        }
      }
    }

    // Lógica para adicionar/remover/trocar a reação
    if (reacaoAntiga === emoji) {
      // Se clicou no mesmo emoji, remove a reação
      const userIndex = reacoes[emoji].indexOf(nomeUsuario);
      if (userIndex > -1) {
          reacoes[emoji].splice(userIndex, 1);
      }
    } else {
      // Se está trocando ou adicionando uma nova reação
      if (reacaoAntiga) {
        // Remove a reação antiga
        const oldUserIndex = reacoes[reacaoAntiga].indexOf(nomeUsuario);
        if (oldUserIndex > -1) {
            reacoes[reacaoAntiga].splice(oldUserIndex, 1);
        }
      }
      
      // Adiciona a nova reação
      if (!reacoes[emoji]) {
        reacoes[emoji] = [];
      }
      reacoes[emoji].push(nomeUsuario);
    }

    // Atualiza o documento no Firestore
    transaction.update(mensagemRef, { reacoes: reacoes });
  }).catch(error => {
    // Se a operação em segundo plano falhar, logamos o erro.
    // A UI pode ficar temporariamente fora de sincronia, mas o 
    // ouvinte em tempo real (onSnapshot) corrigirá isso eventualmente.
    console.error("Falha na transação de reação em segundo plano: ", error);
    mostrarPopup("❌ Ops!", "Sua reação não pôde ser salva. Tente novamente.", 3000);
  });
};
  
// ATUALIZADA: Agora lê e salva o estado do ranking no Firestore
async function carregarTop5Semana() {
  try {
    const semanaAtual = getSemanaAtual();
    const hojeISO = getHojeISO();
    const inicioSemana = formatarDataISO(semanaAtual.inicio);

    const q = query(
      collection(db, "presencas"),
      where('__name__', '>=', inicioSemana),
      where('__name__', '<=', hojeISO)
    );

    const querySnapshot = await getDocs(q);
    const contagemMembros = {};

    todosMembros.forEach(m => {
      contagemMembros[m.nome] = { pontos: 0, tempoTotal: 0 };
    });

    querySnapshot.forEach(doc => {
      const presencas = doc.data();
      for (const [membro, presencaData] of Object.entries(presencas)) {
        
        // ===== INÍCIO DA CORREÇÃO DEFINITIVA =====
        // Esta condição é mais robusta. Ela conta o ponto se houver QUALQUER
        // registro de presença (seja um Timestamp novo ou um booleano 'true' antigo).
        if (contagemMembros[membro] && presencaData) {
          
          contagemMembros[membro].pontos += 1; // Adiciona o ponto de foco

          // Para o critério de desempate, somamos o tempo apenas se for um Timestamp válido.
          // Isso evita erros caso o dado seja um 'true' booleano.
          if (presencaData && presencaData.toDate) {
            contagemMembros[membro].tempoTotal += presencaData.toDate().getTime();
          }
        }
        // ===== FIM DA CORREÇÃO DEFINITIVA =====
      }
    });

    const ranking = Object.entries(contagemMembros)
      .map(([nome, dados]) => ({ nome, pontos: dados.pontos, tempoTotal: dados.tempoTotal }))
      .sort((a, b) => {
        if (b.pontos !== a.pontos) {
          return b.pontos - a.pontos;
        }
        if (a.tempoTotal === 0) return 1;
        if (b.tempoTotal === 0) return -1;
        return a.tempoTotal - b.tempoTotal;
      });

    const rankingStateRef = doc(db, "appState", "rankingState");
    const rankingStateSnap = await getDoc(rankingStateRef);
    const top3Anterior = rankingStateSnap.exists() ? rankingStateSnap.data().top3 : null;

    const top3Atual = ranking.slice(0, 3).map(membro => membro.nome);
    const top3AtualString = top3Atual.join(',');
    const rankingTemPontos = ranking.length > 0 && ranking[0].pontos > 0;

    if (rankingTemPontos && top3AtualString !== top3Anterior) {
      const liderAnterior = top3Anterior ? top3Anterior.split(',')[0] : null;
      const novoLider = top3Atual[0];
      let textoFeed;

      if (novoLider === liderAnterior) {
        textoFeed = `<strong>${novoLider}</strong> permanece na liderança do Top 5 da semana!`;
      } else {
        textoFeed = `<strong>${novoLider}</strong> assumiu a liderança do Top 5 da semana!`;
      }

      const segundoLugar = top3Atual.length > 1 ? top3Atual[1] : null;
      const terceiroLugar = top3Atual.length > 2 ? top3Atual[2] : null;

      if (segundoLugar && terceiroLugar) {
        textoFeed += ` Em seguida temos <strong>${segundoLugar}</strong> em 2º e <strong>${terceiroLugar}</strong> em 3º.`;
      } else if (segundoLugar) {
        textoFeed += ` Seguido por <strong>${segundoLugar}</strong> em 2º lugar.`;
      }

      await adicionarEventoAoFeed(
        'geral',
        '🔥 Disputa no Top 5!',
        textoFeed,
        { nomeLider: novoLider }
      );

      await setDoc(rankingStateRef, { top3: top3AtualString });
    }
    
    const listaEl = document.getElementById('ranking-top-lista');
    if (!listaEl) return;
    listaEl.innerHTML = '';

    if (ranking.length === 0 || ranking[0].pontos === 0) {
      listaEl.innerHTML = '<div class="ranking-item">Ainda não há dados esta semana</div>';
      if (rankingStateSnap.exists()) {
        await deleteDoc(rankingStateRef);
      }
      return;
    }

    const top5 = ranking.slice(0, 5);
    top5.forEach((membro, index) => {
      if (membro.pontos === 0) return;
      const posicao = index + 1;
      let emoji = '';

      if (posicao === 1) emoji = '🥇';
      else if (posicao === 2) emoji = '🥈';
      else if (posicao === 3) emoji = '🥉';
      else emoji = '⭐';

      const itemEl = document.createElement('div');
      itemEl.className = 'ranking-item';
      itemEl.style.setProperty('--i', index);
      itemEl.innerHTML = `
        <div class="ranking-posicao">${emoji} ${posicao}º</div>
        <div class="ranking-nome">${membro.nome}</div>
        <div class="ranking-pontos">${membro.pontos} dias</div>
      `;
      listaEl.appendChild(itemEl);
    });

    if (listaEl.children.length === 0) {
      listaEl.innerHTML = '<div class="ranking-item">Ainda não há dados esta semana</div>';
    }

    setTimeout(() => { listaEl.scrollLeft = 0; }, 100);

  } catch (error) {
    console.error("Erro ao carregar top 5:", error);
  }
}

  // ===== FUNÇÕES ADICIONADAS PARA MEMBROS DINÂMICOS =====
  async function carregarMembros() {
    const querySnapshot = await getDocs(collection(db, "membros"));
    
    // Resetar estruturas
    todosMembros = [];
    equipes = {
      abelha: { membros: [], lider: null },
      joaninha: { membros: [], lider: null },
      vagalume: { membros: [], lider: null }
    };
    liderGeral = null;

    querySnapshot.forEach(doc => {
      const data = doc.data();
      const membro = {
        nome: doc.id,
        equipe: data.equipe,
        papel: data.papel,
        folga: data.folga || "",
        aniversario: data.aniversario || "",
        senha: data.senha || "",  // Novo campo
        tempPassword: data.tempPassword || true  // Novo campo
      };

      todosMembros.push(membro);

      if (membro.papel === "lider") {
        liderGeral = membro;
      } else if (membro.papel === "lider-equipe") {
        if (equipes[membro.equipe]) {
          equipes[membro.equipe].lider = membro;
        }
      }

      if (membro.equipe && equipes[membro.equipe]) {
        equipes[membro.equipe].membros.push(membro);
      }
    });
  }

 async function carregarInformacoesMembros() {
  try {
    const membrosSnapshot = await getDocs(collection(db, "membros"));
    const carrosselContainer = document.getElementById('carrossel-container');
    const indicadoresContainer = document.getElementById('carrossel-indicadores');

    if (!carrosselContainer) return;

    carrosselContainer.innerHTML = '';
    if (indicadoresContainer) indicadoresContainer.innerHTML = '';

    const membrosArray = [];
    membrosSnapshot.forEach(doc => membrosArray.push({ id: doc.id, ...doc.data() }));
    totalSlides = membrosArray.length;

    if (document.getElementById('botao-pausa')) {
        document.getElementById('botao-pausa').textContent = '⏸';
    }

    // Criar cards
    membrosArray.forEach((membro, index) => {
      const data = membro;
      const card = document.createElement('div');
      card.className = 'card-membro';
      card.id = `card-membro-${membro.id}`; 

      const corDoCard = data.corCard || '#FFFFFF'; 
      card.style.backgroundColor = corDoCard;

      // ===== INÍCIO DA ADAPTAÇÃO DE COR DO TEXTO =====
      if (isColorDark(corDoCard)) {
        card.classList.add('text-light');
      } else {
        card.classList.remove('text-light');
      }
      // ===== FIM DA ADAPTAÇÃO DE COR DO TEXTO =====

      const podeEditar = (currentUser === membro.id || userRole === 'lider');
      const visibilidadeBotoes = podeEditar ? '' : 'hidden';

      card.innerHTML = `
        <div class="card-controls ${visibilidadeBotoes}">
          <button class="card-color-chooser-btn" onclick="toggleColorPalette(event, '${membro.id}')">Escolha a cor</button>
          <div id="palette-${membro.id}" class="card-color-palette hidden">
          </div>
        </div>
        <h3>${membro.id}</h3>
        <div class="subtitulo">coisas sobre mim</div>
        <div class="info-item">
          <div class="info-content"><strong>Eu me chamo:</strong> <span id="info-${membro.id}-me chamo">${data['me chamo'] || 'Não informado'}</span></div>
          <button class="edit-info-btn ${visibilidadeBotoes}" onclick="editarInformacao(event, '${membro.id}', 'me chamo')">✏️</button>
        </div>
        <div class="info-item">
          <div class="info-content"><strong>Meu apelido é:</strong> <span id="info-${membro.id}-apelido">${data.apelido || 'Não informado'}</span></div>
          <button class="edit-info-btn ${visibilidadeBotoes}" onclick="editarInformacao(event, '${membro.id}', 'apelido')">✏️</button>
        </div>
        <div class="info-item">
          <div class="info-content"><strong>Meu filme favorito:</strong> <span id="info-${membro.id}-filme">${data.filme || 'Não informado'}</span></div>
          <button class="edit-info-btn ${visibilidadeBotoes}" onclick="editarInformacao(event, '${membro.id}', 'filme')">✏️</button>
        </div>
        <div class="info-item">
          <div class="info-content"><strong>Meu maior sonho atualmente:</strong> <span id="info-${membro.id}-sonho">${data.sonho || 'Não informado'}</span></div>
          <button class="edit-info-btn ${visibilidadeBotoes}" onclick="editarInformacao(event, '${membro.id}', 'sonho')">✏️</button>
        </div>
        <div class="info-item">
          <div class="info-content"><strong>Uma música que gosto muito:</strong> <span id="info-${membro.id}-musica">${data.musica || 'Não informado'}</span></div>
          <button class="edit-info-btn ${visibilidadeBotoes}" onclick="editarInformacao(event, '${membro.id}', 'musica')">✏️</button>
        </div>
        <div class="info-item">
          <div class="info-content"><strong>Uma curiosidade aleatória sobre mim:</strong> <span id="info-${membro.id}-curiosidade">${data.curiosidade || 'Não informado'}</span></div>
          <button class="edit-info-btn ${visibilidadeBotoes}" onclick="editarInformacao(event, '${membro.id}', 'curiosidade')">✏️</button>
        </div>
      `;

      const isDark = isColorDark(corDoCard);
      const colorChooserBtn = card.querySelector('.card-color-chooser-btn');
      if (colorChooserBtn) {
        colorChooserBtn.style.color = isDark ? 'white' : 'black';
        colorChooserBtn.style.borderColor = isDark ? 'white' : 'black';
      }

      carrosselContainer.appendChild(card);

      if(podeEditar) {
        criarPaletaDeCoresDoCard(membro.id);
      }

      if (indicadoresContainer) {
          const indicador = document.createElement('div');
          indicador.className = 'carrossel-indicador';
          indicador.onclick = () => {
            if(window.reiniciarIntervaloCarrossel) reiniciarIntervaloCarrossel();
            irParaSlide(index);
          };
          indicadoresContainer.appendChild(indicador);
      }
    });

    if (totalSlides > 0) {
      document.querySelector('.carrossel-indicador')?.classList.add('ativo');
      irParaSlide(0);
      if (totalSlides > 1 && window.iniciarCarrosselAutomatico) {
        iniciarCarrosselAutomatico();
      }
    }
  } catch (error) {
    console.error("Erro ao carregar informações dos membros:", error);
  }
}

window.editarInformacao = async function(event, membroId, campo) {
  event.stopPropagation(); // Impede que o carrossel mude ao clicar

  const spanElement = document.getElementById(`info-${membroId}-${campo}`);
  if (!spanElement) return;

  const valorOriginal = spanElement.textContent;

  // Habilita o modo de edição
  spanElement.contentEditable = true;
  spanElement.classList.add('editing'); // Adiciona classe para feedback visual
  spanElement.focus();

  // Seleciona todo o texto para facilitar a edição
  document.execCommand('selectAll', false, null);

  // Função para salvar as alterações
  const salvarEdicao = async () => {
    // Desliga o modo de edição
    spanElement.contentEditable = false;
    spanElement.classList.remove('editing');

    // Remove os ouvintes de evento para evitar duplicação
    spanElement.removeEventListener('blur', salvarEdicao);
    spanElement.removeEventListener('keydown', lidarComTeclas);

    const novoValor = spanElement.textContent.trim();

    // Se o valor não mudou ou está vazio, não faz nada no banco de dados
    if (novoValor === valorOriginal || novoValor === '') {
      spanElement.textContent = valorOriginal; // Restaura o valor original se ficou vazio
      return;
    }

    try {
      const membroRef = doc(db, "membros", membroId);
      await updateDoc(membroRef, {
        [campo]: novoValor
      });
      mostrarPopup("✅ Sucesso", `Informação atualizada!`, 3000);
    } catch (error) {
      console.error("Erro ao atualizar informação:", error);
      mostrarPopup("❌ Erro", "Ocorreu um erro ao salvar.", 4000);
      spanElement.textContent = valorOriginal; // Restaura em caso de erro
    }
  };

  // Função para lidar com as teclas Enter e Escape
  const lidarComTeclas = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita criar uma nova linha
      salvarEdicao();
    } else if (e.key === 'Escape') {
      // Cancela a edição, restaurando o valor original
      spanElement.textContent = valorOriginal;
      salvarEdicao(); // Chama para limpar os eventos e classes
    }
  };

  // Adiciona os ouvintes de evento
  spanElement.addEventListener('blur', salvarEdicao); // Salva quando o foco é perdido
  spanElement.addEventListener('keydown', lidarComTeclas); // Salva com Enter, cancela com Esc
};

// Função para mostrar/esconder a paleta de cores do card
window.toggleColorPalette = function(event, membroId) {
  event.stopPropagation();
  const palette = document.getElementById(`palette-${membroId}`);
  palette.classList.toggle('hidden');
}

// Função que gera as 30 cores na paleta
function criarPaletaDeCoresDoCard(membroId) {
  const paletteContainer = document.getElementById(`palette-${membroId}`);
  if (!paletteContainer) return;

  const cores = [
    '#FFFFFF', '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', 
    '#A0C4FF', '#BDB2FF', '#FFC6FF', '#EAE4E9', '#F38375', '#F9A384',
    '#FBC42C', '#57C479', '#57C5C8', '#578DC8', '#8A57C8', '#C857B2',
    '#4B4A49', '#ACACAC', '#FF6B6B', '#FF9F43', '#1DD1A1', '#48DBFB',
    '#2E86DE', '#9B59B6', '#FAD390', '#FEA47F', '#55E6C1', '#00B894'
  ];

  paletteContainer.innerHTML = ''; // Limpa antes de adicionar

  cores.forEach(cor => {
    const corEl = document.createElement('div');
    corEl.className = 'card-color-option';
    corEl.style.backgroundColor = cor;
    corEl.onclick = (event) => selecionarCorDoCard(event, membroId, cor);
    paletteContainer.appendChild(corEl);
  });
}

// Função para salvar a cor escolhida no Firestore
async function selecionarCorDoCard(event, membroId, cor) {
  event.stopPropagation();

  try {
    const membroRef = doc(db, "membros", membroId);
    await updateDoc(membroRef, {
      corCard: cor
    });

    const cardElement = document.getElementById(`card-membro-${membroId}`);
    if (cardElement) {
      cardElement.style.backgroundColor = cor;

      // ===== INÍCIO DA ADAPTAÇÃO DE COR DO TEXTO =====
      if (isColorDark(cor)) {
        cardElement.classList.add('text-light');
      } else {
        cardElement.classList.remove('text-light');
      }
      // ===== FIM DA ADAPTAÇÃO DE COR DO TEXTO =====

      const isDark = isColorDark(cor);
      const colorChooserBtn = cardElement.querySelector('.card-color-chooser-btn');
      if (colorChooserBtn) {
        colorChooserBtn.style.color = isDark ? 'white' : 'black';
        colorChooserBtn.style.borderColor = isDark ? 'white' : 'black';
      }
    }

    const palette = document.getElementById(`palette-${membroId}`);
    if(palette) palette.classList.add('hidden');

    mostrarPopup("🎨 Sucesso", "A cor do seu card foi alterada!", 3000);

  } catch (error) {
    console.error("Erro ao salvar cor do card:", error);
    mostrarPopup("❌ Erro", "Não foi possível salvar a cor.", 4000);
  }
}

// NOVA FUNÇÃO: Manipula a marcação/desmarcação de uma checkbox e atualiza o Firestore
async function marcarConcluido(memberId, taskId, data, isChecked) {
    const checkboxElement = document.getElementById(`task-${memberId}-${taskId}-${data}`);
    const memberTeam = checkboxElement ? checkboxElement.dataset.memberTeam : null;

    // Verificar permissões ANTES de qualquer modificação no Firestore
    if (!podeMarcarCheckbox(memberId, memberTeam)) {
        mostrarPopup("Erro", "Você não tem permissão para marcar/desmarcar esta tarefa.", 3000);
        if (checkboxElement) {
            checkboxElement.checked = !isChecked; // Reverte o estado visual da checkbox
        }
        return; // Impede a execução do restante da função
    }

    const membroRef = doc(db, "membros", memberId);
    const dataConclusaoCampo = `focoDiario.${data}.${taskId}`; // Caminho para a tarefa específica no dia
    const focoDiaCampo = `focoDia.${data}`; // Caminho para o total de foco no dia

    // Usamos uma transação para garantir atomicidade nas operações de leitura/escrita
    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(membroRef);
            if (!docSnap.exists()) {
                throw new Error("Membro não encontrado.");
            }
            const membroData = docSnap.data();

            // Obter o estado atual dos pontos semanais da equipe (assumindo que já foram carregados globalmente)
            let pontosSemanaAtuaisDaEquipe = pontosSemanais[memberTeam] || 0;
            // Obter o foco total do dia para o membro
            let totalFocoDiaAtualDoMembro = (membroData.focoDia && membroData.focoDia[data]) || 0;

            // Verificar se a tarefa já estava marcada ou desmarcada no Firestore
            const tarefaEstavaMarcada = membroData.focoDiario && membroData.focoDiario[data] && membroData.focoDiario[data][taskId];

            if (isChecked) {
                // Se o usuário marcou a checkbox e ela NÃO estava marcada no Firestore
                if (!tarefaEstavaMarcada) {
                    transaction.update(membroRef, {
                        [dataConclusaoCampo]: true, // Marca a tarefa como true
                        [focoDiaCampo]: increment(1) // Incrementa o contador de foco do dia
                    });
                    pontosSemanaAtuaisDaEquipe++; // Incrementa os pontos locais da equipe
                }
            } else {
                // Se o usuário desmarcou a checkbox e ela ESTAVA marcada no Firestore
                if (tarefaEstavaMarcada) {
                    transaction.update(membroRef, {
                        [dataConclusaoCampo]: false, // Marca a tarefa como false
                        [focoDiaCampo]: increment(-1) // Decrementa o contador de foco do dia
                    });
                    pontosSemanaAtuaisDaEquipe--; // Decrementa os pontos locais da equipe
                }
            }

            // Atualizar os pontos semanais da equipe no documento "semanas/pontosSemanais"
            if (memberTeam && pontosSemanais[memberTeam] !== undefined) {
                const pontosSemanaisRef = doc(db, "semanas", "pontosSemanais");
                transaction.update(pontosSemanaisRef, {
                    [memberTeam]: pontosSemanaAtuaisDaEquipe
                });
                pontosSemanais[memberTeam] = pontosSemanaAtuaisDaEquipe; // Atualiza a variável global
            }
        });

        console.log("Atualização concluída com sucesso!");
        mostrarPopup("Sucesso", "Tarefa atualizada!", 2000);

        // Chamar verificarConquista para atualizar streaks, fora da transação principal
        await verificarConquista(memberId, isChecked ? 'adicionar' : 'remover');

        // Re-executar o resumo geral para atualizar os contadores na UI
        await window.atualizarResumo();

    } catch (error) {
        console.error("Erro ao atualizar o documento: ", error);
        mostrarPopup("Erro", `Erro ao atualizar a tarefa: ${error.message || error}`, 3000);
        if (checkboxElement) {
            checkboxElement.checked = !isChecked; // Reverte o estado visual da checkbox em caso de erro
        }
    }
}

// NOVA FUNÇÃO PARA TOGGLE DE PAUSA
window.togglePausa = function() {
  carrosselPausado = !carrosselPausado;
  const botaoPausa = document.getElementById('botao-pausa');
  
  if (carrosselPausado) {
    clearInterval(carrosselInterval);
    botaoPausa.textContent = '▶';
    // Pausar a barra
    const barra = document.getElementById('progresso-indicador-barra');
    if (barra) {
      barra.style.transition = 'none';
      barra.dataset.width = barra.style.width;
    }
  } else {
    botaoPausa.textContent = '⏸';
    // Retomar a barra
    const barra = document.getElementById('progresso-indicador-barra');
    if (barra) {
      barra.style.transition = 'width 10s linear';
      barra.style.width = barra.dataset.width || '100%';
    }
    iniciarCarrosselAutomatico();
  }
}

// NOVA FUNÇÃO PARA BARRA DE PROGRESSO
function iniciarBarraProgresso() {
  const barra = document.getElementById('progresso-indicador-barra');
  if (barra) {
    // Resetar a barra
    barra.style.transition = 'none';
    barra.style.width = '0%';
    
    // Forçar reflow para que o reset seja aplicado
    void barra.offsetWidth;
    
    // Agora ativar a animação
    barra.style.transition = 'width 10s linear';
    setTimeout(() => {
      if (!carrosselPausado) {
        barra.style.width = '100%';
      }
    }, 10);
    
    // Limpar timeout anterior se existir
    if (progressoBarra) {
      clearTimeout(progressoBarra);
    }
    
    // Configurar para resetar a barra após 10 segundos
    progressoBarra = setTimeout(() => {
      barra.style.width = '0%';
    }, 10000);
  }
}

// Funções de controle do carrossel
window.mudarSlide = function(direction) {
  reiniciarIntervaloCarrossel();
  const totalCards = document.querySelectorAll('.card-membro').length;
  
  if (totalCards === 0) return;
  
  currentCarrosselIndex = (currentCarrosselIndex + direction + totalCards) % totalCards;
  irParaSlide(currentCarrosselIndex);
}

function irParaSlide(index) {
  const carrosselContainer = document.getElementById("carrossel-container");
  carrosselContainer.style.transform = `translateX(-${index * 100}%)`;
  
  const indicadores = document.querySelectorAll('.carrossel-indicador');
  indicadores.forEach((ind, i) => {
    ind.classList.toggle('ativo', i === index);
  });
  
  currentCarrosselIndex = index;
if (!carrosselPausado) iniciarBarraProgresso();
}


function iniciarCarrosselAutomatico() {
  if (carrosselInterval) clearInterval(carrosselInterval);
  
  carrosselInterval = setInterval(() => {
    if (totalSlides > 0 && !carrosselPausado) {
      currentCarrosselIndex = (currentCarrosselIndex + 1) % totalSlides;
      irParaSlide(currentCarrosselIndex);
    }
  }, 10000); // Alterado para 10 segundos
  
  iniciarBarraProgresso();
}

function reiniciarIntervaloCarrossel() {
  clearInterval(carrosselInterval);
  iniciarCarrosselAutomatico();
  iniciarBarraProgresso();
}

  // Função para reconstruir a interface com os membros carregados
  function construirInterface() {
    const gruposContainer = document.querySelector('.grupos-container');
    if (!gruposContainer) return;
    
    gruposContainer.innerHTML = '';

    // Grupo do Líder Geral
    const grupoLiderGeral = document.createElement('div');
    grupoLiderGeral.className = 'grupo';
    grupoLiderGeral.id = 'lider-geral';
    grupoLiderGeral.innerHTML = `
      <h2>Líder Geral</h2>
      <div class="membros-grid">
        ${liderGeral ? `
          <div class="membro">
            <input type="checkbox" id="${liderGeral.nome}">
            <label for="${liderGeral.nome}">
  <span class="membro-nome ${liderGeral.nome.length >= 6 ? 'long-name' : ''}">${liderGeral.nome}</span>
  <span id="dias-${liderGeral.nome}" class="dias-badge">0</span>
              <span class="medalha-container">
                <span id="medalha-${liderGeral.nome}" class="medalha escondido"></span>
              </span>
            </label>
          </div>
        ` : ''}
      </div>
    `;
    gruposContainer.appendChild(grupoLiderGeral);

    // Grupos para cada equipe
    for (const [equipeNome, equipe] of Object.entries(equipes)) {
      const grupo = document.createElement('div');
      grupo.className = 'grupo';
      grupo.id = `equipe-${equipeNome}`;

      let emoji = '';
      if (equipeNome === 'abelha') emoji = '🐝';
      else if (equipeNome === 'joaninha') emoji = '🐞';
      else if (equipeNome === 'vagalume') emoji = '💡';

      grupo.innerHTML = `
        <h2>${emoji} Equipe ${equipeNome.charAt(0).toUpperCase() + equipeNome.slice(1)}</h2>
        <div class="resumo" id="resumo-${equipeNome}">
          <div>0 focaram hoje!</div>
          <div>0 pontos na semana</div>
        </div>
		<div class="mensagem-equipe-completa hidden" id="msg-equipe-${equipeNome}"></div>
      `;

      // Área do líder da equipe
      const liderEquipeDiv = document.createElement('div');
      liderEquipeDiv.className = 'lider-equipe';
      liderEquipeDiv.innerHTML = `
        <div class="titulo-lider">Líder da Equipe</div>
      `;

      if (equipe.lider) {
        const liderMembroDiv = document.createElement('div');
        liderMembroDiv.className = 'membro';
        liderMembroDiv.innerHTML = `
          <input type="checkbox" id="${equipe.lider.nome}">
          <label for="${equipe.lider.nome}">
  <span class="membro-nome ${equipe.lider.nome.length >= 6 ? 'long-name' : ''}">${equipe.lider.nome}</span>
  <span id="dias-${equipe.lider.nome}" class="dias-badge">0</span>
            <span class="medalha-container">
              <span id="medalha-${equipe.lider.nome}" class="medalha escondido"></span>
            </span>
          </label>
        `;
        liderEquipeDiv.appendChild(liderMembroDiv);
      } else {
        const semLider = document.createElement('div');
        semLider.className = 'sem-lider';
        semLider.textContent = 'Sem líder';
        liderEquipeDiv.appendChild(semLider);
      }

      grupo.appendChild(liderEquipeDiv);

      // Lista de membros (excluindo líder)
      const membrosGrid = document.createElement('div');
      membrosGrid.className = 'membros-grid';

      equipe.membros.forEach(membro => {
        if (equipe.lider && membro.nome === equipe.lider.nome) return;
        
        const membroDiv = document.createElement('div');
        membroDiv.className = 'membro';
        membroDiv.innerHTML = `
          <input type="checkbox" id="${membro.nome}">
          <label for="${membro.nome}">
  <span class="membro-nome ${membro.nome.length >= 6 ? 'long-name' : ''}">${membro.nome}</span>
  <span id="dias-${membro.nome}" class="dias-badge">0</span>
            <span class="medalha-container">
              <span id="medalha-${membro.nome}" class="medalha escondido"></span>
            </span>
          </label>
        `;
        membrosGrid.appendChild(membroDiv);
      });

      grupo.appendChild(membrosGrid);
      gruposContainer.appendChild(grupo);
    }
    
    // Adicionar evento de mudança apenas uma vez
    todosMembros.forEach(membro => { const nome = membro.nome;
      const checkbox = document.getElementById(nome);
      if (checkbox) {
        checkbox.onchange = () => marcarCheckbox(nome);
      }
    });
  }

  // ===== FUNÇÕES PARA O PAINEL SECRETO =====
  window.togglePainelSecreto = function(show) {
    const painel = document.getElementById('painel-secreto');
    if (show) {
      painel.style.display = 'block';
    } else {
      painel.style.display = 'none';
    }
  }

  // Ativar painel secreto após 5 cliques na medalha de diamante
  function verificarCliquesDiamante() {
    cliqueCount++;
    clearTimeout(timeoutClique);
    
    if (cliqueCount === 5) {
      const senha = prompt("🔐 Digite a senha para acessar o painel secreto:");
      if (senha === "goiaba") {
        togglePainelSecreto(true);
      } else {
        alert("❌ Senha incorreta!");
      }
      cliqueCount = 0;
    } else {
      timeoutClique = setTimeout(() => {
        cliqueCount = 0;
      }, 3000);
    }
  }
  
  let intervaloConfete = null;
  let animacaoConfeteAniversarioId = null; // Para controlar o loop de animação
  let geradorDeParticulasId = null;     // Para controlar a criação de novas partículas
  let particulasAniversario = [];       // Array para guardar as partículas do aniversário

  async function carregarAniversariantes() {
    const hoje = getHoje();
    const mesAtual = hoje.getMonth() + 1;
    const diaAtual = hoje.getDate();
    
    const membrosSnapshot = await getDocs(collection(db, "membros"));
    const aniversariantes = [];
    let proximoAniversario = null;
    let menorDiferenca = Infinity;

    membrosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.aniversario) {
        const [dia, mes] = data.aniversario.split('/').map(Number);
        
        // Verifica se é aniversário este mês
        if (mes === mesAtual) {
          aniversariantes.push({
            nome: doc.id,
            data: data.aniversario,
            hoje: (dia === diaAtual)
          });
        }
        
        // Calcula próximo aniversário
        let dataAniversario = new Date(hoje.getFullYear(), mes - 1, dia);
        if (dataAniversario < hoje) {
          dataAniversario.setFullYear(hoje.getFullYear() + 1);
        }
        
        const diff = Math.ceil((dataAniversario - hoje) / (1000 * 60 * 60 * 24));
        if (diff < menorDiferenca) {
          menorDiferenca = diff;
          proximoAniversario = {
            nome: doc.id,
            dias: diff,
            data: data.aniversario
          };
        }
      }
    });

    // Atualiza a interface
    atualizarInterfaceAniversariantes(aniversariantes, proximoAniversario);
    
    // Se houver aniversariante hoje, inicia o confete
    if (aniversariantes.some(a => a.hoje)) {
  iniciarConfeteAniversarioContinuo(); // <--- NOVA FUNÇÃO
} else {
  pararConfeteAniversarioContinuo();   // <--- NOVA FUNÇÃO
}
  }

  function atualizarInterfaceAniversariantes(aniversariantes, proximo) {
    const hojeContainer = document.getElementById('aniversariantes-hoje');
    const proximosContainer = document.getElementById('proximos-aniversarios');
    
    hojeContainer.innerHTML = '';
    proximosContainer.innerHTML = '';
    
    const containerHoje = document.createElement('div');
    containerHoje.className = 'aniversariantes-container-hoje';
    
    if (aniversariantes.length > 0) {
      aniversariantes.forEach(aniversariante => {
        const card = document.createElement('div');
        card.className = 'aniversariante-card';
        if (aniversariante.hoje) {
          card.classList.add('hoje');
        }
        card.innerHTML = `
          <div class="aniversariante-nome">${aniversariante.nome}</div>
          <div class="aniversariante-data">${aniversariante.data}</div>
        `;
        containerHoje.appendChild(card);
      });
    } else {
      const card = document.createElement('div');
      card.className = 'aniversariante-card mensagem-vazia';
      card.textContent = 'Nenhum aniversariante neste mês';
      containerHoje.appendChild(card);
    }
    
    hojeContainer.appendChild(containerHoje);
    
    if (proximo) {
      // ADICIONADO SUBTÍTULO AQUI
      proximosContainer.innerHTML = `
        <div style="font-weight:bold; margin-bottom:8px; font-size:1.1rem;">Próximo Aniversariante:</div>
        <div>Faltam <strong>${proximo.dias}</strong> dias para o aniversário de</div>
        <div><strong>${proximo.nome}</strong> (${proximo.data})</div>
      `;
    } else {
      proximosContainer.innerHTML = '<div>Nenhum próximo aniversário cadastrado</div>';
    }
  }

   function iniciarConfetePeriodico() {
    pararConfetePeriodico();
    // Agora chama a mesma função de confete das conquistas
    // O intervalo foi aumentado para 5 segundos para não sobrecarregar a tela
    intervaloConfete = setInterval(dispararConfete, 5000); 
    
    // Dispara uma vez imediatamente
    dispararConfete();
  }

  function pararConfetePeriodico() {
    if (intervaloConfete) {
      clearInterval(intervaloConfete);
      intervaloConfete = null;
    }
  }
  
  // ===== FUNÇÃO PARA EXIBIR QUADRO DE FOLGAS (ATUALIZADA) =====
  async function exibirQuadroFolgas() {
    try {
      const membrosSnapshot = await getDocs(collection(db, "membros"));
      const hoje = getHoje().toLocaleDateString("pt-BR", { weekday: "long" });
      const hojeNormalizado = hoje.toLowerCase()
        .replace(/-feira$/, "")
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "");

      const dias = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
      
      // Resetar listas
      dias.forEach(dia => {
        const lista = document.getElementById(dia);
        if (lista) {
          lista.innerHTML = "";
          lista.classList.remove('centralizado'); // Remover classe anterior
        }
      });

      // Destacar dia atual
      document.querySelectorAll('.dia-col').forEach(col => col.classList.remove('dia-hoje'));
      const diaHojeElement = document.getElementById(hojeNormalizado);
      if (diaHojeElement) {
        diaHojeElement.closest('.dia-col')?.classList.add('dia-hoje');
      }

      // Contador de membros por dia
      const contadores = {
        segunda: 0, terca: 0, quarta: 0, 
        quinta: 0, sexta: 0, sabado: 0, domingo: 0
      };

      membrosSnapshot.forEach(doc => {
        const nome = doc.id;
        const folga = doc.data().folga || "";
        const diaFolga = folga.toLowerCase()
          .replace(/-feira$/, "")
          .normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        
        if (diaFolga && dias.includes(diaFolga)) {
          const lista = document.getElementById(diaFolga);
          if (lista) {
            const membroEl = document.createElement('div');
            membroEl.className = 'membro-folga';
            
            if (diaFolga === hojeNormalizado) {
              membroEl.classList.add('membro-folga-hoje');
              membroEl.innerHTML = `<div>${nome}</div>`;
            } else {
              membroEl.textContent = nome;
            }
            
            lista.appendChild(membroEl);
            contadores[diaFolga]++;
          }
        }
      });

      // Aplicar centralização quando necessário
      dias.forEach(dia => {
        const lista = document.getElementById(dia);
        if (lista && (contadores[dia] <= 2)) {
        lista.classList.add('centralizado');
      }
        
        // Preencher dias vazios
        if (lista && lista.children.length === 0) {
          const texto = dia === 'domingo' ? 'Folga Coletiva' : 'Ninguém';
          lista.innerHTML = `<div class="membro-folga">${texto}</div>`;
          lista.classList.add('centralizado');
        }
      });
    } catch (error) {
      console.error("Erro ao carregar folgas:", error);
    }
  }
  
  async function openChangeFolgaModal() {
  if (!currentUser) return;

  try {
    const userDocRef = doc(db, "membros", currentUser);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const semanaAtual = getSemanaAtual().numero;
      const semanaDaUltimaTroca = userData.semanaTrocaFolga || 0;

      // ===== INÍCIO DA ALTERAÇÃO =====
      // REGRA: Verifica o limite semanal, A MENOS que o usuário seja o líder geral
      if (userRole !== 'lider') {
        if (semanaDaUltimaTroca === semanaAtual) {
          mostrarPopup("🚫 Limite Atingido", "Você já alterou sua folga esta semana. Tente novamente na próxima.", 5000);
          return;
        }
      }
      // ===== FIM DA ALTERAÇÃO =====

      // Preenche o select com a folga atual do usuário
      const selectFolga = document.getElementById('select-new-folga');
      selectFolga.value = userData.folga || "segunda-feira";

      // Abre o modal
      openModal('change-folga-modal');
    }
  } catch (error) {
    console.error("Erro ao verificar permissão de troca de folga:", error);
    mostrarPopup("❌ Erro", "Não foi possível verificar seus dados de folga.", 3000);
  }
}

// NOVA FUNÇÃO PARA ABRIR O MODAL DE REAGENTES
window.abrirModalReagentes = async function(mensagemId, emoji) {
  try {
    const mensagemRef = doc(db, "mural", mensagemId);
    const docSnap = await getDoc(mensagemRef);

    if (!docSnap.exists()) return;

    const reacoes = docSnap.data().reacoes || {};
    const reagentes = Array.isArray(reacoes[emoji]) ? reacoes[emoji] : [];

    const modalTitle = document.getElementById('reactors-modal-title');
    const modalList = document.getElementById('reactors-modal-list');
    const removeBtn = document.getElementById('remove-my-reaction-btn');

    modalTitle.innerHTML = `Reagiram com ${emoji}`;
    modalList.innerHTML = ''; // Limpa a lista anterior

    if (reagentes.length > 0) {
      reagentes.forEach(nome => {
        const item = document.createElement('div');
        item.className = 'reactor-item';
        item.textContent = nome;
        modalList.appendChild(item);
      });
    } else {
      modalList.innerHTML = '<div class="reactor-item" style="text-align:center; font-style:italic;">Ninguém reagiu com este emoji ainda.</div>';
    }

    // Lógica para o botão de remover reação
    if (currentUser && reagentes.includes(currentUser)) {
      removeBtn.style.display = 'block';
      removeBtn.onclick = async () => {
        await window.toggleReacao(mensagemId, emoji); // Chama a função que já remove
        closeModal('reactors-modal'); // Fecha o modal após a ação
      };
    } else {
      removeBtn.style.display = 'none';
    }
    
    openModal('reactors-modal');

  } catch (error) {
    console.error("Erro ao abrir modal de reagentes:", error);
    mostrarPopup("❌ Erro", "Não foi possível carregar quem reagiu.", 3000);
  }
};

async function handleUpdateFolga() {
  const novoDia = document.getElementById('select-new-folga').value;

  const semanaAtual = getSemanaAtual().numero;
  const userDocRef = doc(db, "membros", currentUser);

  try {
    // Atualiza a folga e a semana da troca no Firestore
    await updateDoc(userDocRef, {
      folga: novoDia,
      semanaTrocaFolga: semanaAtual
    });

    mostrarPopup("✅ Sucesso", `Sua folga foi alterada para ${novoDia}!`, 4000);
    closeModal('change-folga-modal');

    // ATUALIZA O QUADRO DE FOLGAS IMEDIATAMENTE
    await exibirQuadroFolgas();

  } catch (error) {
    console.error("Erro ao atualizar folga:", error);
    mostrarPopup("❌ Erro", "Falha ao salvar sua nova folga.", 3000);
  }
}
  
  function atualizarRelogio() {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    document.getElementById('relogio').textContent = `${horas}:${minutos}:${segundos}`;
  }

  // === SISTEMA DE AUTENTICAÇÃO ===
  async function handleLogin() {
    let username = loginUsernameInput.value.trim();
    if (username) {
        // Formata o nome: Primeira letra maiúscula, resto minúsculo.
        username = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
    }
    const password = loginPasswordInput.value;

    if (!username || !password) {
      mostrarPopup("❌ Erro", "Por favor, preencha todos os campos", 3000);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "membros", username));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Cenário 1: Login com SENHA DEFINITIVA
        if (userData.senha === password && userData.usedProv === 'on') {
          // Salva o usuário no localStorage para "lembrar" dele
          localStorage.setItem('loggedInUser', username);

          // PONTO CENTRAL DA CORREÇÃO:
          // A função performSuccessfulLogin agora é a ÚNICA responsável
          // por carregar todos os dados e exibir a interface principal.
          // O bloco de código redundante foi removido.
          await performSuccessfulLogin(username);

        // Cenário 2: Login com SENHA PROVISÓRIA
        } else if (userData.senhaProv === password && userData.usedProv === 'off') {
          currentUser = username; // Armazena o usuário para os próximos passos
          mostrarPopup("🔑 Primeiro Acesso", "Crie sua senha definitiva para continuar.", 4000);
          showChangePasswordForm(); // Mostra o formulário para criar a nova senha

        // Cenário 3: Senha incorreta ou dados inconsistentes
        } else {
          mostrarPopup("❌ Erro de Acesso", "Nome ou senha incorreta.", 3000);
        }

      } else {
        mostrarPopup("❌ Erro", "Usuário não encontrado", 3000);
      }
    } catch (error) {
      console.error("Erro no login:", error);
      mostrarPopup("❌ Erro", "Falha no login: " + error.message, 5000);
    }
  }
  
  // NOVA FUNÇÃO REUTILIZÁVEL
async function performSuccessfulLogin(username) {
  // ATENÇÃO: A linha do mostrarPopup foi MOVIDA daqui.

  dataAtual = getHojeISO();
  const userDoc = await getDoc(doc(db, "membros", username));
  if (!userDoc.exists()) {
    localStorage.removeItem('loggedInUser');
    location.reload();
    return;
  }
  const userData = userDoc.data();

  currentUser = username;
  userRole = userData.papel;
  userTeam = userData.equipe;

  document.getElementById('user-greeting').textContent = `Olá, ${currentUser}!`;

  const controlPanelBtn = document.getElementById('menu-option-control-panel');
  if (userRole === 'lider' || userRole === 'lider-equipe') {
    controlPanelBtn.classList.remove('hidden');
  } else {
    controlPanelBtn.classList.add('hidden');
  }

  authContainer.classList.add('hidden');
  mainContent.classList.remove('hidden');
  document.getElementById('user-menu-container').classList.remove('hidden');

  // =================================================================
  // Lógica dos Popups Personalizados (COM A MELHORIA)
  // =================================================================
  setTimeout(() => {
    // ALTERAÇÃO 1: O popup de sucesso foi movido para DENTRO do setTimeout.
    mostrarPopup("✅ Sucesso", `Bem-vindo(a) de volta, ${username}!`, 3000);

    const hoje = getHoje();
    const diaSemana = hoje.getDay(); // 0-Dom, 1-Seg, ..., 6-Sáb
    const diaMes = hoje.getDate();
    const mesAtual = hoje.getMonth() + 1;

    const folgaDoMembro = (userData.folga || "").toLowerCase().replace("-feira", "");
    const aniversarioDoMembro = userData.aniversario || "";

    const popupMostradoHoje = sessionStorage.getItem('popupDiarioMostrado') === getHojeISO();

    if (!popupMostradoHoje) {
      // 1. Verificação de Aniversário (prioridade máxima)
      if (aniversarioDoMembro) {
        const [diaAniv, mesAniv] = aniversarioDoMembro.split('/').map(Number);
        if (diaAniv === diaMes && mesAniv === mesAtual) {
          const titulo = `🎉 Feliz Aniversário, ${currentUser}! 🎂`;
          const mensagem = `<p>Hoje é um dia mega especial, pois é o seu dia!</p>

<p>Desejamos que sua jornada seja sempre iluminada, cheia de sucesso e momentos incríveis.</p>

<p>Você é uma pessoa incrível e uma peça fundamental em nosso grupo. Que a felicidade, a saúde e a paz sejam suas companheiras constantes.</p>

<p>Aproveite cada segundo do seu dia!</p>

<div class="card-popup-signature">
— Grupo Épicos
</div>`;
          mostrarCardPopup(titulo, mensagem);
          sessionStorage.setItem('popupDiarioMostrado', getHojeISO());
          return; // Para o fluxo aqui para não mostrar outros popups
        }
      }

      // 2. Verificação de Domingo
      if (diaSemana === 0) {
        if (folgaDoMembro === 'segunda') {
            const titulo = "🙌 Olá, vizinho(a) de folga!";
            const mensagem = `<p>Que bom te ver de novo, ${currentUser}!</p>

<p>Hoje é a nossa folga coletiva, basta marcar sua caixa de seleção e aproveitar!!</p>

<p>Ah, outra coisa, amanhã é a sua folga e você poderá voltar aqui para marcar sua caixa de seleção sem precisar focar ou cuidar da fazenda.</p> <p>Amanhã eu te lembrarei novamente!!</p>`;
            mostrarCardPopup(titulo, mensagem);
        } else {
            const titulo = "🎉 Dia de Folga Coletiva!";
            const mensagem = `<p>Hoje é a nossa folga coletiva, ${currentUser}!</p>

<p>Basta marcar sua caixa de seleção e aproveitar.</p> <p>Te vejo amanhã sem falta, viu? Vamos "segundar" com tudo.</p>`;
            mostrarCardPopup(titulo, mensagem);
        }
        sessionStorage.setItem('popupDiarioMostrado', getHojeISO());
        return;
      }

      // 3. Verificação do Dia da Folga
      const diasDaSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
      if (folgaDoMembro === diasDaSemana[diaSemana]) {
        const titulo = `🥳 Aproveite sua Folga!`;
        const mensagem = `<p>Hoje é seu dia, ${currentUser}!</p>

<p>Enfim, hoje você pode descansar da sua rotina de foco. Basta marcar sua caixa de seleção e aproveitar!!</p>

<p>Ah só mais uma coisa, domingo é nossa folga coletiva, então não se esqueça de voltar aqui para marcar sua caixa de seleção, ok?</p>`;
        mostrarCardPopup(titulo, mensagem);
        sessionStorage.setItem('popupDiarioMostrado', getHojeISO());
        return;
      }

      // 4. Verificação do Dia ANTERIOR à Folga
      const diaDeAmanha = diasDaSemana[(diaSemana + 1) % 7];
       if (folgaDoMembro === diaDeAmanha) {
          const titulo = "🔔 Lembrete Amigo!";
          const mensagem = `<p>Que bom te ver de novo, ${currentUser}!</p>

<p>Passando para avisar que amanhã é a sua folga e você poderá marcar sua caixa de seleção sem precisar focar ou cuidar da fazenda.</p>

<p>Amanhã eu te lembrarei novamente!!</p>`;
          mostrarCardPopup(titulo, mensagem);
          sessionStorage.setItem('popupDiarioMostrado', getHojeISO());
          return;
      }
    }
  }, 3500); // O atraso de 3.5 segundos continua aqui

  // =================================================================
  // ROTINA DE CARREGAMENTO (continua a mesma)
  // =================================================================

  await carregarMembros();
  construirInterface();
  
  await new Promise(resolve => setTimeout(resolve, 0));

  await Promise.all([
      carregarPresenca(),
      carregarPontosSemanais(),
      carregarAniversariantes(),
      carregarRankingGeral(),
      carregarArvoreEpica(),
	  loadAdvantageState()
  ]);
  
  atualizarPlacarSemanal();
  atualizarRankingGeral();
  await atualizarResumo();

  const hora = new Date().getHours();
  const body = document.body;
  body.classList.remove("tema-manha", "tema-tarde", "tema-noite");
  if (hora >= 5 && hora < 12) body.classList.add("tema-manha");
  else if (hora >= 12 && hora < 18) body.classList.add("tema-tarde");
  else body.classList.add("tema-noite");

  atualizarDataCabecalho();
  atualizarInfoSemana();
  configurarMuralTempoReal();
  createColorPalette();
  configurarResumoSemanalTempoReal();
  await finalizarSemana();

  await Promise.all([
      carregarTop5Semana(),
      exibirQuadroFolgas(),
      carregarInformacoesMembros(),
      carregarTotalDias(),
      carregarStreaks()
  ]);
  
  atualizarVisualBloqueio();
  await carregarEExibirMembrosOciosos();
  
  setTimeout(() => {
    iniciarCarrosselAutomatico();
    irParaSlide(0);
  }, 1000); 
   setupRefreshListener(); 
   setupVersionCheckListener();
}

  function handleLogout() {
  localStorage.removeItem('loggedInUser');
  currentUser = null;
  userRole = null;
  userTeam = null;

  authContainer.classList.remove('hidden');
  mainContent.classList.add('hidden');

  // CORREÇÃO: Esconde o container do menu do usuário ao sair
  document.getElementById('user-menu-container').classList.add('hidden');

  loginUsernameInput.value = '';
  loginPasswordInput.value = '';

  showLoginForm();

  mostrarPopup("ℹ️ Sessão encerrada", "Você saiu do sistema", 3000);
}

  function showChangePasswordForm() {
    loginForm.classList.add('hidden');
    changePasswordForm.classList.remove('hidden');
  }

  function showLoginForm() {
  changePasswordForm.classList.add('hidden');
  forgotPasswordForm.classList.add('hidden');
  secretQuestionForm.classList.add('hidden'); // Adicione esta linha também
  loginForm.classList.remove('hidden');
}

  async function handlePasswordChange() {
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;

  if (!newPassword || !confirmPassword) {
    mostrarPopup("❌ Erro", "Preencha todos os campos", 3000);
    return;
  }

  if (newPassword !== confirmPassword) {
    mostrarPopup("❌ Erro", "As novas senhas não coincidem", 3000);
    return;
  }

  if (newPassword.length < 6) {
    mostrarPopup("❌ Erro", "A senha deve ter no mínimo 6 caracteres.", 3000);
    return;
  }

  try {
    const userDocRef = doc(db, "membros", currentUser);

    // ATUALIZAÇÃO: Salva APENAS a nova senha por enquanto.
    // O campo 'usedProv' só será mudado no final de todo o processo.
    await updateDoc(userDocRef, {
      senha: newPassword
    });

    // Mensagem para o Passo 2: Configurar recuperação
    mostrarPopup("✅ Senha Criada", "Agora, vamos configurar sua recuperação de login.", 5000);

    // Limpa os campos e leva para a próxima etapa
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    showSecretQuestionForm();

  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    mostrarPopup("❌ Erro", "Falha ao alterar senha. Tente novamente.", 3000);
  }
}

  function initAuth() {
    authContainer = document.getElementById("auth-container");
    mainContent = document.getElementById("main-content");
    logoutBtn = document.getElementById("logout-btn");
    loginForm = document.getElementById("login-form");
    changePasswordForm = document.getElementById("change-password-form");
    loginBtn = document.getElementById("login-btn");
    loginUsernameInput = document.getElementById("login-username");
    loginPasswordInput = document.getElementById("login-password");
	forgotPasswordForm = document.getElementById("forgot-password-form");
	secretQuestionForm = document.getElementById("secret-question-form");
	
	const togglePasswordBtn = document.getElementById('toggle-password-btn');

// Verifica se os elementos existem antes de adicionar os eventos
if (loginPasswordInput && togglePasswordBtn) {

  // Evento para mostrar ou esconder o botão ENQUANTO o usuário digita
  loginPasswordInput.addEventListener('input', () => {
    if (loginPasswordInput.value.length > 0) {
      togglePasswordBtn.style.display = 'block'; // Mostra o botão se houver texto
    } else {
      togglePasswordBtn.style.display = 'none'; // Esconde o botão se o campo estiver vazio
    }
  });

  // Evento de clique para alternar a visibilidade da senha
  togglePasswordBtn.addEventListener('click', () => {
    // Verifica se o tipo do campo é 'password'
    const isPassword = loginPasswordInput.type === 'password';

    if (isPassword) {
      // Se for senha, muda para texto e atualiza o botão
      loginPasswordInput.type = 'text';
      togglePasswordBtn.textContent = 'Ocultar';
    } else {
      // Se for texto, muda de volta para senha
      loginPasswordInput.type = 'password';
      togglePasswordBtn.textContent = 'Ver';
    }
  });
}

    // Configurar eventos
    if (loginBtn) {
      loginBtn.addEventListener("click", handleLogin);
    }
    
    if (logoutBtn) {
      logoutBtn.addEventListener("click", handleLogout);
    }
    
    // Adicionar evento Enter no campo de senha
    if (loginPasswordInput) {
      loginPasswordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleLogin();
      });
    }
	
	const userMenuBtn = document.getElementById('user-menu-btn');
const userMenuDropdown = document.getElementById('user-menu-dropdown');

if (userMenuBtn) {
  userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Impede que o clique no botão feche o menu imediatamente
    userMenuDropdown.classList.toggle('hidden');
  });
}

document.getElementById('user-greeting').textContent = `Olá, ${currentUser}!`;

// Eventos para as opções do menu
document.getElementById('menu-option-logout')?.addEventListener('click', handleLogout);
document.getElementById('menu-option-change-password')?.addEventListener('click', () => openModal('change-password-modal'));
document.getElementById('menu-option-change-secret')?.addEventListener('click', () => openModal('change-secret-modal'));
document.getElementById('confirm-remove-button')?.addEventListener('click', executeRemoveMember);
document.getElementById('force-refresh-btn')?.addEventListener('click', requestGlobalRefresh);
document.getElementById('trigger-update-btn')?.addEventListener('click', triggerForcedUpdate);
document.getElementById('perform-update-btn')?.addEventListener('click', performUpdate);

document.getElementById('limpar-feed-btn')?.addEventListener('click', limparFeedManualmente);
document.getElementById('limpar-mural-btn')?.addEventListener('click', limparMuralManualmente);

 // --- Eventos do Quadro de Folgas ---
  document.getElementById('change-folga-btn')?.addEventListener('click', openChangeFolgaModal);
  document.getElementById('save-new-folga-btn')?.addEventListener('click', handleUpdateFolga);

// Eventos para salvar nos modais
document.getElementById('save-new-password-btn')?.addEventListener('click', handleUpdatePassword);
document.getElementById('save-new-secret-btn')?.addEventListener('click', handleUpdateSecretAnswer);

// Fecha o menu se clicar fora dele
window.addEventListener('click', () => {
  if (userMenuDropdown && !userMenuDropdown.classList.contains('hidden')) {
    userMenuDropdown.classList.add('hidden');
  }
});

// --- Eventos do Mural de Mensagens ---
document.getElementById('open-composer-btn')?.addEventListener('click', () => openMessageComposer());
document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);
document.getElementById('viewer-close-btn')?.addEventListener('click', () => closeModal('message-viewer-modal'));
document.getElementById('composer-color-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('composer-color-palette').classList.toggle('hidden');
    });
document.getElementById('composer-close-btn')?.addEventListener('click', closeMessageComposer);
document.getElementById('composer-send-btn')?.addEventListener('click', enviarMensagem);

// Evento para abrir o Painel de Controle
document.getElementById('menu-option-control-panel')?.addEventListener('click', openControlPanel);

// Eventos dos botões do Painel de Controle
document.getElementById('add-member-btn')?.addEventListener('click', handleAddMember);
document.getElementById('remove-member-btn')?.addEventListener('click', handleRemoveMember);

    // Eventos para mudança de senha
    document.getElementById('change-password-btn')?.addEventListener('click', handlePasswordChange);
    document.getElementById('cancel-change-password')?.addEventListener('click', showLoginForm);
    document.getElementById('forgot-password-link')?.addEventListener('click', showForgotPasswordForm);
	document.getElementById('verify-answer-btn')?.addEventListener('click', handleVerifySecretAnswer);
    document.getElementById('cancel-forgot-password')?.addEventListener('click', showLoginForm);
	document.getElementById('save-secret-answer-btn')?.addEventListener('click', handleSaveSecretAnswer);
  }
  
  async function loginUser() {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!username || !password) {
        mostrarPopup("Erro", "Por favor, preencha todos os campos.", 3000);
        return;
    }

    try {
        const userDocRef = doc(db, "users", username);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.password === password) {
                currentUser = username;
                // userTeam = userData.equipe; // Mantenha esta linha se 'equipe' também existe na coleção 'users' e é usada para algo.

                // NOVO: Buscar o papel e a equipe do membro na coleção 'membros'
                const membroDocRef = doc(db, "membros", currentUser); // Assume que o ID do documento do membro é o username
                const membroDocSnap = await getDoc(membroDocRef);

                if (membroDocSnap.exists()) {
                    const membroData = membroDocSnap.data();
                    currentUserRole = membroData.papel || 'membro'; // Define o papel do usuário logado
                    currentUserTeam = membroData.equipe || null; // Define a equipe do usuário logado
                } else {
                    console.warn("Documento do membro não encontrado na coleção 'membros' para o usuário logado:", currentUser);
                    // Em caso de erro, define um papel e equipe padrão para evitar quebrar a aplicação
                    currentUserRole = 'membro';
                    currentUserTeam = null;
                }

                // Chamar carregarInformacoesMembros() para carregar a interface e os dados
                await carregarInformacoesMembros();
                
                // Estas chamadas podem ser redundantes se carregarInformacoesMembros já as faz,
                // mas não causam problema se forem chamadas novamente.
                await carregarInformacoesMembros(); // Chamada existente para carregar dados
                // await carregarInformacoesMembros(); // Re-chamar se necessário, ou garantir que seja idempotente

                mostrarPopup("Sucesso", `Bem-vindo(a), ${username}!`, 3000);
                authContainer.classList.add('hidden');
                mainContent.classList.remove('hidden');
                logoutBtn.classList.remove('hidden');

                // NOVO: Chamar esta função para ajustar as permissões visuais das checkboxes após o login
                atualizarPermissoesCheckboxes();
            } else {
                mostrarPopup("Erro", "Senha incorreta.", 3000);
            }
        } else {
            mostrarPopup("Erro", "Usuário não encontrado.", 3000);
        }
    } catch (e) {
        console.error("Erro ao fazer login: ", e);
        mostrarPopup("Erro", "Erro ao fazer login. Tente novamente.", 3000);
    }
}

// Função para copiar texto para a área de transferência
window.copyToClipboard = function(text, type) {
  navigator.clipboard.writeText(text).then(() => {
    mostrarPopup('✅ Copiado', `${type} copiado para a área de transferência!`, 2000);
  }).catch(err => {
    console.error('Erro ao copiar: ', err);
    mostrarPopup('❌ Erro', 'Não foi possível copiar.', 3000);
  });
}

// Função para verificar permissões de marcação/desmarcação de checkboxes
function podeMarcarCheckbox(memberId, memberTeam) {
    // Se não há usuário logado, não pode marcar
    if (!currentUser) {
        return false;
    }

    // 1. O líder geral ('lider') pode marcar qualquer checkbox
    if (currentUserRole === 'lider') {
        return true;
    }

    // 2. Líder de equipe ('lider-equipe') pode marcar checkboxes de membros da sua própria equipe
    // Verifica se o usuário logado é um 'lider-equipe' E se a equipe do usuário logado
    // (currentUserTeam) é a mesma do membro dono da checkbox (memberTeam).
    if (currentUserRole === 'lider-equipe' && currentUserTeam === memberTeam) {
        return true;
    }

    // 3. Membro regular ('membro') pode marcar/desmarcar apenas a sua própria checkbox
    // Verifica se o usuário logado é um 'membro' E se o ID do usuário logado (currentUser)
    // é o mesmo ID do membro dono da checkbox (memberId).
    if (currentUserRole === 'membro' && currentUser === memberId) {
        return true;
    }

    // Se nenhuma das condições acima foi atendida, o usuário não tem permissão
    return false;
}

function atualizarPermissoesCheckboxes() {
    // Seleciona todas as checkboxes que têm a classe 'tarefa-checkbox'
    const checkboxes = document.querySelectorAll('.tarefa-checkbox'); 
    checkboxes.forEach(checkbox => {
        const memberId = checkbox.dataset.memberId;
        const memberTeam = checkbox.dataset.memberTeam;
        if (memberId && memberTeam) { // Garante que os datasets existem
            checkbox.disabled = !podeMarcarCheckbox(memberId, memberTeam);
        }
    });
}

function atualizarVisualBloqueio() {
  if (!currentUser) return;

  todosMembros.forEach(membro => {
    const checkbox = document.getElementById(membro.nome);
    if (!checkbox) return;

    let podeMarcar = false;
    if (userRole === 'lider' || (userRole === 'lider-equipe' && membro.equipe === userTeam) || (currentUser === membro.nome)) {
      podeMarcar = true;
    }

    const membroDiv = checkbox.parentElement; // Pega o <div class="membro">
if (membroDiv) {
  if (podeMarcar) {
    membroDiv.classList.remove('bloqueado');
    membroDiv.title = 'Clique para marcar/desmarcar o foco';
  } else {
    membroDiv.classList.add('bloqueado');
    membroDiv.title = 'Você não tem permissão para alterar este foco';
  }
}
  });
}

function showForgotPasswordForm() {
  loginForm.classList.add('hidden');
  changePasswordForm.classList.add('hidden');
  forgotPasswordForm.classList.remove('hidden'); // Mostra o novo formulário
}

async function handleVerifySecretAnswer() {
  let username = document.getElementById('forgot-username').value.trim();
if (username) {
    // Formata o nome: Primeira letra maiúscula, resto minúsculo.
    username = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
}
  const secretAnswer = document.getElementById('secret-answer').value.trim();

  if (!username || !secretAnswer) {
    mostrarPopup("❌ Erro", "Preencha seu nome e a resposta secreta.", 3000);
    return;
  }

  try {
    const userDocRef = doc(db, "membros", username);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();

      // Verifica se o campo 'pet' existe e compara a resposta
      // A comparação ignora maiúsculas/minúsculas para facilitar para o usuário
      if (userData.pet && userData.pet.toLowerCase() === secretAnswer.toLowerCase()) {

        // A resposta está correta!
        currentUser = username; // Define o usuário para o qual a senha será trocada
        mostrarPopup("✅ Correto", "Resposta correta! Crie sua nova senha.", 3000);

        // Esconde o formulário da pergunta e mostra o de criar nova senha
        forgotPasswordForm.classList.add('hidden');
        changePasswordForm.classList.remove('hidden');

      } else {
        // A resposta está incorreta ou o campo não existe
        mostrarPopup("❌ Incorreto", "A resposta para a pergunta secreta está errada.", 4000);
      }
    } else {
      mostrarPopup("❌ Erro", "Usuário não encontrado.", 3000);
    }
  } catch (error) {
    console.error("Erro ao verificar resposta secreta:", error);
    mostrarPopup("❌ Erro", "Ocorreu um erro ao verificar os dados.", 3000);
  }
}

function showSecretQuestionForm() {
  loginForm.classList.add('hidden');
  changePasswordForm.classList.add('hidden');
  forgotPasswordForm.classList.add('hidden');
  secretQuestionForm.classList.remove('hidden'); // Mostra o formulário da pergunta
}

// Adicione esta nova função async
async function handleSaveSecretAnswer() {
  const secretAnswer = document.getElementById('setup-secret-answer').value.trim();

  if (!secretAnswer) {
    mostrarPopup("❌ Erro", "Por favor, preencha a resposta.", 3000);
    return;
  }

  try {
    const userDocRef = doc(db, "membros", currentUser);

    // ATUALIZAÇÃO FINAL: Salva a resposta e MARCA o processo como concluído
    await updateDoc(userDocRef, {
      pet: secretAnswer, // Salva a resposta no campo 'pet'
      usedProv: "on"    // Finaliza o processo de primeiro acesso
    });

    mostrarPopup("✅ Tudo Pronto!", `Bem-vindo(a), ${currentUser}! Carregando o app...`, 4000);

    // --- INÍCIO DO BLOCO CORRIGIDO ---
    // Após salvar, em vez de duplicar o código de carregamento, 
    // simplesmente chamamos a função principal que já faz tudo isso!
    // Isso também garante que o menu do usuário seja exibido corretamente.
    await performSuccessfulLogin(currentUser);
    // --- FIM DO BLOCO CORRIGIDO ---

  } catch (error) {
    console.error("Erro ao salvar resposta secreta:", error);
    mostrarPopup("❌ Falha Grave", "Ocorreu um erro ao finalizar seu cadastro. Por favor, recarregue a página.", 5000);
  }
}

// Adicione estas novas funções ao seu script

// Funções para abrir e fechar modais
window.openModal = function(modalId) {
  document.getElementById(modalId).style.display = 'flex';
}

window.closeModal = function(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Nova função para ATUALIZAR a senha de um usuário JÁ LOGADO
async function handleUpdatePassword() {
  const newPassword = document.getElementById('logged-in-new-password').value;
  const confirmPassword = document.getElementById('logged-in-confirm-password').value;

  if (!newPassword || newPassword.length < 6) {
    mostrarPopup("❌ Erro", "A senha deve ter no mínimo 6 caracteres.", 3000);
    return;
  }
  if (newPassword !== confirmPassword) {
    mostrarPopup("❌ Erro", "As senhas não coincidem.", 3000);
    return;
  }
  
  if (modalId === 'message-viewer-modal' && unsubscribeViewerListener) {
    unsubscribeViewerListener(); // Desliga o ouvinte do Firebase
    unsubscribeViewerListener = null; // Limpa a variável
  }

  try {
    await updateDoc(doc(db, "membros", currentUser), { senha: newPassword });
    mostrarPopup("✅ Sucesso", "Sua senha foi alterada!", 3000);
    closeModal('change-password-modal');
  } catch (error) {
    mostrarPopup("❌ Erro", "Falha ao atualizar a senha.", 3000);
    console.error("Erro ao trocar senha:", error);
  }
}

// Nova função para ATUALIZAR a pergunta secreta
async function handleUpdateSecretAnswer() {
  const newAnswer = document.getElementById('new-secret-answer').value.trim();

  if (!newAnswer) {
    mostrarPopup("❌ Erro", "Por favor, digite uma resposta.", 3000);
    return;
  }

  try {
    await updateDoc(doc(db, "membros", currentUser), { pet: newAnswer });
    mostrarPopup("✅ Sucesso", "Sua resposta secreta foi atualizada!", 3000);
    closeModal('change-secret-modal');
  } catch (error) {
    mostrarPopup("❌ Erro", "Falha ao atualizar a resposta.", 3000);
    console.error("Erro ao trocar resposta secreta:", error);
  }
}

// NOVA FUNÇÃO: Ferramenta para criar um post no feed da semana
async function adicionarEventoAoFeed(tipo, titulo, texto, dadosExtras = {}) {
  try {
    const eventoRef = doc(collection(db, "resumoSemanalFeed"));
    const dadosEvento = {
      id: eventoRef.id,
      tipo: tipo, // 'medalha', 'arvore', 'vitoria', 'vantagem', 'geral'
      titulo: titulo,
      texto: texto,
      timestamp: new Date(),
      reacoes: { "👍": [], "😂": [], "😭": [], "💖": [], "😡": [] }, // Estrutura de reações
      ...dadosExtras // Para informações adicionais se necessário
    };
    await setDoc(eventoRef, dadosEvento);
  } catch (error) {
    console.error("Erro ao adicionar evento ao feed:", error);
  }
}

// NOVA FUNÇÃO: Cria o HTML para um card do feed
function criarElementoCardResumo(evento) {
  const card = document.createElement('div');
  card.className = `feed-card ${evento.tipo}`;
  card.dataset.id = evento.id;

  const timestamp = evento.timestamp?.toDate ? evento.timestamp.toDate() : new Date();
  const dataCurta = timestamp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaFormatada = timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataCompletaFormatada = `${dataCurta}, ${horaFormatada}`;

  // Lógica de Reações (copiada e adaptada do mural)
  const reacoes = evento.reacoes || {};
  let reacoesHTML = '';
  const emojisOrdenados = Object.keys(reacoes).sort((a, b) => (reacoes[b]?.length || 0) - (reacoes[a]?.length || 0));

  emojisOrdenados.forEach(emoji => {
    const reagentes = Array.isArray(reacoes[emoji]) ? reacoes[emoji] : [];
    if (reagentes.length > 0) {
      const userHasReacted = reagentes.includes(currentUser);
      const reactedClass = userHasReacted ? 'reacted' : '';
      reacoesHTML += `
        <div class="reacao-display ${reactedClass}" 
             title="Reagido por: ${reagentes.join(', ')}"
             onclick="toggleReacaoFeed(event, '${evento.id}', '${emoji}')">
          ${emoji} <span class="contador-display">${reagentes.length}</span>
        </div>`;
    }
  });

  const reacoesContainer = reacoesHTML ? `<div class="feed-card-reacoes">${reacoesHTML}</div>` : `<div class="feed-card-reacoes"></div>`;

  card.innerHTML = `
    <div class="feed-card-header">
      <span>${evento.titulo}</span>
      <span>${dataCompletaFormatada}</span>
      
      ${userRole === 'lider' ? `
        <button class="feed-card-delete-btn" title="Apagar evento" onclick="deletarEventoFeed(event, '${evento.id}')">
          &times;
        </button>
      ` : ''}
      </div>
    <div class="feed-card-body">
      ${evento.texto}
    </div>
    ${reacoesContainer}
  `;


  // Adiciona o seletor de emojis ao clicar no card
  card.addEventListener('click', (e) => {
    if (e.target.closest('.reacao-display')) return; // Não ativa se clicar em uma reação existente

    // Remove outros seletores abertos
    document.querySelectorAll('.reacao-seletor-bar').forEach(bar => bar.remove());

    const seletorBar = document.createElement('div');
    seletorBar.className = 'reacao-seletor-bar';
    const emojisParaReagir = ['👍', '💖', '🎉', '🔥', '🎯'];
    emojisParaReagir.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.onclick = (ev) => {
            ev.stopPropagation();
            toggleReacaoFeed(ev, evento.id, emoji);
            seletorBar.remove();
        };
        seletorBar.appendChild(btn);
    });

    // Anexa a barra de reações ao card clicado
    card.querySelector('.feed-card-reacoes').appendChild(seletorBar);

    // Fecha a barra se clicar fora
    setTimeout(() => {
        document.addEventListener('click', function closeBar(event) {
            if (!card.contains(event.target)) {
                seletorBar.remove();
                document.removeEventListener('click', closeBar);
            }
        }, { once: true });
    }, 100);
  });

  return card;
}

// NOVA FUNÇÃO: Ouve as mudanças no feed e atualiza a tela
function configurarResumoSemanalTempoReal() {
  const feedContainer = document.getElementById('feed-semanal-cards');
  if (!feedContainer) return;

  const q = query(collection(db, "resumoSemanalFeed"), orderBy("timestamp", "desc"));

  onSnapshot(q, (querySnapshot) => {
    feedContainer.innerHTML = ''; // Limpa antes de renderizar
    if (querySnapshot.empty) {
      feedContainer.innerHTML = '<div class="sem-mensagens">Nenhum evento importante aconteceu esta semana ainda.</div>';
      return;
    }
    querySnapshot.forEach(doc => {
      const evento = doc.data();
      const cardElement = criarElementoCardResumo(evento);
      feedContainer.appendChild(cardElement);
    });
  });
}

// NOVA FUNÇÃO: Alterna uma reação em um card do feed
window.toggleReacaoFeed = async function(event, eventoId, emoji) {
    event.stopPropagation();
    if (!currentUser) return;

    const eventoRef = doc(db, "resumoSemanalFeed", eventoId);

    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(eventoRef);
            if (!docSnap.exists()) { throw "Evento não encontrado!"; }

            const dados = docSnap.data();
            const reacoes = dados.reacoes || {};

            // Inicializa o array para o emoji se não existir
            if (!Array.isArray(reacoes[emoji])) {
                reacoes[emoji] = [];
            }

            const userIndex = reacoes[emoji].indexOf(currentUser);

            if (userIndex > -1) {
                // Se o usuário já reagiu com este emoji, remove a reação
                reacoes[emoji].splice(userIndex, 1);
            } else {
                // Adiciona a nova reação
                reacoes[emoji].push(currentUser);
            }

            transaction.update(eventoRef, { reacoes: reacoes });
        });
    } catch (error) {
        console.error("Erro ao reagir no feed:", error);
        mostrarPopup("❌ Ops!", "Sua reação não pôde ser salva.", 3000);
    }
}

// NOVA FUNÇÃO: Apaga todos os documentos do feed semanal
async function limparFeedSemanal() {
  console.log("🧹 Verificando e limpando o feed da semana anterior...");
  const q = query(collection(db, "resumoSemanalFeed"));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("Feed já estava limpo.");
    return;
  }

  const batch = writeBatch(db);
  querySnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`✅ Feed limpo! ${querySnapshot.size} eventos removidos.`);
  
  // Adiciona a mensagem de "nova semana" APÓS limpar o feed.
  await adicionarEventoAoFeed(
      'geral', 
      '✨ Uma Nova Semana Começou!', 
      'O resumo da semana foi zerado. Que esta seja uma semana produtiva e cheia de foco para todos nós!'
  );
}

// 2. ADICIONE esta nova função para limpar todo o mural.
async function limparTodoOMural() {
    console.log("🧹 Verificando e limpando o mural de mensagens...");
    const q = query(collection(db, "mural"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log("Mural de mensagens já estava limpo.");
        return;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Mural limpo! ${querySnapshot.size} mensagens removidas.`);
}

// Função que o líder chama para forçar a atualização de todos
async function requestGlobalRefresh() {
  if (!confirm("Tem certeza que deseja forçar a atualização da página para todos os membros?")) return;

  try {
    // Usamos um local específico no DB para isso: coleção 'appState', documento 'status'
    const refreshRef = doc(db, "appState", "status");
    await setDoc(refreshRef, { 
      lastRefreshRequest: new Date() // Salva o timestamp atual
    });
    mostrarPopup("🚀 Enviado!", "Comando de atualização enviado para todos os membros.", 3000);
  } catch (error) {
    console.error("Erro ao solicitar atualização global:", error);
    mostrarPopup("❌ Erro", "Não foi possível enviar o comando.", 4000);
  }
}

// Configura o ouvinte de snapshot para atualizações globais
function setupRefreshListener() {
  const refreshRef = doc(db, "appState", "status");

  onSnapshot(refreshRef, (docSnap) => {
    if (docSnap.exists()) {
      const newTimestamp = docSnap.data().lastRefreshRequest?.toDate();
      
      if (newTimestamp) {
        // A primeira vez que carrega, apenas armazena o timestamp
        if (lastRefreshTimestamp === null) {
          lastRefreshTimestamp = newTimestamp;
          return;
        }

        // Se o timestamp do DB for mais novo que o nosso, significa que outra pessoa (o líder) pediu a atualização
        if (newTimestamp > lastRefreshTimestamp) {
          console.log("Recebido comando de atualização global. Atualizando a interface...");
          lastRefreshTimestamp = newTimestamp; // Atualiza nosso timestamp local
          refreshAppUI(); // Executa a atualização!
        }
      }
    }
  });
}

// Função que o líder chama para forçar a atualização de versão
async function triggerForcedUpdate() {
  if (!confirm("⚠️ ATENÇÃO!\n\nVocê está prestes a forçar uma atualização para TODOS os membros. A tela deles será bloqueada até que cliquem no botão para atualizar.\n\nUse isso apenas após ter certeza de que uma nova versão do aplicativo está no ar.\n\nDeseja continuar?")) {
    return;
  }

  try {
    const statusRef = doc(db, "appState", "status");
    // Usamos um timestamp como um número de versão.
    // Qualquer um com uma versão mais antiga será forçado a atualizar.
    await setDoc(statusRef, { 
      requiredUpdateVersion: new Date()
    }, { merge: true }); // Merge para não apagar o 'lastRefreshRequest'

    mostrarPopup("🚀 Enviado!", "Comando de atualização de versão enviado.", 4000);
  } catch (error) {
    console.error("Erro ao forçar atualização:", error);
    mostrarPopup("❌ Erro", "Não foi possível enviar o comando.", 4000);
  }
}

// Função que mostra a tela de bloqueio
function showUpdateOverlay() {
  const overlay = document.getElementById('update-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
}

// Função que o botão de atualização vai chamar
function performUpdate() {
  if (!officialAppVersion) {
    location.reload(true);
    return;
  }
  
  // ALTERAÇÃO: Remove a chave do sessionStorage para que o popup possa reaparecer.
  sessionStorage.removeItem('popupDiarioMostrado');
  
  localStorage.setItem('currentAppVersion', officialAppVersion.toISOString());
  location.reload(true);
}

// Função que escuta as mudanças de versão no Firestore
function setupVersionCheckListener() {
  const statusRef = doc(db, "appState", "status");

  onSnapshot(statusRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.requiredUpdateVersion) {
        // Armazena a versão oficial que veio do DB na nossa variável global
        officialAppVersion = data.requiredUpdateVersion.toDate();
        
        // Pega a versão que o usuário tem salva no navegador dele
        const localVersionStr = localStorage.getItem('currentAppVersion');
        const localVersion = localVersionStr ? new Date(localVersionStr) : new Date(0); // Usa uma data muito antiga se não houver nada salvo

        // Se a versão oficial for mais nova que a versão local, mostra a tela
        if (officialAppVersion > localVersion) {
          console.log("Nova versão detectada. Exibindo tela de atualização.");
          showUpdateOverlay();
        }
      }
    }
  });
}

// NOVA FUNÇÃO: Deleta um card do feed semanal
window.deletarEventoFeed = async function(event, eventoId) {
  // Impede que o clique no botão "x" acione outros cliques no card
  event.stopPropagation();

  if (!confirm("Tem certeza que deseja apagar este evento do feed?")) {
    return; // O usuário cancelou a ação
  }

  try {
    const eventoRef = doc(db, "resumoSemanalFeed", eventoId);
    await deleteDoc(eventoRef);
    mostrarPopup("✅ Sucesso", "O evento foi removido do feed.", 3000);
    // O feed se atualizará automaticamente por causa do 'onSnapshot'
  } catch (error) {
    console.error("Erro ao deletar evento do feed:", error);
    mostrarPopup("❌ Erro", "Não foi possível remover o evento.", 4000);
  }
}

// NOVA FUNÇÃO: Limpa manualmente o feed da semana (chamada pelo botão do líder)
async function limparFeedManualmente() {
  if (!confirm("⚠️ ATENÇÃO!\n\nVocê está prestes a apagar TODOS os eventos do feed da semana.\n\nDeseja continuar?")) return;

  try {
    const feedRef = collection(db, "resumoSemanalFeed");
    const querySnapshot = await getDocs(feedRef);

    if (querySnapshot.empty) {
      mostrarPopup("ℹ️ Informação", "O feed da semana já está limpo.", 3000);
      return;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    mostrarPopup("✅ Sucesso", `Todos os ${querySnapshot.size} eventos do feed foram apagados.`, 5000);
  } catch (error) {
    console.error("Erro ao limpar feed manualmente:", error);
    mostrarPopup("❌ Erro", "Ocorreu uma falha ao tentar limpar o feed.", 4000);
  }
}

// NOVA FUNÇÃO: Limpa manualmente o mural de mensagens (chamada pelo botão do líder)
async function limparMuralManualmente() {
  if (!confirm("⚠️ ATENÇÃO!\n\nVocê está prestes a apagar TODAS as mensagens do mural.\n\nEsta ação é permanente. Deseja continuar?")) return;

  try {
    const muralRef = collection(db, "mural");
    const querySnapshot = await getDocs(muralRef);

    if (querySnapshot.empty) {
      mostrarPopup("ℹ️ Informação", "O mural de mensagens já está vazio.", 3000);
      return;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    mostrarPopup("✅ Sucesso", `Todas as ${querySnapshot.size} mensagens do mural foram apagadas.`, 5000);
  } catch (error) {
    console.error("Erro ao limpar mural manualmente:", error);
    mostrarPopup("❌ Erro", "Ocorreu uma falha ao tentar limpar o mural.", 4000);
  }
}

window.onload = async () => {
  // 1. Inicializa os elementos de autenticação UMA VEZ para que estejam sempre disponíveis.
  initAuth();

// ===== INÍCIO DA ADIÇÃO PARA O PWA =====
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch(error => {
        console.log('Falha ao registrar Service Worker:', error);
      });
  }
  // ===== FIM DA ADIÇÃO PARA O PWA =====

  // 2. Verifica se há um usuário "lembrado" no navegador.
  const rememberedUser = localStorage.getItem('loggedInUser');

  if (rememberedUser) {
    // CAMINHO A: Se o usuário foi lembrado, executa o login automático.
    // Esta função já contém toda a lógica de carregamento de dados necessária.
    await performSuccessfulLogin(rememberedUser);
	
	const medalhaDiamante = document.getElementById('medalha-diamante');
if (medalhaDiamante) {
  medalhaDiamante.addEventListener('click', verificarCliquesDiamante);
}

  } else {
    // CAMINHO B: Se NINGUÉM está logado, executa a rotina completa de carregamento inicial da página.
    // =================================================================
    // INÍCIO DO BLOCO MOVIDO - Todo o seu código de carregamento
    // que estava fora, foi movido para DENTRO deste 'else'.
    // =================================================================

    dataAtual = getHojeISO();

    // Carregar membros do Firebase primeiro
    await carregarMembros();

    // Construir interface com membros carregados
    construirInterface();

    setTimeout(() => {
      iniciarCarrosselAutomatico();
      irParaSlide(0);
    }, 1000);

    // Paralelizar carregamentos iniciais
    await Promise.all([
      carregarPresenca(),
      carregarPontosSemanais(),
      carregarRankingGeral(),
      carregarAniversariantes(),
      carregarArvoreEpica(),
      carregarStreaks(),
      carregarTotalDias()
    ]);

    // Se for domingo, pontos semanais = 0
    if (getHoje().getDay() === 0) {
      pontosSemanais.abelha = 0;
      pontosSemanais.joaninha = 0;
      pontosSemanais.vagalume = 0;
    }

    const semanaAtual = getSemanaAtual();
    const semanaDocRef = doc(db, "semanas", semanaAtual.inicio.toISOString().slice(0, 10));
    const semanaDoc = await getDoc(semanaDocRef);
    if (!semanaDoc.exists()) {
      await setDoc(semanaDocRef, {
        abelha: 0,
        joaninha: 0,
        vagalume: 0,
        finalizada: false
      });
    }

    const rankingRef = doc(db, "ranking", "geral");
    const rankingDoc = await getDoc(rankingRef);
    if (!rankingDoc.exists()) await setDoc(rankingRef, rankingGeral);

    atualizarPlacarSemanal();
    atualizarRankingGeral();
    await finalizarSemana();

    // Tema dinâmico corrigido
    const hora = new Date().getHours();
    const body = document.body;
    body.classList.remove("tema-manha", "tema-tarde", "tema-noite");
    if (hora >= 5 && hora < 12) body.classList.add("tema-manha");
    else if (hora >= 12 && hora < 18) body.classList.add("tema-tarde");
    else body.classList.add("tema-noite");

    // Atualizar informações de data
    atualizarDataCabecalho();
    atualizarInfoSemana();

    // Adicionar evento à medalha de diamante
    const medalhaDiamante = document.getElementById('medalha-diamante');
    if (medalhaDiamante) {
      medalhaDiamante.addEventListener('click', verificarCliquesDiamante);
    }

    // Atualizar resumo e verificar equipes completas
    await atualizarResumo();
    verificarEquipeCompleta();

    configurarMuralTempoReal();
    configurarInputMensagem();

    await exibirQuadroFolgas();
    carregarTop5Semana();

     window.addEventListener('beforeunload', () => {
  pararConfeteAniversarioContinuo();
});

    // =================================================================
    // FIM DO BLOCO MOVIDO
    // =================================================================
  }

  // 3. CONFIGURAÇÕES GLOBAIS que rodam independentemente do status de login.
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);
  setInterval(verificarMudancaData, 60000);
  window.addEventListener('focus', verificarMudancaData);
};

async function refreshAppUI() {
  mostrarPopup("🔄 Atualizando", "Aguarde, recarregando a interface...", 2000);
  
  // A ordem é importante para garantir que a interface seja reconstruída corretamente
  await carregarMembros();
  construirInterface();
  
  // Carrega todos os outros componentes da interface em paralelo
  await Promise.all([
    carregarPresenca(),
    carregarPontosSemanais(),
    carregarRankingGeral(),
    carregarAniversariantes(),
    carregarArvoreEpica(),
    carregarStreaks(),
    carregarTotalDias(),
    exibirQuadroFolgas(),
    carregarInformacoesMembros()
  ]);

  // Atualiza os resumos e contadores
  await atualizarResumo();
  atualizarPlacarSemanal();
  atualizarRankingGeral();
  atualizarVisualBloqueio();
  await carregarEExibirMembrosOciosos();
  
  mostrarPopup("✅ Pronto!", "Interface atualizada com sucesso!", 3000);
}


// Função para abrir o painel e popular os dados
async function openControlPanel() {
  const selectRemove = document.getElementById('select-member-to-remove');
  const selectTeam = document.getElementById('new-member-team');
  const selectRole = document.getElementById('new-member-role');

  // Limpa o select de remoção
  selectRemove.innerHTML = '<option value="">Selecione um membro para remover...</option>';

  // Popula o select de remoção baseado no papel do líder
  todosMembros.forEach(membro => {
    // Não permitir que o líder se remova
    if (membro.nome === currentUser) return;

    if (userRole === 'lider') {
      // Líder geral pode remover qualquer um (exceto ele mesmo)
      const option = new Option(`${membro.nome} (${membro.equipe})`, membro.nome);
      selectRemove.appendChild(option);
    } else if (userRole === 'lider-equipe' && membro.equipe === userTeam) {
      // Líder de equipe só pode remover membros da sua equipe
      const option = new Option(membro.nome, membro.nome);
      selectRemove.appendChild(option);
    }
  });

  // Controla a visibilidade das opções de equipe para o líder de equipe
  if (userRole === 'lider-equipe') {
    selectTeam.value = userTeam;
    selectTeam.disabled = true; // Trava a seleção na equipe dele
    selectRole.value = 'membro';
    // Opcional: esconder a opção de "líder de equipe" se ele não puder criar outros
    // selectRole.querySelector('[value="lider-equipe"]').classList.add('hidden'); 
  } else {
    selectTeam.disabled = false; // Garante que o líder geral possa escolher
  }

  // Limpa o campo de resultado
  document.getElementById('new-member-result').textContent = '';
  
  openModal('control-panel-modal');
}

// NOVA FUNÇÃO PARA ABRIR E POPULAR O PLACAR DA VANTAGEM
window.abrirPlacarVantagem = async function() {
  const semana = getSemanaAtual();
  const docId = `semana_${semana.numero}_${semana.inicio.getFullYear()}`;
  const advantageRef = doc(db, "vantagemSemanal", docId);

  const placarCompletosEl = document.getElementById('placar-completos');
  const placarPendentesEl = document.getElementById('placar-pendentes');

  // Limpa o conteúdo anterior e mostra mensagem de carregamento
  placarCompletosEl.innerHTML = '<li>Carregando...</li>';
  placarPendentesEl.innerHTML = '<li>Carregando...</li>';

  openModal('placar-vantagem-modal');

  try {
    const docSnap = await getDoc(advantageRef);
    const completadoPor = docSnap.exists() ? docSnap.data().completadoPor || {} : {};

    const listaCompletos = [];
    const listaPendentes = [];

    // Separa os membros em duas listas: os que completaram e os que faltam
    todosMembros.forEach(membro => {
      if (completadoPor[membro.nome]) {
        listaCompletos.push({
          nome: membro.nome,
          equipe: membro.equipe,
          timestamp: completadoPor[membro.nome].toDate() // Converte para objeto Date
        });
      } else {
        listaPendentes.push({
            nome: membro.nome,
            equipe: membro.equipe
        });
      }
    });

    // Ordena a lista de completos pela data, do mais antigo para o mais novo
    listaCompletos.sort((a, b) => a.timestamp - b.timestamp);

    // Gera o HTML para a lista de quem completou
    if (listaCompletos.length > 0) {
      placarCompletosEl.innerHTML = listaCompletos.map((membro, index) => {
        const dataFormatada = membro.timestamp.toLocaleDateString('pt-BR');
        const horaFormatada = membro.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="placar-item">
            <span class="posicao">${index + 1}º</span>
            <span class="nome ${membro.equipe}">${membro.nome}</span>
            <span class="timestamp">${dataFormatada} às ${horaFormatada}</span>
          </div>
        `;
      }).join('');
    } else {
      placarCompletosEl.innerHTML = '<div class="placar-item">Ninguém finalizou o jogo ainda.</div>';
    }

    // Gera o HTML para a lista de quem falta
    if (listaPendentes.length > 0) {
      placarPendentesEl.innerHTML = listaPendentes.map(membro => {
        return `
          <div class="placar-item">
             <span class="nome ${membro.equipe}">${membro.nome}</span>
          </div>
        `;
      }).join('');
    } else {
      placarPendentesEl.innerHTML = '<div class="placar-item">Todos os membros finalizaram! Parabéns!</div>';
    }

  } catch (error) {
    console.error("Erro ao carregar placar da vantagem:", error);
    mostrarPopup("❌ Erro", "Não foi possível carregar o placar.", 4000);
    closeModal('placar-vantagem-modal');
  }
}

// Função para ADICIONAR um novo membro (ATUALIZADA)
async function handleAddMember() {
  let newName = document.getElementById('new-member-name').value.trim();
  const newTeam = document.getElementById('new-member-team').value;
  const newRole = document.getElementById('new-member-role').value;

  if (!newName) {
    mostrarPopup("❌ Erro", "O nome do membro não pode ser vazio.", 3000);
    return;
  }

  // ===== NOVA LINHA: Capitaliza a primeira letra =====
  newName = newName.charAt(0).toUpperCase() + newName.slice(1);

  // Verifica se o membro já existe
  const memberExists = todosMembros.some(m => m.nome.toLowerCase() === newName.toLowerCase());
  if (memberExists) {
    mostrarPopup("❌ Erro", `O membro "${newName}" já existe!`, 4000);
    return;
  }

  // Gera uma senha provisória de 5 dígitos
  const provisionalPassword = Math.floor(10000 + Math.random() * 90000).toString();

  try {
    const newMemberData = {
      equipe: newTeam,
      papel: newRole,
      senhaProv: provisionalPassword,
      usedProv: 'off',
      folga: "segunda-feira", // Folga padrão
      aniversario: "",
      // Campos do carrossel para evitar erros
      apelido: "",
      filme: "",
      sonho: "",
      musica: "",
      curiosidade: ""
    };

    // Adiciona o novo membro ao Firestore
    await setDoc(doc(db, "membros", newName), newMemberData);
	
await adicionarEventoAoFeed(
    'geral',
    '👋 Bem-vindo(a) ao Grupo!',
    `Um novo épico se juntou a nós! Seja muito bem-vindo(a), <strong>${newName}</strong>!`,
    { nomeMembro: newName }
);

    // ===== LÓGICA ATUALIZADA: Abre o modal de sucesso =====
    document.getElementById('success-username').innerText = newName;
    document.getElementById('success-password').innerText = provisionalPassword;
    openModal('new-member-success-modal');

    // Limpa o campo de nome e o resultado antigo
    document.getElementById('new-member-name').value = '';
    document.getElementById('new-member-result').textContent = '';

    // Atualiza toda a interface para incluir o novo membro
    await refreshAppUI();

  } catch (error) {
    console.error("Erro ao adicionar membro:", error);
    mostrarPopup("❌ Falha", "Ocorreu um erro ao salvar o novo membro.", 4000);
  }
}

// Função para REMOVER um membro (ATUALIZADA)
async function handleRemoveMember() {
  const memberToRemove = document.getElementById('select-member-to-remove').value;

  if (!memberToRemove) {
    mostrarPopup("❌ Erro", "Selecione um membro para remover.", 3000);
    return;
  }

  // ===== LÓGICA ATUALIZADA: Abre o modal de confirmação =====
  memberIdToRemove = memberToRemove; // Armazena o ID do membro a ser removido
  document.getElementById('member-to-remove-name').innerText = memberToRemove;
  openModal('confirm-remove-modal');
}

// NOVA FUNÇÃO: Executa a remoção após confirmação no modal
async function executeRemoveMember() {
  if (!memberIdToRemove) return;

  try {
    // Remove o documento do membro da coleção 'membros'
    await deleteDoc(doc(db, "membros", memberIdToRemove));

    mostrarPopup("✅ Sucesso", `O membro "${memberIdToRemove}" foi removido.`, 4000);

    // Atualiza a interface para remover o membro de todos os locais
    await refreshAppUI();

    // Fecha e reabre o painel para atualizar a lista de remoção
    closeModal('control-panel-modal');
    openControlPanel();

  } catch (error) {
    console.error("Erro ao remover membro:", error);
    mostrarPopup("❌ Falha", "Ocorreu um erro ao remover o membro.", 4000);
  } finally {
    // Limpa a variável e fecha o modal de confirmação
    memberIdToRemove = null;
    closeModal('confirm-remove-modal');
  }
}

// ===== INÍCIO DA LÓGICA DO JOGO DA VANTAGEM (v2.0 com Rodízio) =====

// --- Configurações Globais dos Jogos ---
const todosOsJogos = [
    {
        nome: "Jogo da Memória",
        initFunction: initMemoryGame,
        htmlContent: '' // O HTML do jogo da memória já está no CSS, será gerado via JS
    },
    {
        nome: "Acerte o Alvo",
        initFunction: initClickerGame,
        htmlContent: `
            <div id="clicker-game-board">
                <div class="clicker-stats">
                    <div id="clicker-score">Pontos: 0</div>
                    <div id="clicker-timer">Tempo: 30</div>
                </div>
                <button id="clicker-start-button">Começar!</button>
            </div>
        `
    },
    {
        nome: "Sequência de Cores",
        initFunction: initSimonGame,
        htmlContent: `
            <div id="simon-game-board">
                <div id="simon-info-display">Nível: 1</div>
                <div id="simon-pads-container">
                    <div class="simon-pad" id="simon-pad-0" data-index="0"></div>
                    <div class="simon-pad" id="simon-pad-1" data-index="1"></div>
                    <div class="simon-pad" id="simon-pad-2" data-index="2"></div>
                    <div class="simon-pad" id="simon-pad-3" data-index="3"></div>
                </div>
                <button id="simon-start-button">Iniciar</button>
            </div>
        `
    },
	{
    nome: "Jogo da Velha",
    initFunction: initTicTacToeGame,
    htmlContent: `
        <div id="tictactoe-board-wrapper">
            <div id="tictactoe-symbol-selection">
                <div class="status-display">Escolha seu lado:</div>
                <div class="symbol-buttons">
                    <button id="select-X" class="symbol-btn x">X</button>
                    <button id="select-O" class="symbol-btn o">O</button>
                </div>
            </div>

            <div id="tictactoe-status" class="status-display hidden">Sua vez de jogar (X)</div>
            <div id="tictactoe-board" class="hidden">
                <div class="tictactoe-cell" data-cell-index="0"></div>
                <div class="tictactoe-cell" data-cell-index="1"></div>
                <div class="tictactoe-cell" data-cell-index="2"></div>
                <div class="tictactoe-cell" data-cell-index="3"></div>
                <div class="tictactoe-cell" data-cell-index="4"></div>
                <div class="tictactoe-cell" data-cell-index="5"></div>
                <div class="tictactoe-cell" data-cell-index="6"></div>
                <div class="tictactoe-cell" data-cell-index="7"></div>
                <div class="tictactoe-cell" data-cell-index="8"></div>
                <div id="tictactoe-winning-line" class="winning-line"></div>
            </div>
            <button id="tictactoe-restart-button" class="hidden">Jogar Novamente</button>
        </div>
    `
}
];

// --- Carregador Principal e Despachante de Jogos ---
async function loadAdvantageState() {
    if (!currentUser) return;

    // --- LÓGICA DO LÍDER (permanece igual) ---
    const leaderControls = document.getElementById('leader-advantage-controls');
    if (userRole === 'lider') {
        leaderControls.classList.remove('hidden');
        document.getElementById('leader-test-button').onclick = window.toggleLeaderTestPanel;
        populateLeaderTestPanel();
    } else {
        leaderControls.classList.add('hidden');
    }

    const hoje = getHoje();
    const diaSemana = hoje.getDay(); // 0 = Domingo, 6 = Sábado
    const eFimDeSemana = (diaSemana === 0 || diaSemana === 6);

    const semana = getSemanaAtual();
    const docId = `semana_${semana.numero}_${semana.inicio.getFullYear()}`;
    const advantageRef = doc(db, "vantagemSemanal", docId);
    const docSnap = await getDoc(advantageRef);

    const usuarioCompletou = docSnap.exists() && docSnap.data().completadoPor?.[currentUser];

    // Verificação #1: O usuário já completou?
    if (usuarioCompletou) {
    lockAdvantageSection("Desafio concluído! Volte na próxima semana para mais.");
    document.getElementById('advantage-game-board').innerHTML = '';
    // O jogo deve permanecer travado para todos. O painel de teste do líder
    // é uma função separada e não deve interferir no estado do jogo da semana.
    return; // A função para aqui para TODOS.
}
    
    // Verificação #2: É fim de semana E o usuário NÃO completou?
    else if (eFimDeSemana) {
    lockAdvantageSection("O tempo para este desafio acabou. Ele retorna na Segunda-feira!");
    document.getElementById('advantage-game-board').innerHTML = '';
    return; // A função para aqui para TODOS.
}

    // Se chegou até aqui, o jogo deve estar ativo.
    unlockAdvantageSection();

    const gameBoard = document.getElementById('advantage-game-board');
    const nomeJogoEl = document.getElementById('vantagem-jogo-nome');

    const indiceDoJogo = semana.numero % todosOsJogos.length;
    const jogoDaSemana = todosOsJogos[indiceDoJogo];

    if (nomeJogoEl) {
        nomeJogoEl.textContent = `Jogo da Semana: ${jogoDaSemana.nome}`;
    }

    gameBoard.innerHTML = jogoDaSemana.htmlContent;
    jogoDaSemana.initFunction();
}

// --- Funções de Conclusão e Bloqueio (Comuns a todos os jogos) ---
function lockAdvantageSection(message) {
    const overlay = document.getElementById('vantagem-locked-overlay');
    const lockMessage = document.getElementById('vantagem-lock-message');
    if (overlay && lockMessage) {
        lockMessage.textContent = message;
        overlay.classList.remove('hidden');
    }
}

function unlockAdvantageSection() {
    const overlay = document.getElementById('vantagem-locked-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

async function saveAdvantageCompletion() {
    if (!currentUser) return;
    const semana = getSemanaAtual();
    const docId = `semana_${semana.numero}_${semana.inicio.getFullYear()}`;
    const advantageRef = doc(db, "vantagemSemanal", docId);
    try {
        // A MUDANÇA ESTÁ AQUI: Salva a data atual em vez de 'true'
        await setDoc(advantageRef, { completadoPor: { [currentUser]: new Date() } }, { merge: true });
        console.log(`Conclusão salva para ${currentUser}`);
    } catch (error) {
        console.error("Erro ao salvar conclusão:", error);
        mostrarPopup("❌ Erro", "Não foi possível salvar seu progresso.", 4000);
    }
}

// ATUALIZADA: Agora é async e notifica a conclusão no feed
async function handleGameWin(gameName) {
    // Busca a posição do jogador no placar ANTES de registrar a vitória
    const semana = getSemanaAtual();
    const docId = `semana_${semana.numero}_${semana.inicio.getFullYear()}`;
    const advantageRef = doc(db, "vantagemSemanal", docId);
    
    let posicao = 1; // Padrão se for o primeiro a completar
    try {
        const docSnap = await getDoc(advantageRef);
        if (docSnap.exists()) {
            const completadoPor = docSnap.data().completadoPor || {};
            posicao = Object.keys(completadoPor).length + 1;
        }
    } catch (error) {
        console.error("Erro ao buscar placar da vantagem para o feed:", error);
    }

   // ===== INÍCIO DA NOVA LÓGICA PARA O FEED (COM CONDIÇÃO) =====
let textoFeed;

// Verifica se quem completou é o líder geral
if (liderGeral && currentUser === liderGeral.nome) {
    // Se for o líder, cria a mensagem sem a parte dos pontos
    textoFeed = `O líder geral <strong>${currentUser}</strong> finalizou com maestria o <strong>${gameName}</strong>, ficando na <strong>${posicao}ª</strong> posição do placar!`;
} else {
    // Para todos os outros membros, mantém a mensagem original com os pontos
    textoFeed = `<strong>${currentUser}</strong> finalizou com maestria o <strong>${gameName}</strong>, ficando na <strong>${posicao}ª</strong> posição do placar e garantindo +3 pontos para sua equipe!`;
}

await adicionarEventoAoFeed(
    'vantagem',                 // Tipo do evento
    '🎯 Desafio Concluído!',    // Título do card
    textoFeed,                  // A variável com o texto do card
    { nomeMembro: currentUser, jogo: gameName, posicao: posicao } // Dados extras
);
// ===== FIM DA NOVA LÓGICA PARA O FEED (COM CONDIÇÃO) =====

    // O resto da função original continua aqui
    mostrarPopup(`🎉 Parabéns!`, `Você venceu o ${gameName}!`, 5000);
    dispararConfete();
    await saveAdvantageCompletion();
    lockAdvantageSection("Desafio concluído! Volte na próxima semana.");
}

// Função para mostrar/esconder o painel de teste do líder
window.toggleLeaderTestPanel = function() {
  const panel = document.getElementById('leader-test-panel');
  panel.classList.toggle('hidden');
}

// Função para popular o painel com a lista de jogos disponíveis
function populateLeaderTestPanel() {
  const gameList = document.getElementById('leader-game-list');
  if (!gameList) return;

  gameList.innerHTML = ''; // Limpa a lista antes de adicionar

  todosOsJogos.forEach((game, index) => {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = game.nome;
    // Adiciona o evento de clique que chama a função para iniciar o jogo
    button.onclick = () => startLeaderTestGame(index);
    listItem.appendChild(button);
    gameList.appendChild(listItem);
  });
}

// Função que efetivamente inicia o jogo selecionado pelo líder para teste
function startLeaderTestGame(gameIndex) {
  const game = todosOsJogos[gameIndex];
  const gameBoard = document.getElementById('advantage-game-board') || document.getElementById('memory-game-board');
  const nomeJogoEl = document.getElementById('vantagem-jogo-nome');

  if (!game || !gameBoard || !nomeJogoEl) return;
  
    // *** INÍCIO DA CORREÇÃO ***
  // Garante que o contêiner sempre tenha o ID correto antes de carregar um novo jogo.
  gameBoard.id = 'advantage-game-board';
  // *** FIM DA CORREÇÃO ***

  // Atualiza a interface para refletir o jogo de teste
  nomeJogoEl.textContent = `Modo de Teste: ${game.nome}`;
  gameBoard.innerHTML = game.htmlContent;

  // Inicia a lógica do jogo escolhido
  game.initFunction();

  // Opcional: esconde o painel de seleção após escolher um jogo
  document.getElementById('leader-test-panel').classList.add('hidden');

  // IMPORTANTE: Remove a tela de bloqueio para permitir o teste
  unlockAdvantageSection();
}

// ==========================================================
// --- JOGO 1: JOGO DA MEMÓRIA (CÓDIGO EXISTENTE ADAPTADO) ---
// ==========================================================
function initMemoryGame() {
    const EMOJIS = ['🧠', '🔥', '🚀', '💎', '🏆', '🌞', '🧸', '🐸'];
    let gameFlippedCards = [];
    let gameMatchedPairs = 0;
    let gameLockBoard = false;
    const gameBoard = document.getElementById('advantage-game-board');
    
    // O Jogo da Memória precisa que seu board seja criado dinamicamente
    gameBoard.id = 'memory-game-board'; // Atribui o ID correto para o CSS
    gameBoard.innerHTML = '';
    
    const gameCards = [...EMOJIS, ...EMOJIS];
    gameCards.sort(() => 0.5 - Math.random());
    
    gameCards.forEach(emoji => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('memory-card');
        cardElement.dataset.emoji = emoji;
        cardElement.innerHTML = `<div class="card-face card-front"></div><div class="card-face card-back">${emoji}</div>`;
        cardElement.addEventListener('click', () => flipCard(cardElement));
        gameBoard.appendChild(cardElement);
    });

    function flipCard(card) {
        if (gameLockBoard || card.classList.contains('flipped') || !currentUser) return;
        card.classList.add('flipped');
        gameFlippedCards.push(card);
        if (gameFlippedCards.length === 2) checkForMatch();
    }

    function checkForMatch() {
        gameLockBoard = true;
        const [cardOne, cardTwo] = gameFlippedCards;
        const isMatch = cardOne.dataset.emoji === cardTwo.dataset.emoji;

        if (isMatch) {
            setTimeout(() => {
                cardOne.classList.add('matched');
                cardTwo.classList.add('matched');
                gameMatchedPairs++;
                if (gameMatchedPairs === EMOJIS.length) {
                    setTimeout(() => handleGameWin("Jogo da Memória"), 500);
                }
                resetBoard();
            }, 600);
        } else {
            setTimeout(() => {
                cardOne.classList.remove('flipped');
                cardTwo.classList.remove('flipped');
                resetBoard();
            }, 1200);
        }
    }
    function resetBoard() {
        gameFlippedCards = [];
        gameLockBoard = false;
    }
}


// =======================================================
// --- JOGO 2: ACERTE O ALVO (CLICKER GAME) ---
// =======================================================
function initClickerGame() {
    const board = document.getElementById('clicker-game-board');
    const scoreDisplay = document.getElementById('clicker-score');
    const timerDisplay = document.getElementById('clicker-timer');
    const startButton = document.getElementById('clicker-start-button');
    const TARGET_SCORE = 40; // Alterado de 25 para 40
    let score = 0;
    let timeLeft = 25; // Alterado de 30 para 25
    let gameInterval = null;
    let targetCreatorInterval = null;

    if (startButton) {
        startButton.onclick = startGame;
    }

    function startGame() {
        if (!startButton) return;
        startButton.style.display = 'none';
        score = 0;
        timeLeft = 25; // Garante que o tempo reinicie com o novo valor
        
        if (scoreDisplay) scoreDisplay.textContent = `Pontos: 0 / ${TARGET_SCORE}`;
        if (timerDisplay) {
          timerDisplay.textContent = `Tempo: ${timeLeft}`;
          timerDisplay.classList.remove('ending');
        }

        gameInterval = setInterval(() => {
            timeLeft--;
            if (timerDisplay) timerDisplay.textContent = `Tempo: ${timeLeft}`;
            if (timeLeft <= 5 && timerDisplay) timerDisplay.classList.add('ending');
            if (timeLeft <= 0) endGame(false); // Passa 'false' para indicar derrota
        }, 1000);
        
        // Alvos aparecem mais rápido (a cada 450ms)
        targetCreatorInterval = setInterval(createTarget, 450);
    }
    
    function createTarget() {
        if (!board) return;
        const target = document.createElement('div');
        target.classList.add('clicker-target');

        const teamEmojis = ['🐝', '🐞', '💡'];
        const randomTeam = ['abelha', 'joaninha', 'vagalume'][Math.floor(Math.random() * 3)];
        target.classList.add(randomTeam);
        target.textContent = teamEmojis[Math.floor(Math.random() * 3)];
        
        // Posição ajustada para não começar tão perto das bordas (para a animação de movimento)
        target.style.top = `${10 + Math.random() * 70}%`;
        target.style.left = `${10 + Math.random() * 70}%`;
        
        target.onclick = () => {
            score++;
            if (scoreDisplay) scoreDisplay.textContent = `Pontos: ${score} / ${TARGET_SCORE}`;
            target.classList.add('clicked');
            if (score >= TARGET_SCORE) {
                endGame(true); // Venceu!
            }
            setTimeout(() => target.remove(), 300);
        };
        
        board.appendChild(target);
        
        // Alvos desaparecem mais rápido (duração de 1.5 segundos)
        setTimeout(() => {
            if (target && target.parentElement) target.remove();
        }, 1500);
    }
    
    function endGame(isWinner) {
        clearInterval(gameInterval);
        clearInterval(targetCreatorInterval);
        
        if (!board) return;
        board.innerHTML = ''; // Limpa os alvos restantes

        if(isWinner) {
            handleGameWin("Acerte o Alvo");
        } else {
            const resultText = document.createElement('div');
            resultText.innerHTML = `Tempo esgotado! Você fez ${score} pontos.<br>Tente novamente!`;
            resultText.style.fontSize = '1.5rem';
            resultText.style.textAlign = 'center';
            board.appendChild(resultText);
            
            setTimeout(() => {
                const clickerGameData = todosOsJogos.find(jogo => jogo.nome === "Acerte o Alvo");
                if (clickerGameData) {
                    const gameContainer = document.getElementById('advantage-game-board');
                    gameContainer.innerHTML = clickerGameData.htmlContent;
                    initClickerGame(); 
                }
            }, 4000);
        }
    }
}

// ========================================================
// --- JOGO 3: SEQUÊNCIA DE CORES (SIMON GAME) ---
// ========================================================
function initSimonGame() {
    const infoDisplay = document.getElementById('simon-info-display');
    const startButton = document.getElementById('simon-start-button');
    const pads = document.querySelectorAll('.simon-pad');
    const WIN_LEVEL = 8;
    let sequence = [];
    let playerSequence = [];
    let level = 1;
    let isPlayerTurn = false;

    startButton.onclick = startGame;
    pads.forEach(pad => pad.addEventListener('click', handlePlayerClick));

    function startGame() {
        startButton.style.display = 'none';
        sequence = [];
        level = 1;
        nextTurn();
    }
    
    function nextTurn() {
        isPlayerTurn = false;
        playerSequence = [];
        infoDisplay.textContent = `Nível: ${level}`;
        
        const nextInSequence = Math.floor(Math.random() * 4);
        sequence.push(nextInSequence);
        
        playSequence();
    }
    
    async function playSequence() {
        await new Promise(resolve => setTimeout(resolve, 700)); // Pausa antes de começar
        for (let i = 0; i < sequence.length; i++) {
            await activatePad(sequence[i]);
            await new Promise(resolve => setTimeout(resolve, 200)); // Pausa entre as luzes
        }
        isPlayerTurn = true;
        infoDisplay.textContent = "Sua vez!";
    }

    function activatePad(index) {
        return new Promise(resolve => {
            const pad = document.getElementById(`simon-pad-${index}`);
            pad.classList.add('active');
            // Simular som (opcional, pode adicionar <audio> tags)
            setTimeout(() => {
                pad.classList.remove('active');
                resolve();
            }, 500); // Duração que a luz fica acesa
        });
    }

    function handlePlayerClick(event) {
        if (!isPlayerTurn) return;
        
        const clickedIndex = parseInt(event.target.dataset.index, 10);
        activatePad(clickedIndex);
        playerSequence.push(clickedIndex);
        
        const lastIndex = playerSequence.length - 1;
        
        // Se o jogador errou
        if (playerSequence[lastIndex] !== sequence[lastIndex]) {
            endGame(false);
            return;
        }
        
        // Se o jogador completou a sequência do nível
        if (playerSequence.length === sequence.length) {
            if (level >= WIN_LEVEL) {
                endGame(true); // Venceu o jogo!
            } else {
                level++;
                isPlayerTurn = false;
                setTimeout(nextTurn, 1000);
            }
        }
    }
    
    function endGame(isWinner) {
        isPlayerTurn = false;
        if(isWinner) {
            handleGameWin("Sequência de Cores");
        } else {
            infoDisplay.textContent = "Errado! Tente de novo.";
            setTimeout(() => {
                document.getElementById('simon-game-board').innerHTML = `
                    <div id="simon-info-display">Nível: 1</div>
                    <div id="simon-pads-container">
                        <div class="simon-pad" id="simon-pad-0" data-index="0"></div>
                        <div class="simon-pad" id="simon-pad-1" data-index="1"></div>
                        <div class="simon-pad" id="simon-pad-2" data-index="2"></div>
                        <div class="simon-pad" id="simon-pad-3" data-index="3"></div>
                    </div>
                    <button id="simon-start-button">Iniciar</button>
                `;
                initSimonGame(); // Reinicia o jogo
            }, 3000);
        }
    }
}

// ==========================================================
// --- JOGO 4: JOGO DA VELHA (TIC-TAC-TOE) ---
// ==========================================================
function initTicTacToeGame() {
    // Referências aos elementos do DOM
    const wrapper = document.getElementById('tictactoe-board-wrapper');
    const statusDisplay = document.getElementById('tictactoe-status');
    const restartButton = document.getElementById('tictactoe-restart-button');
    const symbolSelection = document.getElementById('tictactoe-symbol-selection');
    const boardElement = document.getElementById('tictactoe-board');
    const winningLine = document.getElementById('tictactoe-winning-line');

    // Constantes e Variáveis do Jogo
    let PLAYER_SYMBOL = 'X';
    let AI_SYMBOL = 'O';
    const WINNING_COMBINATIONS = [
        // Horizontais
        { combo: [0, 1, 2], class: 'line-h-0' }, { combo: [3, 4, 5], class: 'line-h-1' }, { combo: [6, 7, 8], class: 'line-h-2' },
        // Verticais
        { combo: [0, 3, 6], class: 'line-v-0' }, { combo: [1, 4, 7], class: 'line-v-1' }, { combo: [2, 5, 8], class: 'line-v-2' },
        // Diagonais
        { combo: [0, 4, 8], class: 'line-d-0' }, { combo: [2, 4, 6], class: 'line-d-1' }
    ];
    let boardState = Array(9).fill(null);
    let isPlayerTurn = true;
    let isGameOver = false;
	let chosenPlayerSymbol = null;

    // Função para iniciar o jogo após a seleção do símbolo
     function startGame(selectedSymbol) {
        // Se um símbolo foi selecionado (primeira partida), armazena a escolha
        if (selectedSymbol) {
            chosenPlayerSymbol = selectedSymbol;
        }

        PLAYER_SYMBOL = chosenPlayerSymbol;
        AI_SYMBOL = PLAYER_SYMBOL === 'X' ? 'O' : 'X';

        // Esconde a seleção e mostra o tabuleiro
        symbolSelection.classList.add('hidden');
        boardElement.classList.remove('hidden');
        statusDisplay.classList.remove('hidden');

        // LÓGICA DE INÍCIO ALEATÓRIO
        isPlayerTurn = Math.random() < 0.5;

        if (!isPlayerTurn) {
            statusDisplay.textContent = `O computador (${AI_SYMBOL}) começa...`;
            setTimeout(computerMove, 1200);
        } else {
            statusDisplay.textContent = `Sua vez de jogar (${PLAYER_SYMBOL})`;
        }
    }

    // Adiciona eventos aos botões de seleção
    document.getElementById('select-X').onclick = () => startGame('X');
    document.getElementById('select-O').onclick = () => startGame('O');

    // Manipulador de clique na célula
    function handleCellClick(e) {
        if (isGameOver || !isPlayerTurn) return;
        const cellIndex = parseInt(e.target.dataset.cellIndex);
        if (boardState[cellIndex] !== null) return;

        updateBoard(cellIndex, PLAYER_SYMBOL);
        const gameStatus = checkGameStatus();
        if (gameStatus.isFinished) {
            endGame(gameStatus);
            return;
        }

        isPlayerTurn = false;
        statusDisplay.textContent = `Vez do computador (${AI_SYMBOL})...`;
        setTimeout(computerMove, 700);
    }

    // Lógica da jogada do computador
    function computerMove() {
        if (isGameOver) return;
        const bestMoveIndex = findBestMove();
        updateBoard(bestMoveIndex, AI_SYMBOL);
        
        const gameStatus = checkGameStatus();
        if (gameStatus.isFinished) {
            endGame(gameStatus);
            return;
        }
        
        isPlayerTurn = true;
        statusDisplay.textContent = `Sua vez de jogar (${PLAYER_SYMBOL})`;
    }

    // IA para encontrar a melhor jogada
    function findBestMove() {
        // 1. Vencer
        for (const combination of WINNING_COMBINATIONS) {
            const move = getWinningMove(combination.combo, AI_SYMBOL);
            if (move !== -1) return move;
        }
        // 2. Bloquear
        for (const combination of WINNING_COMBINATIONS) {
            const move = getWinningMove(combination.combo, PLAYER_SYMBOL);
            if (move !== -1) return move;
        }
        // 3. Estratégia: Centro, cantos, etc.
        if (boardState[4] === null) return 4;
        const corners = [0, 2, 6, 8].filter(i => boardState[i] === null);
        if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
        const sides = [1, 3, 5, 7].filter(i => boardState[i] === null);
        if (sides.length > 0) return sides[Math.floor(Math.random() * sides.length)];
        return boardState.findIndex(cell => cell === null);
    }

    function getWinningMove(combo, symbol) {
        const line = combo.map(i => boardState[i]);
        if (line.filter(s => s === symbol).length === 2 && line.includes(null)) {
            return combo[line.indexOf(null)];
        }
        return -1;
    }

    // Atualiza visualmente o tabuleiro
    function updateBoard(index, symbol) {
        boardState[index] = symbol;
        const cell = boardElement.querySelector(`[data-cell-index='${index}']`);
        cell.classList.add(symbol.toLowerCase());
    }

    // Verifica o estado do jogo (vitória, empate ou continua)
    function checkGameStatus() {
        for (const combination of WINNING_COMBINATIONS) {
            const [a, b, c] = combination.combo;
            if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
                return { isFinished: true, winner: boardState[a], lineClass: combination.class, winningCombo: combination.combo };
            }
        }
        if (boardState.every(cell => cell !== null)) {
            return { isFinished: true, winner: 'tie' };
        }
        return { isFinished: false };
    }

    // Finaliza o jogo
     function endGame(status) {
        isGameOver = true;
        if (status.winner === PLAYER_SYMBOL) {
            // ... (a lógica de vitória permanece a mesma)
            statusDisplay.textContent = "Você venceu! 🎉";
            winningLine.className = `winning-line ${status.lineClass}`;
            status.winningCombo.forEach(i => document.querySelector(`[data-cell-index='${i}']`).classList.add('highlight'));
            handleGameWin("Jogo da Velha");
        } else if (status.winner === AI_SYMBOL) {
    // >>> INÍCIO DA MODIFICAÇÃO <<<
    statusDisplay.textContent = "O computador venceu!";
    winningLine.className = `winning-line ${status.lineClass}`;
    status.winningCombo.forEach(i => document.querySelector(`[data-cell-index='${i}']`).classList.add('highlight'));

    // Inicia a lógica da contagem regressiva
    let countdown = 3;
    statusDisplay.textContent = `O computador venceu! Nova rodada em ${countdown}...`;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            statusDisplay.textContent = `O computador venceu! Nova rodada em ${countdown}...`;
        } else {
            // Quando a contagem chega a zero, para o intervalo e reinicia o jogo
            clearInterval(countdownInterval);
            autoRestartAfterLoss();
        }
    }, 1000); // O intervalo é de 1000ms (1 segundo)
    // >>> FIM DA MODIFICAÇÃO <<<
} else {
            // ... (a lógica de empate permanece a mesma)
            statusDisplay.textContent = "Deu velha! Tente novamente.";
            restartButton.classList.remove('hidden');
        }
    }
	
	// ADICIONE esta função nova dentro de initTicTacToeGame
    function autoRestartAfterLoss() {
        // Reseta o estado do jogo
        boardState.fill(null);
        isGameOver = false;
        
        // Limpa a interface do tabuleiro
        document.querySelectorAll('.tictactoe-cell').forEach(cell => {
            cell.className = 'tictactoe-cell';
        });
        winningLine.className = 'winning-line';
        restartButton.classList.add('hidden'); // Garante que o botão de restart manual não apareça

        // Inicia uma nova partida, reutilizando a escolha de símbolo do jogador
        startGame(null);
    }

    // Reinicia o jogo
    function restartGame() {
	    chosenPlayerSymbol = null;
        boardState.fill(null);
        isGameOver = false;
        isPlayerTurn = true;
        
        // Limpa a interface
        document.querySelectorAll('.tictactoe-cell').forEach(cell => {
            cell.className = 'tictactoe-cell';
        });
        winningLine.className = 'winning-line';
        restartButton.classList.add('hidden');
        boardElement.classList.add('hidden');
        statusDisplay.classList.add('hidden');

        // Mostra a seleção de símbolo novamente
        symbolSelection.classList.remove('hidden');
    }

    // Adiciona os eventos de clique às células e ao botão de reiniciar
    document.querySelectorAll('.tictactoe-cell').forEach(cell => cell.addEventListener('click', handleCellClick));
    restartButton.addEventListener('click', restartGame);
}

// ===== FIM DA LÓGICA DO JOGO DA VANTAGEM =====

// Função para buscar e exibir as Instruções
  async function carregarInstrucoes() {
    try {
      const docRef = doc(db, "regras", "manual");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const conteudoDiv = document.querySelector("#secao-instrucoes .secao-conteudo");

        conteudoDiv.innerHTML = `
          <h1>📜 Manual de Funcionamento e Dinâmicas do Grupo </h1>
          <div class="info-bloco">
            <h2>Lista de Foco</h2>
            <p>${data.Foco.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="info-bloco">
            <h2>Dia de Folga</h2>
            <p>${data.Folga.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="info-bloco">
            <h2>Nomeação de Líderes</h2>
            <p>${data.Lider.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="info-bloco">
            <h2>Medalhas Individuais</h2>
            <p>${data.Medalhas.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="info-bloco">
            <h2>Árvore Épica</h2>
            <p>${data['Árvore'].replace(/\n/g, "<br>")}</p>
          </div>
        `;
        document.getElementById("secao-instrucoes").classList.remove("hidden");
      } else {
        mostrarPopup("❌ Erro", "Não foi possível encontrar o manual de instruções.", 4000);
      }
    } catch (error) {
      console.error("Erro ao carregar instruções:", error);
      mostrarPopup("❌ Erro", "Falha ao carregar as instruções.", 4000);
    }
  }

  // Função para buscar e exibir as Advertências
  async function carregarAdvertencias() {
    try {
      const docRef = doc(db, "regras", "conduta");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const conteudoDiv = document.querySelector("#secao-advertencias .secao-conteudo");

        const formatarLista = (texto) => `<ul>${texto.split('•').filter(item => item.trim() !== '').map(item => `<li>${item.trim()}</li>`).join('')}</ul>`;

        conteudoDiv.innerHTML = `
          <h1>⚠️ Código de Conduta e Advertências</h1>
          <div class="advertencia-card leve">
            <h2><span class="emoji">🟢</span>Advertência Leve</h2>
            ${formatarLista(data.leve)}
          </div>
          <div class="advertencia-card media">
            <h2><span class="emoji">🟡</span>Advertência Média</h2>
            ${formatarLista(data.media)}
          </div>
          <div class="advertencia-card grave">
            <h2><span class="emoji">🔴</span>Advertência Grave</h2>
            ${formatarLista(data.grave)}
          </div>
          <div class="advertencia-card gravissima">
            <h2><span class="emoji">🟣</span>Advertência Gravíssima</h2>
            ${formatarLista(data.gravissima)}
          </div>
          <div class="advertencia-card expulsao">
            <h2><span class="emoji">⚫</span>Expulsão</h2>
            ${formatarLista(data.expulsao)}
          </div>
        `;
        document.getElementById("secao-advertencias").classList.remove("hidden");
      } else {
        mostrarPopup("❌ Erro", "Não foi possível encontrar o código de conduta.", 4000);
      }
    } catch (error) {
      console.error("Erro ao carregar advertências:", error);
      mostrarPopup("❌ Erro", "Falha ao carregar as advertências.", 4000);
    }
  }

  // Função para fechar as seções de tela cheia
  function fecharSecoes() {
    document.getElementById("secao-instrucoes").classList.add("hidden");
    document.getElementById("secao-advertencias").classList.add("hidden");
  }

  // Adicionar os ouvintes de evento aos botões
  document.getElementById("btn-instrucoes").addEventListener("click", carregarInstrucoes);
  document.getElementById("btn-advertencias").addEventListener("click", carregarAdvertencias);

  document.querySelectorAll(".botao-fechar-secao").forEach(btn => {
    btn.addEventListener("click", fecharSecoes);
  });
  
  // NOVA FUNÇÃO: Calcula quem ficou ocioso e salva no Firestore
async function calcularMembrosOciosos() {
    console.log("Calculando membros ociosos da semana...");
    const semanaPassada = getSemanaAtual(new Date(new Date().setDate(new Date().getDate() - 2))); // Pega a semana que acabou no sábado
    const inicioSemana = semanaPassada.inicio;
    const fimSemana = semanaPassada.fim;

    const inicioISO = inicioSemana.toISOString().slice(0, 10);
    const fimISO = fimSemana.toISOString().slice(0, 10);
    
    const semanaId = `semana_${semanaPassada.numero}_${semanaPassada.inicio.getFullYear()}`;
    const contagemMembros = {};

    // Inicializa a contagem para todos
    todosMembros.forEach(m => {
        // Exclui o líder geral da contagem de ociosidade
        if (m.papel !== 'lider') {
            contagemMembros[m.nome] = 0;
        }
    });

    try {
        const q = query(
            collection(db, "presencas"),
            where('__name__', '>=', inicioISO),
            where('__name__', '<=', fimISO)
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(doc => {
            const presencas = doc.data();
            for (const [nome, presente] of Object.entries(presencas)) {
                if (presente && contagemMembros[nome] !== undefined) {
                    contagemMembros[nome]++;
                }
            }
        });

        const membrosOciosos = Object.entries(contagemMembros)
            .filter(([nome, contagem]) => contagem < 4)
            .map(([nome, contagem]) => ({ nome, contagem }));

        const ociososRef = doc(db, "gerenciamentoSemanal", semanaId);
        await setDoc(ociososRef, {
            ociosos: membrosOciosos,
            processado: false // Flag para indicar que esta lista ainda não foi finalizada
        });

        console.log(`Encontrados ${membrosOciosos.length} membros ociosos. Dados salvos em ${semanaId}.`);

    } catch (error) {
        console.error("Erro ao calcular membros ociosos:", error);
    }
}

// NOVA FUNÇÃO (SUBSTITUA A ANTIGA COMPLETAMENTE)
async function carregarEExibirMembrosOciosos() {
    const secao = document.getElementById('secao-ociosos');
    // Apenas o líder pode ver esta seção.
    if (userRole !== 'lider') {
        secao.classList.add('hidden');
        return;
    }
    secao.classList.remove('hidden');

    const hoje = getHoje();
    const diaDaSemana = hoje.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
    const eDomingo = diaDaSemana === 0;

    const listaEl = document.getElementById('lista-ociosos');
    const descricaoEl = document.getElementById('ociosos-descricao');
    listaEl.innerHTML = '<div class="ociosos-placeholder">Calculando...</div>'; // Feedback inicial

    // =================================================================================
    // LÓGICA DE DOMINGO: Dia de Gerenciamento (Lógica Original Mantida)
    // No domingo, olhamos para a lista final da semana que acabou de terminar.
    // =================================================================================
    if (eDomingo) {
        // Pega a semana que acabou no sábado.
        const semanaPassadaQuery = getSemanaAtual(new Date(new Date().setDate(hoje.getDate() - 1)));
        const semanaId = `semana_${semanaPassadaQuery.numero}_${semanaPassadaQuery.inicio.getFullYear()}`;
        const ociososRef = doc(db, "gerenciamentoSemanal", semanaId);

        try {
            const docSnap = await getDoc(ociososRef);
            if (!docSnap.exists() || docSnap.data().ociosos.length === 0) {
                listaEl.innerHTML = '<div class="ociosos-placeholder">Nenhum membro ficou abaixo da meta na semana passada.</div>';
                descricaoEl.textContent = "Ações de final de semana: Nenhuma ação necessária.";
                return;
            }

            const ociosos = docSnap.data().ociosos;
            listaEl.innerHTML = ''; // Limpa a lista para adicionar os itens.
            descricaoEl.textContent = "Ações de final de semana: Justifique os membros que apresentaram um motivo válido ou expulse os que não cumpriram a meta semanal.";
            
            ociosos.forEach(membro => {
                const itemEl = document.createElement('div');
                itemEl.className = 'ocioso-item';
                itemEl.innerHTML = `
                    <div class="ocioso-nome">${membro.nome} (${membro.contagem}/4 dias)</div>
                    <div class="ocioso-botoes">
                        <button class="ocioso-btn justificar" onclick="justificarMembro('${membro.nome}', '${semanaId}')">Justificar</button>
                        <button class="ocioso-btn expulsar" onclick="confirmarExpulsao('${membro.nome}')">Expulsar</button>
                    </div>
                `;
                listaEl.appendChild(itemEl);
            });

        } catch (error) {
            console.error("Erro ao carregar lista de ociosos de domingo:", error);
            listaEl.innerHTML = '<div class="ociosos-placeholder">Erro ao carregar a lista.</div>';
        }

    // =================================================================================
    // LÓGICA DE SEGUNDA A SÁBADO: Análise Preditiva (Nova Lógica Inteligente)
    // Durante a semana, calculamos em tempo real quem não pode mais atingir a meta.
    // =================================================================================
    } else {
        const semanaAtual = getSemanaAtual();
        const inicioSemanaISO = formatarDataISO(semanaAtual.inicio);
        const hojeISO = getHojeISO();
        
        // Quantos dias ainda restam na competição (Seg=6, Ter=5, ..., Sáb=1)
        const diasRestantes = 7 - diaDaSemana;
        
        descricaoEl.textContent = `Análise em tempo real: A lista abaixo mostra os membros que matematicamente não podem mais atingir a meta de 4 dias de foco nesta semana.`;
        
        try {
            // 1. Busca todas as presenças da semana atual.
            const q = query(
                collection(db, "presencas"),
                where('__name__', '>=', inicioSemanaISO),
                where('__name__', '<=', hojeISO)
            );
            const querySnapshot = await getDocs(q);

            // 2. Conta os focos de cada membro.
            const contagem = {};
            todosMembros.forEach(m => {
                if (m.papel !== 'lider') { // Líder geral não entra na contagem.
                    contagem[m.nome] = 0;
                }
            });

            querySnapshot.forEach(doc => {
                const presencasDoDia = doc.data();
                for (const nome in presencasDoDia) {
                    if (presencasDoDia[nome] && contagem[nome] !== undefined) {
                        contagem[nome]++;
                    }
                }
            });

            // 3. Filtra usando a nova lógica inteligente.
            const membrosMatematicamenteOciosos = Object.keys(contagem)
                .filter(nome => {
                    const focosAtuais = contagem[nome] || 0;
                    const focosNecessarios = 4 - focosAtuais;
                    // A condição principal: se os focos que ele precisa é MAIOR que os dias que ainda restam.
                    return focosNecessarios > diasRestantes;
                })
                .map(nome => ({ nome: nome, contagem: contagem[nome] }));

            // 4. Exibe o resultado.
            if (membrosMatematicamenteOciosos.length === 0) {
                listaEl.innerHTML = '<div class="ociosos-placeholder">Até o momento, todos os membros ainda podem atingir a meta.</div>';
            } else {
                listaEl.innerHTML = ''; // Limpa a lista.
                membrosMatematicamenteOciosos.forEach(membro => {
                    const itemEl = document.createElement('div');
                    itemEl.className = 'ocioso-item';
                    // Mostra apenas a informação, sem botões de ação.
                    itemEl.innerHTML = `<div class="ocioso-nome">${membro.nome} (${membro.contagem}/4 dias)</div>`;
                    listaEl.appendChild(itemEl);
                });
            }

        } catch (error) {
            console.error("Erro ao calcular ociosos em tempo real:", error);
            listaEl.innerHTML = '<div class="ociosos-placeholder">Erro ao calcular a lista.</div>';
        }
    }
}

// NOVA FUNÇÃO: Remove um membro da lista de ociosos (ação de justificar)
async function justificarMembro(nome, semanaId) {
    if (!confirm(`Tem certeza que deseja justificar e remover '${nome}' da lista de ociosos desta semana?`)) return;

    const ociososRef = doc(db, "gerenciamentoSemanal", semanaId);
    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(ociososRef);
            if (!docSnap.exists()) return;

            const dadosAtuais = docSnap.data().ociosos;
            const novosDados = dadosAtuais.filter(m => m.nome !== nome);
            transaction.update(ociososRef, { ociosos: novosDados });
        });
        mostrarPopup("✅ Sucesso", `${nome} foi justificado e removido da lista.`, 4000);
        await carregarEExibirMembrosOciosos(); // Atualiza a lista na tela
    } catch (error) {
        console.error("Erro ao justificar membro:", error);
        mostrarPopup("❌ Erro", "Não foi possível processar a justiticativa.", 4000);
    }
}

// NOVA FUNÇÃO: Abre o modal de confirmação para expulsão
function confirmarExpulsao(nome) {
    membroParaExpulsar = nome;
    document.getElementById('member-to-expel-name').innerText = nome;
    document.getElementById('confirm-expel-button').onclick = executarExpulsao;
    openModal('confirm-expel-modal');
}

// NOVA FUNÇÃO: Executa a expulsão do membro
async function executarExpulsao() {
    if (!membroParaExpulsar) return;

    const nome = membroParaExpulsar;
    console.log(`Iniciando processo de expulsão para: ${nome}`);

    try {
        // Deletar o membro da coleção principal 'membros'
        await deleteDoc(doc(db, "membros", nome));
		
		// NOVA LINHA: Registra o evento de expulsão de membro
await adicionarEventoAoFeed(
    'geral',
    '🚶‍♂️ Despedida no Grupo',
    `O membro <strong>${nome}</strong> não faz mais parte do nosso grupo. Desejamos sucesso em sua jornada!`,
    { nomeMembro: nome }
);

        // BÔNUS: Limpar dados de outras coleções (opcional, mas recomendado)
        // Você pode adicionar aqui a lógica para remover o membro de `presencas`, `streak`, etc. se desejar uma limpeza completa.
        // Por simplicidade, focaremos na remoção principal.

        mostrarPopup("🗑️ Membro Expulso", `${nome} foi removido permanentemente do sistema.`, 5000);
        
        // Limpa a variável global e fecha o modal
        membroParaExpulsar = null;
        closeModal('confirm-expel-modal');

        // Atualiza toda a interface para refletir a remoção
        await refreshAppUI();

    } catch (error) {
        console.error(`Erro ao expulsar ${nome}:`, error);
        mostrarPopup("❌ Falha Grave", `Ocorreu um erro ao tentar expulsar ${nome}.`, 5000);
    }
}

// COLE ESTA NOVA FUNÇÃO NO SEU SCRIPT

function atualizarPodioEquipes() {
  // 1. Coleta os dados das equipes em um array
  const equipesArray = [
    { id: 'abelha', vitorias: rankingGeral.abelha, elemento: document.getElementById('podio-abelha') },
    { id: 'joaninha', vitorias: rankingGeral.joaninha, elemento: document.getElementById('podio-joaninha') },
    { id: 'vagalume', vitorias: rankingGeral.vagalume, elemento: document.getElementById('podio-vagalume') }
  ];

  // 2. Ordena as equipes por vitórias, da maior para a menor
  equipesArray.sort((a, b) => b.vitorias - a.vitorias);

  // 3. Limpa classes de pódio anteriores para garantir uma atualização limpa
  equipesArray.forEach(equipe => {
    if (equipe.elemento) {
      equipe.elemento.classList.remove('podium-1', 'podium-2', 'podium-3');
    }
  });

  // 4. Determina e aplica as classes do pódio, tratando empates
  let rank = 1;
  for (let i = 0; i < equipesArray.length; i++) {
    // Se não for a primeira equipe, verifica se a pontuação é menor que a anterior para definir o próximo rank
    if (i > 0 && equipesArray[i].vitorias < equipesArray[i - 1].vitorias) {
      rank = i + 1;
    }
    
    // Aplica a classe correspondente ao rank
    if (equipesArray[i].elemento) {
      equipesArray[i].elemento.classList.add(`podium-${rank}`);
    }
  }
}
