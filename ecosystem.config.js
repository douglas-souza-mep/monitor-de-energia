module.exports = {
    apps: [
      {
        name: "Servidor_Monitor",
        script: "bin/www.js",           // seu arquivo de inicialização
        node_args: "--dns-result-order=ipv4first",
        env: {
          NODE_ENV: "production"       // ambiente de produção
          // NÃO é necessário repetir TELEGRAM_TOKEN e CHAT_ID_DEV
          // se você já tem no .env e está usando dotenv
        }
      }
    ]
  };
  