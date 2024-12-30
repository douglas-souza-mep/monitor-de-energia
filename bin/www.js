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

globalThis.reservatoriosDinamico = [];
globalThis.medidoresEnergDinamico = [];

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

  socket.on("iniciarTelaCasa", async (medidor)=>{
    const dados=await model_Energ.getDataStart(medidor,"casa")
    //console.log("atualizar_santaMonica"+medidor)
    app.io.sockets.emit("atualizar_casa"+medidor,dados)
  })

  socket.on("iniciarTelasantaMonica", async (medidor)=>{
    const dados=await model_Energ.getDataStart(medidor,"santaMonica")
    //console.log("atualizar_santaMonica"+medidor)
    app.io.sockets.emit("atualizar_santaMonica"+medidor,dados)
  })

  socket.on("calcular_consumo_energ", async (info)=>{
    //console.log(dados)
    const { startDate, endDate } = info.datas;
    try {
        const retorno = await model_Energ.getConsumo(info.url,info.id,startDate,endDate)
        //console.log(retorno)
        if(retorno.consumosDiario.length >= 1){
          dados={
            id: info.id,
            local:info.local,
            consumo:retorno.consumo,
            dataL1:retorno.consumosDiario[0].data,
            dataL2:retorno.consumosDiario[retorno.consumosDiario.length-1].data,
            grafico:[]
          }
          await retorno.consumosDiario.forEach(element => {
            dados.grafico.push([element.data, element.valor]);
          });
          socket.emit('consumo_de_energia_'+info.url, dados);
          //console.log(dados)
        }else{
          socket.emit('consumo_de_energia_'+info.url, { error: 'Não ha leituras sufucientes necesse periodo para se calcular o consumo. Leituras = '+retorno.consumosDiario.length });
        }
        
    } catch (error) {
        console.error('Erro ao consultar o banco de dados:', error);
        socket.emit('consumo_de_energia'+info.url, { error: 'Erro ao buscar leituras.' });
    }
  })

  socket.on("iniciarTelaAnchieta_Res", async (medidor)=>{
    const dados=await model_Res.getDataStart(medidor,"anchieta")
    //console.log("atualizar_anchieta: "+medidor)
    app.io.sockets.emit("atualizar_anchieta_res"+medidor,dados)
  })

  socket.on("iniciarTelaTest_Res", async (medidor)=>{
    const dados=await model_Res.getDataStart(medidor,"test")
    //console.log("atualizar_anchieta: "+medidor)
    app.io.sockets.emit("atualizar_test_res"+medidor,dados)
  })

  socket.on("iniciarTela_taguaLife_Res", async (medidor)=>{
    const dados=await model_Res.getDataStart(medidor,"taguaLife")
    //console.log("atualizar_anchieta: "+medidor)
    app.io.sockets.emit("atualizar_taguaLife_res",dados)
  })

  socket.on("getHistorico_taguaLife_res", async (dados)=>{
    //console.log(dados)
    const { startDate, endDate } = dados.datas;
    try {
      const retorno = await model_Res.getHistorico("taguaLife",dados.id,startDate,endDate)
      //console.log(retorno)
      dados={
        id: dados.id,
        local:dados.local,
        dataL1:retorno[0][1],
        dataL2:retorno[retorno.length-1][1],
        grafico: []
      }
      await retorno.forEach(element => {
        dados.grafico.push([element[1], element[2]]);
      });
      socket.emit('historico_taguaLife_res', dados);
      //console.log(retorno)
    } catch (error) {
        console.error('Erro ao consultar o banco de dados:', error);
        socket.emit('historico_taguaLife_res', { error: 'Ainda não ha leituras' });
    }
  })

  socket.on("iniciarTelasantaMonica_hidro", async ()=>{
    const [[hidrometros]] = await db.query("SELECT hidrometros FROM usuarios WHERE url = ?  LIMIT 1","santaMonica")
    //console.log('santa Monica hidro')
    //console.log(hidrometros)
    app.io.sockets.emit("atualizar_santaMonica_hidrometros",hidrometros)
  })

  socket.on("getLeituasHidrometro", async (dados)=>{
    //console.log(dados)
    if(dados != null){
      const leituras=await model_Hidro.getLeituras(dados.url,dados.hidrometro)
      app.io.sockets.emit("atualizar_santaMonica_hidro",leituras)
    }
    
  })

  socket.on("calcular_consumo_santaMonica_hidro", async (dados)=>{
    //console.log(dados)
    const { startDate, endDate } = dados.datas;
    try {
        const retorno = await model_Hidro.getConsumo("santaMonica",dados.hidrometro,startDate,endDate)
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
          socket.emit('consumo_santaMonica_hidro', dados);
        }else{
          socket.emit('consumo_santaMonica_hidro', { error: 'Não ha leituras sufucientes necesse periodo para se calcular o consumo. Leituras = '+retorno.length });
        }
        //console.log(retorno)
    } catch (error) {
        console.error('Erro ao consultar o banco de dados:', error);
        socket.emit('consumo_santaMonica_hidro', { error: 'Erro ao buscar leituras.' });
    }
  })

  socket.on('addLeituraHidrometro_santaMonica', async (leituras) => {
    //console.log(leituras);
    retorno = await model_Hidro.addLeituras("santaMonica",leituras)
    //console.log(retorno);
    socket.emit('retornoArquivo_santaMonica', retorno);
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


// Substitua pelo token real do seu bot
const bot = new Telegraf(process.env.TELEGRAN_TOKEN);

// Inicia o bot
try{
  bot.launch()
  console.log('Bot está rodando...');
  f.sendAlerta("Servidor Mep iniciado",[process.env.CHAT_ID_DEV])
}catch(err){
  console.error('Erro ao iniciar o bot:', err);
};

// Mensagem inicial quando o bot é iniciado
bot.start((ctx) => {
  ctx.reply('Olá! Por favor, informe seu nome de usuário.');
});

// Armazena o estado do usuário
const userStates = {};

// Recebe o nome de usuário e solicita a senha
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  if (!userStates[chatId]) {
      // Armazena o nome de usuário e solicita a senha
      userStates[chatId] = { username: text };
      ctx.reply('Obrigado! Agora, informe sua senha.');
  } else {
      // Verifica o usuário e senha no banco de dados
      const result = await logar.logarTelegran(userStates[chatId].username, text,chatId);
      ctx.reply(result.msg);
      // Limpa o estado após o login
      delete userStates[chatId];
  }
});


// Trate sinais de término para parar o bot corretamente
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

//################################ Alertas ###################################

// Define o intervalo de tempo em milissegundos 
const intervalo = 1000*60*15;

// Inicia a execução periódica da função
const idIntervalo = setInterval(f.tarefaPeriodica, intervalo);


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
