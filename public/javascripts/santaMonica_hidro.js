//  Carrega a API de visualização e o pacote corechart.
google.charts.load('current', {'packages':['corechart']});
const loadingPopup = document.getElementById('loadingPopup');
google.charts.setOnLoadCallback(iciniarPagina);
const url = "santaMonica"
const socket = io();

socket.on("connect", () => {
    console.log(socket.id);
});

const select = document.getElementById('hidrometros');
var hidrometro = $('#hidrometros option:selected').val()
var hidrometros = [];

$('#hidrometros').on('change', () => {
    hidrometro = $('#hidrometros option:selected').val()
    console.log(hidrometro)
    obterLeituras(url,hidrometro)
})

function iciniarPagina() {
    console.log("iniciartela" )
    fetch('/get-dados-do-usuario', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }) // Envia o dado da URL como JSON
    })
    .then(response => response.json())
    .then(async dados =>  {
        //console.log(dados)
        let text = dados.hidrometros.split(";")
        await criarSelect(text,select)
        for (let i = 0; i < text.length; i+=2) {
            hidrometros.push({id:text[i], local:text[i+1]})
        }
        
    }).then(()=>{
        select.value = hidrometros[0].id
        hidrometro = $('#hidrometros option:selected').val()
        obterLeituras(url,hidrometro)
    })
    .catch(err => {
        console.error('Erro ao obter dados do usuário:', err);
        loadingPopup.style.display = 'none'; // Esconde o pop-up em caso de erro
    });
    
}


// Adiciona os ouvintes de evento para os botões
document.getElementById('calcular').addEventListener('click', calcularConsumo);
document.getElementById('relatorio').addEventListener('click', obterRelatorio); 



document.getElementById('upload-button').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        const content = reader.result;
        
        // Divide o conteúdo por linhas
        const lines = content.split('\n');

        // Divide cada linha por tabulação
        const leituras = lines.map(line => {
            const l = line.split('\t')
            if(l[21]==undefined){
                return
            }
            const data = l[21].split('/')
            return {
                id:l[9],
                local:l[15],
                data:data[2]+"/"+data[1]+"/"+data[0]+" "+l[22],
                leitura:l[23]
            }
        });
        // Envia o conteúdo do arquivo para o servidor
        socket.emit('addLeituraHidrometro_santaMonica', leituras);

        // Atualiza o status
        document.getElementById('retornoArquivo').innerText = 'Enviando arquivo ...';
    };

    reader.onerror = () => {
        document.getElementById('retornoArquivo').innerText = 'Erro ao ler o arquivo.';
    };

    reader.readAsText(file);
});

socket.on('retornoArquivo_santaMonica', (retorno) => {
    const arquivoDiv = document.getElementById('retornoArquivo');

    if (retorno.negados>0) {
        console.log(retorno)
        arquivoDiv.innerHTML = `<h3> Leituras carregadas: ${retorno.inseridos}</h3>`+
                                `<h3> Leituras não carregadas: ${retorno.negados}</h3>` + retorno.log.map(e => `
            <div "scrollbox"style="color: red;">
                <p><strong>Erro:</strong> ${e.erro}</p>
            </div>
        `).join('');
    } else {
       arquivoDiv.innerHTML = `<h3> Leituras carregadas: ${retorno.inseridos}</h3>`
    }
})

function obterLeituras(url,hidrometro) {
    console.log("pedir dados")
    console.log(hidrometro)
    fetch('/get_leituras/hidro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({hidrometro:hidrometro, url:url}) // Envia o dado da URL como JSON
    })
    .then(response => response.json())
    .then(dados=> {
        //console.log(dados)
        try {
            if(dados[0].id == hidrometro){
                drawChart(dados)
            }  
        } catch (error) {
            console.log("hidrometro não encontrado")
            console.log(dados)
            console.log(error)
        }
        loadingPopup.style.display = 'none'; // Esconde o pop-up 
    })
}

