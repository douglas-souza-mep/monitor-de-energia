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
        'connect/res',
        'taguaLife/res',
        'casa/energ',
        'santaMonica/energ'
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
    //console.log(`topico: ${topic}`)
    //console.log(`Mensagem: ${message}`)
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
    switch (topico) {
        case 'connect/res':
            const distancias1 = [
                //Superior
                {cheio:27 , vazio:125 ,max:200, NB:30 }
            ]
            const array1 = msg.split(';');
            //console.log(array1)
            const dados1 ={
                id : array1[0],
                distancia : array1[1],
                dist : distancias1[array1[0]-1],
                modoOP : array1[2],
                url :"connect",
                nome : 'Connect Towers', 
                data: data
            }
            leituraRes(dados1,io)
        break;
        case 'taguaLife/res':
            const distancias2 = [
                //Superior A
                //{cheio:26 , vazio:96 ,max:200, NB:40 },
                {cheio:20 , vazio:96 ,max:200, NB:35, NA:102 },
                //Superior B
                {cheio:28 , vazio:92 ,max:200, NB:35, NA:105 },
                //Superior C
                //cheio:26 , vazio:77 ,max:200, NB:40 },
                {cheio:20 , vazio:85 ,max:200, NB:35, NA:102 },
                //Superior D
                //{cheio:24 , vazio:88 ,max:200, NB:40 },
                {cheio:33 , vazio:88 ,max:200, NB:35, NA:105 },
                //Superior E
                {cheio:25 , vazio:92 ,max:200, NB:30, NA:105 },
                //Superior F
                //{cheio:22 , vazio:89 ,max:200, NB:40 }
                {cheio:26 , vazio:93 ,max:200, NB:30, NA:105}
            ]
            const array2 = msg.split(';');
            //console.log(array2)
            const dados2 ={
                id : array2[0],
                distancia : array2[1],
                dist : distancias2[array2[0]-1],
                url :"taguaLife",
                nome : 'Tagua Life', 
                data: data
            }
            leituraRes(dados2,io)
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
