const moment = require('moment')
const db = require('../models/connection')
const model_Eneg = require('../models/model_Energ')
const { Telegraf } = require('telegraf');
const { exec } = require("child_process");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID_DEV = process.env.CHAT_ID_DEV;           


function calculoConsumo(t_star,t_end,pt){
    pt=pt/1000 //W -> KW
    t=(t_end-t_star)/(3600000) // mS -> H
    //console.log("tempo des da ultima atualizacao: "+(t_end-t_star)/1000+"s")
    const T = pt*t
    //console.log((t_end-t_star))
    return T
  }

  function datasAnteriorers (data){
    //dedifio umtimo dia do mes anterior
    var mes = new Date(moment().format('YYYY/MM/01')).setHours(-1)
    mes = moment(mes).format('YYYY-MM-DD')
    
    //console.log(data)
    const hoje = new Date(data);
    //console.log(hoje)
    // Subtrai um dia da data atual
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    var dia = moment(ontem).format('YYYY-MM-DD')
    //console.log(`ontem: ${moment(ontem).format('YYYY-MM-DD HH:mm:ss')}`)
    return {dia: dia, mes:mes}
  }

  function instervaloDoMes(mes,ano){
    const m = mes - 1
    if(mes<10) mes = "0"+mes
    else mes= "1"+(mes-10)
    var data_inicial = moment().format(+ano+'-'+mes+'-01')
    var data_final = moment([ano, m, 1]).endOf('month').format('YYYY-MM-DD')
  return {inicial: data_inicial, final:data_final}
}

function traduzDia(str){
  str = str.replace("Mon","Seg")
  str = str.replace("Tue","Ter")
  str = str.replace("Wed","Qua")
  str = str.replace("Thu","Qui")
  str = str.replace("Fri","Sex")
  str = str.replace("Sat","Sab")
  str = str.replace("Sun","Dom")
  return str
}

function traduzMes(str){
  str = str.replace("January","Janeiro")
  str = str.replace("February","Fevereiro")
  str = str.replace("March","Março")
  str = str.replace("April","Abril")
  str = str.replace("May","Maio")
  str = str.replace("June","Junho")
  str = str.replace("July","Julho")
  str = str.replace("August","Agosto")
  str = str.replace("September","Setembro")
  str = str.replace("October","Outubro")
  str = str.replace("November","Novembro")
  str = str.replace("December","Dezembro")
  return str
}


// Função para enviar alertas com retry e captura de erros
async function sendAlerta(msg, usuarios) {
  const bot = new Telegraf(TELEGRAM_TOKEN);
  if (!usuarios || usuarios.length === 0) return;

  for (const user of usuarios) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        await bot.telegram.sendMessage(user, msg);
        console.log(`Mensagem enviada para ${user}`);
        break; // sucesso
      } catch (error) {
        attempts++;
        console.error(`Erro ao enviar para ${user}, tentativa ${attempts}:`, error.description || error);

        // Se o erro for 401, reinicia a aplicação via PM2
        if (error.code === 401) {
          console.error("Erro 401 detectado. Reiniciando aplicação via PM2...");
          const { exec } = require('child_process');
          exec('pm2 restart all', (err, stdout, stderr) => {
            if (err) console.error("Falha ao reiniciar via PM2:", err);
            else console.log("Aplicação reiniciada via PM2:", stdout);
          });
          return; // sai da função para não continuar enviando
        }

        // Espera 1 segundo antes de tentar novamente
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }
}


// Função assíncrona para gerar a lista de dispositivos
async function gerarListaDeDispositivos() {
  try {
    // Consulta ao banco de dados
    const [usuarios] = await db.query("SELECT url, reservatorio, reservatorios, energia, med_energia FROM usuarios");

    // Limpa as listas globais antes de preenchê-las
    globalThis.reservatorios = [];
    globalThis.medidoresEnerg = [];

    // Itera sobre os usuários para processar os dados
    usuarios.forEach(usuario => {
      // Processa os reservatórios
      if (usuario.reservatorio > 0) {
        const reservatorioArray = usuario.reservatorios.split(";");
        for (let i = 0; i < reservatorioArray.length; i += 2) {
          // Adiciona os reservatórios à lista global
          globalThis.reservatorios.push(`res_${usuario.url}_${reservatorioArray[i]}`);
        }
      }

      // Processa os medidores de energia
      if (usuario.energia > 0) {
        const medidorArray = usuario.med_energia.split(";");
        for (let i = 0; i < medidorArray.length; i += 2) {
          // Adiciona os medidores de energia à lista global
          globalThis.medidoresEnerg.push(`energ_${usuario.url}_${medidorArray[i]}`);
        }
      }
    });
  } catch (error) {
    console.error("Erro ao gerar lista de dispositivos:", error);
  }
}

