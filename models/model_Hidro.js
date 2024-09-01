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


module.exports = {
    addLeituras,
    getLeituras
}