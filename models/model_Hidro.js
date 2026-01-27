const db = require('./connection')
const moment = require('moment')
const { adicionarSeNaoExistir } = require('../bin/funcoes');

const getLeituras = async (cliente,medidor)=>{
    let leitura
    const sql = "SELECT id,local,data,leitura FROM tb_"+cliente+"_hidrometros WHERE id = ? ORDER BY data ASC LIMIT 2000"
    try {
        [leitura] = await db.query(sql,medidor)
        //console.log(leitura)
    } catch (error) {
        console.log(error)
        leitura = null
    }
    return leitura
}

const getUltimasLeituras = async (cliente) => {
    let leituras = []
    const sql = `
        SELECT t.id, t.local, t.data, t.leitura
        FROM tb_${cliente}_hidrometros t
        INNER JOIN (
            SELECT id, MAX(data) AS ultima_data
            FROM tb_${cliente}_hidrometros
            GROUP BY id
        ) ultimas
        ON t.id = ultimas.id AND t.data = ultimas.ultima_data
    `
    try {
        const [rows] = await db.query(sql)
        leituras = rows
    } catch (error) {
        console.log(error)
        leituras = []
    }
    return leituras
}



const addLeituras = async (cliente,dados)=>{
    const sql = "INSERT INTO tb_"+cliente+"_hidrometros (id,local,data,leitura) VALUES(?,?,?,?)"
    var i = 0;
    var n = 0;
    var log=[];
    for (let index = 0; index < dados.length; index++) {
        const element = dados[index];
        if(element!==null){
            try {
                const [s] = await db.query(sql,[element.id,element.local,element.data,element.leitura])
                i++
            } catch (error) {
                n++
                console.log(error)
                let e = {
                    leitura: element,
                    erro :error.sqlMessage
                }
                log.push(e)
            }
        }
    }
    return {inseridos:i, negados:n, log:log}
}

const addLeitura = async (cliente,dados)=>{
    adicionarSeNaoExistir(globalThis.hidrometrosDinamico, `hidro_${cliente}_${dados.id}`);

    const [[resultado]] = await db.query("SELECT hidrometros FROM usuarios WHERE url = ?  LIMIT 1",cliente)
    const parts = resultado.hidrometros.split(';');

    // Cria um objeto chave-valor
    const hidrometros = {};

    for (let i = 0; i < parts.length; i += 2) {
        const id = parts[i];
        const local = parts[i + 1];
        hidrometros[id] = local;
    }
    
    dados.local = hidrometros[dados.id]
    const d = moment(dados.data).format('YYYY-MM-DD HH:mm:ss');
    const sql = "INSERT INTO tb_"+cliente+"_hidrometros (id,local,data,leitura) VALUES(?,?,?,?)"
    const element = dados;
    try {
        const [s] = await db.query(sql,[element.id,element.local,d,element.leitura])
    
    } catch (error) {
        console.log(error)
        let e = {
            leitura: element,
            erro :error.sqlMessage
        }
        log.push(e)
    }
    return
}

const getConsumo = async (url,hidrometro,startDate,endDate)=>{
    let leituras
    let ultima
    const sql = "SELECT * FROM tb_"+url+"_hidrometros WHERE DATE(data) >= ? AND DATE(data) < ? AND id = ? ORDER BY data ASC"
    const sql2= "SELECT * FROM tb_"+url+"_hidrometros WHERE DATE(data) >= ? AND id = ? ORDER BY data ASC LIMIT 1"
    
    try {
        [leituras] = await db.query(sql,[startDate,endDate,hidrometro]);
        [ultima] = await db.query(sql2,[endDate,hidrometro]);
    } catch (error) {
        console.log(error)
    }
    leituras.push(ultima[0])
    return leituras
}

const getGrafico = async (url,hidrometro,startDate)=>{
    let leituras
    const sql = "SELECT * FROM tb_"+url+"_hidrometros WHERE DATE(data) >= ?  AND id = ? ORDER BY data ASC"
    try {
        [leituras] = await db.query(sql,[startDate,hidrometro])
        return {leituras:leituras}
    } catch (error) {
        return {error:error}
    }
}


