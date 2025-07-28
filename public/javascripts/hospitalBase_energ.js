 //  Carrega a API de visualização e o pacote corechart.
google.charts.load('current', {'packages':['corechart']});
const loadingPopup = document.getElementById('loadingPopup');

let medidores = []
const url = "HospitalBase"
var clientMQTT;

let medidor = $('#medidor option:selected').val()
let local = $('#medidor option:selected').text()
console.log(medidor+" "+local)
$('#medidor').on('change', () => {
  loadingPopup.style.display = 'flex'; // aparece o pop-ap de carregarmento dos dados 
  medidor = $('#medidor option:selected').val()
  local = $('#medidor option:selected').text()
  console.log(medidor+" "+local)
  fetch('/get_ultimas_leituras/energ', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ medidor: medidor, url: url }) // Envia o dado da URL e do medidor como JSON
  })
  .then(response => response.json())
  .then(dados => {
    if(dados.id == medidor){
      atualizar(dados)
    }else{
      console.log("dados de inicialização invalidos")
      console.log(dados)
    }
  })
  loadingPopup.style.display = 'none'; // Esconde o pop-up 
})

fetch('/get-dados-do-usuario', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: url }) // Envia o dado da URL como JSON
})
.then(response => response.json())
.then(dados => {
    let text = dados.med_energia.split(";")
    //console.log(text)
    for (let i = 0; i < text.length; i+=2) {
      medidores.push({id:text[i], local:text[i+1]})
    }
})
.catch(err => {
    console.error('Erro ao obter dados do usuário:', err);
  //  loadingPopup.style.display = 'none'; // Esconde o pop-up em caso de erro
});


fetch('/get_ultimas_leituras/energ', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ medidor: medidor, url: url }) // Envia o dado da URL e do medidor como JSON
})
.then(response => response.json())
.then(dados => {
  console.log(dados)
  if(dados.id == medidor){
    atualizar(dados)
  }else{
    console.log("dados de inicialização invalidos")
    console.log(dados)
  }

  clientMQTT = mqtt.connect("wss://monitor.mep.eng.br", {
    username: "douglas",
    password: "8501",
    path: '/mqtt'
});

  clientMQTT.on('connect', () => {
    console.log('Conectado ao broker MQTT');
    
    // Lista de tópicos para subscrever
    const topics = [
    `${url}/atualizarTela/energ`
    ];
    // Subscrição em múltiplos tópicos
    clientMQTT.subscribe(topics, (err) => {
        if (err) {
            console.error('Erro ao subscrever aos tópicos', err);
        } else {
            console.log('Subscrito aos tópicos:', topics.join(', '));
        }
    });
  });

  loadingPopup.style.display = 'none'; // Esconde o pop-up

  clientMQTT.on('message', (topic, message) => {
    switch (topic) {
      case `${url}/atualizarTela/energ`:
        // Desserializar a mensagem JSON para objeto
        const leitura = JSON.parse(message.toString());
        console.log('Nova leitura:', leitura);
        atualizar(leitura)
      break;
      default:
      console.log(`Tópico desconhecido: ${topico} - Mensagem: ${message}`);
    }
  });

    clientMQTT.on('error', (err) => {
        console.error('Erro de conexão MQTT', err);
    });

  loadingPopup.style.display = 'none'; // Esconde o pop-up
})

// Adiciona os ouvintes de evento para os botões
document.getElementById('calcular').addEventListener('click', calcularConsumo);
document.getElementById('relatorio').addEventListener('click', obterRelatorio);


// Função para calcular o consumo de energia
function calcularConsumo(event) {
  event.preventDefault(); // Impede o envio padrão do formulário

  // Coleta os valores do formulário
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  fetch('/get_consumo/energ', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({info: {id: medidor, datas: { startDate, endDate }, url: url, local: local}}) // Envia o dado como JSON
  })
  .then(response => response.json())
  .then(dados => {
    const resultDiv = document.getElementById('result');
  //console.log(dados)
  if (dados.error) {
      resultDiv.innerHTML = `<p style="color: red;">${dados.error}</p>`;
  } else {
      drawChartConsumo(dados.grafico,dados.id,dados.local)
      var options = { year: 'numeric', month: '2-digit', day: '2-digit'};
      console.log(dados.consumo)
      resultDiv.innerHTML = '<h2>Consumo calculado com base nas leituras encontradas:</h2>' + `
          <div>
              <p><strong>Local:</strong> ${dados.local}</p>
              <p><strong>Data Início:</strong> ${new Date(dados.dataL1).toLocaleDateString('pt-BR',options)}</p>
              <p><strong>Data Término:</strong> ${new Date(dados.dataL2).toLocaleDateString('pt-BR',options)}</p>
              <p><strong>Consumo:</strong> ${dados.consumo} kWh</p>
          </div>
      `;    
  }
  loadingPopup.style.display = 'none'; // Esconde o pop-up
  })

  // Exibe o pop-up de carregamento
  loadingPopup.style.display = 'flex';
}

