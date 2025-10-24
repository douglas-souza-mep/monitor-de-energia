const db = require('./connection');
const moment = require('moment-timezone');
require('dotenv').config();

// Funções auxiliares copiadas de model_Energ.js para garantir a lógica de estrutura de tabela
const isNewStructureCondominium = async (usuario) => {
    const usuariosNewStructure = process.env.USUARIOS_NEW_STRUCTURE
    ? process.env.USUARIOS_NEW_STRUCTURE.split(',').map(u => u.trim())
    : [];
    return usuariosNewStructure.includes(usuario);
};

function getTableName(condominio, medidorId, tipoTabela, isNewStructure) {
    if (isNewStructure) {
        // Para a nova estrutura, a tabela de dados dos medidores é única e tem a coluna id_medidor
        switch (tipoTabela) {
            case 'dados':
                return `tb_${condominio}_medidores`;
            case 'consumo_diario':
                return `tb_${condominio}_consumo_diario`;
            default:
                throw new Error('Tipo de tabela inválido');
        }
    } else {
        // Para a estrutura antiga, cada medidor tem sua própria tabela
        switch (tipoTabela) {
            case 'dados':
                return `tb_${condominio}_m${medidorId}`;
            case 'consumo_diario':
                return `tb_${condominio}_cd_m${medidorId}`;
            default:
                throw new Error('Tipo de tabela inválido');
        }
    }
}

// Função para buscar os dados do usuário e a lista de medidores
const getUsuarioAndMedidores = async (url) => {
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE url = ? LIMIT 1", [url]);
    
    if (!usuario) {
        return { usuario: null, medidoresInfo: [] };
    }

    // A coluna med_energia contém: "id;local;id;local;..."
    const medidoresInfo = usuario.med_energia
        .split(';')
        .filter((_, index) => index % 2 === 0) // Filtra apenas os IDs (posições pares)
        .map((id, index) => ({
            id: parseInt(id),
            local: usuario.med_energia.split(';')[index * 2 + 1]
        }))
        .filter(m => !isNaN(m.id) && m.local); // Remove entradas inválidas

    return { usuario, medidoresInfo };
};


// Nova função otimizada para obter o resumo de todos os medidores em uma única consulta
const getResumoMedidores = async (medidoresInfo,url) => {
    
    if (medidoresInfo.length === 0) {
        return [];
    }

    const useNewStructure = await isNewStructureCondominium(url);
    let resumoMedidores = [];

    // --- Lógica para Estrutura Antiga (N tabelas) ---
    // Fazendo um loop e buscando a última leitura e o consumo diário para cada medidor.
    // Isso ainda é N+1 requisições no backend, mas o frontend faz apenas 1.
    if (!useNewStructure) {
        for (const medidor of medidoresInfo) {
            const tableNameDados = getTableName(url, medidor.id, 'dados', false);
            const tableNameCD = getTableName(url, medidor.id, 'consumo_diario', false);
            
            // 1. Busca a última leitura (pft e data)
            const sqlLeitura = `SELECT pft, data FROM ${tableNameDados} ORDER BY data DESC LIMIT 1`;
            const [[ultimaLeitura]] = await db.query(sqlLeitura);

            // 2. Busca o consumo diário de hoje
            const hoje = moment().format('YYYY-MM-DD');
            const sqlConsumo = `SELECT valor FROM ${tableNameCD} WHERE DATE(data) = ? LIMIT 1`;
            const [[consumoDiario]] = await db.query(sqlConsumo, [hoje]);

            if (ultimaLeitura) {
                resumoMedidores.push({
                    id: medidor.id,
                    local: medidor.local,
                    pft: ultimaLeitura.pft,
                    data: moment(ultimaLeitura.data).format('YYYY-MM-DD HH:mm:ss'),
                    consumoDiario: consumoDiario ? consumoDiario.valor : 0
                });
            }
        }
        return resumoMedidores;
    }

    // --- Lógica para Estrutura Nova (1 tabela) ---
    // Tentativa de otimizar para 1 ou 2 consultas principais.
    const tableNameDados = getTableName(url, null, 'dados', true);
    const tableNameCD = getTableName(url, null, 'consumo_diario', true);
    const medidorIds = medidoresInfo.map(m => m.id);

    // 1. Obter a última leitura (pft e data) para todos os medidores
    // Usando Window Function (MySQL 8+) ou Subquery (se for MySQL < 8)
    // Vamos usar a Window Function por ser mais eficiente
    const sqlUltimasLeituras = `
        WITH RankedData AS (
            SELECT 
                id_medidor, pft, data,
                ROW_NUMBER() OVER(PARTITION BY id_medidor ORDER BY data DESC) as rn
            FROM ${tableNameDados}
            WHERE id_medidor IN (${medidorIds.join(',')})
        )
        SELECT id_medidor, pft, data
        FROM RankedData
        WHERE rn = 1
    `;
    const [ultimasLeituras] = await db.query(sqlUltimasLeituras);
    const leiturasMap = new Map(ultimasLeituras.map(l => [l.id_medidor, l]));

    // 2. Obter o consumo diário de hoje para todos os medidores
    const hoje = moment().format('YYYY-MM-DD');
    const sqlConsumoDiario = `
        SELECT id_medidor, valor
        FROM ${tableNameCD}
        WHERE DATE(data) = ? AND id_medidor IN (${medidorIds.join(',')})
    `;
    const [consumosDiarios] = await db.query(sqlConsumoDiario, [hoje]);
    const consumosMap = new Map(consumosDiarios.map(c => [c.id_medidor, c.valor]));

    // 3. Consolidar os dados
    resumoMedidores = medidoresInfo.map(medidor => {
        const leitura = leiturasMap.get(medidor.id);
        const consumo = consumosMap.get(medidor.id);

        return {
            id: medidor.id,
            local: medidor.local,
            pft: leitura ? leitura.pft : null,
            data: leitura ? moment(leitura.data).format('YYYY-MM-DD HH:mm:ss') : null,
            consumoDiario: consumo || 0
        };
    });
    
    return resumoMedidores;
};

module.exports = {
    getUsuarioAndMedidores, // Exporta para ser usado na rota v2
    getResumoMedidores
};