// Função para obter o relatório geral
function obterRelatorio(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Coleta os valores do formulário
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    info = {
        hidrometros:hidrometros,
        datas: { startDate, endDate },
        url:url
    };

    fetch('/get_relatorio/hidro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ info: info }) // Envia o dado da URL como JSON
    })
    .then(response => response.json())
    .then(dados =>{
        const resultDiv = document.getElementById('result');
        if (dados.error) {
            resultDiv.innerHTML = `<p style="color: red;">${dados.error}</p>`;
        } else {
            resultDiv.innerHTML = `<p style="color: blue;">Dados do relatorio obtido com sucesso! Baixando</p>`;
            //console.log(dados)
            // Definir o cabeçalho do CSV
            const cabecalho = ['id', 'local', 'Consumo(m3)', 'Data inicial','Hora inicial', 'Leitura Inicial','Data final','Hora final','Leitura Final'];

            // Inicializar a string do CSV com o cabeçalho
            let csvContent = cabecalho.join(';') + '\n';
            
            // Iterar sobre o array de dados e adicionar cada linha ao CSV
            dados.forEach(dados => {
                const linha = [
                    dados.id,
                    dados.nome,
                    dados.consumo.valor,
                    dados.consumo.startDate,
                    dados.consumo.startTime,
                    dados.consumo.startValor,
                    dados.consumo.endDate,
                    dados.consumo.endTime,
                    dados.consumo.endValor
                ];
                csvContent += linha.join(';') + '\n';
            });
            
            // Criar o arquivo CSV e disparar o download
            const link = document.createElement('a');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            link.href = URL.createObjectURL(blob);
            link.download = `Consumo_de_Agua_Santa_Monica.csv`; // Nome do arquivo CSV
            
            resultDiv.innerHTML = `<p style="color: blue;">iniciando dowload</p>`;
            link.click(); 
        }
        loadingPopup.style.display = 'none'; // Esconde o pop-up
    });
}

function calcularConsumo(event) {
    event.preventDefault(); // Impede o envio padrão do formulário
    // Coleta os valores do formulário
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    info = {
        hidrometro:hidrometro,
        datas: { startDate, endDate },
        url:url
    };

    fetch('/get_consumo/hidro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ info: info }) // Envia o dado da URL como JSON
    })
    .then(response => response.json())
    .then(dados =>{
        const resultDiv = document.getElementById('result');
        console.log(dados)
        if (dados.error) {
            resultDiv.innerHTML = `<p style="color: red;">${dados.error}</p>`;
        } else {
            drawChartConsumo(dados.grafico,dados.id,dados.local)
            var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            resultDiv.innerHTML = '<h2>Consumo calculado com base nas leituras encontradas:</h2>' + `
                <div>
                    <p><strong>Local:</strong> ${dados.local}</p>
                    <p><strong>Data Início:</strong> ${new Date(dados.dataL1).toLocaleDateString('pt-BR',options)}</p>
                    <p><strong>Data Término:</strong> ${new Date(dados.dataL2).toLocaleDateString('pt-BR',options)}</p>
                    <p><strong>Consumo:</strong> ${dados.consumo/1000} m<sup>3</sup></p>
                </div>`;
                
        }
    });
}

