google.charts.load('current', {'packages':['gauge','corechart']})

class Reservatorio {
  constructor(id,nome){
    this.id = id
    this.nome = nome
    this.data =  '01-01-2000 00:00:00'
    this.volume =  0
    this.nivel =  0
    this.distancia =  0
    this.graficos =  []
    //this.volumeMax = volumeMax
    this.alerta = 40
    this.critico = 10
    this.gaugeOptions = {min: 0, max: 110, 
      yellowFrom: this.critico, yellowTo: this.alerta,
      redFrom: 0, redTo: this.critico,
      blueFrom: 100, blueTo: 110,
      greenFrom: this.alerta, greenTo: 100,
      minorTicks: 5,
    };
    
    this.gaugeData 
    this.gauge 
    
    //this.alerta = Math.round(this.volumeMax*0.2)
    //this.critico = Math.round(this.volumeMax*0.1)
    //this.gaugeOptions = {min: 0, max: this.volumeMax, yellowFrom: this.critico, yellowTo: this.alerta,
      //redFrom: 0, redTo: this.critico, minorTicks: Math.round(this.volumeMax*0.05)};
    
      this.chartOptions = {
      title: this.nome,
      hAxis: {title: 'Horario', 
      format: 'dd-MM-yy hh:mm', // Formato da data no eixo horizontal
      titleTextStyle: {color: '#333'}
      },
      vAxis: {
        minValue: 0,},
      height: 330,
      series: {
        0: {lineWidth: 2} // largura da linha
      },
      pointSize: 1, // tamanho dos pontos
      pointShape: 'circle', // forma dos pontos
      tooltip: {
        isHtml: true, // Permite HTML no tooltip
        trigger: 'selection' // Exibe tooltip ao selecionar um ponto
      }
    };
  }

    iniciaGalge(){
      try {
        this.gaugeData = google.visualization.arrayToDataTable([
          ['Label', 'Value'],
          [this.nome, 0]
      ]);
      this.gauge = new google.visualization.Gauge(document.getElementById(`res${this.id}`));
      this.gauge.draw(this.gaugeData, this.gaugeOptions);
        
      } catch (error) {
        console.log(error)
        google.charts.load('current', {'packages':['gauge','corechart']}).then( ()=>{
          this.gaugeData = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            [this.nome, 0]
          ]);
          setTimeout(() => {
            this.gauge = new google.visualization.Gauge(document.getElementById(`res${this.id}`));
            this.gauge.draw(this.gaugeData, this.gaugeOptions);
          }, 1000);
        
        })
      }
        
    }
    async send(dados){
        this.data =  dados.leitura.data
        this.volume =  dados.leitura.volume
        this.nivel =  dados.leitura.nivel
        this.distancia =  dados.leitura.distancia
        //this.graficos =  dados.graficos
        this.gaugeData.setCell(0, 1, dados.leitura.nivel, `${dados.leitura.nivel}%`, 'number');
        this.gauge.draw(this.gaugeData, this.gaugeOptions);
        return
    }
}

var reservatorios = [];
var ultimaAtualizacao = new Date('01-01-2000 00:00:00')
url='taguaLife'
const socket = io();


// caracteriscas do usuario
var usuario
socket.on("connect", () => {
  console.log(socket.id);
  socket.emit("Get_dados_do_usuario", url)
  loadingPopup.style.display = 'flex'; // aparece o pop-ap de carregarmento dos dados 
 })

socket.on("return_dados_do_usuario_taguaLife",async (dados) =>{
  
  usuario = await dados
  //console.log(usuario)
  google.charts.setOnLoadCallback(iniciarPagina(usuario)); // Chama iniciarPagina quando a API estiver carregada
  loadingPopup.style.display = 'none'; // Esconde o pop-up 
})




