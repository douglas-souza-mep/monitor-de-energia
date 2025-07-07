//  Carrega a API de visualização e o pacote corechart.
google.charts.load('current', {'packages':['corechart']});
const url = "HospitalBase"
const socket = io();

let hidrometro = $('#hidrometros option:selected').val()

$('#hidrometros').on('change', () => {
    hidrometro = $('#hidrometros option:selected').val()
    console.log(hidrometro)
    socket.emit("getLeituasHidrometro_hospitalBase",{hidrometro, url:url})

})

socket.on("connect", () => {
    console.log(socket.id);
    socket.emit("iniciarTelahospitalBase_hidro") 
    console.log("iniciartela" )
});

socket.on("atualizar_hospitalBase_hidrometros", async (dados) => {
     // Obtém o elemento select
    const select = document.getElementById('hidrometros');
    const lista = dados.hidrometros.split(';');
    await criarSelect(lista,select)

    hidrometro = $('#hidrometros option:selected').val()
    console.log(hidrometro)
    socket.emit("getLeituasHidrometro_hospitalBase",{hidrometro, url:url})
})
var hidrometros = [];
fetch('/get-dados-do-usuario', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: url }) // Envia o dado da URL como JSON
})
.then(response => response.json())
.then(dados => {
    
    let text = dados.hidrometros.split(";")
    console.log(text)
    for (let i = 0; i < text.length; i+=2) {
        hidrometros.push({id:text[i], local:text[i+1]})
    }
})
.catch(err => {
    console.error('Erro ao obter dados do usuário:', err);
  //  loadingPopup.style.display = 'none'; // Esconde o pop-up em caso de erro
});


// Função para obter o relatório geral
function obterRelatorio(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Coleta os valores do formulário
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // Envia os dados para o servidor usando Socket.IO
    info = {
        hidrometros:hidrometros,
        datas: { startDate, endDate },
        url:url
    };

    fetch('/get-relatorio/hidro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ info: info }) // Envia o dado da URL como JSON
    })
    .then(response => response.json())
    .then(dados =>{
        const resultDiv = document.getElementById('result');
        //console.log(dados)
        if (dados.error) {
            resultDiv.innerHTML = `<p style="color: red;">${dados.error}</p>`;
        } else {
            resultDiv.innerHTML = `<p style="color: blue;">Dados do relatorio obtido com sucesso! Baixad</p>`;
            //console.log(dados)
            // Definir o cabeçalho do CSV
            const cabecalho = ['Local', 'id', 'Consumo(m3)', 'Data inicial', 'Leitura Inicial','Data final','Leitura Final'];
            
            // Inicializar a string do CSV com o cabeçalho
            let csvContent = cabecalho.join(';') + '\n';
            
            // Iterar sobre o array de dados e adicionar cada linha ao CSV
            dados.forEach(dados => {
                const linha = [
                    dados.nome,
                    dados.id,
                    dados.consumo.valor,
                    dados.consumo.startDate,
                    dados.consumo.start.valor,
                    dados.consumo.endDate,
                    dados.consumo.end.valor
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

document.getElementById('event-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Coleta os valores do formulário
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // Envia os dados para o servidor usando Socket IO
    socket.emit("calcular_consumo_hospitalBase_hidro",{hidrometro: hidrometro , datas:{startDate, endDate} })
});


// Ouve eventos de resposta do servidor
socket.on('consumo_hospitalBase_hidro', (dados) => {
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
            </div>
        `;
        
    }
});


socket.on('atualizar_hospitalBase_hidro', (dados) => {
    //console.log(dados)
   try {
        if(dados[0].id == hidrometro){
            atualizar(dados)
           }  
    } catch (error) {
        console.log("hidrometro não encontrado")
        console.log(dados)
        console.log(error)
    }
    
});

async function  atualizar (dados){
  
  // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
    await google.charts.setOnLoadCallback(drawChart(dados));
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
    console.log(dados)
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

async function criarSelect(lista,select) {
    console.log(lista)
    for (let index = 0; index < lista.length; index += 2) {

        // Cria um novo elemento option
        const option = document.createElement('option');
        option.value = lista[index]
        option.textContent = lista[index+1]

        // Adiciona a opção ao select
        select.appendChild(option);
        
    }   
}
