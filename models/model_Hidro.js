const db = require('./connection')

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

module.exports = {
    addLeituras,
    getLeituras,
    getConsumo
}