// Função para obter o relatório geral
function obterRelatorio(event) {
  event.preventDefault(); // Impede o envio padrão do formulário

  // Coleta os valores do formulário
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;

  loadingPopup.style.display = 'flex';
  fetch('/get_relatorio_geral/energ', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({info:{medidores:medidores, datas: { startDate, endDate },url:url}}) // Envia o dado como JSON
  })
  .then(response => response.json())
  .then(dados => {
    const resultDiv = document.getElementById('result');
  //console.log(dados)
  loadingPopup.style.display = 'none'; // Esconde o pop-up
  if (dados.error) {
      resultDiv.innerHTML = `<p style="color: red;">${dados.error}</p>`;
  } else {
      resultDiv.innerHTML = `<p style="color: blue;">Dados do relatorio obtido com sucesso! Gerando arquivo</p>`;
      //console.log(dados)
      // Definir o cabeçalho do CSV
      const cabecalho = ['Local', 'id', 'Consumo(KWh)', 'Data inicial', 'Data final','Leitura inicial','Leitura final'];
    
      // Inicializar a string do CSV com o cabeçalho
      let csvContent = cabecalho.join(';') + '\n';
    
      // Iterar sobre o array de dados e adicionar cada linha ao CSV
      dados.forEach(dados => {
        const linha = [
          dados.nome,
          dados.id,
          dados.consumo.valor,
          dados.consumo.startDate,
          dados.consumo.endDate,
          dados.consumo.startValor,
          dados.consumo.endValor
        ];
        csvContent += linha.join(';') + '\n';
      });
    
      // Criar o arquivo CSV e disparar o download
      const link = document.createElement('a');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      link.href = URL.createObjectURL(blob);
      link.download = `Consumo_de_Energia_Santa_Monica.csv`; // Nome do arquivo CSV
        
    resultDiv.innerHTML = `<p style="color: blue;">iniciando dowload</p>`;
    link.click(); 
  }
  })
}


function atualizar (dados){
  $('#data').text(dados.leitura.data)
  $('#va').text(dados.leitura.uarms + " V" ) 
  $('#vb').text(dados.leitura.ubrms + " V" )
  $('#vc').text(dados.leitura.ucrms + " V" )
  $('#ia').text(dados.leitura.iarms + " A" )
  $('#ib').text(dados.leitura.ibrms + " A" )
  $('#ic').text(dados.leitura.icrms + " A" )
  $('#it').text(dados.leitura.itrms + " A" )
  $('#pfa').text(dados.leitura.pfa)
  $('#pfb').text(dados.leitura.pfb)
  $('#pfc').text(dados.leitura.pfc)
  $('#pft').text(dados.leitura.pft)
  $('#pa').text(dados.leitura.pa + " W" )
  $('#pb').text(dados.leitura.pb + " W" )
  $('#pc').text(dados.leitura.pc + " W" )
  $('#pt').text(dados.leitura.pt + " W" )
  $('#cd').text(dados.graficos.semanal[dados.graficos.semanal.length-1][1] + " KWh") 
  $('#cda').text(dados.consumos.consumoDiaAnterior + " KWh") 
  $('#cm').text(dados.consumos.consumoMensal + " KWh") 
  $('#cma').text(dados.consumos.consumoMesAnterior+ " KWh") 
  
   // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
  google.charts.setOnLoadCallback(drawChart(dados.graficos));
}

  // Retorno de chamada que cria e preenche uma tabela de dados,
 // instancia o tipo de gráfico, passa os dados e desenha
function drawChart(dados) {
  // Cria a tabela de dados.
  var data1 = new google.visualization.DataTable();
  data1.addColumn('string', 'Horario');
  data1.addColumn('number', 'potencia ativa Total');
  data1.addRows(dados.diario);
  //console.log(data1)
  // Set chart options
  var options1 = {title:'Consumo hoje'}

  // Cria a tabela de dados.
  var data2 = new google.visualization.DataTable();
  data2.addColumn('string', 'Datas');
  data2.addColumn('number', 'Consumo');
  data2.addRows(dados.semestral);
  // console.log(dados.semestral)

  // Set chart options
  var options2 = {title:'Consumos mensais'}
  // Cria a tabela de dados.
  var data3 = new google.visualization.DataTable();
  data3.addColumn('string', 'Datas');
  data3.addColumn('number', 'Consumo');
  data3.addRows(dados.semanal);
  // Set chart options
  var options3 = {title:'Consumo nos ultimos 7 dias'}
  // Instantiate and draw our chart, passing in some options.
  var chart1 = new google.visualization.AreaChart(document.getElementById('chart_div1'));
  var chart2 = new google.visualization.ColumnChart(document.getElementById('chart_div2'));
  var chart3 = new google.visualization.ColumnChart(document.getElementById('chart_div3'));
  chart1.draw(data1, options1);
  chart2.draw(data2, options2);
  chart3.draw(data3, options3);
}

async function drawChartConsumo(dados,id,local) {
  let grafico = []
  console.log(dados)
  await dados.forEach(element => {
      grafico.push([new Date(element[0]), element[1]]);
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
    var options = { year: 'numeric', month: '2-digit', day: '2-digit'};
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