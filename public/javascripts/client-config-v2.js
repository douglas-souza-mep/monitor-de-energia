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

  // Cliente: Santa Mônica
  santaMonica: {
    name: "Santa Mônica",
    mqtt: {
      broker: "wss://monitor.mep.eng.br",
      username: "douglas",
      password: "8501",
      path: "/mqtt",
      topic: "santaMonica/atualizarTela/energ"
    },
    api: {
      baseUrl: "santaMonica"
    },
    navigation: {
      hydrometers: "https://monitor.mep.eng.br/users/santaMonica_hidro"
    }
  },

  // Cliente: Hospital de Base
  hospitalBase: {
    name: "Hospital de Base",
    mqtt: {
      broker: "wss://monitor.mep.eng.br",
      username: "douglas",
      password: "8501",
      path: "/mqtt",
      topic: "HospitalBase/energ"
    },
    api: {
      baseUrl: "HospitalBase"
    },
    navigation: {
      hydrometers: "https://monitor.mep.eng.br/users/hospitalBase_hidro"
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


