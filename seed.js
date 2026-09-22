/* Cronograma e conteúdo padrão. Importado pelo administrador em Configurações → "Importar cronograma padrão".
   Cada tarefa tem: id estável, data (k), frente (f), papel responsável (owner_role) e dependências (deps). */
window.PPV_SEED = (function () {
  const CONTENT_V = 6;
  const pad = n => String(n).padStart(2, "0");
  const K = (m, d) => `2026-${pad(m)}-${pad(d)}`;
  const addDays = (k, n) => { const [y, m, d] = k.split("-").map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; };
  const ROLE_OF = { cont: "expert", traf: "gestor_trafego", copy: "copywriter", wa: "operacao", tech: "gestor_projetos", ev: "gestor_projetos" };

  const tasks = [];
  const add = (id, k, f, t, s, r, deps, owner_role) => tasks.push({ id, k, f, t, s: s || "", r: r || "", depends_on: deps || [], owner_role: owner_role || ROLE_OF[f] });

  /* ---------- PREPARAÇÃO 28/09 → 04/10 ---------- */
  add("p-nome", K(9, 28), "ev", "Bater o nome definitivo da imersão", "Provisório: Família Forte — O Começo. Validar junto à promessa e à identidade visual antes de gravar qualquer peça.", "Nome simples, humano, familiar, ligado à ideia de construção.");
  add("p-lotes", K(9, 28), "ev", "Definir os 3 lotes do ingresso", "Lote 1 = R$ 27,90. Preço e data de virada dos lotes 2 e 3 — registrar em Decisões.", "Sugestão: virar lote junto com a virada de ato (15/10 e 26/10).");
  add("p-funil", K(9, 28), "cont", "Mapear o funil de conteúdo da Paula (topo → meio → fundo)", "Ela já produz vídeos virais: definir formatos de topo, meio e fundo. Registrar na aba Funil.", "Cada peça responde: em qual ato estamos e qual conclusão a mãe precisa ter.", [], "gestor_projetos");
  add("p-avatar", K(9, 28), "tech", "Preencher Raio X + Nicho, Avatar e Roma", "Avatar: mãe cristã, casada, 30–45, filhos de 2 a 10, trabalha fora. Roma DSA: 'uma família com direção'.", "");
  add("p-oferta-ing", K(9, 29), "ev", "Fechar a oferta do ingresso", "Nome, o que os 2 dias entregam, bônus de quem compra no Lote 1, garantia.", "A imersão não é 'curso de birra' nem palestra longa.", ["p-nome", "p-lotes"]);
  add("p-oferta-ff", K(9, 29), "ev", "Fechar a oferta do Família Forte 2.0", "Preço vitalício da Black Friday antecipada, entregáveis, bônus, garantia, prazo do carrinho.", "A narrativa não pode depender do desconto.");
  add("p-copy-pagina", K(9, 29), "copy", "Copy da página de vendas do ingresso + página de obrigado", "Linguagem da mãe (zero técnica). Preço do lote atual, próximo lote anunciado. Obrigado: 'você vai receber uma mensagem no WhatsApp agora'.", "", ["p-oferta-ing"]);
  add("p-pagina", K(9, 30), "tech", "Publicar página de vendas do ingresso + checkout + página de obrigado", "Montar com a copy aprovada. Sem link de grupo.", "Aqui a conversão é COMPRA, não lead.", ["p-copy-pagina"]);
  add("p-api-conta", K(9, 29), "wa", "Conta WhatsApp Business API oficial pronta", "Número dedicado, verificação Meta, nome 'Família Forte', foto e descrição. Escolher provedor (BSP).", "Sem grupos e sem Joinzap: mensagens 1:1 pela API.");
  add("p-copy-wa", K(9, 29), "copy", "Copies dos templates de aquecimento (WhatsApp)", "Boas-vindas + pesquisa, guarde a data, faltam 7/4/1 dias, instruções, nutrição por ato.", "");
  add("p-api-templates", K(9, 30), "wa", "Enviar templates de aquecimento para aprovação da Meta", "Cadastrar os templates aprovados pela copy.", "Aprovação leva de horas a 48h; aprovados até 03/10.", ["p-api-conta", "p-copy-wa"]);
  add("p-api-integra", K(10, 1), "wa", "Integrar checkout → disparo automático", "Webhook 'compra aprovada' dispara boas-vindas na hora. Testar com compra real e estornar.", "", ["p-pagina", "p-api-conta"]);
  add("p-pixel", K(10, 1), "tech", "Pixel + evento de compra nas páginas", "Pixel Meta em todas as páginas; Purchase na página de obrigado; domínio verificado; tag do Google.", "", ["p-pagina"]);
  add("p-copy-email", K(10, 1), "copy", "Sequência de e-mail pós-compra + pesquisa de avatar", "1) Obrigado + pesquisa (imediato) · 2) Salve o número da Paula (D+1) · 3) Guarde a data (D+3). Pesquisa: idade dos filhos, maior incêndio do dia, o que já tentou, o marido concorda?", "");
  add("p-email-config", K(10, 2), "tech", "Programar a sequência de e-mail no e-mail marketing", "", "", ["p-copy-email", "p-pagina"]);
  add("p-copy-criativos", K(9, 30), "copy", "Copies dos 10 criativos de VENDA DE INGRESSO", "Chamada para evento pago: 'dois dias para parar de resolver cada problema separado'. Base: os virais da Paula que mais performaram.", "Nada de culpabilizar a mãe ou vilanizar a criança.", ["p-oferta-ing"]);
  add("p-gravar-criativos", K(10, 1), "cont", "Gravar os vídeos dos 10 criativos de venda", "Seguindo as copies aprovadas.", "", ["p-copy-criativos"]);
  add("p-plan-trafego", K(10, 1), "traf", "Planejamento de investimento", "Meta de ingressos, CPA-alvo por lote, orçamento diário.", "Campanha de CONVERSÃO otimizada para Purchase.", ["p-lotes"]);
  add("p-campanhas", K(10, 2), "traf", "Montar campanhas de captação (compra) para 05/10", "Públicos: interesses do avatar, Envolvimento 60D, VV 25%/95% dos virais, Lookalike 1%, remarketing da página. 5 anúncios iniciais.", "Criar 2 dias antes: aprovação leva até 48h.", ["p-gravar-criativos", "p-pixel", "p-plan-trafego"]);
  add("p-rmk-ingresso", K(10, 2), "traf", "Remarketing de carrinho abandonado do ingresso", "Visitou checkout e não comprou. Roda até 06/11.", "", ["p-pixel"]);
  add("p-lives-plan", K(10, 2), "cont", "Programar as lives do Ato 1", "Dias, horários e temas (as 6 perguntas-espelho). Registrar em Funil → Programação de lives.", "", [], "gestor_projetos");
  add("p-virais-plan", K(10, 2), "cont", "Planejar os vídeos virais do Ato 1 (topo)", "Temas de reconhecimento no formato que já funciona para ela. Cada viral aponta para a imersão.", "", ["p-funil"], "gestor_projetos");
  add("p-teste", K(10, 4), "tech", "Checklist final de virada", "Teste ponta a ponta: anúncio → página → checkout → obrigado → WhatsApp em <1 min → e-mail.", "Se qualquer elo falhar, a captação NÃO abre dia 05/10.", ["p-api-integra", "p-email-config", "p-campanhas"]);

  /* ---------- ROTINAS SEMANAIS ---------- */
  const weeks = [[K(10, 5), "ato1"], [K(10, 12), "ato2"], [K(10, 19), "ato2"], [K(10, 26), "ato3"], [K(11, 2), "ato3"]];
  const ACT = { ato1: "Ato 1 · reconhecimento: dar nome ao que a mãe vive. Não entregar a solução completa.", ato2: "Ato 2 · mudar a interpretação: amor e limite não são opostos; autoridade ≠ grito; info solta ≠ direção.", ato3: "Ato 3 · possibilidade: histórias reais, antes/depois, demonstrações. 'Isso cabe na minha vida.'" };
  const LIVE = { ato1: "Cena real da casa: tablet, ordem repetida, culpa, casal discorda, apagar incêndio.", ato2: "Padrões: 'não é falta de amor'; por que dica solta não vira rotina.", ato3: "Prova e demonstração prática; convite direto para a imersão." };
  weeks.forEach(([mon, ph], i) => {
    const w = "w" + (i + 1), prevFri = addDays(mon, -3);
    const mix = mon === "2026-10-12" ? " (segunda a quarta ainda Ato 1; virada para o Ato 2 na quinta 15/10)" : "";
    add(`${w}-copy`, prevFri, "copy", `Semana ${i + 1}: roteiros e copies (virais, lives, e-mail, WhatsApp)`, ACT[ph] + mix, "A copy da semana precisa estar pronta na sexta anterior — sem ela a expert não grava e o tráfego não distribui.", i === 0 ? ["p-virais-plan"] : [`w${i}-copy`]);
    add(`${w}-virais`, mon, "cont", `Semana ${i + 1}: gravar e publicar os vídeos virais (topo)`, "Virais da semana alinhados ao ato; CTA para a imersão.", "Topo: descoberta e identificação.", [`${w}-copy`]);
    add(`${w}-cortes`, mon, "cont", `Semana ${i + 1}: cortes das lives e conteúdo de meio de funil`, "Cortes da live anterior, carrosséis/stories; CTA para a página do ingresso.", "Meio: aprofundar consciência.", i === 0 ? [] : [`w${i}-live2`]);
    if (i > 0) add(`${w}-distrib`, mon, "traf", `Semana ${i + 1}: distribuição paga do conteúdo da semana anterior`, "Campanha de visualização com os virais e cortes da semana passada. Duplicar, trocar vídeos, ajustar data.", "", [`w${i}-virais`]);
    add(`${w}-orc`, mon, "traf", `Semana ${i + 1}: otimizar orçamento da captação (seg a qui)`, "Novo orçamento diário = compras de ontem × CPA ideal. Registrar no Planilhamento.", "");
    add(`${w}-criat`, addDays(mon, 2), "traf", `Semana ${i + 1}: otimizar criativos (segunda e quarta)`, "Pausar anúncios com CPA acima do alvo; subir novos.", "");
    add(`${w}-pub`, addDays(mon, 3), "traf", `Semana ${i + 1}: otimizar públicos (quinta)`, "Pausar públicos acima do CPA-alvo; adicionar novos.", "");
    add(`${w}-live1`, addDays(mon, 1), "cont", `Semana ${i + 1}: Live 1 (ver Programação de lives)`, LIVE[ph], "Mín. 30 min. Postar o link como evidência.", [`${w}-copy`]);
    add(`${w}-live2`, addDays(mon, 3), "cont", `Semana ${i + 1}: Live 2 (ver Programação de lives)`, "", "Mín. 30 min.", [`${w}-copy`]);
    add(`${w}-wa`, addDays(mon, 1), "wa", `Semana ${i + 1}: mensagem de nutrição para compradoras (API)`, "Template aprovado. Uma cena + uma pergunta + lembrete leve da data.", "WhatsApp aproxima, lembra e conduz.", [`${w}-copy`]);
    add(`${w}-email`, addDays(mon, 3), "tech", `Semana ${i + 1}: disparar o e-mail da narrativa`, "Segmentar compradoras × não compradoras (convite + lote atual).", "", [`${w}-copy`]);
    add(`${w}-reuniao`, addDays(mon, 4), "ev", `Semana ${i + 1}: reunião de ato — coerência dos canais e vendas × meta`, "Instagram, lives, e-mail e WhatsApp contam o MESMO filme? Ajustes para a próxima semana.", "Se a peça não responde 'qual conclusão a mãe precisa ter', ela não entra.");
  });

  /* ---------- MARCOS ---------- */
  add("m-captacao", K(10, 5), "traf", "Ativar captação (venda de ingresso) — Lote 1", "Campanhas ativas, pixel disparando Purchase, orçamento conforme planejamento.", "CAPTAÇÃO COMEÇA HOJE.", ["p-teste"]);
  add("m-api-ok", K(10, 5), "wa", "Confirmar templates aprovados e disparo automático funcionando", "Primeira compra do dia = primeira boas-vindas.", "", ["p-api-templates", "p-api-integra"]);
  add("m-provas", K(10, 12), "ev", "Coletar provas sociais para o Ato 3", "Depoimentos de alunas do FF 1.0, prints, antes/depois de rotina. Pedir autorização.", "");
  add("m-lote2-aviso", K(10, 12), "wa", "Comunicar virada de lote (faltam 3 dias) — WhatsApp, e-mail, stories", "Não compradoras com contato.", "", ["p-lotes"]);
  add("m-lote1-fim", K(10, 14), "wa", "Último dia do Lote 1 — 'últimas horas'", "Disparo + story de contagem.", "");
  add("m-copy-ato2", K(10, 13), "copy", "Copies dos criativos do Ato 2", "Mensagem de quebra de crença + preço do Lote 2.", "");
  add("m-gravar-ato2", K(10, 14), "cont", "Gravar criativos do Ato 2", "", "", ["m-copy-ato2"]);
  add("m-lote2-checkout", K(10, 15), "tech", "Virar checkout para o Lote 2", "Atualizar preço na página, checkout e criativos. Testar compra.", "", ["p-lotes"]);
  add("m-trocar-ato2", K(10, 15), "traf", "Trocar criativos para o Ato 2", "5 novos anúncios.", "", ["m-gravar-ato2", "m-lote2-checkout"]);
  add("m-roteiro-d1", K(10, 19), "copy", "Roteiro da Imersão — Dia 1", "Reconhecer → entender → descobrir. Arquétipo Jeito Errado / Jeito Certo.", "", ["p-oferta-ff"]);
  add("m-roteiro-d2", K(10, 20), "copy", "Roteiro da Imersão — Dia 2", "Aplicar → método e continuidade → oferta do FF 2.0 como consequência lógica.", "", ["m-roteiro-d1"]);
  add("m-pitch", K(10, 21), "copy", "Roteiro da oferta (pitch) do FF 2.0", "Transformação, entregáveis, bônus, garantia, condição vitalícia, prazo. Desmontar as 7 objeções antes do preço.", "", ["m-roteiro-d2"]);
  add("m-roteiro-ok", K(10, 22), "cont", "Expert valida os roteiros dos dois dias e do pitch", "Ajustes finais com a Paula.", "", ["m-pitch"]);
  add("m-emails-lanc", K(10, 22), "copy", "E-mails de lançamento do FF 2.0 (8 peças)", "Inscrições abertas (3 no dia 1), Estamos vivos, Atendendo a pedidos, Encerramento, Encerram hoje, Últimas horas.", "", ["m-pitch"]);
  add("m-copy-evento-wa", K(10, 22), "copy", "Copies dos templates de EVENTO e OFERTA (WhatsApp)", "Começa em 1h · ao vivo · replay · oferta aberta · vagas/bônus · encerra hoje · últimas horas · boleto · recusada.", "", ["m-pitch"]);
  add("m-templates-evento", K(10, 23), "wa", "Enviar templates de EVENTO e OFERTA para aprovação", "", "Aprovados até 30/10.", ["m-copy-evento-wa"]);
  add("m-lote3-aviso", K(10, 23), "wa", "Comunicar virada para o Lote 3 (faltam 3 dias)", "", "");
  add("m-copy-ato3", K(10, 22), "copy", "Copies dos criativos do Ato 3", "Provas, depoimentos, 'faltam 12 dias'.", "", ["m-provas"]);
  add("m-gravar-ato3", K(10, 23), "cont", "Gravar criativos do Ato 3", "", "", ["m-copy-ato3"]);
  add("m-lote2-fim", K(10, 25), "wa", "Último dia do Lote 2 — 'últimas horas'", "", "");
  add("m-lote3-checkout", K(10, 26), "tech", "Virar checkout para o Lote 3", "", "");
  add("m-trocar-ato3", K(10, 26), "traf", "Trocar criativos para o Ato 3", "", "", ["m-gravar-ato3", "m-lote3-checkout"]);
  add("m-copy-ff", K(10, 26), "copy", "Copy da página de vendas do Família Forte 2.0", "Oferta vitalícia.", "", ["m-pitch"]);
  add("m-pagina-ff", K(10, 27), "tech", "Página de vendas + checkout do Família Forte 2.0", "Página escondida até 08/11. Evento Purchase separado.", "", ["m-copy-ff"]);
  add("m-copy-recup", K(10, 27), "copy", "Copies de recuperação de vendas (e-mail e WhatsApp)", "Carrinho abandonado #1/#2, compra cancelada, boleto #1/#2.", "");
  add("m-recup-config", K(10, 28), "tech", "Programar automações de recuperação de vendas", "", "", ["m-copy-recup", "m-pagina-ff"]);
  add("m-copy-rmk", K(10, 28), "copy", "Copies de remarketing (7 lembrete · 4 ao vivo · 7 carrinho aberto)", "", "");
  add("m-gravar-rmk", K(10, 29), "cont", "Gravar criativos de remarketing", "", "", ["m-copy-rmk"]);
  add("m-templates-ok", K(10, 30), "wa", "Confirmar aprovação de todos os templates do evento", "Ter mensagem alternativa pronta.", "", ["m-templates-evento"]);
  add("m-rmk-lembrete", K(10, 30), "traf", "Montar remarketing 'Faltam X dias' e 'Estamos ao vivo'", "Alcance para compradoras + tráfego para não compradoras (última chamada).", "", ["m-gravar-rmk"]);
  add("m-e7", K(10, 31), "tech", "E-mail 'Faltam 7 dias'", "Compradoras: agenda. Não compradoras: Lote 3 + escassez real.", "");
  add("m-w7", K(10, 31), "wa", "WhatsApp 'Faltam 7 dias'", "", "");
  add("m-plataforma", K(11, 2), "ev", "Definir plataforma e fluxo de acesso do evento", "Onde a mãe assiste, link único por compradora?, replay, suporte ao vivo.", "");
  add("m-e4", K(11, 3), "tech", "E-mail 'Faltam 4 dias'", "", "");
  add("m-w4", K(11, 3), "wa", "WhatsApp 'Faltam 4 dias'", "", "");
  add("m-rmk-ff", K(11, 4), "traf", "Montar remarketing de carrinho do FF 2.0 (para 08/11)", "Viu a imersão, visitou página de vendas, compradoras do ingresso, lista total.", "", ["m-gravar-rmk", "m-pagina-ff"]);
  add("m-ensaio", K(11, 5), "ev", "Ensaio técnico da transmissão", "Áudio, luz, slides, link, chat, plano B. Simular a virada para a oferta.", "", ["m-plataforma", "m-roteiro-ok"]);
  add("m-guerra", K(11, 5), "ev", "Reunião de guerra: papéis dos 2 dias", "Quem apresenta, modera chat, responde WhatsApp, monitora checkout, posta stories.", "");
  add("m-e1", K(11, 6), "tech", "E-mail 'É amanhã' + instruções de acesso", "", "", ["m-plataforma"]);
  add("m-w1", K(11, 6), "wa", "WhatsApp 'É amanhã' + instruções", "Duas chamadas: manhã e noite.", "", ["m-plataforma", "m-templates-ok"]);
  add("m-ultima", K(11, 6), "traf", "Última chamada de ingresso (encerra hoje)", "Pausar captação à meia-noite. Manter lembrete ativo.", "");
  add("m-fechar-ing", K(11, 6), "tech", "Fechar vendas do ingresso e travar checkout", "", "");
  add("e1-w1h", K(11, 7), "wa", "WhatsApp 'Começa em 1h'", "", "");
  add("e1-dia1", K(11, 7), "cont", "IMERSÃO — Dia 1 ao vivo", "Reconhecer → entender → descobrir. Gancho para o Dia 2.", "Não é palestra longa.", ["m-ensaio"]);
  add("e1-wlive", K(11, 7), "wa", "WhatsApp 'Estamos ao vivo' + 'Replay do Dia 1'", "", "");
  add("e1-email", K(11, 7), "tech", "E-mail 'Como foi o Dia 1 + amanhã tem mais'", "", "");
  add("e1-rmk", K(11, 7), "traf", "Remarketing 'Estamos ao vivo' ativo", "", "", ["m-rmk-lembrete"]);
  add("e2-w1h", K(11, 8), "wa", "WhatsApp 'Começa em 1h' (Dia 2)", "", "");
  add("e2-dia2", K(11, 8), "cont", "IMERSÃO — Dia 2 ao vivo + abertura da oferta", "Aplicar → método → Família Forte 2.0 vitalício abre AO VIVO.", "Bônus de quem decide ao vivo.", ["e1-dia1"]);
  add("e2-checkout", K(11, 8), "tech", "Publicar página de vendas + liberar checkout do FF 2.0 no pitch", "", "", ["m-pagina-ff"]);
  add("e2-woferta", K(11, 8), "wa", "WhatsApp 'Oferta aberta' (2 chamadas) + 'Vagas com bônus e garantia'", "", "", ["e2-checkout"]);
  add("e2-emails", K(11, 8), "tech", "E-mails Dia 1 do carrinho: Inscrições abertas · Cuidado, pode perder sua vaga · Últimas horas do bônus", "", "", ["m-emails-lanc", "e2-checkout"]);
  add("e2-rmk", K(11, 8), "traf", "Ativar remarketing de carrinho do FF 2.0", "", "", ["m-rmk-ff", "e2-checkout"]);
  [[9, "Estamos vivos… (Dia 2 #1)"], [10, "Atendendo a pedidos (Dia 3 #1)"], [11, "Encerramento das inscrições (Dia 4 #1)"], [12, "As matrículas encerram hoje (#1) + Últimas horas (#2)"]].forEach(([d, t]) => {
    add(`c${d}-email`, K(11, d), "tech", "E-mail: " + t, "", "", ["m-emails-lanc"]);
    add(`c${d}-wa`, K(11, d), "wa", "WhatsApp: " + t, "", "", ["m-templates-ok"]);
    add(`c${d}-rmk`, K(11, d), "traf", "Otimizar remarketing de carrinho (diário)", "Priorizar os públicos mais quentes (assistiu o Dia 2).", "");
    add(`c${d}-recup`, K(11, d), "wa", "Recuperação manual: boleto emitido + compra recusada", "Preencher Planilha de Recuperação com status.", "", ["m-recup-config"]);
    add(`c${d}-vendas`, K(11, d), "ev", "Monitorar vendas × meta e responder objeções", "", "");
  });
  add("c9-virais", K(11, 9), "cont", "Virais e cortes com os melhores momentos da imersão", "", "");
  add("c12-fechar", K(11, 12), "tech", "Fechar carrinho à meia-noite", "Trocar página por lista de espera.", "");
  add("f-debrief", K(11, 13), "ev", "Debriefão do lançamento", "Números por lote, CPA, conversão ingresso→FF 2.0, o que cada canal entregou.", "");
  add("f-api", K(11, 13), "wa", "Exportar histórico da API e manter base segmentada", "Compradoras × alunas FF 2.0 × não compradoras.", "");
  add("f-traf", K(11, 13), "traf", "Pausar campanhas e arquivar relatórios", "", "");

  tasks.forEach(t => { if (t.k < "2026-09-28") t.k = "2026-09-28"; });

  /* ---------- LIVES ---------- */
  const PH = [["ato1", "2026-10-05", "2026-10-14"], ["ato2", "2026-10-15", "2026-10-25"], ["ato3", "2026-10-26", "2026-11-06"]];
  const temas = { ato1: ["Você tira o tablet e seu filho vira outra criança?", "Quantas vezes você precisa pedir a mesma coisa?", "Você promete mais paciência e termina o dia culpada?", "Seu marido corrige de um jeito e você de outro?"], ato2: ["Nem todo comportamento é 'fase'", "Amor e limite não são opostos", "Autoridade não é grito; rotina não é quartel", "Resolver a birra sem olhar o todo só desloca o problema"], ato3: ["Caso real: a rotina que mudou em 3 semanas", "Antes e depois: a casa no modo sobrevivência", "Demonstração: o que muda em dois dias", "Última live: o que você vai sair sabendo na imersão"] };
  const lives = []; const used = { ato1: 0, ato2: 0, ato3: 0 };
  weeks.forEach(([mon]) => [1, 3].forEach(off => { const d = addDays(mon, off); const ph = (PH.find(p => d >= p[1] && d <= p[2]) || [])[0]; if (!temas[ph]) return; lives.push({ d, h: "20h", tema: temas[ph][used[ph]++ % 4], ato: ph, cta: "Ingresso da imersão — lote atual" }); }));

  const content = {
    v: CONTENT_V,
    marks: { [K(9, 28)]: "Início da preparação", [K(10, 5)]: "Abre a narrativa · Lote 1 (R$ 27,90) · captação começa", [K(10, 15)]: "Virada para o Ato 2 · Lote 2", [K(10, 26)]: "Virada para o Ato 3 · Lote 3", [K(10, 31)]: "Faltam 7 dias", [K(11, 3)]: "Faltam 4 dias", [K(11, 6)]: "É amanhã · instruções de acesso", [K(11, 7)]: "IMERSÃO — Dia 1", [K(11, 8)]: "IMERSÃO — Dia 2 · oferta FF 2.0 abre ao vivo", [K(11, 12)]: "Carrinho FF 2.0 fecha (proposta)", [K(11, 13)]: "Fechamento e debrief" },
    lives,
    funil: {
      topo: [["Vídeos virais (Reels/TikTok/Shorts)", "Cenas de reconhecimento na linguagem da casa; formato que a Paula já domina", "Descoberta e identificação · alimentar públicos de VV 25%/95%", "Alcance, views, seguidores, custo por view"], ["Distribuição paga dos virais", "Campanha de visualização toda segunda com os virais da semana anterior", "Aquecer público frio barato", "CPV, % de retenção"], ["Criativos de venda do ingresso (público frio)", "Virais que mais performaram + CTA 'dois dias'", "Primeira compra de R$ 27,90", "CPA por lote"]],
      meio: [["Lives (2 por semana)", "Aprofundam consciência e autoridade; tema segue o ato", "Levar de 'reconheço' para 'talvez eu esteja resolvendo errado'", "Espectadores, tempo médio, comentários"], ["Cortes das lives + carrosséis + stories", "Meio de funil orgânico com CTA para a página do ingresso", "Nutrir quem viu o viral e não comprou", "Cliques no link, saves"], ["E-mail semanal + WhatsApp (API)", "E-mail argumenta; WhatsApp aproxima e lembra", "Manter a compradora aquecida e converter a não compradora", "Abertura, resposta, compras por disparo"], ["Remarketing de carrinho do ingresso", "Visitou checkout e não comprou", "Recuperar compra", "CPA do remarketing"]],
      fundo: [["Página de vendas do ingresso + lotes", "Escassez real por lote acompanhando os atos", "Compra do ingresso", "Conversão da página, compras/dia"], ["Provas sociais (Ato 3)", "Depoimentos, antes/depois, casos reais", "'Isso cabe na minha vida'", "Compras no Lote 3"], ["Imersão 07 e 08/11", "Organiza tudo; Dia 2 abre a oferta ao vivo", "Decisão: 'preciso aprender a conduzir agora'", "Comparecimento, permanência no pitch"], ["Oferta FF 2.0 + remarketing + recuperação", "Vitalício, BF antecipada, bônus ao vivo, carrinho 08→12/11", "Venda do Família Forte 2.0", "Conversão ingresso→FF 2.0, faturamento"]]
    },
    wa: [["Compra aprovada", "imediato", "Boas-vindas + pesquisa", "Convite para a data + link da pesquisa. Pede para salvar o contato.", "utility"], ["Compra +1 dia", "D+1 · 9h", "Guarde a data", "Agenda dos dois dias e o que preparar.", "utility"], ["Terças (semanal, a partir de 06/10)", "9h", "Nutrição do ato", "Uma cena + uma pergunta. Um template por ato.", "marketing"], ["12/10 · 23/10", "10h", "Virada de lote (não compradoras com contato)", "'Até domingo o ingresso está em R$ X.'", "marketing"], ["31/10", "10h", "Faltam 7 dias", "Agenda + convite para chamar o marido.", "marketing"], ["03/11", "10h", "Faltam 4 dias", "O que a mãe vai sair sabendo.", "marketing"], ["06/11", "9h e 19h", "É amanhã + instruções", "Link, horário, acesso, suporte.", "utility"], ["07/11", "1h antes", "Começa em 1h", "", "utility"], ["07/11", "na abertura", "Estamos ao vivo", "Link direto.", "utility"], ["07/11", "noite", "Replay do Dia 1 + gancho do Dia 2", "", "utility"], ["08/11", "1h antes · abertura", "Começa em 1h · Estamos ao vivo", "", "utility"], ["08/11", "no pitch · +3h", "Oferta aberta (chamada 1 e 2)", "Condição vitalícia + bônus de quem decide ao vivo.", "marketing"], ["08/11", "noite", "Vagas com bônus e garantia", "", "marketing"], ["09/11", "10h", "Estamos vivos…", "Respostas às dúvidas do chat.", "marketing"], ["10/11", "10h", "Atendendo a pedidos", "", "marketing"], ["11/11", "10h", "Encerramento das inscrições", "", "marketing"], ["12/11", "9h · 18h · 22h", "As matrículas encerram hoje · Últimas horas", "", "marketing"], ["09→12/11", "manual, diário", "Recuperação: boleto emitido · compra recusada", "1:1 pela API, script da pasta 7.", "utility"]],
    waRules: [["Templates enviados até 30/09 (aquecimento) e 23/10 (evento e oferta); aprovação pode levar 48h.", "Guardar um template alternativo genérico para emergências."], ["Janela de 24h: quando a mãe responde, a equipe conversa livremente por 24h sem template.", "Aproveitar respostas à pesquisa para relacionamento 1:1."], ["Nunca mais de 1 mensagem de marketing por dia por contato, exceto Dia 1 do carrinho e último dia.", "Número bloqueado = régua inteira parada."], ["Segmentar sempre: compradoras × não compradoras com contato × alunas FF 2.0 (parar a régua de venda na compra).", ""]],
    em: [["Compra aprovada", "Obrigado + pesquisa de avatar", "Sequência automática · passo 1"], ["D+1", "Salve o número da Paula no WhatsApp", "Sequência automática · passo 2"], ["D+3", "Guarde a data: 07 e 08/11", "Sequência automática · passo 3"], ["Quintas", "E-mail da narrativa (Ato 1 / 2 / 3)", "Segmentar compradoras × não compradoras"], ["12/10 · 23/10", "Virada de lote em 3 dias", "Não compradoras"], ["14/10 · 25/10 · 06/11", "Últimas horas do lote / do ingresso", "Não compradoras"], ["31/10", "Faltam 7 dias", ""], ["03/11", "Faltam 4 dias", ""], ["06/11", "É amanhã + instruções de acesso", ""], ["07/11", "Como foi o Dia 1 + amanhã tem mais", "Replay"], ["08/11", "Inscrições abertas · Cuidado, pode perder sua vaga · Últimas horas do bônus ao vivo", "Dia 1 do carrinho — 3 e-mails"], ["09/11", "Estamos vivos…", "Dia 2 #1"], ["10/11", "Atendendo a pedidos", "Dia 3 #1"], ["11/11", "Encerramento das inscrições", "Dia 4 #1"], ["12/11", "As matrículas encerram hoje · Últimas horas", "Dia 5 #1 e #2"], ["Automação", "Carrinho abandonado #1 e #2 · Compra cancelada · Boleto #1 e #2", "Recuperação — ingresso e FF 2.0"]],
    trafCards: [["1 · Captação (venda de ingresso)", "Campanha de conversão → Purchase. 5 anúncios iniciais por ato. Públicos: interesses do avatar, Envolvimento 60D, VV 25%/95% dos virais, Lookalike 1%, remarketing da página.", "05/10 → 06/11 · trocar criativos a cada ato"], ["2 · Distribuição de conteúdo", "Toda segunda: visualização de vídeo com os virais e cortes da semana anterior (Meta e YouTube).", "12/10 → 09/11"], ["3 · Remarketing de carrinho do ingresso", "Visitou checkout e não comprou. Preço do lote atual + próximo lote como escassez.", "05/10 → 06/11 · sempre ligado"], ["4 · Lembrete (compradoras)", "Alcance para compradoras: 'Faltam X dias' e 'Estamos ao vivo'.", "31/10 → 08/11"], ["5 · Remarketing de carrinho FF 2.0", "Tráfego; conjuntos: assistiu o Dia 2, visitou página, compradoras do ingresso, lista total.", "08/11 → 12/11 · criar até 04/11"], ["6 · Criativos", "10 de venda (Ato 1) + 5 por ato · 7 lembrete · 4 ao vivo · 7 carrinho aberto.", "Nunca: culpa da mãe, criança vilã, medo extremo"]],
    trafMeta: ["Todo dia · orçamento: compras de ontem × CPA ideal = novo orçamento diário.", "Segunda e quarta · criativos: pausar acima do CPA-alvo, subir novos.", "Quinta · públicos: pausar acima do CPA-alvo, adicionar novos.", "Todo dia · planilhamento de vendas e criativos."],
    trafGoogle: ["Todo dia · orçamento (se gastou tudo dentro do CPA, aumenta) e lance de CPA por grupo.", "Quarta · dispositivos, locais, programação; criativos.", "Quinta · públicos.", "Grupos: View Video, inscritos, envolvimento, interesses, ≥15 palavras-chave, ≥50 canais."],
    d1: [["Abertura", "Fratura emocional: 'Eu amo a minha família, mas a rotina não se parece com a família que eu sonhei construir.' Regra: ninguém sai culpada."], ["Bloco 1", "RECONHECER — as cenas: tablet, ordem repetida, culpa, casal desalinhado, apagar incêndio. Exercício guiado do cenário da própria casa."], ["Bloco 2", "ENTENDER — casa no modo sobrevivência × família com direção. Nem tudo é fase; amor e limite não são opostos; autoridade não é grito."], ["Bloco 3", "DESCOBRIR — os três fundamentos na linguagem da casa, só depois nomeados: organização, autoridade, emocional."], ["Fechamento", "Tarefa: escolher UMA decisão pequena de hoje. Gancho para o Dia 2."]],
    d2: [["Abertura", "Retomar as decisões do chat. Prova: histórias reais de alunas."], ["Bloco 1", "APLICAR — demonstração em 3 situações (birra 2–4, desobediência 5–10, casal discordando)."], ["Bloco 2", "MÉTODO — transformação consistente exige método e continuidade. Desmontar as 7 objeções antes do preço."], ["Oferta", "Família Forte 2.0 como consequência lógica. Vitalício, BF antecipada, bônus de quem decide ao vivo. Checkout liberado na hora."], ["Encerramento", "Perguntas ao vivo, garantia. WhatsApp 'Oferta aberta' sai com a Paula no ar."]],
    ingressos: [["Lote 1 · R$ 27,90 · 05/10 → 14/10 (Ato 1)", "Bônus de entrada: gravação + material do Dia 1."], ["Lote 2 · a definir · 15/10 → 25/10 (Ato 2)", ""], ["Lote 3 · a definir · 26/10 → 06/11 (Ato 3)", ""], ["Vendas encerram 06/11 à meia-noite.", "Cada virada é comunicada 3 dias antes + 'últimas horas' no dia."]],
    ofertaFF: [["Abre ao vivo no Dia 2 (08/11) · fecha 12/11 (proposta)", ""], ["Condição: acesso vitalício, Black Friday antecipada", ""], ["Não é 'biblioteca de aulas': é a metodologia que organiza o que ela percebeu.", "Filhos que aprendem limites, rotina organizada, virtudes, cuidado emocional, casal alinhado."], ["Papéis no ar: apresentação (Paula), chat, WhatsApp 1:1, checkout, stories", ""]],
    tensao: ["Casa no modo sobrevivência × Família com direção", "A mãe não é negligente: ama profundamente e conduz a casa sem caminho claro. O inimigo é a falta de direção, o excesso de informação desconectada e as soluções pontuais."],
    conclusoes: [["“Isso acontece na minha casa.”", "reconhecimento (Ato 1)"], ["“Talvez eu esteja tentando resolver do jeito errado.”", "quebra de crença (Ato 2)"], ["“Existe um caminho mais claro e possível.”", "esperança concreta (Ato 3)"], ["“Eu preciso aprender a conduzir isso agora.”", "decisão (Imersão)"]],
    linguagem: [["Organização", "“Uma casa que funciona.”"], ["Autoridade", "“Uma mãe que sabe conduzir sem viver gritando ou repetindo.”"], ["Emocional", "“Uma criança que aprende a lidar com o que sente.”"]],
    frases: ["Uma família forte não acontece por acaso. Ela é construída nas pequenas decisões de todos os dias.", "Seu filho não precisa de uma mãe que saiba tudo. Precisa de uma mãe que saiba conduzir.", "Talvez você não precise tentar mais. Talvez precise finalmente saber o que fazer, em que ordem e por quê.", "Você não precisa resolver cada problema da sua casa separadamente.", "Não é sobre ser uma mãe perfeita. É sobre ter direção.", "A mudança da sua família começa dentro de casa — e começa nas decisões de hoje."],
    obj: [["“Já tentei de tudo.”", "Não faltou tentativa; faltou visão integrada e sequência de aplicação."], ["“Já fiz outros cursos.”", "Consumir informação e transformar a rotina são coisas diferentes."], ["“É só uma fase.”", "Distinguir desenvolvimento esperado de padrões que pedem direção — sem alarmismo."], ["“Meu marido acha frescura.”", "Conteúdo que inclui o casal e mostra o custo do desalinhamento."], ["“Com meu filho não funciona.”", "Casos diversos, princípios adaptáveis, sem promessa universal."], ["“Não tenho tempo.”", "O método cabe na rotina real."], ["“Não quero me sentir mais culpada.”", "A campanha não acusa: troca culpa por clareza."]],
    nao: ["Não transformar a criança em vilã.", "Não construir a campanha sobre medo extremo do futuro dos filhos.", "Não prometer filho perfeito, obediência absoluta ou ausência de conflitos.", "Não culpabilizar a mãe para vender.", "Não abrir com termos técnicos de psicologia.", "Não entregar dicas aleatórias sem conexão com a história maior.", "Não deixar cada canal parecer uma campanha diferente.", "Não depender de desconto para criar desejo."],
    canais: [["Instagram (virais)", "identificação e descoberta"], ["Lives", "aprofundam consciência e autoridade"], ["E-mail", "desenvolve o raciocínio"], ["WhatsApp (API)", "aproxima, lembra e conduz"], ["Provas sociais", "demonstram possibilidade"], ["Imersão", "organiza tudo"], ["Família Forte 2.0", "implementação e continuidade"]]
  };
  return { CONTENT_V, tasks, content };
})();
