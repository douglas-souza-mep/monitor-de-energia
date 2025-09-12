/**
 * Configuração do Cliente V2 - Energy Monitor Grid
 * Sistema de monitoramento com visualização em grid de medidores
 */

const clientConfigV2 = {
  // Informações do Cliente
  client: {
    name: "Santa Mônica",
    logo: "/images/logo_mep.png",
    favicon: "/images/favicon.ico",
    brand: "MEP Engenharia",
    version: "2.0",
    // Cores baseadas na logo da MEP Engenharia
    colors: {
      primary: "#dc2626",      // Vermelho principal da logo
      primaryDark: "#b91c1c",  // Vermelho escuro
      secondary: "#ffffff",     // Branco
      accent: "#7f1d1d",       // Vermelho mais escuro
      success: "#10b981",      // Verde para status online
      warning: "#f59e0b",      // Amarelo para atenção
      danger: "#ef4444",       // Vermelho para offline
      background: "#f9fafb",   // Cinza claro de fundo
      surface: "#ffffff",      // Branco para cards
      text: "#1f2937",         // Cinza escuro para texto
      textSecondary: "#6b7280" // Cinza médio para texto secundário
    }
  },

  // Configurações MQTT
  mqtt: {
    broker: "wss://monitor.mep.eng.br",
    username: "douglas",
    password: "8501",
    path: "/mqtt",
    topics: {
      energy: "santaMonica/atualizarTela/energ"
    },
    reconnectInterval: 5000,
    keepalive: 60
  },

  // URLs da API
  api: {
    baseUrl: "santaMonica",
    endpoints: {
      userData: "/get-dados-do-usuario",
      lastReadings: "/get_ultimas_leituras/energ",
      consumption: "/get_consumo/energ",
      generalReport: "/get_relatorio_geral/energ"
    },
    timeout: 30000
  },

  // Configurações da Interface V2
  interface: {
    // Configurações do Grid
    grid: {
      minCardWidth: "320px",
      gap: "1.5rem",
      animationDelay: 0.1, // segundos entre animações dos cards
      autoRefreshInterval: 300000 // 5 minutos em ms
    },
    
    // Configurações dos Cards de Medidores
    meterCard: {
      highlightConsumption: true,
      showPowerFactor: true,
      showLastUpdate: true,
      showStatus: true,
      statusThresholds: {
        online: 30,    // minutos - verde se última atualização < 30min
        warning: 120,  // minutos - amarelo se entre 30min e 2h
        offline: 120   // minutos - vermelho se > 2h
      }
    },

    // Configurações de Transições
    transitions: {
      cardHover: "0.3s ease",
      viewChange: "0.5s ease-out",
      statusUpdate: "0.2s ease"
    }
  },

  // Configuração dos Medidores (será preenchida dinamicamente)
  meters: [],

  // Links de Navegação
  navigation: {
    hydrometers: "http://monitor.mep.eng.br:5000/users/santaMonica_hidro",
    backToV1: "/users/santaMonica_energ" // Link para voltar à versão 1
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
    },
    numberFormat: {
      decimals: 2,
      thousandsSeparator: ".",
      decimalSeparator: ","
    }
  },

  // Configurações dos Gráficos
  charts: {
    colors: {
      primary: "#dc2626",
      secondary: "#b91c1c",
      accent: "#7f1d1d",
      background: "transparent"
    },
    options: {
      backgroundColor: "transparent",
      titleTextStyle: { 
        fontSize: 16, 
        bold: true,
        color: "#1f2937"
      },
      chartArea: { 
        width: "85%", 
        height: "75%" 
      },
      legend: {
        textStyle: {
          color: "#6b7280"
        }
      },
      hAxis: {
        textStyle: {
          color: "#6b7280"
        },
        titleTextStyle: {
          color: "#374151"
        }
      },
      vAxis: {
        textStyle: {
          color: "#6b7280"
        },
        titleTextStyle: {
          color: "#374151"
        }
      }
    }
  },

  // Configurações de Relatórios
  reports: {
    csvSeparator: ";",
    dateFormat: "YYYY-MM-DD",
    filename: {
      prefix: "Consumo_de_Energia_V2",
      suffix: "_Report"
    },
    includeMetadata: true
  },

  // Configurações de Performance
  performance: {
    cacheTimeout: 300000, // 5 minutos
    maxConcurrentRequests: 5,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // Configurações de Acessibilidade
  accessibility: {
    enableKeyboardNavigation: true,
    enableScreenReader: true,
    highContrast: false,
    fontSize: "normal" // "small", "normal", "large"
  },

  // Configurações de Debug
  debug: {
    enableConsoleLog: true,
    enablePerformanceMonitoring: false,
    logLevel: "info" // "debug", "info", "warn", "error"
  }
};