async function drawChart(dados) {
    var grafico = []
    //console.log(dados)
    if (Array.isArray(dados)) {
        dados.forEach(element => {
            grafico.push([new Date(element.data), element.leitura/1000]);
        });
    } else {
        console.error('Dados fornecidos não são um array.');
    }
    //console.log(grafico)

    // Cria a tabela de dados.
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Data');
    data.addColumn('number', 'Leitura');
    data.addRows(grafico);
   // console.log(dados.semestral)
    // Set chart options
    var options = {
        title:'Leituras: ' + dados[0].local+" ("+dados[0].id+")",
        hAxis: {
            title: 'data', 
            format: 'dd-MM-yy', // Formato da data no eixo horizontal
            titleTextStyle: {color: '#333'}},
        vAxis: {title: 'leitura (em m3)'},
        series: {
            0: {lineWidth: 2} // largura da linha
        },
        pointSize: 5, // tamanho dos pontos
        pointShape: 'circle', // forma dos pontos
        colors: ['#1c91c0'], // cor da linha e dos pontos
        tooltip: {
            isHtml: true, // Permite HTML no tooltip
            trigger: 'selection' // Exibe tooltip ao selecionar um ponto
        }
    }

     // Função para formatar o tooltip
    function formatTooltip(date, value) {
        var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' };
        var formattedDate = date.toLocaleDateString('pt-BR', options);
        return `<div><strong>Data e Hora:</strong> ${formattedDate}<br><strong>Leitura:</strong> ${value}</div>`;
    }

     // Modifica os dados para incluir o tooltip HTML
    var formattedData = [];
    for (var i = 0; i < data.getNumberOfRows(); i++) {
        var date = data.getValue(i, 0);
        var value = data.getValue(i, 1);
        var tooltip = formatTooltip(date, value);
        formattedData.push([date, value, tooltip]);
    }

    // Cria uma nova tabela com os dados formatados
    var dataWithTooltip = google.visualization.arrayToDataTable([
        ['Data', 'Leitura', { role: 'tooltip', type: 'string', p: { html: true } }],
        ...formattedData
    ]);

    // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.AreaChart(document.getElementById('chart_leituras'));
    chart.draw(dataWithTooltip, options);
}

async function drawChartConsumo(dados,id,local) {
    let grafico = []
    //console.log(dados)
    await dados.forEach(element => {
        grafico.push([new Date(element[0]), element[1]/1000]);
      });
    // Cria a tabela de dados.
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Data');
    data.addColumn('number', 'Leitura');
    data.addRows(grafico);
   // console.log(dados.semestral)
 
    // Set chart options
    var options = {
        title:'Leituras: ' + local+" ("+id+")",
        hAxis: {
            title: 'data', 
            format: 'dd-MM-yy', // Formato da data no eixo horizontal
            titleTextStyle: {color: '#333'}},
        vAxis: {title: 'leitura (em m3)'},
        series: {
            0: {lineWidth: 2} // largura da linha
          },
        pointSize: 5, // tamanho dos pontos
        pointShape: 'circle', // forma dos pontos
        colors: ['#1c91c0'], // cor da linha e dos pontos
        tooltip: {
            isHtml: true, // Permite HTML no tooltip
            trigger: 'selection' // Exibe tooltip ao selecionar um ponto
          }
    }

     // Função para formatar o tooltip
    function formatTooltip(date, value) {
        var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };//timeZoneName: 'short' };
        var formattedDate = date.toLocaleDateString('pt-BR', options);
        return `<div><strong>Data e Hora:</strong> ${formattedDate}<br><strong>Leitura:</strong> ${value}</div>`;
    }

     // Modifica os dados para incluir o tooltip HTML
     var formattedData = [];
     for (var i = 0; i < data.getNumberOfRows(); i++) {
       var date = data.getValue(i, 0);
       var value = data.getValue(i, 1);
       var tooltip = formatTooltip(date, value);
       formattedData.push([date, value, tooltip]);
     }

     // Cria uma nova tabela com os dados formatados
     var dataWithTooltip = google.visualization.arrayToDataTable([
       ['Data', 'Leitura', { role: 'tooltip', type: 'string', p: { html: true } }],
       ...formattedData
     ]);

    // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.AreaChart(document.getElementById('chart_consumo'));
    chart.draw(dataWithTooltip, options);
}

function criarSelect(lista,select) {
    for (let index = 0; index < lista.length; index += 2) {

        // Cria um novo elemento option
        const option = document.createElement('option');
        option.value = lista[index]
        option.textContent = lista[index+1]

        // Adiciona a opção ao select
        select.appendChild(option);
        
    }   
}
