/**
 * Energy Monitor Dashboard V2
 * Sistema de monitoramento de medidores de energia com visualização em grid
 */

class EnergyMonitorV2 {
  constructor() {
    this.medidores = [];
    this.url = "santaMonica";
    this.clientMQTT = null;
    this.currentView = 'grid'; // 'grid' ou 'detail'
    this.selectedMeter = null;
    this.metersData = new Map(); // Cache dos dados dos medidores
    
    this.init();
  }

  /**
   * Inicializa o sistema
   */
  async init() {
    try {
      // Carrega Google Charts
      google.charts.load('current', {'packages':['corechart']});
      google.charts.setOnLoadCallback(() => this.startPage());
      
      // Configura event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Erro na inicialização:', error);
      this.hideLoading();
    }
  }

  /**
   * Configura os event listeners
   */
  setupEventListeners() {
    // Botão de voltar para grid
    document.addEventListener('click', (e) => {
      if (e.target.id === 'back-to-grid' || e.target.closest('#back-to-grid')) {
        this.showGridView();
      }
    });

    // Clique nos cards dos medidores
    document.addEventListener('click', (e) => {
      const meterCard = e.target.closest('.meter-card');
      if (meterCard && this.currentView === 'grid') {
        const meterId = meterCard.dataset.meterId;
        this.showMeterDetail(meterId);
      }
    });

    // Formulário de cálculo (apenas na view de detalhes)
    document.addEventListener('click', (e) => {
      if (e.target.id === 'calcular') {
        e.preventDefault();
        this.calculateConsumption(e);
      }
      if (e.target.id === 'relatorio') {
        e.preventDefault();
        this.generateReport(e);
      }
    });
  }

