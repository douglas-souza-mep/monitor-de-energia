/**
 * Configuração do Cliente - Energy Monitor
 * Este arquivo permite personalizar o sistema para diferentes clientes
 */

const clientConfig = {
  // Informações do Cliente
  client: {
    name: "Santa Mônica",
    logo: "/images/logo_mep.png",
    favicon: "/images/favicon.ico",
    brand: "MEP Engenharia",
    primaryColor: "#2563eb",
    accentColor: "#dc2626"
  },

  // Configurações MQTT
  mqtt: {
    broker: "wss://monitor.mep.eng.br",
    username: "douglas",
    password: "8501",
    path: "/mqtt",
    topics: {
      energy: "santaMonica/atualizarTela/energ"
    }
  },

  // URLs da API
  api: {
    baseUrl: "santaMonica",
    endpoints: {
      userData: "/get-dados-do-usuario",
      lastReadings: "/get_ultimas_leituras/energ",
      consumption: "/get_consumo/energ",
      generalReport: "/get_relatorio_geral/energ"
    }
  },

  // Configuração dos Medidores
  meters: [
    {
      category: "Principais",
      meters: [
        { id: "1", name: "Quadr. Geral" },
        { id: "2", name: "QG Condomínio" },
        { id: "3", name: "QG CAG" }
      ]
    },
    {
      category: "Térreo",
      meters: [
        { id: "11", name: "Sala 1" },
        { id: "12", name: "Sala 7" }
      ]
    },
    {
      category: "1º Andar",
      meters: [
        { id: "101", name: "Sala 101" },
        { id: "102", name: "Sala 102" },
        { id: "103", name: "Sala 103" },
        { id: "104", name: "Sala 104" },
        { id: "105", name: "Sala 105" },
        { id: "106", name: "Sala 106" },
        { id: "107", name: "Sala 107" },
        { id: "108", name: "Sala 108" },
        { id: "109", name: "Sala 109" },
        { id: "110", name: "Sala 110" },
        { id: "111", name: "Sala 111" },
        { id: "112", name: "Sala 112" },
        { id: "113", name: "Sala 113" },
        { id: "114", name: "Sala 114" }
      ]
    },
    {
      category: "2º Andar",
      meters: [
        { id: "201", name: "Sala 201" },
        { id: "202", name: "Sala 202" },
        { id: "203", name: "Sala 203" },
        { id: "204", name: "Sala 204" },
        { id: "205", name: "Sala 205" },
        { id: "206", name: "Sala 206" },
        { id: "207", name: "Sala 207" },
        { id: "208", name: "Sala 208" },
        { id: "209", name: "Sala 209" },
        { id: "210", name: "Sala 210" },
        { id: "211", name: "Sala 211" },
        { id: "212", name: "Sala 212" },
        { id: "213", name: "Sala 213" },
        { id: "214", name: "Sala 214" }
      ]
    },
    {
      category: "3º Andar",
      meters: [
        { id: "301", name: "Sala 301" },
        { id: "302", name: "Sala 302" },
        { id: "303", name: "Sala 303" },
        { id: "304", name: "Sala 304" },
        { id: "305", name: "Sala 305" },
        { id: "306", name: "Sala 306" },
        { id: "307", name: "Sala 307" },
        { id: "308", name: "Sala 308" },
        { id: "309", name: "Sala 309" }
      ]
    },
    {
      category: "4º Andar",
      meters: [
        { id: "401", name: "Sala 401" },
        { id: "402", name: "Sala 402" }
      ]
    }
  ],

  // Links de Navegação
  navigation: {
    hydrometers: "http://monitor.mep.eng.br:5000/users/santaMonica_hidro"
  },

  // Configurações de Exibição
  display: {
    dateFormat: "pt-BR",
    timezone: "America/Sao_Paulo",
    currency: "BRL",
    units: {
      voltage: "V",
      current: "A",
      power: "W",
      energy: "kWh"
    }
  },

  // Configurações dos Gráficos
  charts: {
    colors: {
      primary: "#2563eb",
      secondary: "#16a34a",
      accent: "#ea580c",
      warning: "#f59e0b",
      danger: "#dc2626"
    },
    options: {
      backgroundColor: "transparent",
      titleTextStyle: { fontSize: 16, bold: true },
      chartArea: { width: "85%", height: "75%" }
    }
  },

  // Configurações de Relatórios
  reports: {
    csvSeparator: ";",
    dateFormat: "YYYY-MM-DD",
    filename: {
      prefix: "Consumo_de_Energia",
      suffix: "_Report"
    }
  }
};

// Função para obter configuração específica
function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj && obj[key], clientConfig);
}

// Função para atualizar configuração
function updateConfig(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, key) => obj[key], clientConfig);
  target[lastKey] = value;
}

// Exporta para uso no Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clientConfig, getConfig, updateConfig };
}

// Disponibiliza globalmente no browser
if (typeof window !== 'undefined') {
  window.clientConfig = clientConfig;
  window.getConfig = getConfig;
  window.updateConfig = updateConfig;
}