async function getRelatorio(usuario, startDate, endDate, dispositivos) {
    try {
        //console.log("Iniciando relatório de forma eficiente...");
        //console.log(dispositivos)
        // Retorna um array vazio se não houver dispositivos para consultar
        
        const idsDispositivos = dispositivos.map(d => d.id);
        if (idsDispositivos.length === 0) {
            return {error:"nenhum dispositivo passado para obter relatorio"};
        }

        // Prepara os nomes e datas para a consulta SQL
        const tableName = `tb_${usuario}_hidrometros`;
        const formattedStartDate = moment(startDate).format('YYYY-MM-DD');
        const formattedEndDate = moment(endDate).format('YYYY-MM-DD');

        // Consulta SQL otimizada que busca todas as leituras de uma só vez
        const sql = `
            SELECT
                t.id,
                MIN(CASE WHEN t.tipo_leitura = 'inicial' THEN t.local END) AS local,
                MIN(CASE WHEN t.tipo_leitura = 'inicial' THEN t.leitura END) AS leitura_inicial,
                MIN(CASE WHEN t.tipo_leitura = 'inicial' THEN t.data END) AS data_inicial,
                MAX(CASE WHEN t.tipo_leitura = 'final' THEN t.leitura END) AS leitura_final,
                MAX(CASE WHEN t.tipo_leitura = 'final' THEN t.data END) AS data_final
            FROM (
                -- Subconsulta para encontrar as leituras de INÍCIO
                (SELECT id, local, data, leitura, 'inicial' AS tipo_leitura,
                    ROW_NUMBER() OVER(PARTITION BY id ORDER BY CASE WHEN DATE(data) = ? THEN 1 ELSE 2 END, ABS(DATEDIFF(data, ?))) as rn
                    FROM ?? WHERE id IN (?) AND data BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND DATE_ADD(?, INTERVAL 30 DAY))
                UNION ALL
                -- Subconsulta para encontrar as leituras de FIM
                (SELECT id, local, data, leitura, 'final' AS tipo_leitura,
                    ROW_NUMBER() OVER(PARTITION BY id ORDER BY CASE WHEN DATE(data) = ? THEN 1 ELSE 2 END, ABS(DATEDIFF(data, ?))) as rn
                    FROM ?? WHERE id IN (?) AND data BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND DATE_ADD(?, INTERVAL 30 DAY))
            ) AS t
            WHERE t.rn = 1
            GROUP BY t.id;
        `;

        // Parâmetros para a consulta, na ordem correta
        const params = [
            formattedStartDate, formattedStartDate, tableName, idsDispositivos, formattedStartDate, formattedStartDate,
            formattedEndDate, formattedEndDate, tableName, idsDispositivos, formattedEndDate, formattedEndDate
        ];

        // Executa a consulta no banco de dados
        const [results] = await db.query(sql, params);

        // Mapeia os resultados da consulta para o formato de objeto desejado
        const medidores = results.map(row => {
            const nomeLocal = row.local || dispositivos.find(d => d.id == row.id)?.local || 'Desconhecido';
            
            const consumoFinalBruto = parseFloat(row.leitura_final);
            const consumoInicialBruto = parseFloat(row.leitura_inicial);

            // Pula o medidor se não houver dados suficientes para calcular o consumo
            if (isNaN(consumoFinalBruto) || isNaN(consumoInicialBruto)) {
                console.warn(`Medidor ${row.id} (${nomeLocal}) não possui dados suficientes no período.`);
                return null;
            }

            // Converte os valores (divide por 1000)
            const consumoCalculado = (consumoFinalBruto - consumoInicialBruto);
            const consumoFinalConvertido = consumoFinalBruto;
            const consumoInicialConvertido = consumoInicialBruto;

            // Retorna o objeto final formatado
            return {
                consumo: {
                    startDate: moment(row.data_inicial).format('DD-MM-YYYY'),
                    startTime: moment(row.data_inicial).format('HH:mm:ss'),
                    endDate: moment(row.data_final).format('DD-MM-YYYY'),
                    endTime: moment(row.data_final).format('HH:mm:ss'),
                    valor: parseFloat(consumoCalculado.toFixed(3)),
                    endValor: parseFloat(consumoFinalConvertido.toFixed(3)),
                    startValor: parseFloat(consumoInicialConvertido.toFixed(3))
                },
                id: row.id,
                nome: nomeLocal
            };
        }).filter(Boolean); // O .filter(Boolean) remove todos os itens nulos do array

        //console.log("Dados do relatório gerados com sucesso.");
        return medidores;

    } catch (error) {
        console.error("Ocorreu um erro ao gerar o relatório eficiente:", error);
        // Em caso de erro, retorna um array vazio para não quebrar a aplicação
        return {error:error};
    }
}

async function dadosAlerta(url,id){
    try {
        const [[retorno]] = await db.query("SELECT nome,hidrometros,chatID,alertas FROM usuarios WHERE url = ?  LIMIT 1",url)
        //console.log(retorno)
        const hidrometros = retorno.hidrometros.split(";")
        let chatID = {}
        try {
            chatID = retorno.chatID.split(";")
        } catch (error) {
            return {alerta:false}
        }
        const index = hidrometros.indexOf(id.toString());
        const alartasDesabilitados = retorno.alertas ? retorno.alertas.split(";") : []
        const identificador = `${url}${"hidro"}${id}`;

        return {chatID:chatID, local: hidrometros[index+1], id: hidrometros[index],nome:retorno.nome,alerta:!alartasDesabilitados.includes(identificador)}
        
    } catch (error) {
        return {error:error}
    }
}


module.exports = {
    addLeituras,
    getUltimasLeituras,
    getLeituras,
    getConsumo,
    addLeitura,
    getRelatorio,
    getGrafico,
    dadosAlerta
}