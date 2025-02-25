const mqtt = require('mqtt');
const model_Energ = require('./models/model_Energ')
const model_Res = require('./models/model_Res')
const moment = require('moment')


// Função para conectar ao broker MQTT e subscrever vários tópicos
function subscribeToMqttTopics(io) {

    const client = mqtt.connect(process.env.MQTTBROKER, {
    username: process.env.usernameMQTT,
    password: process.env.passwordMQTT
    });

    client.on('connect', () => {
        console.log('Conectado ao broker MQTT');

        // Lista de tópicos para subscrever
        const topics = [
            'test/res',
            //'santaMonica/energ',
            'connect/res',
            'taguaLife/res',
            //'casa/energ'
        ];

        // Subscrição em múltiplos tópicos
        client.subscribe(topics, (err) => {
            if (err) {
                console.error('Erro ao subscrever aos tópicos', err);
            } else {
                console.log('Subscrito aos tópicos:', topics.join(', '));
            }
        });
    });

    client.on('message', (topic, message) => {
    // Converte a mensagem em string
    console.log(`topico: ${topic}`)
    console.log(`Mensagem: ${message}`)
    var d = new Date();
    var data = d.setHours(d.getHours() - 3)
    const messageStr = message.toString();
    tratarLeitura(io,topic,messageStr,data)
    });

    client.on('error', (err) => {
        console.error('Erro de conexão MQTT', err);
    });
}

 // Funções de tratamento para cada tópico

async function tratarLeitura(io,topico,msg,data){
    const array = msg.split(';'); 
    var dados = {
        id : array[0],
        distancia : array[1],
        modoOP : array[2],
        data: data
    };
    switch (topico) {
        case 'test/res':
            dados.url = "test"
            dados.nome = 'Teste', 
            dados.dist = await model_Res.getInfo("test",array[0])
            leituraRes(dados,io)
        break;
        case 'connect/res':
            dados.url = "connect"
            dados.nome = 'Connect Towers', 
            dados.dist = await model_Res.getInfo("connect",array[0])
            leituraRes(dados,io)
        break;
        case 'taguaLife/res':
            dados.url = "taguaLife"
            dados.nome = 'Tagua Life', 
            dados.dist = await model_Res.getInfo("taguaLife",array[0])
            leituraRes(dados,io)
        break;
        case 'casa/energ':
            leituraEnerg(data,msg,"casa",io)
        break;
        case 'santaMonica/energ':
            leituraEnerg(data,msg,"santaMonica",io)
        break;
        default:
        console.log(`Tópico desconhecido: ${topico} - Mensagem: ${msg}`);
    }
}

async function leituraRes(dados,io){
    dados.dist.max = 200
    //console.log(dados)
    try {
        const retorno = await model_Res.atualizarDados(dados.data,dados.distancia,dados.dist,dados.id,dados.url,dados.nome,dados.modoOP)
        if(retorno.erro){
            console.log("erro")
            return
            }
        leitura = retorno.leitura,
        leitura.data = moment(dados.data).format('DD-MM-YYYY HH:mm:ss')
        io.emit("atualizar_"+dados.url+"_res",{leitura})
        model_Res.verificarAlarmes(dados.id,dados.dist,leitura,dados.url,dados.data)
    } catch (error) {
        console.log(error)
    }
}

async function leituraEnerg(data,msg,url,io) {
    let leitura = JSON.parse(msg);
    const retorno = await model_Energ.atualizarDados(leitura,data,leitura.id,url)
    leitura.data = moment(data).format('DD-MM-YYYY HH:mm:ss')

    var dados = {
        leitura:leitura,
        consumos:{
            consumo: retorno.consumos.consumo,
            consumoDiaAnterior: retorno.consumos.consumoDiaAnterior,
            consumoMensal:  retorno.consumos.consumoMensal,
            consumoMesAnterior: retorno.consumos.consumoMesAnterior
        },
        graficos:{
            diario: retorno.graficos.diario,
            semanal: retorno.graficos.semanal,
            semestral: retorno.graficos.semestral
        }
    }
    io.emit("atualizar_"+url+leitura.id,dados)
    //console.log(leitura)
}
module.exports = { subscribeToMqttTopics };