  /**
   * Carrega dados do usuário e medidores
   */
  async loadUserData() {
    try {
      const response = await fetch('/get-dados-do-usuario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url })
      });

      const dados = await response.json();
      const medidoresText = dados.med_energia.split(";");
      
      this.medidores = [];
      for (let i = 0; i < medidoresText.length; i += 2) {
        this.medidores.push({
          id: medidoresText[i], 
          local: medidoresText[i + 1]
        });
      }
      
      console.log('Medidores carregados:', this.medidores);
      return this.medidores;
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      return [];
    }
  }

  /**
   * Inicia a página principal
   */
  async startPage() {
    try {
      this.showLoading();
      
      // Carrega dados dos medidores
      await this.loadUserData();
      
      // Carrega dados iniciais de todos os medidores
      await this.loadAllMetersData();
      
      // Configura conexão MQTT
      this.setupMQTTConnection();
      
      // Mostra a view de grid
      this.showGridView();
      
    } catch (error) {
      console.error('Erro ao iniciar página:', error);
      this.hideLoading();
    }
  }

  /**
   * Carrega dados de todos os medidores
   */
  async loadAllMetersData() {
    try {
      const promises = this.medidores.map(medidor => this.loadMeterData(medidor.id));
      await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao carregar dados dos medidores:', error);
    }
  }

  /**
   * Carrega dados de um medidor específico
   */
  async loadMeterData(meterId) {
    try {
      const response = await fetch('/get_ultimas_leituras/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          medidor: meterId, 
          url: this.url 
        })
      });

      const dados = await response.json();
      
      if (dados.id == meterId) {
        this.metersData.set(meterId, dados);
        
        // Atualiza o card do medidor se estiver na view de grid
        if (this.currentView === 'grid') {
          this.updateMeterCard(meterId, dados);
        }
        
        // Atualiza a view de detalhes se for o medidor selecionado
        if (this.currentView === 'detail' && this.selectedMeter === meterId) {
          this.updateDetailView(dados);
        }
      }
      
      return dados;
    } catch (error) {
      console.error(`Erro ao carregar dados do medidor ${meterId}:`, error);
      return null;
    }
  }

  /**
   * Configura conexão MQTT
   */
  setupMQTTConnection() {
    try {
      this.clientMQTT = mqtt.connect("wss://monitor.mep.eng.br", {
        username: "douglas",
        password: "8501",
        path: '/mqtt'
      });

      this.clientMQTT.on('connect', () => {
        console.log('Conectado ao broker MQTT');
        
        const topics = [`${this.url}/atualizarTela/energ`];
        
        this.clientMQTT.subscribe(topics, (err) => {
          if (err) {
            console.error('Erro ao subscrever aos tópicos', err);
          } else {
            console.log('Subscrito aos tópicos:', topics.join(', '));
          }
        });
      });

      this.clientMQTT.on('message', (topic, message) => {
        this.handleMQTTMessage(topic, message);
      });

      this.clientMQTT.on('error', (err) => {
        console.error('Erro de conexão MQTT', err);
      });

      this.hideLoading();
      
    } catch (error) {
      console.error('Erro ao configurar MQTT:', error);
      this.hideLoading();
    }
  }

  /**
   * Manipula mensagens MQTT
   */
  handleMQTTMessage(topic, message) {
    switch (topic) {
      case `${this.url}/atualizarTela/energ`:
        try {
          const leitura = JSON.parse(message.toString());
          console.log('Nova leitura:', leitura);
          
          // Atualiza o cache de dados
          this.metersData.set(leitura.id, leitura);
          
          // Atualiza a interface baseado na view atual
          if (this.currentView === 'grid') {
            this.updateMeterCard(leitura.id, leitura);
          } else if (this.currentView === 'detail' && this.selectedMeter === leitura.id) {
            this.updateDetailView(leitura);
          }
          
        } catch (error) {
          console.error('Erro ao processar mensagem MQTT:', error);
        }
        break;
      default:
        console.log(`Tópico desconhecido: ${topic} - Mensagem: ${message}`);
    }
  }

  /**
   * Mostra a view de grid com todos os medidores
   */
  showGridView() {
    this.currentView = 'grid';
    
    const container = document.getElementById('main-content');
    container.innerHTML = this.generateGridHTML();
    
    // Atualiza os cards com os dados em cache
    this.medidores.forEach(medidor => {
      const dados = this.metersData.get(medidor.id);
      if (dados) {
        this.updateMeterCard(medidor.id, dados);
      }
    });
  }

  /**
   * Gera HTML para a view de grid
   */
  generateGridHTML() {
    return `
      <div class="grid-header">
        <h1>Monitoramento de Energia - Visão Geral</h1>
        <p class="grid-subtitle">Clique em um medidor para ver os detalhes</p>
      </div>
      
      <div class="meters-grid">
        ${this.medidores.map(medidor => `
          <div class="meter-card" data-meter-id="${medidor.id}">
            <div class="meter-header">
              <h3 class="meter-name">${medidor.local}</h3>
              <span class="meter-id">ID: ${medidor.id}</span>
            </div>
            
            <div class="meter-consumption">
              <div class="consumption-value" id="consumption-${medidor.id}">
                <span class="value">--</span>
                <span class="unit">kWh</span>
              </div>
              <div class="consumption-label">Consumo Hoje</div>
            </div>
            
            <div class="meter-info">
              <div class="info-item">
                <span class="info-label">Fator de Potência:</span>
                <span class="info-value" id="pf-${medidor.id}">--</span>
              </div>
              <div class="info-item">
                <span class="info-label">Última Atualização:</span>
                <span class="info-value" id="date-${medidor.id}">--</span>
              </div>
            </div>
            
            <div class="meter-status" id="status-${medidor.id}">
              <span class="status-indicator"></span>
              <span class="status-text">Aguardando dados...</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Atualiza um card de medidor na view de grid
   */
  updateMeterCard(meterId, dados) {
    try {
      // Consumo hoje
      const consumptionEl = document.getElementById(`consumption-${meterId}`);
      if (consumptionEl && dados.graficos && dados.graficos.semanal) {
        const consumoHoje = dados.graficos.semanal[dados.graficos.semanal.length - 1][1];
        consumptionEl.querySelector('.value').textContent = consumoHoje;
      }
      
      // Fator de potência total
      const pfEl = document.getElementById(`pf-${meterId}`);
      if (pfEl && dados.leitura) {
        pfEl.textContent = dados.leitura.pft || '--';
      }
      
      // Data da última transmissão
      const dateEl = document.getElementById(`date-${meterId}`);
      if (dateEl && dados.leitura) {
        const date = new Date(dados.leitura.data);
        dateEl.textContent = date.toLocaleString('pt-BR');
      }
      
      // Status do medidor
      const statusEl = document.getElementById(`status-${meterId}`);
      if (statusEl) {
        const now = new Date();
        const lastUpdate = new Date(dados.leitura.data);
        const diffMinutes = (now - lastUpdate) / (1000 * 60);
        
        if (diffMinutes < 30) {
          statusEl.innerHTML = '<span class="status-indicator online"></span><span class="status-text">Online</span>';
        } else if (diffMinutes < 120) {
          statusEl.innerHTML = '<span class="status-indicator warning"></span><span class="status-text">Atenção</span>';
        } else {
          statusEl.innerHTML = '<span class="status-indicator offline"></span><span class="status-text">Offline</span>';
        }
      }
      
    } catch (error) {
      console.error(`Erro ao atualizar card do medidor ${meterId}:`, error);
    }
  }

  /**
   * Mostra a view de detalhes de um medidor específico
   */
  showMeterDetail(meterId) {
    this.currentView = 'detail';
    this.selectedMeter = meterId;
    
    const medidor = this.medidores.find(m => m.id === meterId);
    const dados = this.metersData.get(meterId);
    
    const container = document.getElementById('main-content');
    container.innerHTML = this.generateDetailHTML(medidor, dados);
    
    if (dados) {
      this.updateDetailView(dados);
    }
  }

  /**
   * Gera HTML para a view de detalhes
   */
  generateDetailHTML(medidor, dados) {
    return `
      <div class="detail-header">
        <button id="back-to-grid" class="back-button">
          ← Voltar à Visão Geral
        </button>
        <h1>${medidor.local}</h1>
        <p class="detail-subtitle">ID: ${medidor.id}</p>
        <p class="last-update">Última atualização: <span id="detail-date">Carregando...</span></p>
      </div>

      <!-- Voltage Section -->
      <div class="section-title">Tensão (V)</div>
      <div class="metrics-grid voltage">
        <div class="metric-card">
          <p class="metric-label">Fase A</p>
          <p class="metric-value" id="va">0<span class="metric-unit">V</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase B</p>
          <p class="metric-value" id="vb">0<span class="metric-unit">V</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase C</p>
          <p class="metric-value" id="vc">0<span class="metric-unit">V</span></p>
        </div>
      </div>

      <!-- Current Section -->
      <div class="section-title">Corrente (A)</div>
      <div class="metrics-grid current">
        <div class="metric-card">
          <p class="metric-label">Fase A</p>
          <p class="metric-value" id="ia">0<span class="metric-unit">A</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase B</p>
          <p class="metric-value" id="ib">0<span class="metric-unit">A</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase C</p>
          <p class="metric-value" id="ic">0<span class="metric-unit">A</span></p>
        </div>
        <div class="metric-card total">
          <p class="metric-label">Total</p>
          <p class="metric-value" id="it">0<span class="metric-unit">A</span></p>
        </div>
      </div>

      <!-- Power Factor Section -->
      <div class="section-title">Fator de Potência</div>
      <div class="metrics-grid power-factor">
        <div class="metric-card">
          <p class="metric-label">Fase A</p>
          <p class="metric-value" id="pfa">0.00</p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase B</p>
          <p class="metric-value" id="pfb">0.00</p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase C</p>
          <p class="metric-value" id="pfc">0.00</p>
        </div>
        <div class="metric-card total">
          <p class="metric-label">Total</p>
          <p class="metric-value" id="pft">0.00</p>
        </div>
      </div>

      <!-- Active Power Section -->
      <div class="section-title">Potência Ativa (W)</div>
      <div class="metrics-grid active-power">
        <div class="metric-card">
          <p class="metric-label">Fase A</p>
          <p class="metric-value" id="pa">0<span class="metric-unit">W</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase B</p>
          <p class="metric-value" id="pb">0<span class="metric-unit">W</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Fase C</p>
          <p class="metric-value" id="pc">0<span class="metric-unit">W</span></p>
        </div>
        <div class="metric-card total">
          <p class="metric-label">Total</p>
          <p class="metric-value" id="pt">0<span class="metric-unit">W</span></p>
        </div>
      </div>

      <!-- Consumption Section -->
      <div class="section-title">Consumo (kWh)</div>
      <div class="metrics-grid consumption">
        <div class="metric-card">
          <p class="metric-label">Hoje</p>
          <p class="metric-value" id="cd">0<span class="metric-unit">kWh</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Ontem</p>
          <p class="metric-value" id="cda">0<span class="metric-unit">kWh</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Consumo Mensal</p>
          <p class="metric-value" id="cm">0<span class="metric-unit">kWh</span></p>
        </div>
        <div class="metric-card">
          <p class="metric-label">Mês Anterior</p>
          <p class="metric-value" id="cma">0<span class="metric-unit">kWh</span></p>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="charts-grid chart-single">
          <div class="chart-container">
            <div id="chart_div1"></div>
          </div>
        </div>
        
        <div class="charts-grid chart-double">
          <div class="chart-container">
            <div id="chart_div2"></div>
          </div>
          <div class="chart-container">
            <div id="chart_div3"></div>
          </div>
        </div>
      </div>

      <!-- Consumption Calculator -->
      <div class="consumption-calculator">
        <h3 class="calculator-title">Período de Cobrança</h3>
        <form id="event-form" class="calculator-form">
          <div class="form-group">
            <label for="start-date" class="form-label">Data de Início:</label>
            <input type="date" id="start-date" name="start-date" class="form-input" required>
          </div>
          
          <div class="form-group">
            <label for="end-date" class="form-label">Data de Término:</label>
            <input type="date" id="end-date" name="end-date" class="form-input" required>
          </div>
          
          <div class="button-group">
            <button id="calcular" type="submit" class="btn btn-primary">
              📊 Calcular Consumo
            </button>
            <button id="relatorio" type="button" class="btn btn-secondary">
              📋 Relatório Geral
            </button>
          </div>
        </form>
      </div>

      <!-- Results Section -->
      <div class="results-section results-grid">
        <div class="chart-container">
          <div id="chart_consumo"></div>
        </div>
        <div class="result-container">
          <div id="result">
            <div class="text-center">
              <p class="text-secondary">Selecione um período e clique em "Calcular Consumo" para ver os resultados.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Atualiza a view de detalhes com novos dados
   */
  updateDetailView(dados) {
    try {
      // Atualiza data
      const dateEl = document.getElementById('detail-date');
      if (dateEl) {
        const date = new Date(dados.leitura.data);
        dateEl.textContent = date.toLocaleString('pt-BR');
      }
      
      // Atualiza tensões
      document.getElementById('va').innerHTML = `${dados.leitura.uarms}<span class="metric-unit">V</span>`;
      document.getElementById('vb').innerHTML = `${dados.leitura.ubrms}<span class="metric-unit">V</span>`;
      document.getElementById('vc').innerHTML = `${dados.leitura.ucrms}<span class="metric-unit">V</span>`;
      
      // Atualiza correntes
      document.getElementById('ia').innerHTML = `${dados.leitura.iarms}<span class="metric-unit">A</span>`;
      document.getElementById('ib').innerHTML = `${dados.leitura.ibrms}<span class="metric-unit">A</span>`;
      document.getElementById('ic').innerHTML = `${dados.leitura.icrms}<span class="metric-unit">A</span>`;
      document.getElementById('it').innerHTML = `${dados.leitura.itrms}<span class="metric-unit">A</span>`;
      
      // Atualiza fatores de potência
      document.getElementById('pfa').textContent = dados.leitura.pfa;
      document.getElementById('pfb').textContent = dados.leitura.pfb;
      document.getElementById('pfc').textContent = dados.leitura.pfc;
      document.getElementById('pft').textContent = dados.leitura.pft;
      
      // Atualiza potências ativas
      document.getElementById('pa').innerHTML = `${dados.leitura.pa}<span class="metric-unit">W</span>`;
      document.getElementById('pb').innerHTML = `${dados.leitura.pb}<span class="metric-unit">W</span>`;
      document.getElementById('pc').innerHTML = `${dados.leitura.pc}<span class="metric-unit">W</span>`;
      document.getElementById('pt').innerHTML = `${dados.leitura.pt}<span class="metric-unit">W</span>`;
      
      // Atualiza consumos
      document.getElementById('cd').innerHTML = `${dados.graficos.semanal[dados.graficos.semanal.length-1][1]}<span class="metric-unit">kWh</span>`;
      document.getElementById('cda').innerHTML = `${dados.consumos.consumoDiaAnterior}<span class="metric-unit">kWh</span>`;
      document.getElementById('cm').innerHTML = `${dados.consumos.consumoMensal}<span class="metric-unit">kWh</span>`;
      document.getElementById('cma').innerHTML = `${dados.consumos.consumoMesAnterior}<span class="metric-unit">kWh</span>`;
      
      // Atualiza gráficos
      this.drawCharts(dados.graficos);
      
    } catch (error) {
      console.error('Erro ao atualizar view de detalhes:', error);
    }
  }

  /**
   * Desenha os gráficos (mesmo código da versão anterior)
   */
  drawCharts(dados) {
    try {
      // Gráfico diário
      const data1 = new google.visualization.DataTable();
      data1.addColumn('string', 'Horário');
      data1.addColumn('number', 'Potência Ativa Total');
      data1.addRows(dados.diario);

      const options1 = {
        title: 'Consumo Hoje',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Horário' },
        vAxis: { title: 'Potência (W)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: ['#dc2626']
      };

      // Gráfico semestral
      const data2 = new google.visualization.DataTable();
      data2.addColumn('string', 'Datas');
      data2.addColumn('number', 'Consumo');
      data2.addRows(dados.semestral);

      const options2 = {
        title: 'Consumos Mensais',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Meses' },
        vAxis: { title: 'Consumo (kWh)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: ['#dc2626']
      };

      // Gráfico semanal
      const data3 = new google.visualization.DataTable();
      data3.addColumn('string', 'Datas');
      data3.addColumn('number', 'Consumo');
      data3.addRows(dados.semanal);

      const options3 = {
        title: 'Consumo nos Últimos 7 Dias',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Dias' },
        vAxis: { title: 'Consumo (kWh)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: ['#dc2626']
      };

      // Desenha os gráficos
      const chart1 = new google.visualization.AreaChart(document.getElementById('chart_div1'));
      const chart2 = new google.visualization.ColumnChart(document.getElementById('chart_div2'));
      const chart3 = new google.visualization.ColumnChart(document.getElementById('chart_div3'));

      chart1.draw(data1, options1);
      chart2.draw(data2, options2);
      chart3.draw(data3, options3);
      
    } catch (error) {
      console.error('Erro ao desenhar gráficos:', error);
    }
  }

  /**
   * Calcula consumo de energia (mesmo código da versão anterior)
   */
  async calculateConsumption(event) {
    event.preventDefault();
    
    try {
      this.showLoading();
      
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e fim.');
        this.hideLoading();
        return;
      }
      
      const medidor = this.medidores.find(m => m.id === this.selectedMeter);
      
      const response = await fetch('/get_consumo/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          info: {
            id: this.selectedMeter,
            datas: { startDate, endDate },
            url: this.url,
            local: medidor.local
          }
        })
      });

      const dados = await response.json();
      const resultDiv = document.getElementById('result');
      
      if (dados.error) {
        resultDiv.innerHTML = `<div class="text-error"><p>${dados.error}</p></div>`;
      } else {
        this.drawConsumptionChart(dados.grafico, dados.id, dados.local);
        
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        
        resultDiv.innerHTML = `
          <div class="result-content">
            <h3 class="mb-3">Consumo Calculado</h3>
            <div class="result-details">
              <p><strong>Local:</strong> ${dados.local}</p>
              <p><strong>Data Início:</strong> ${new Date(dados.dataL1).toLocaleDateString('pt-BR', options)}</p>
              <p><strong>Data Término:</strong> ${new Date(dados.dataL2).toLocaleDateString('pt-BR', options)}</p>
              <p class="consumption-value"><strong>Consumo:</strong> <span class="text-success">${dados.consumo} kWh</span></p>
            </div>
          </div>
        `;
      }
      
      this.hideLoading();
    } catch (error) {
      console.error('Erro ao calcular consumo:', error);
      this.hideLoading();
    }
  }

  /**
   * Gera relatório geral (mesmo código da versão anterior)
   */
  async generateReport(event) {
    event.preventDefault();
    
    try {
      this.showLoading();
      
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e fim.');
        this.hideLoading();
        return;
      }
      
      const response = await fetch('/get_relatorio_geral/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          info: {
            medidores: this.medidores,
            datas: { startDate, endDate },
            url: this.url
          }
        })
      });

      const dados = await response.json();
      const resultDiv = document.getElementById('result');
      
      if (dados.error) {
        resultDiv.innerHTML = `<div class="text-error"><p>${dados.error}</p></div>`;
      } else {
        resultDiv.innerHTML = `<div class="text-success"><p>Dados do relatório obtidos com sucesso! Gerando arquivo...</p></div>`;
        
        // Gera CSV
        this.generateCSVReport(dados);
        
        resultDiv.innerHTML = `<div class="text-success"><p>Download iniciado com sucesso!</p></div>`;
      }
      
      this.hideLoading();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      this.hideLoading();
    }
  }

  /**
   * Gera relatório CSV (mesmo código da versão anterior)
   */
  generateCSVReport(dados) {
    try {
      const cabecalho = ['Local', 'ID', 'Consumo(KWh)', 'Data inicial', 'Data final', 'Leitura inicial', 'Leitura final'];
      let csvContent = cabecalho.join(';') + '\n';
      
      dados.forEach(item => {
        const linha = [
          item.nome,
          item.id,
          item.consumo.valor,
          item.consumo.startDate,
          item.consumo.endDate,
          item.consumo.startValor,
          item.consumo.endValor
        ];
        csvContent += linha.join(';') + '\n';
      });
      
      const link = document.createElement('a');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      link.href = URL.createObjectURL(blob);
      link.download = `Consumo_de_Energia_${this.url}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
    }
  }

  /**
   * Desenha gráfico de consumo (mesmo código da versão anterior)
   */
  async drawConsumptionChart(dados, id, local) {
    try {
      const grafico = [];
      
      dados.forEach(element => {
        grafico.push([new Date(element[0]), element[1]]);
      });
      
      const data = new google.visualization.DataTable();
      data.addColumn('date', 'Data');
      data.addColumn('number', 'Leitura');
      data.addRows(grafico);
      
      const options = {
        title: `Leituras: ${local} (${id})`,
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: {
          title: 'Data',
          format: 'dd/MM/yy',
          titleTextStyle: { color: '#333' }
        },
        vAxis: { 
          title: 'Leitura (kWh)',
          titleTextStyle: { color: '#333' }
        },
        series: {
          0: { lineWidth: 3 }
        },
        pointSize: 6,
        pointShape: 'circle',
        colors: ['#dc2626'],
        backgroundColor: 'transparent',
        chartArea: { width: '85%', height: '75%' },
        tooltip: {
          isHtml: true,
          trigger: 'selection'
        }
      };
      
      // Formata tooltip
      const formattedData = [];
      for (let i = 0; i < data.getNumberOfRows(); i++) {
        const date = data.getValue(i, 0);
        const value = data.getValue(i, 1);
        const tooltip = this.formatTooltip(date, value);
        formattedData.push([date, value, tooltip]);
      }
      
      const dataWithTooltip = google.visualization.arrayToDataTable([
        ['Data', 'Leitura', { role: 'tooltip', type: 'string', p: { html: true } }],
        ...formattedData
      ]);
      
      const chart = new google.visualization.AreaChart(document.getElementById('chart_consumo'));
      chart.draw(dataWithTooltip, options);
      
    } catch (error) {
      console.error('Erro ao desenhar gráfico de consumo:', error);
    }
  }

  /**
   * Formata tooltip do gráfico
   */
  formatTooltip(date, value) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const formattedDate = date.toLocaleDateString('pt-BR', options);
    return `<div style="padding: 8px;"><strong>Data:</strong> ${formattedDate}<br><strong>Leitura:</strong> ${value} kWh</div>`;
  }

  /**
   * Mostra loading
   */
  showLoading() {
    const loadingPopup = document.getElementById('loadingPopup');
    if (loadingPopup) {
      loadingPopup.style.display = 'flex';
    }
  }

  /**
   * Esconde loading
   */
  hideLoading() {
    const loadingPopup = document.getElementById('loadingPopup');
    if (loadingPopup) {
      loadingPopup.style.display = 'none';
    }
  }
}

// Inicializa o sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.energyMonitorV2 = new EnergyMonitorV2();
});

