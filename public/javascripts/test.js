google.charts.load('current', {'packages':['gauge','corechart']})

var gauge1,gauge2;

class Reservatorio {
  constructor(id,nome,volumeMax){
    this.id = id
    this.nome = nome
    this.data =  '01-01-2000 00:00:00'
    this.volume =  0
    this.nivel =  0
    this.distancia =  0
    this.graficos =  []
    this.volumeMax = volumeMax
    this.alerta = 20
    this.critico = 10
    this.gaugeOptions = {min: 0, max: 100, yellowFrom: this.critico, yellowTo: this.alerta,
      redFrom: 0, redTo: this.critico, minorTicks: 5};
    
    //this.alerta = Math.round(this.volumeMax*0.2)
    //this.critico = Math.round(this.volumeMax*0.1)
    //this.gaugeOptions = {min: 0, max: this.volumeMax, yellowFrom: this.critico, yellowTo: this.alerta,
      //redFrom: 0, redTo: this.critico, minorTicks: Math.round(this.volumeMax*0.05)};
    
      this.chartOptions = {
      title: this.nome,
      hAxis: {title: 'Horario',  titleTextStyle: {color: '#333'}},
      vAxis: {minValue: 0},
      height: 330,
    };
  }
  async send(dados){
    this.data =  dados.leitura.data
    this.volume =  dados.leitura.volume
    this.nivel =  dados.leitura.nivel
    this.distancia =  dados.leitura.distancia
    this.graficos =  dados.graficos

    return
  }
}

var reservatorios = [];

const socket = io();

// caracteriscas do usuario
var usuario
socket.on("connect", () => {
  console.log(socket.id);
  socket.emit("Get_dados_do_usuario", "test")
 })

  socket.on("return_dados_do_usuario_test",async (dados) =>{
  usuario = await dados
  console.log(usuario)
  iniciarPagina(usuario)
})




async function iniciarPagina(){
  for (let i = 1; i < usuario.agua+1; i++) {
    let text = usuario.reservatorios.split(";");
    reservatorios.push(new Reservatorio(i, text[(i * 2) - 2], text[(i * 2) - 1]))
  }
  
  $('#res1_titulo').text(reservatorios[0].nome)
  $('#res2_titulo').text(reservatorios[1].nome)
  
  // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
  gauge1 = await google.setOnLoadCallback(drawGauge1);
  
  socket.emit("iniciarTelaTest_Res", 1)
  // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
  gauge2 = await google.setOnLoadCallback(drawGauge2);

  //await google.setOnLoadCallback(drawChart1(reservatorios[1].graficos,reservatorios[1].chartOptions));
  socket.emit("iniciarTelaTest_Res", 2)

  socket.on("atualizar_test_res1",  async (dados) =>{
    await reservatorios[0].send(dados)
    //console.log(reservatorios[0])
    drawGauge1()

    drawChart1(teste,reservatorios[0].chartOptions)

    if(new Date(reservatorios[0].data) >= new Date(reservatorios[1].data)){
      $('#data').text(reservatorios[0].data)
    }
  })


  socket.on("atualizar_test_res2",async dados =>{
    await reservatorios[1].send(dados)
    drawGauge2()
    drawChart2(reservatorios[1].graficos,reservatorios[1].chartOptions)
    
    if(new Date(reservatorios[1].data) >= new Date(reservatorios[0].data)){
      $('#data').text(reservatorios[1].data)
    }
  })
  
}

function drawGauge1() {

  $('#res'+reservatorios[0].id+'_data').text(reservatorios[0].data)
  $('#res'+reservatorios[0].id+'_dis').text(reservatorios[0].distancia + " cm" ) 
  $('#res'+reservatorios[0].id+'_p').text(reservatorios[0].volume+ " L" )

  // Cria a tabela de dados para gauge
  var gaugeData = new google.visualization.DataTable();
  gaugeData.addColumn('number', 'Nivel(%)');
  gaugeData.addRows(1);

  gaugeData.setCell(0, 0, reservatorios[0].nivel);

  gauge = new google.visualization.Gauge(document.getElementById('res1_gauge_div'));
  return gauge.draw(gaugeData,reservatorios[0].gaugeOptions);
}

function drawGauge2() {

  
  $('#res'+reservatorios[1].id+'_data').text(reservatorios[1].data)
  $('#res'+reservatorios[1].id+'_dis').text(reservatorios[1].distancia + " cm" ) 
  $('#res'+reservatorios[1].id+'_p').text(reservatorios[1].volume+ " L" )

  // Cria a tabela de dados para gauge
  var gaugeData = new google.visualization.DataTable();
  gaugeData.addColumn('number', 'Nivel (%)');
  gaugeData.addRows(1);

  
  gaugeData.setCell(0, 0, reservatorios[1].nivel);

  gauge = new google.visualization.Gauge(document.getElementById('res2_gauge_div'));
  return gauge.draw(gaugeData,reservatorios[1].gaugeOptions);
}

function drawChart1(graficos,chartOptions) {
  
  
  var dataChart = new google.visualization.DataTable();
  dataChart.addColumn('date', 'Horario');
  dataChart.addColumn('number', 'Volume(L)');
  dataChart.addColumn('number', 'nivel(%)');
  dataChart.addColumn('number', 'distancia(cm)');
  dataChart.addRows(graficos);
  
  
  chart = new google.visualization.AreaChart(document.getElementById('res1_chart_div'));
  chart.draw(dataChart, chartOptions);
   return
}

function drawChart2(graficos,chartOptions) {
  graficos.forEach(element => {
    element[0]=new Date(element[0])
  });
 
  var dataChart = new google.visualization.DataTable();
  dataChart.addColumn('date', 'Horario');
  dataChart.addColumn('number', 'Volume(L)');
  dataChart.addColumn('number', 'nivel(%)');
  dataChart.addColumn('number', 'distancia(cm)');
  dataChart.addRows(graficos);
  
  
  chart = new google.visualization.AreaChart(document.getElementById('res2_chart_div'));
  chart.draw(dataChart, chartOptions);
   return
}