// Função para adicionar o dispositivo na lista de dispositivos comunicado caso ele ainda não estiver presente
function adicionarSeNaoExistir(lista, dispositivo) {
  if (!lista.includes(dispositivo)) {
  lista.push(dispositivo);
  }
}


// helper: aplica timeout
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout ao enviar mensagem")), ms)
    ),
  ]);
}

// watchdog telegram
async function watchdogTelegram() {
  try {
    const bot = new Telegraf(TELEGRAM_TOKEN);
    await withTimeout(
      bot.telegram.sendMessage(CHAT_ID_DEV, "🔍 Watchdog: teste de conexão"),
      10000 // 10s
    );
    console.log("✅ Telegram OK");
    return true;
  } catch (err) {
    console.error("❌ Falha no Telegram:", err.message);
    return false;
  }
}

function reiniciarApp() {
  console.log("🔄 Reiniciando aplicação...");
  exec("pm2 restart app", (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao reiniciar: ${error.message}`);
      return;
    }
    console.log(`STDOUT: ${stdout}`);
    console.error(`STDERR: ${stderr}`);
  });
}

// Verifica se todos os dispositivos estão trasmintindo e emite alertas caso não esteja
async function tarefaPeriodica() {
  try {
    // ---- PROCESSO DOS RESERVATÓRIOS ----
    const promisesRes = globalThis.reservatorios.map(async (element) => {
      if (!globalThis.reservatoriosDinamico.includes(element)) {
        const aux = element.split("_");
        const url = aux[1];
        const id = aux[2];
        const model_Res = require("../models/model_Res");
        try {
          const retorno = await model_Res.dadosAlerta(url, id);
          const msg = `⚠️ Alerta!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})`;
          console.log(msg);
          await sendAlerta(msg, retorno.chatID);
          console.log("Mensagem enviada");
        } catch (alertError) {
          console.error(`Erro ao obter dados de alerta para ${url} (id: ${id}):`, alertError);
        }
      }
    });

    // ---- PROCESSO DOS MEDIDORES ----
    const promisesEnerg = globalThis.medidoresEnerg.map(async (element) => {
      if (!globalThis.medidoresEnergDinamico.includes(element)) {
        const aux = element.split("_");
        const url = aux[1];
        const id = aux[2];
        try {
          const retorno = await dadosAlertaEnerg(url, id);
          const msg = `⚠️ Alerta!\nLocal: ${retorno.nome}\nMedidor de energia: ${retorno.local} (id:${retorno.id})`;
          console.log(msg);
          await sendAlerta(msg, retorno.chatID);
        } catch (alertError) {
          console.error(`Erro ao obter dados de alerta para ${url} (id: ${id}):`, alertError);
        }
      }
    });

    await Promise.all(promisesRes);
    await Promise.all(promisesEnerg);

    globalThis.reservatoriosDinamico = [];
    globalThis.medidoresEnergDinamico = [];

    // ---- WATCHDOG DO TELEGRAM ----
    let ok = await watchdogTelegram();
    if (!ok) {
      ok = await watchdogTelegram(); // tenta mais uma vez
    }
    if (!ok) {
      reiniciarApp();
    }

  } catch (error) {
    console.error("Erro na tarefa periódica:", error);
  }
}

async function dadosAlertaEnerg (url,id){
    try {
        
        const [[retorno]] = await db.query("SELECT nome,med_energia,chatID FROM usuarios WHERE url = ?  LIMIT 1",url)
        //console.log(retorno)
        const med_energia = retorno.med_energia.split(";")
        const chatID = retorno.chatID.split(";")
        const index = med_energia.indexOf(id.toString());
        return {chatID:chatID, local: med_energia[index+1], id: med_energia[index],nome:retorno.nome}
        
    } catch (error) {
        return {error:error}
    }
}


module.exports = {
    calculoConsumo,
    datasAnteriorers,
    instervaloDoMes,
    traduzDia,
    traduzMes,
    sendAlerta,
    gerarListaDeDispositivos,
    adicionarSeNaoExistir,
    tarefaPeriodica
}