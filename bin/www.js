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
const _ = require("./funcoes")

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
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE usuario = ?  LIMIT 1",user)
    //console.log("usuario "+user+" logado")
    app.io.sockets.emit("return_dados_do_usuario_"+user,usuario)
  })

  socket.on("iniciarTelaBrisas", async (medidor)=>{
    const dados=await model_Energ.getDataStart(medidor,"brisas")
    console.log("atualizar brisas: "+medidor)
    app.io.sockets.emit("atualizar_brisas"+medidor,dados)
  })

  socket.on("iniciarTelaSia", async (medidor)=>{
    const dados=await model_Energ.getDataStart(medidor,"sia")
    //console.log("atualizar_sia"+medidor)
    app.io.sockets.emit("atualizar_sia"+medidor,dados)
  })

  socket.on("iniciarTelaAnchieta_Res", async (medidor)=>{
    const dados=await model_Res.getDataStart(medidor,"anchieta")
    //console.log("atualizar_anchieta: "+medidor)
    app.io.sockets.emit("atualizar_anchieta_res"+medidor,dados)
  })

  socket.on("iniciarTelaTest_Res", async (medidor)=>{
    const dados=await model_Res.getDataStart(medidor,"anchieta")
    //console.log("atualizar_anchieta: "+medidor)
    app.io.sockets.emit("atualizar_test_res"+medidor,dados)
  })

  socket.on("iniciarTelaSanta_monica_hidro", async (medidor)=>{
    const [[hidrometros]] = await db.query("SELECT hidrometros FROM usuarios WHERE url = ?  LIMIT 1","santa_monica")
    app.io.sockets.emit("atualizar_santa_monica_hidrometros",hidrometros)
  })

  socket.on("getLeituasHidrometro", async (dados)=>{
    console.log(dados)
    if(dados != null){
      const leituras=await model_Hidro.getLeituras(dados.url,dados.hidrometro)
      app.io.sockets.emit("atualizar_santa_monica_hidro",leituras)
    }
    
  })

  socket.on("calcular_consumo_santa_monica_hidro", async (dados)=>{
    console.log(dados)
    const { startDate, endDate } = dados.datas;
    try {
        //const dados=await model_Hidro.getConsumo("santa_monica",hidrometro,startDate,endDate)
        dados={
          x:"deu certo",
          l1:100,
          l2:200,
          dataL1:startDate,
          dataL2:endDate}
        socket.emit('consumo_santa_monica_hidro', { dados: [dados]});
    } catch (error) {
        console.error('Erro ao consultar o banco de dados:', error);
        socket.emit('consumo_santa_monica_hidro', { error: 'Erro ao buscar leituras.' });
    }
  })

  socket.on('addLeituraHidrometro_santa_monica', async (leituras) => {
    //console.log(leituras);
    retorno = await model_Hidro.addLeituras("santa_monica",leituras)
    //console.log(retorno);
    socket.emit('retornoArquivo_santa_monica', retorno);
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
//server.on('listening', onListening);




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
