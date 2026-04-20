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
};
