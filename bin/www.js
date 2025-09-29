#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('monitoramento-de-energia:server');
var http = require('http');
require('dotenv').config()
const model_Energ = require('../models/model_Energ')
const model_Res = require('../models/model_Res')
const model_Hidro = require('../models/model_Hidro')
const db = require('../models/connection')
const f = require("./funcoes")
const { Telegraf } = require('telegraf');
const logar = require('../controller/logar')

// Declara variáveis globais
globalThis.reservatorios = [];
globalThis.medidoresEnerg = [];
globalThis.Hidrometros = [];

globalThis.reservatoriosDinamico = [];
globalThis.medidoresEnergDinamico = [];
globalThis.hidrometrosDinamico = [];

// Função para inicializar a lista de dispositivos
async function inicializarListadeDispositivos() {
  await f.gerarListaDeDispositivos();
  //console.log( globalThis.reservatorios);
  //console.log(globalThis.medidoresEnerg);
  //globalThis.reservatoriosDinamico = globalThis.reservatorios
  //globalThis.medidoresEnergDinamico =globalThis.medidoresEnerg
}

// Chama a função inicializar
inicializarListadeDispositivos()


/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '5000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);
app.io.attach(server); 

app.io.on('connection', socket=>{
  console.log('novo usuario conectado, id: '+socket.id)
  
  socket.on("Get_dados_do_usuario", async (user)=>{
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE url = ?  LIMIT 1",user)
    //console.log("usuario "+user+" logado")
    app.io.sockets.emit("return_dados_do_usuario_"+user,usuario)
  })

  socket.on("iniciarTelasantaMonica_hidro", async ()=>{
    const [[hidrometros]] = await db.query("SELECT hidrometros FROM usuarios WHERE url = ?  LIMIT 1","santaMonica")
    //console.log('santa Monica hidro')
    //console.log(hidrometros)
    app.io.sockets.emit("atualizar_santaMonica_hidrometros",hidrometros)
  })

  

  socket.on('addLeituraHidrometro_santaMonica', async (leituras) => {
    //console.log(leituras);
    retorno = await model_Hidro.addLeituras("santaMonica",leituras)
    //console.log(retorno);
    socket.emit('retornoArquivo_santaMonica', retorno);
  })

  socket.on("iniciarTelahospitalBase_hidro", async ()=>{
    const [[hidrometros]] = await db.query("SELECT hidrometros FROM usuarios WHERE url = ?  LIMIT 1","HospitalBase")
    //console.log('santa Monica hidro')
    //console.log(hidrometros)
    app.io.sockets.emit("atualizar_hospitalBase_hidrometros",hidrometros)
  })
  
  socket.on("getLeituasHidrometro_hospitalBase", async (dados)=>{
    //console.log(dados)
    if(dados != null){
      const leituras=await model_Hidro.getLeituras(dados.url,dados.hidrometro)
      app.io.sockets.emit("atualizar_hospitalBase_hidro",leituras)
    }
    
  })
  
  socket.on("calcular_consumo_hospitalBase_hidro", async (dados)=>{
    //console.log(dados)
    const { startDate, endDate } = dados.datas;
    try {
        const retorno = await model_Hidro.getConsumo("HospitalBase",dados.hidrometro,startDate,endDate)
        //console.log(retorno.length)
        if(retorno.length >= 2){
          consumo = retorno[retorno.length-1].leitura - retorno[0].leitura
          dados={
            id: retorno[0].id,
            local:retorno[0].local,
            consumo:consumo,
            dataL1:retorno[0].data,
            dataL2:retorno[retorno.length-1].data,
            grafico:[]
          }
          await retorno.forEach(element => {
            dados.grafico.push([element.data, element.leitura]);
          });
          socket.emit('consumo_hospitalBase_hidro', dados);
        }else{
          socket.emit('consumo_hospitalBase_hidro', { error: 'Não ha leituras sufucientes necesse periodo para se calcular o consumo. Leituras = '+retorno.length });
        }
        //console.log(retorno)
    } catch (error) {
        console.error('Erro ao consultar o banco de dados:', error);
        socket.emit('consumo_hospitalBase_hidro', { error: 'Erro ao buscar leituras.' });
    }
  })
  
  socket.on('addLeituraHidrometro_hospitalBase', async (leituras) => {
    //console.log(leituras);
    retorno = await model_Hidro.addLeituras("HospitalBase",leituras)
    //console.log(retorno);
    socket.emit('retornoArquivo_hospitalBase', retorno);
  })  
})



/**
 * Listen on provided port, on all network interfaces.
 */
const os = require('os');
const networkInfo = os.networkInterfaces();
//console.log(networkInfo) // objeto
//server.listen(port, () => console.log(`Server running ${networkInfo.Ethernet[networkInfo.Ethernet.length-1].address} or port ${port}`));
server.listen(port, () => console.log(`Server running or port ${port}`));
server.on('error', onError);
server.on('listening', onListening);


// 1. Instancia o bot
const bot = new Telegraf(process.env.TELEGRAN_TOKEN);
globalThis.bot = bot;

// 2. Envia a mensagem de inicialização imediatamente.
//    O bot já pode enviar mensagens mesmo antes do 'launch'.
const chatId = process.env.CHAT_ID_DEV;
if (chatId) {
    bot.telegram.sendMessage(chatId, 'Servidor Mep reiniciado e online.')
        .then(() => {
            console.log(`Mensagem de inicialização enviada para o chat ID: ${chatId}`);
        })
        .catch(err => {
            console.error('ERRO AO ENVIAR MENSAGEM INICIAL:', err);
        });
} else {
    console.warn('A variável de ambiente CHAT_ID_DEV não está definida. Nenhuma mensagem de alerta foi enviada.');
}

// 3. Define os handlers de mensagens (comandos, texto, etc.)
bot.start((ctx) => {
  ctx.reply('Olá! Por favor, informe seu nome de usuário.');
});

const userStates = {};
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  if (text === '/start') return; // Evita que o /start seja processado aqui

  if (!userStates[chatId]) {
      userStates[chatId] = { username: text };
      ctx.reply('Obrigado! Agora, informe sua senha.');
  } else {
      const result = await logar.logarTelegran(userStates[chatId].username, text, chatId);
      ctx.reply(result.msg);
      delete userStates[chatId];
  }
});

// 4. Inicia o bot para começar a OUVIR por novas mensagens.
//    Usamos um catch para o caso de a inicialização falhar.
bot.launch().then(() => {
    console.log('Bot do Telegram iniciado e ouvindo por mensagens...');
}).catch(err => {
    console.error('ERRO FATAL AO INICIAR O LISTENER DO BOT:', err);
});

// 5. Define como parar o bot
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

//################################ Alertas ###################################

// Define o intervalo de tempo em milissegundos
const intervalo1 = 1000 * 60 * 15; //minutos
const intervalo2 = 1000 * 60 * 60 * 3; //horas

// Inicia a execução periódica da função, passando o bot como argumento
const idIntervalo = setInterval(() => f.tarefaPeriodica(bot), intervalo1);
const idIntervalo2 = setInterval(() => f.testeTelegra(bot), intervalo2);
//##############################################################################

//Normalize a port into a number, string, or false.
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

// Event listener for HTTP server "error" event.
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

//Event listener for HTTP server "listening" event.
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
