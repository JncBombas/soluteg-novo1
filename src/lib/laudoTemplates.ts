export interface LaudoTemplate {
  metodologia: string;
  equipamentos: string;
  constatacoes: Array<{
    item: string;
    descricao: string;
    status: "conforme" | "nao_conforme" | "atencao";
    referenciaNormativa: string;
  }>;
}

export const LAUDO_TEMPLATES: Record<string, LaudoTemplate> = {
  instalacao_eletrica: {
    metodologia:
      "Inspeção visual e instrumental das instalações elétricas, verificando conformidade com a ABNT NBR 5410. Foram realizadas medições de isolamento, continuidade e aterramento com equipamentos calibrados.",
    equipamentos:
      "Multímetro digital, Megôhmetro, Alicate amperímetro, Detector de tensão, Equipamentos de proteção individual (EPI)",
    constatacoes: [
      {
        item: "Quadro de Distribuição",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410 – 6.3",
      },
      {
        item: "Sistema de Aterramento",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410 – 5.1",
      },
      {
        item: "Proteção contra Choques Elétricos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410 – 4.1",
      },
      {
        item: "Identificação de Circuitos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410 – 6.3.4",
      },
      {
        item: "Estado das Fiações e Eletrodutos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410 – 5.2",
      },
    ],
  },

  inspecao_predial: {
    metodologia:
      "Inspeção visual das instalações elétricas prediais, avaliando condições gerais de segurança, estado de conservação e conformidade normativa.",
    equipamentos:
      "Multímetro digital, Detector de tensão, Câmera fotográfica, EPI",
    constatacoes: [
      {
        item: "Quadro Geral de Baixa Tensão (QGBT)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Iluminação de Emergência",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 10898",
      },
      {
        item: "SPDA / Para-raios",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5419",
      },
      {
        item: "Instalações em Áreas Comuns",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Estado Geral das Instalações",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
    ],
  },

  nr10_nr12: {
    metodologia:
      "Avaliação das condições de segurança em instalações e serviços em eletricidade conforme NR-10, e verificação de requisitos de segurança em máquinas e equipamentos conforme NR-12.",
    equipamentos:
      "Multímetro digital, Megôhmetro, Detector de tensão, Medidor de isolamento, EPI completo NR-10",
    constatacoes: [
      {
        item: "Sinalização de Segurança",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-10 – item 10.7",
      },
      {
        item: "Bloqueio e Etiquetagem (LOTO)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-10 – item 10.6",
      },
      {
        item: "EPI e EPC Disponíveis",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-10 – item 10.8",
      },
      {
        item: "Prontuário das Instalações",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-10 – item 10.2.4",
      },
      {
        item: "Proteções em Máquinas e Equipamentos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-12 – item 12.5",
      },
      {
        item: "Dispositivos de Parada de Emergência",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-12 – item 12.6",
      },
    ],
  },

  grupo_gerador: {
    metodologia:
      "Inspeção técnica do grupo gerador contemplando aspectos elétricos e mecânicos. Verificação de parâmetros operacionais, sistemas de proteção, qualidade da energia gerada e condições gerais de operação.",
    equipamentos:
      "Multímetro digital, Alicate amperímetro, Analisador de energia, Tacômetro, Manômetro, EPI",
    constatacoes: [
      {
        item: "Sistema de Partida",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 7094",
      },
      {
        item: "Sistema de Arrefecimento",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 7094",
      },
      {
        item: "Quadro de Comando e Proteções",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 7094",
      },
      {
        item: "Sistema de Transferência Automática (QTA)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 7094",
      },
      {
        item: "Nível de Tensão e Frequência",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 7094",
      },
      {
        item: "Condições Gerais do Motor",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-12",
      },
    ],
  },

  adequacoes: {
    metodologia:
      "Vistoria técnica para verificação das adequações realizadas nas instalações elétricas, avaliando conformidade com projeto executivo e normas técnicas vigentes.",
    equipamentos:
      "Multímetro digital, Detector de tensão, Trena, EPI",
    constatacoes: [
      {
        item: "Conformidade com Projeto Executivo",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Qualidade dos Materiais Instalados",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Execução dos Serviços",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Documentação Técnica",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
    ],
  },

  // ── 8 Novos tipos ────────────────────────────────────────────────────────

  tubulacao_hidraulica: {
    metodologia:
      "Inspeção visual e instrumental das tubulações e conexões hidráulicas, verificando estanqueidade, fixação, corrosão, pressão de operação e conformidade com projeto.",
    equipamentos:
      "Manômetro, detector de vazamentos, trena, nível, câmera fotográfica, EPI",
    constatacoes: [
      {
        item: "Estanqueidade das Tubulações",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5626",
      },
      {
        item: "Fixação e Suportes",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5626",
      },
      {
        item: "Estado de Conservação e Corrosão",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5626",
      },
      {
        item: "Válvulas e Registros",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5626",
      },
      {
        item: "Pressão de Operação",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5626",
      },
      {
        item: "Identificação das Linhas",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 6493",
      },
    ],
  },

  spda_adequacao: {
    metodologia:
      "Vistoria técnica das instalações do sistema de proteção contra descargas atmosféricas, verificando condições de fixação, continuidade elétrica, estado de conservação dos captores, descidas e malha de aterramento. Este trabalho refere-se exclusivamente à execução e adequação do sistema, não constituindo laudo ou certificação de SPDA.",
    equipamentos:
      "Terrômetro, multímetro, alicate amperímetro, trena, câmera fotográfica, EPI",
    constatacoes: [
      {
        item: "Captores e Hastes",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5419",
      },
      {
        item: "Condutores de Descida",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5419",
      },
      {
        item: "Malha de Aterramento",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5419",
      },
      {
        item: "Conectores e Fixações",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5419",
      },
      {
        item: "Resistência de Aterramento",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5419",
      },
      {
        item: "Proteção Contra Surtos (DPS)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5419",
      },
    ],
  },

  motores_eletricos: {
    metodologia:
      "Inspeção técnica de motores elétricos contemplando aspectos elétricos e mecânicos: análise de corrente, tensão, isolamento, vibração, temperatura, rolamentos e sistema de acionamento.",
    equipamentos:
      "Alicate amperímetro, megôhmetro, multímetro, termômetro infravermelho, analisador de vibração, EPI",
    constatacoes: [
      {
        item: "Corrente de Operação",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 60034",
      },
      {
        item: "Isolamento dos Enrolamentos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 60034",
      },
      {
        item: "Temperatura de Operação",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 60034",
      },
      {
        item: "Vibração e Rolamentos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 60034",
      },
      {
        item: "Sistema de Acionamento (Partida)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NR-12",
      },
      {
        item: "Proteções Elétricas (Relé, Fusível)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Aterramento da Carcaça",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
    ],
  },

  bombas_dagua: {
    metodologia:
      "Inspeção técnica de conjuntos moto-bomba, verificando desempenho hidráulico, condições mecânicas, sistema de vedação, alinhamento e instalação elétrica.",
    equipamentos:
      "Manômetro, vacuômetro, alicate amperímetro, multímetro, termômetro infravermelho, trena, EPI",
    constatacoes: [
      {
        item: "Pressão de Sucção e Recalque",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 12214",
      },
      {
        item: "Corrente Elétrica do Motor",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 60034",
      },
      {
        item: "Vedação e Gaxetas",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 12214",
      },
      {
        item: "Alinhamento do Conjunto",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 12214",
      },
      {
        item: "Vibração e Ruído",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 12214",
      },
      {
        item: "Sistema de Proteção Elétrica",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Tubulação de Sucção e Recalque",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5626",
      },
    ],
  },

  motores_diesel: {
    metodologia:
      "Inspeção técnica de motores diesel verificando sistema de combustível, arrefecimento, lubrificação, partida, escape e condições gerais de operação e manutenção.",
    equipamentos:
      "Manômetro de óleo, termômetro, multímetro, tacômetro, câmera fotográfica, EPI",
    constatacoes: [
      {
        item: "Sistema de Combustível",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NBR 13786",
      },
      {
        item: "Sistema de Arrefecimento",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NBR 13786",
      },
      {
        item: "Sistema de Lubrificação",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NBR 13786",
      },
      {
        item: "Sistema de Partida Elétrica",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 7094",
      },
      {
        item: "Sistema de Escape",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NBR 13786",
      },
      {
        item: "Nível de Ruído e Vibração",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NBR 13786",
      },
      {
        item: "Condições Gerais de Conservação",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "NBR 13786",
      },
    ],
  },

  combate_incendio: {
    metodologia:
      "Inspeção técnica do sistema de combate a incêndio verificando hidrantes, sprinklers, extintores, bombas de incêndio, reservatório e sinalização, conforme ABNT NBR 13714 e NBR 10897.",
    equipamentos:
      "Manômetro, medidor de vazão, multímetro, trena, câmera fotográfica, EPI",
    constatacoes: [
      {
        item: "Reservatório de Incêndio (volume)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 13714",
      },
      {
        item: "Conjunto Moto-Bomba de Incêndio",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 13714",
      },
      {
        item: "Rede de Hidrantes e Mangotinhos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 13714",
      },
      {
        item: "Sistema de Sprinklers",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 10897",
      },
      {
        item: "Extintores de Incêndio",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 12693",
      },
      {
        item: "Sinalização de Emergência",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 13434",
      },
      {
        item: "Iluminação de Emergência",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 10898",
      },
      {
        item: "Instalação Elétrica do Sistema",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
    ],
  },

  paineis_distribuicao: {
    metodologia:
      "Inspeção técnica de painéis elétricos de distribuição verificando condições estruturais, componentes internos, conexões, identificação, proteções e conformidade com normas vigentes.",
    equipamentos:
      "Multímetro, alicate amperímetro, megôhmetro, termômetro infravermelho, câmera fotográfica, EPI",
    constatacoes: [
      {
        item: "Estrutura e Grau de Proteção (IP)",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 61439",
      },
      {
        item: "Disjuntores e Dispositivos de Proteção",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 61439",
      },
      {
        item: "Barramentos e Conexões",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 61439",
      },
      {
        item: "Identificação de Circuitos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Aterramento do Painel",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 5410",
      },
      {
        item: "Temperatura dos Componentes",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 61439",
      },
      {
        item: "Diagramas e Documentação",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR IEC 61439",
      },
    ],
  },

  estruturas_metalicas: {
    metodologia:
      "Inspeção visual e instrumental de estruturas metálicas verificando condições de corrosão, fixações, soldas, pintura de proteção, alinhamento e integridade estrutural.",
    equipamentos:
      "Medidor de espessura ultrassônico, trena, nível, câmera fotográfica, EPI",
    constatacoes: [
      {
        item: "Estado de Conservação e Corrosão",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 6118",
      },
      {
        item: "Fixações e Parafusos",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 8681",
      },
      {
        item: "Qualidade das Soldas",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 6118",
      },
      {
        item: "Sistema de Pintura Anticorrosiva",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 7348",
      },
      {
        item: "Alinhamento e Prumo",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 6118",
      },
      {
        item: "Integridade Estrutural Geral",
        descricao: "",
        status: "conforme",
        referenciaNormativa: "ABNT NBR 6118",
      },
    ],
  },
};
