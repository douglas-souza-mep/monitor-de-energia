const mqtt = require('mqtt');
const model_Energ = require('./models/model_Energ')
const model_Res = require('./models/model_Res')
const model_Hidro = require('./models/model_Hidro')
const moment = require('moment');


// Função para conectar ao broker MQTT e subscrever vários tópicos
function subscribeToMqttTopics() {

    const client = mqtt.connect(process.env.MQTTBROKER, {
    username: process.env.usernameMQTT,
    password: process.env.passwordMQTT
    });

    client.on('connect', () => {
        console.log('Conectado ao broker MQTT');

        // Lista de tópicos para subscrever
        const topics = process.env.TOPICS
        ? process.env.TOPICS.split(',').map(t => t.trim())
        : [];

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
    tratarLeitura(client,topic,messageStr,data)
    });

    client.on('error', (err) => {
        console.error('Erro de conexão MQTT', err);
    });
}

 // Funções de tratamento para cada tópico

async function tratarLeitura(client,topico,msg,data){
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
            leituraRes(dados,client)
        break;
        case 'connect/res':
            dados.url = "connect"
            dados.nome = 'Connect Towers', 
            dados.dist = await model_Res.getInfo("connect",array[0])
            leituraRes(dados,client)
        break;
        case 'taguaLife/res':
            dados.url = "taguaLife"
            dados.nome = 'Tagua Life', 
            dados.dist = await model_Res.getInfo("taguaLife",array[0])
            leituraRes(dados,client)
        break;
        case 'casa/energ':
            leituraEnerg(data,msg,"casa",client)
        break;
        case 'santaMonica/energ':
            leituraEnerg(data,msg,"santaMonica",client)
        break;
        case 'HospitalBase/energ':
            //console.log(msg)
            leituraEnerg(data,msg,"HospitalBase",client)
        break;
        case 'HospitalBase/hidro':
            leituraHidro(data,msg,"HospitalBase",client,223700)
            //console.log(msg)
        break;
        default:
        console.log(`Tópico desconhecido: ${topico} - Mensagem: ${msg}`);
    }
}

async function leituraRes(dados,client){
    //console.log(dados)
    try {
        const retorno = await model_Res.atualizarDados(dados.data,dados.distancia,dados.dist,dados.id,dados.url,dados.nome,dados.modoOP)
        if(retorno.erro){
            console.log(retorno.erro)
            return
            }
        leitura = retorno.leitura,
        leitura.data = moment(dados.data).format('DD-MM-YYYY HH:mm:ss');
        // Serializar o objeto para JSON
        const mensagem = JSON.stringify(leitura);
        client.publish(`${dados.url}/atualizarTela/res`, mensagem, (err) => {
            if (err) {
                console.error('Erro ao publicar mensagem:', err);
            }
        })
        model_Res.verificarAlarmes(dados.id,dados.dist,leitura,dados.url,dados.data)
    } catch (error) {
        console.log(error)
    }
}

async function leituraEnerg(data,msg,url,client) {
    let leitura = JSON.parse(msg);
    const retorno = await model_Energ.atualizarDados(leitura,data,leitura.id,url)
    leitura.data = moment(data).format('DD-MM-YYYY HH:mm:ss');
    var dados = {
        id:leitura.id,
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
    const mensagem = JSON.stringify(dados);
        client.publish(`${url}/atualizarTela/energ`, mensagem, (err) => {
            if (err) {
                console.error('Erro ao publicar mensagem:', err);
            }
        })
    //console.log(leitura)
}

async function leituraHidro(data,msg,url,client,setPoit) {
    let leitura = JSON.parse(msg);
    //console.log(leitura)
    let dados ={
        id:leitura.id,
        data: data,
        leitura: parseInt(parseFloat(leitura.consumo)+setPoit)
        }
    retorno = await model_Hidro.addLeitura(url,dados)
    dados.data = moment(dados.data).format('DD-MM-YYYY HH:mm:ss');
    //console.log(dados);
    const mensagem = JSON.stringify(dados);
    client.publish(`${url}/atualizarTela/hidro`, mensagem, (err) => {
        if (err) {
            console.error('Erro ao publicar mensagem:', err);
        }
    })
}
module.exports = { subscribeToMqttTopics };