async function iniciarPagina(){
  for (let i = 0; i < usuario.reservatorio*2; i+=2) {
    let text = usuario.reservatorios.split(";");
    reservatorios.push(new Reservatorio(text[i], text[i+1],))
  }
  //console.log(reservatorios)
  iniciarGalges();

  socket.emit("iniciarTela_"+url+"_Res", 1)
  socket.emit("iniciarTela_"+url+"_Res", 2)
  socket.emit("iniciarTela_"+url+"_Res", 3)
  socket.emit("iniciarTela_"+url+"_Res", 4)
  socket.emit("iniciarTela_"+url+"_Res", 5)
  socket.emit("iniciarTela_"+url+"_Res", 6)

  socket.on("atualizar_taguaLife_res",async dados =>{
    await reservatorios[dados.leitura.id-1].send(dados)
    let strdata = dados.leitura.data.split("-")
    let data = new Date(strdata[1]+"-"+strdata[0]+"-"+strdata[2])
    
    $(`#res${dados.leitura.id}_data`).text(reservatorios[dados.leitura.id-1].data)
    if(data >= ultimaAtualizacao){
        ultimaAtualizacao = data
        $('#data').text(reservatorios[dados.leitura.id-1].data)
    }

    loadingPopup.style.display = 'none'; // Esconde o pop-up 
  })

  const botoesHistorico = document.querySelectorAll('.getHistorico');
  const loadingPopup = document.getElementById('loadingPopup');
  const recarregar = document.getElementById('recarregar')

  recarregar.addEventListener('click',function () {

    loadingPopup.style.display = 'flex'; // aparece o pop-ap de carregarmento dos dados 

    socket.emit("iniciarTela_"+url+"_Res", 1)
    socket.emit("iniciarTela_"+url+"_Res", 2)
    socket.emit("iniciarTela_"+url+"_Res", 3)
    socket.emit("iniciarTela_"+url+"_Res", 4)
    socket.emit("iniciarTela_"+url+"_Res", 5)
    socket.emit("iniciarTela_"+url+"_Res", 6)


  })

  botoesHistorico.forEach(botao => {
  botao.addEventListener('click', function() {
    // Coleta os valores para o grafico
    loadingPopup.style.display = 'flex'; // aparece o pop-ap de carregarmento dos dados 
    const startDate  = new Date(); // Data de hoje
    const endDate = new Date(startDate); // Copia a data de hoje
    startDate.setDate(startDate.getDate() - 1); // Subtrai um dia para obter ontem
    const id = this.value; //obtem o id do reservatorio
    const local = reservatorios[id-1].nome //obtem o o local do reservatorio

    // Envia os dados para o servidor usando Socket IO
    socket.emit("getHistorico_taguaLife_res",{id: id , datas:{startDate, endDate}, local: local })
  })
})

  socket.on('historico_taguaLife_res', (dados) => {
    
    const chartDiv = document.getElementById('chart');
    chartDiv.innerHTML =`
      <div class="item1">
        <form id="event-form">
            <h3>Periodo de leituras</h3>
            <label for="start-date">Data de Início:</label>
            <input type="date" id="start-date" name="start-date" required>
            
            <label for="end-date">Data de Término:</label>
            <input type="date" id="end-date" name="end-date" required>
            
            <button type="submit">Obter</button>
        </form>
        
      </div>
      <div id='resultado' class="item2"></div>
      <div id="res_chart_div" class="item1"></div>`

    
    //console.log(dados)
    if (dados.error) {
        document.getElementById('event-form').innerHTML = ''; // Limpa todos os elementos
        document.getElementById('res_chart_div').innerHTML = ''; // Limpa todos os elementos
        document.getElementById('resultado').innerHTML = `<p style="color: red;">${dados.error}</p>`;
    } else {
        const resultDiv = document.getElementById('resultado');
        
        var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        resultDiv.innerHTML = `
            <div>
                <p><strong>Local:</strong> ${dados.local}</p>
                <p><strong>Data Início:</strong> ${new Date(dados.dataL1).toLocaleDateString('pt-BR',options)}</p>
                <p><strong>Data Término:</strong> ${new Date(dados.dataL2).toLocaleDateString('pt-BR',options)}</p>
            </div>
        `;

        drawChart(dados.id,dados.local,dados.grafico,reservatorios[dados.id-1].chartOptions)

        document.getElementById('event-form').addEventListener('submit', async function(event) {
          event.preventDefault(); // Impede o envio padrão do formulário
      
          // Coleta os valores do formulário
          const startDate = document.getElementById('start-date').value;
          const endDate = document.getElementById('end-date').value;
      
          // Envia os dados para o servidor usando Socket IO
          socket.emit("getHistorico_taguaLife_res",{id: dados.id , datas:{startDate, endDate}, local: dados.local })
          loadingPopup.style.display = 'flex'; // aparece o pop-ap de carregarmento dos dados 
      });
        
    }
    
    loadingPopup.style.display = 'none'; // Esconde o pop-up 
  });
  
}



function iniciarGalges(){
    reservatorios.forEach(res =>{
      //console.log(res)
        res.iniciaGalge()
    })
}

function drawChart(id,local,graficos,chartOptions) {
  let dados = []
  const trasbordo =105
  const nivelBaixo = 40
  graficos.forEach(element => {
    dados.push([new Date(element[0]),element[1],trasbordo,nivelBaixo])
  });
  
  var dataChart = new google.visualization.DataTable();
  dataChart.addColumn('date', 'Horario');
  dataChart.addColumn('number', 'Nivel(%)');
  dataChart.addColumn('number', 'Transbordo');
  dataChart.addColumn('number', 'Nivel Bixo');
  dataChart.addRows(dados);
  
  //console.log(dataChart)
  // Função para formatar o tooltip
  function formatTooltip(date, value) {
    var options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };//timeZoneName: 'short' };
    var formattedDate = date.toLocaleDateString('pt-BR', options);
    return `<div><strong>Data e Hora:</strong> ${formattedDate}<br><strong>Leitura:</strong> ${value}</div>`;
}

 // Modifica os dados para incluir o tooltip HTML
 var formattedData = [];
 for (var i = 0; i < dataChart.getNumberOfRows(); i++) {
   var date = dataChart.getValue(i, 0);
   var value = dataChart.getValue(i, 1);
   var tooltip1 = formatTooltip(date, value);
   var tooltip2 = `<div><strong>Alerta de trasbordo ${trasbordo}%</strong></div>`;
   var tooltip3 = `<div><strong>Alerta de nivel baixo ${nivelBaixo}%</strong></div>`;
   formattedData.push([date, value,tooltip1,trasbordo,tooltip2,nivelBaixo,tooltip3]);
 }
  //console.log(formattedData)
 // Cria uma nova tabela com os dados formatados
 var dataWithTooltip = google.visualization.arrayToDataTable([
   ['Data','Nivel(%)',{ role: 'tooltip', type: 'string', p: { html: true } },'trasbordo',
   { role: 'tooltip', type: 'string', p: { html: true } },
   'Nivel Baixo',{ role: 'tooltip', type: 'string', p: { html: true } }],
   ...formattedData
 ]);
  
  chart = new google.visualization.AreaChart(document.getElementById('res_chart_div'));
  chart.draw(dataWithTooltip, chartOptions);
   return
}

function comparaData(data1, data2) {
  
  strdata1 = data1.split("-")
  strdata2 = data2.split("-")
  if(new Date(strdata1[1]+"-"+strdata1[0]+"-"+strdata1[2]) >= new Date(strdata2[1]+"-"+strdata2[0]+"-"+strdata2[2])){
    return(data1)
  }
  return(data2)
}



