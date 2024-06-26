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
