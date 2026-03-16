var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const rateLimit = require('express-rate-limit');


var indexRouter = require('./routes/index');
var indexRouterV2 = require('./routes/index_v2');
//var usersRouter = require('./routes/users');

// Importar a função de subscrição MQTT
const { subscribeToMqttTopics } = require('./mqtt-subscription');

var app = express();

app.set('trust proxy', 1);

// 3. CONFIGURAÇÃO DO BLOQUEIO DE SCANNER (404)
const scannerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Janela de 5 minutos
  max: 10, // Limite de 10 erros 404 por IP
  handler: (req, res, next) => {
    console.warn(`[SEGURANÇA] IP Bloqueado por excesso de 404: ${req.ip}`);
    globalThis.bot.telegram.sendMessage(process.env.CHAT_ID_DEV, `[SEGURANÇA] IP Bloqueado por excesso de 404: ${req.ip}`);
    res.status(429).render('error', {
      message: 'Acesso bloqueado temporariamente por comportamento suspeito.',
      error: { status: 429 }
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

//app.io = require('socket.io')();

// Iniciar a subscrição MQTT
subscribeToMqttTopics();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/', indexRouterV2);
app.use('/users', require('./routes/users')(app.io));

app.use(scannerLimiter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
