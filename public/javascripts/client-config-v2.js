/**
 * Configuração de Clientes V2 - Energy Monitor Grid
 * Sistema de monitoramento com suporte a múltiplos clientes
 */

const clientsConfig = {
  // Cliente Padrão (MEP Engenharia)
  default: {
    brand: "MEP Engenharia",
    logo: "/images/logo_mep.png",
    favicon: "/images/favicon.ico",
    colors: {
      primary: "#dc2626",
      primaryDark: "#b91c1c",
      primaryLight: "#fecaca",
      secondary: "#ffffff",
      accent: "#7f1d1d",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
      background: "#f9fafb",
      surface: "#ffffff",
      text: "#1f2937",
      textSecondary: "#6b7280",
      border: "#e5e7eb"
    }
  },

 // Cliente: Golgi Brasilia
  golgidf: {
    name: "Golgi Brasilia",
    mqtt: {
      broker: "wss://monitor.mep.eng.br",
      username: "golgidf",
      password: "golgi@df",
      path: "/mqtt",
      energyTopic: "golgidf/atualizarTela/energ",
      hydrometerTopic: "golgidf/atualizarTela/hidro"
    },
    api: {
      baseUrl: "golgidf"
    },
    navigation: {
      hydrometers: "http://monitor.mep.eng.br/users/golgidf_hidro_v2",
      energy: "http://monitor.mep.eng.br/users/golgidf_energ_v2"
    },
    interface: {
      meterCard: {
        statusThresholds: {
          online: 5,    // minutos
          warning: 15,  // minutos
          offline: 30   // minutos
        }
      },
      hydrometerCard: {
        statusThresholds: {
          online: 5,    // minutos
          warning: 15,  // minutos
          offline: 30   // minutos
        }
      }
    }
  },
  // Cliente: Santa Mônica
  santaMonica: {
    name: "Santa Mônica",
    mqtt: {
      broker: "wss://monitor.mep.eng.br",
      username: "santa.monica",
      password: "32565996",
      path: "/mqtt",
      energyTopic: "santaMonica/atualizarTela/energ",
      hydrometerTopic: "santaMonica/atualizarTela/hidro"
    },
    api: {
      baseUrl: "santaMonica"
    },
    navigation: {
      hydrometers: "http://monitor.mep.eng.br/users/santaMonica_hidro_v2",
      energy: "http://monitor.mep.eng.br/users/santaMonica_energ_v2"
    },
    interface: {
      meterCard: {
        statusThresholds: {
          online: 5,    // minutos
          warning: 15,  // minutos
          offline: 30   // minutos
        }
      },
      hydrometerCard: {
        statusThresholds: {
          online: 5,    // minutos
          warning: 15,  // minutos
          offline: 30   // minutos
        }
      }
    }
  },

  // Cliente: Hospital de Base
  HospitalBase: {
    name: "Hospital de Base",
    mqtt: {
      broker: "wss://monitor.mep.eng.br",
      username: "hospital.base",
      password: "hospital@base",
      path: "/mqtt",
      energyTopic: "HospitalBase/atualizarTela/energ",
      hydrometerTopic: "HospitalBase/atualizarTela/hidro"
    },
    api: {
      baseUrl: "HospitalBase"
    },
    navigation: {
      hydrometers: "http://monitor.mep.eng.br/users/hospitalBase_hidro_v2",
      energy: "http://monitor.mep.eng.br/users/hospitalBase_energ_v2"
    },
    interface: {
      meterCard: {
        statusThresholds: {
          online: 5,    // minutos
          warning: 15,  // minutos
          offline: 30   // minutos
        }
      },
      hydrometerCard: {
        statusThresholds: {
          online: 5,    // minutos
          warning: 15,  // minutos
          offline: 30   // minutos
        }
      }
    }
  }
};

// Função para obter a configuração de um cliente específico
function getClientConfig(clientKey) {
  const clientConfig = clientsConfig[clientKey];
  if (!clientConfig) {
    console.error(`Configuração para o cliente "${clientKey}" não encontrada.`);
    return null;
  }

  // Mescla a configuração do cliente com a configuração padrão
  return {
    ...clientsConfig.default,
    ...clientConfig
  };
}

// Disponibiliza globalmente no browser
if (typeof window !== "undefined") {
  window.getClientConfig = getClientConfig;
}


