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
        'casa/energ'
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
                {cheio:26 , vazio:96 ,max:200, NB:40 },
            ]
            const array1 = msg.split(';');
            console.log(array1)
            const dados1 ={
                id : array1[0],
                distancia : array1[1],
                dist : distancias1[array1[0]-1],
                url :"connect",
                nome : 'Connect Tower', 
                data: data
            }
            leituraRes(dados1,io)
        break;
        case 'taguaLife/res':
            const distancias2 = [
                //Superior A
                {cheio:26 , vazio:96 ,max:200, NB:40 },
                //Superior B
                {cheio:28 , vazio:101 ,max:200, NB:40 },
                //Superior C
                {cheio:26 , vazio:77 ,max:200, NB:40 },
                //Superior D
                {cheio:24 , vazio:88 ,max:200, NB:40 },
                //Superior E
                {cheio:25 , vazio:92 ,max:200, NB:40 },
                //Superior F
                {cheio:22 , vazio:89 ,max:200, NB:40 }
            ]
            const array2 = msg.split(';');
            console.log(array2)
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
        case 'topico/luz':
        handleLuzTopic(messageStr);
        break;
        default:
        console.log(`Tópico desconhecido: ${topic} - Mensagem: ${messageStr}`);
    }
}

async function leituraRes(dados,io){
    try {
        const retorno = await model_Res.atualizarDados2(dados.data,dados.distancia,dados.dist,dados.id,dados.url,dados.nome)
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
    io.emit("atualizar_casa"+leitura.id,dados)
    f.adicionarSeNaoExistir( globalThis.medidoresEnergDinamico,`energ_${url}_${req.body.id}`)
    //console.log(leitura)
}
module.exports = { subscribeToMqttTopics };
