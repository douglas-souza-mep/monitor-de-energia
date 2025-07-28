const db = require('./connection')
const moment = require('moment')

const getLeituras = async (cliente,medidor)=>{
    let leitura
    const sql = "SELECT id,local,data,leitura FROM tb_"+cliente+"_hidrometros WHERE id = ? ORDER BY data"
    try {
        [leitura] = await db.query(sql,medidor)
        //console.log(leitura)
    } catch (error) {
        console.log(error)
        leitura = null
    }
    return leitura
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
    const [[resultado]] = await db.query("SELECT hidrometros FROM usuarios WHERE url = ?  LIMIT 1","HospitalBase")
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
    const sql = "SELECT * FROM tb_"+url+"_hidrometros WHERE DATE(data) >= ? AND DATE(data) <= ? AND id = ? ORDER BY data ASC"
    try {
        [leituras] = await db.query(sql,[startDate,endDate,hidrometro])
    } catch (error) {
        console.log(error)
    }
    return leituras
}


async function getRelatorio(usuario, startDate, endDate, dispositivos) {
    try {
        console.log("Iniciando relatório de forma eficiente...");

        const idsDispositivos = dispositivos.map(d => d.id);
        if (idsDispositivos.length === 0) {
            return [];
        }

        const tableName = `tb_${usuario}_hidrometros`;
        const formattedStartDate = moment(startDate).format('YYYY-MM-DD');
        const formattedEndDate = moment(endDate).format('YYYY-MM-DD');

        const sql = `
            SELECT
                t.id,
                MIN(CASE WHEN t.tipo_leitura = 'inicial' THEN t.local END) AS local,
                MIN(CASE WHEN t.tipo_leitura = 'inicial' THEN t.leitura END) AS leitura_inicial,
                MIN(CASE WHEN t.tipo_leitura = 'inicial' THEN t.data END) AS data_inicial,
                MAX(CASE WHEN t.tipo_leitura = 'final' THEN t.leitura END) AS leitura_final,
                MAX(CASE WHEN t.tipo_leitura = 'final' THEN t.data END) AS data_final
            FROM (
                (SELECT id, local, data, leitura, 'inicial' AS tipo_leitura,
                    ROW_NUMBER() OVER(PARTITION BY id ORDER BY CASE WHEN DATE(data) = ? THEN 1 ELSE 2 END, ABS(DATEDIFF(data, ?))) as rn
                    FROM ?? WHERE id IN (?) AND data BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND DATE_ADD(?, INTERVAL 30 DAY))
                UNION ALL
                (SELECT id, local, data, leitura, 'final' AS tipo_leitura,
                    ROW_NUMBER() OVER(PARTITION BY id ORDER BY CASE WHEN DATE(data) = ? THEN 1 ELSE 2 END, ABS(DATEDIFF(data, ?))) as rn
                    FROM ?? WHERE id IN (?) AND data BETWEEN DATE_SUB(?, INTERVAL 30 DAY) AND DATE_ADD(?, INTERVAL 30 DAY))
            ) AS t
            WHERE t.rn = 1
            GROUP BY t.id;
        `;

        const params = [
            // Parâmetros para a subconsulta INICIAL
            formattedStartDate, formattedStartDate, tableName, idsDispositivos, formattedStartDate, formattedStartDate,
            // Parâmetros para a subconsulta FINAL
            formattedEndDate, formattedEndDate, tableName, idsDispositivos, formattedEndDate, formattedEndDate
        ];

        const [results] = await db.query(sql, params);

        const medidores = results.map(row => {
            // Se 'local' for nulo na consulta, usa o da lista original
            const nomeLocal = row.local || dispositivos.find(d => d.id == row.id)?.local || 'Desconhecido';
            
            const consumoFinal = parseFloat(row.leitura_final);
            const consumoInicial = parseFloat(row.leitura_inicial);

            // Tratamento para caso não encontre uma das leituras
            if (isNaN(consumoFinal) || isNaN(consumoInicial)) {
                console.warn(`Medidor ${row.id} (${nomeLocal}) sem dados suficientes no período.`);
                return null; // Será filtrado depois
            }

            return {
                consumo: {
                    startDate: moment(row.data_inicial).format('DD-MM-YYYY'),
                    endDate: moment(row.data_final).format('DD-MM-YYYY'),
                    valor: parseFloat((consumoFinal - consumoInicial).toFixed(2)),
                    endValor: consumoFinal.toFixed(2),
                    startValor: consumoInicial.toFixed(2)
                },
                id: row.id,
                nome: nomeLocal
            };
        }).filter(Boolean); // Remove os medidores que retornaram null

        console.log("Dados do relatório enviados de forma eficiente.");
        return medidores;

    } catch (error) {
        console.error("Erro ao gerar relatório eficiente:", error);
        return [{error: error}];
    }
}

module.exports = {
    addLeituras,
    getLeituras,
    getConsumo,
    addLeitura,
    getRelatorio
}