// Função para obter configuração específica
function getConfigV2(path) {
  return path.split('.').reduce((obj, key) => obj && obj[key], clientConfigV2);
}

// Função para atualizar configuração
function updateConfigV2(path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, key) => obj[key], clientConfigV2);
  target[lastKey] = value;
}

// Função para validar configuração
function validateConfigV2() {
  const required = [
    'client.name',
    'mqtt.broker',
    'mqtt.username',
    'mqtt.password',
    'api.baseUrl'
  ];
  
  const missing = required.filter(path => !getConfigV2(path));
  
  if (missing.length > 0) {
    console.error('Configurações obrigatórias ausentes:', missing);
    return false;
  }
  
  return true;
}

// Função para aplicar tema baseado nas cores da logo
function applyMEPTheme() {
  const root = document.documentElement;
  const colors = clientConfigV2.client.colors;
  
  // Aplica variáveis CSS customizadas
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--mep-${key}`, value);
  });
  
  // Aplica classes CSS específicas
  document.body.classList.add('mep-theme', 'mep-v2');
}

// Função para inicializar configurações V2
function initConfigV2() {
  if (!validateConfigV2()) {
    throw new Error('Configuração V2 inválida');
  }
  
  // Aplica tema da MEP
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyMEPTheme);
    } else {
      applyMEPTheme();
    }
  }
  
  console.log('Configuração V2 inicializada:', clientConfigV2.client.name);
}

// Função para obter configurações de um medidor específico
function getMeterConfig(meterId) {
  const meter = clientConfigV2.meters.find(m => m.id === meterId);
  return meter || null;
}

// Função para adicionar medidor à configuração
function addMeterToConfig(meter) {
  const existingIndex = clientConfigV2.meters.findIndex(m => m.id === meter.id);
  
  if (existingIndex >= 0) {
    clientConfigV2.meters[existingIndex] = meter;
  } else {
    clientConfigV2.meters.push(meter);
  }
}

// Função para remover medidor da configuração
function removeMeterFromConfig(meterId) {
  const index = clientConfigV2.meters.findIndex(m => m.id === meterId);
  if (index >= 0) {
    clientConfigV2.meters.splice(index, 1);
  }
}

// Função para obter configurações de status
function getStatusConfig() {
  return clientConfigV2.interface.meterCard.statusThresholds;
}

// Função para formatar valores baseado na configuração
function formatValue(value, type = 'number') {
  const config = clientConfigV2.display;
  
  switch (type) {
    case 'number':
      return Number(value).toLocaleString(config.dateFormat, {
        minimumFractionDigits: config.numberFormat.decimals,
        maximumFractionDigits: config.numberFormat.decimals
      });
    
    case 'date':
      return new Date(value).toLocaleString(config.dateFormat, {
        timeZone: config.timezone
      });
    
    case 'currency':
      return Number(value).toLocaleString(config.dateFormat, {
        style: 'currency',
        currency: config.currency
      });
    
    default:
      return value;
  }
}

// Função para log baseado na configuração
function logV2(level, message, data = null) {
  if (!clientConfigV2.debug.enableConsoleLog) return;
  
  const levels = ['debug', 'info', 'warn', 'error'];
  const configLevel = levels.indexOf(clientConfigV2.debug.logLevel);
  const messageLevel = levels.indexOf(level);
  
  if (messageLevel >= configLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [V2] [${level.toUpperCase()}]`;
    
    if (data) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }
  }
}

// Exporta para uso no Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clientConfigV2,
    getConfigV2,
    updateConfigV2,
    validateConfigV2,
    initConfigV2,
    getMeterConfig,
    addMeterToConfig,
    removeMeterFromConfig,
    getStatusConfig,
    formatValue,
    logV2
  };
}

// Disponibiliza globalmente no browser
if (typeof window !== 'undefined') {
  window.clientConfigV2 = clientConfigV2;
  window.getConfigV2 = getConfigV2;
  window.updateConfigV2 = updateConfigV2;
  window.validateConfigV2 = validateConfigV2;
  window.initConfigV2 = initConfigV2;
  window.getMeterConfig = getMeterConfig;
  window.addMeterToConfig = addMeterToConfig;
  window.removeMeterFromConfig = removeMeterFromConfig;
  window.getStatusConfig = getStatusConfig;
  window.formatValue = formatValue;
  window.logV2 = logV2;
  
  // Inicializa automaticamente
  initConfigV2();
}

