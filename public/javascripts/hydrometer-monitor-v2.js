/**
 * Hydrometer Monitor Dashboard V2
 * Sistema de monitoramento de hidrômetros com visualização em grid
 */

class HydrometerMonitorV2 {
  constructor() {
    this.hydrometers = [];
    this.clientKey = window.CLIENT_KEY; // Obtém a chave do cliente
    this.config = getClientConfig(this.clientKey); // Carrega a configuração do cliente
    if (!this.config) {
      console.error("Configuração do cliente não encontrada. Usando fallback.");
      //this.config = getClientConfig("santaMonica"); // Exemplo de fallback
    }

    this.url = this.config.api.baseUrl; // URL base da API do cliente
    this.clientMQTT = null;
    this.currentView = 'grid'; // 'grid' ou 'detail'
    this.selectedHydrometer = null;
    this.hydrometersData = new Map(); // Cache dos dados dos hidrômetros
    
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

    // Clique nos cards dos hidrômetros
    document.addEventListener('click', (e) => {
      const hydrometerCard = e.target.closest('.hydrometer-card');
      if (hydrometerCard && this.currentView === 'grid') {
        const hydrometerId = hydrometerCard.dataset.hydrometerId;
        this.showHydrometerDetail(hydrometerId);
      }
    });

    // Botão de Relatório Geral na visão de grid
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-report-general') {
        e.preventDefault();
        this.generateGeneralReport();
      }
    });

    // Botão de Relatório de Consumo na visão de detalhes
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-report-consumption') {
        e.preventDefault();
        this.showConsumptionReportPopup();
      }
    });

    // Formulário de cálculo (apenas na view de detalhes)
    document.addEventListener('click', (e) => {
      if (e.target.id === 'calcular') {
        e.preventDefault();
        this.calculateConsumption(e);
      }
    });

    // Upload de arquivo
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'upload-button') {
        e.preventDefault();
        this.handleFileUpload();
      }
    });

    // Fechar pop-up
    document.addEventListener('click', (e) => {
      if (e.target.closest('.popup-close') || e.target.classList.contains('popup-overlay')) {
        this.hidePopup();
      }
    });
  }

  /**
   * Carrega dados do usuário e hidrômetros
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
      const hydrometersText = dados.hidrometros.split(";");
      
      this.hydrometers = [];
      for (let i = 0; i < hydrometersText.length; i += 2) {
        if (hydrometersText[i] && hydrometersText[i+1]) {
          this.hydrometers.push({
            id: hydrometersText[i], 
            local: hydrometersText[i + 1]
          });
        }
      }
      
      console.log('Hidrômetros carregados:', this.hydrometers);
      return this.hydrometers;
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
      
      // Carrega dados dos hidrômetros
      await this.loadUserData();
      
      // Carrega dados iniciais de todos os hidrômetros
      await this.loadAllHydrometersData();
      
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
   * Carrega dados de todos os hidrômetros em uma única consulta
   */
  async loadAllHydrometersData() {
    try {
      console.log('Carregando todas as últimas leituras dos hidrômetros...');
      
      const response = await fetch('/get_ultimas_leituras_hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url })
      });

      const leituras = await response.json();
      console.log('Últimas leituras recebidas:', leituras);
      
      // Processa cada leitura e atualiza o cache
      leituras.forEach(leitura => {
        // Estrutura os dados no formato esperado pelo sistema
        const dadosHidrometro = {
          id: leitura.id,
          local: leitura.local,
          leitura: {
            data: leitura.data,
            leitura: parseFloat(leitura.leitura/1000).toFixed(3)
          }
        };
        
        // Atualiza o cache de dados
        this.hydrometersData.set(leitura.id, dadosHidrometro);
        
        // Atualiza o card do hidrômetro se estiver na view de grid
        if (this.currentView === 'grid') {
          this.updateHydrometerCard(leitura.id, dadosHidrometro);
        }
      });
      
      console.log('Cache de hidrômetros atualizado:', this.hydrometersData);
      
    } catch (error) {
      console.error('Erro ao carregar dados dos hidrômetros:', error);
    }
  }

  /**
   * Carrega dados de um hidrômetro específico (usado para detalhes individuais)
   */
  async loadHydrometerData(hydrometerId) {
    try {
      // Primeiro verifica se já temos os dados no cache
      const cachedData = this.hydrometersData.get(hydrometerId);
      if (cachedData) {
        console.log(`Usando dados em cache para hidrômetro ${hydrometerId}`);
        return cachedData;
      }
      
      // Se não tiver no cache, faz uma consulta individual
      console.log(`Carregando dados individuais do hidrômetro ${hydrometerId}...`);
      
      const response = await fetch('/get_leituras/hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hidrometro: hydrometerId, 
          url: this.url 
        })
      });

      const dados = await response.json();
      
      if (dados.id == hydrometerId) {
        this.hydrometersData.set(hydrometerId, dados);
        
        // Atualiza o card do hidrômetro se estiver na view de grid
        if (this.currentView === 'grid') {
          this.updateHydrometerCard(hydrometerId, dados);
        }
        
        // Atualiza a view de detalhes se for o hidrômetro selecionado
        if (this.currentView === 'detail' && this.selectedHydrometer === hydrometerId) {
          this.updateDetailView(dados);
        }
      }
      
      return dados;
    } catch (error) {
      console.error(`Erro ao carregar dados do hidrômetro ${hydrometerId}:`, error);
      
      // Em caso de erro, tenta usar dados do cache se disponível
      const cachedData = this.hydrometersData.get(hydrometerId);
      if (cachedData) {
        console.log(`Usando dados em cache como fallback para hidrômetro ${hydrometerId}`);
        return cachedData;
      }
      
      return null;
    }
  }

  /**
   * Configura conexão MQTT
   */
  setupMQTTConnection() {
    try {
      this.clientMQTT = mqtt.connect(this.config.mqtt.broker, {
        username: this.config.mqtt.username,
        password: this.config.mqtt.password,
        path: this.config.mqtt.path
      });

      this.clientMQTT.on('connect', () => {
        console.log('Conectado ao broker MQTT');
        
        const topics = [this.config.mqtt.hydrometerTopic];
        
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
      case this.config.mqtt.hydrometerTopic:
        try {
          const leitura = JSON.parse(message.toString());
          console.log('Nova leitura:', leitura);
          
          // Atualiza o cache de dados
          this.hydrometersData.set(leitura.id, leitura);
          // Atualiza a interface baseado na view atual
          if (this.currentView === 'grid') {
            this.updateHydrometerCard(leitura.id, leitura);
          } else if (this.currentView === 'detail' && this.selectedHydrometer === leitura.id) {
            let dados = this.hydrometersData.get(Number(leitura.id));
            dados.grafico.push([leitura.data, leitura.leitura])
            this.hydrometersData.set(leitura.id, dados);
            this.updateDetailView(dados);
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
   * Mostra a view de grid com todos os hidrômetros
   */
  showGridView() {
    this.currentView = 'grid';
    
    const container = document.getElementById('main-content');
    container.innerHTML = this.generateGridHTML();
    
    // Atualiza os cards com os dados em cache
    
    this.hydrometers.forEach(hydrometer => {
      const dados = this.hydrometersData.get(Number(hydrometer.id));
      this.updateHydrometerCard(hydrometer.id, dados);
    });
    
    console.log('View de grid exibida com '+this.hydrometers.length+ ' hidrômetros');
  }

  /**
   * Gera HTML para a view de grid
   */
  generateGridHTML() {
    return `
      <div class="grid-header hydro-v2">
        <h1>Monitoramento de Hidrômetros - Visão Geral</h1>
        <p class="grid-subtitle hydro-v2">Clique em um hidrômetro para ver os detalhes</p>
      </div>

      <div class="hydrometers-grid hydro-v2">
        ${this.hydrometers.map(hydrometer => `
          <div class="hydrometer-card hydro-v2" data-hydrometer-id="${hydrometer.id}">
            <div class="hydrometer-header hydro-v2">
              <h3 class="hydrometer-name hydro-v2">${hydrometer.local}</h3>
              <span class="hydrometer-id hydro-v2">ID: ${hydrometer.id}</span>
            </div>
            
            <div class="hydrometer-reading hydro-v2">
              <div class="reading-value hydro-v2" id="reading-${hydrometer.id}">
                <span class="value">--</span>
                <span class="unit">m³</span>
              </div>
              <div class="reading-label hydro-v2">Última Leitura</div>
            </div>
            
            <div class="hydrometer-info hydro-v2">
              <div class="info-item hydro-v2">
                <span class="info-label hydro-v2">Última Atualização:</span>
                <span class="info-value hydro-v2" id="date-${hydrometer.id}">--</span>
              </div>
            </div>
            
            <div class="hydrometer-status hydro-v2" id="status-${hydrometer.id}">
              <span class="status-indicator hydro-v2"></span>
              <span class="status-text hydro-v2">Aguardando dados...</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="grid-actions hydro-v2">
        <div class="report-general-form hydro-v2">
          <h3 class="form-title hydro-v2">Relatório Geral</h3>
          <div class="form-row hydro-v2">
            <div class="form-group hydro-v2">
              <label for="general-start-date" class="form-label hydro-v2">Data de Início:</label>
              <input type="date" id="general-start-date" class="form-input hydro-v2" required>
            </div>
            <div class="form-group hydro-v2">
              <label for="general-end-date" class="form-label hydro-v2">Data de Término:</label>
              <input type="date" id="general-end-date" class="form-input hydro-v2" required>
            </div>
            <div class="form-group hydro-v2">
              <button id="btn-report-general" class="btn btn-report-general hydro-v2">
                <i class="fas fa-file-csv"></i> Gerar Relatório Geral
              </button>
            </div>
          </div>
        </div>
        
        <div class="upload-section hydro-v2">
          <h3 class="form-title hydro-v2">Upload de Leituras</h3>
          <div class="form-group hydro-v2">
            <div class="file-input-wrapper hydro-v2">
              <input type="file" id="file-input" class="file-input hydro-v2" accept=".txt,.csv">
              <label for="file-input" class="file-input-label hydro-v2">
                <i class="fas fa-upload"></i> Selecionar Arquivo
              </label>
            </div>
            <button id="upload-button" class="btn btn-upload hydro-v2">
              <i class="fas fa-cloud-upload-alt"></i> Enviar Leituras
            </button>
          </div>
          <div id="retornoArquivo" class="upload-status hydro-v2">Aguardando arquivo...</div>
        </div>
      </div>
    `;
  }

  /**
   * Atualiza um card de hidrômetro na view de grid
   */
  updateHydrometerCard(hydrometerId, dados) {
    try {
      // Log para depuração de data/hora
      ////console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Data recebida:`, dados.leitura?.data);
      
      // Última leitura
      const readingEl = document.getElementById(`reading-${hydrometerId}`);
      if (readingEl && dados.leitura) {
        readingEl.querySelector('.value').textContent = dados.leitura.leitura || '--';
      }
      
      // Data da última transmissão (corrigindo fuso horário)
      const dateEl = document.getElementById(`date-${hydrometerId}`);
      if (dateEl && dados.leitura && dados.leitura.data) {
        let date;
        if (typeof dados.leitura.data === 'string') {
          const parts = dados.leitura.data.split(' ');
          if (parts.length === 2) {
            const datePart = parts[0].split('-');
            const timePart = parts[1];
            const isoString = `${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}`;
            date = new Date(isoString);
            //console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Data original: ${dados.leitura.data}, ISO: ${isoString}, Objeto Date: ${date}`);
          } else {
            date = new Date(dados.leitura.data);
            //console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Data direta: ${dados.leitura.data}, Objeto Date: ${date}`);
          }
        } else {
          date = new Date(dados.leitura.data);
          //console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Data como objeto: ${dados.leitura.data}, Objeto Date: ${date}`);
        }
        
        const originalHour = date.getHours();
        date.setHours(date.getHours() + 3);
        //console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Hora original: ${originalHour}, Hora corrigida: ${date.getHours()}`);
        
        const formattedDate = date.toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        //console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Data formatada exibida: ${formattedDate}`);
        dateEl.textContent = formattedDate;
      }
      
      // Status do hidrômetro
      const statusEl = document.getElementById(`status-${hydrometerId}`);
      if (statusEl && dados.leitura && dados.leitura.data) {
        const now = new Date();
        let lastUpdate;
        if (typeof dados.leitura.data === 'string') {
          const parts = dados.leitura.data.split(' ');
          if (parts.length === 2) {
            const datePart = parts[0].split('-');
            const timePart = parts[1];
            const isoString = `${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}`;
            lastUpdate = new Date(isoString);
          } else {
            lastUpdate = new Date(dados.leitura.data);
          }
        } else {
          lastUpdate = new Date(dados.leitura.data);
        }
        lastUpdate.setHours(lastUpdate.getHours() + 3);
        
        const diffMinutes = (now - lastUpdate) / (1000 * 60);
        //console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Diferença em minutos: ${diffMinutes.toFixed(2)}`);
        
        const statusConfig = this.config.interface?.hydrometerCard?.statusThresholds || {
          online: 5,
          warning: 15,
          offline: 30
        };

        let statusClass = '';
        let statusText = '';

        if (diffMinutes < statusConfig.online) {
          statusClass = 'online';
          statusText = 'Online';
        } else if (diffMinutes < statusConfig.warning) {
          statusClass = 'warning';
          statusText = 'Atenção';
        } else {
          statusClass = 'offline';
          statusText = 'Offline';
        }
        
        //console.log(`[DEBUG] Hidrômetro ${hydrometerId} - Status: ${statusText} (${statusClass})`);
        statusEl.innerHTML = `<span class="status-indicator hydro-v2 ${statusClass}"></span><span class="status-text hydro-v2">${statusText}</span>`;
      }
      
    } catch (error) {
      console.error(`Erro ao atualizar card do hidrômetro ${hydrometerId}:`, error);
    }
  }

  /**
   * Mostra a view de detalhes de um hidrômetro específico
   */
  async showHydrometerDetail(hydrometerId) {
    this.currentView = 'detail';
    this.selectedHydrometer = hydrometerId;
    const ontem = new Date();   // cria uma cópia para não alterar 'hoje'
    ontem.setDate(ontem.getDate() - 1);
    const hydrometer = this.hydrometers.find(m => m.id === hydrometerId);
    const dados = this.hydrometersData.get(Number(hydrometerId));
    const response = await fetch('/get_grafico_hidro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hidrometro: this.selectedHydrometer,
        url: this.url,
        startDate: ontem.toISOString().split('T')[0]  
      })
    });

    const grafico = await response.json();
    if (dados.id == grafico.id) {
      dados.grafico = grafico.grafico
      const container = document.getElementById('main-content');
      container.innerHTML = this.generateDetailHTML(hydrometer, dados);
    } else {
      console.log("falha ao obter dados")
      console.log(grafico)
      console.log(dados)
    }
    if (dados) {
      this.updateDetailView(dados);
    }
  }

  /**
   * Gera HTML para a view de detalhes
   */
  generateDetailHTML(hydrometer, dados) {
    return `
      <div class="detail-header hydro-v2">
        <button id="back-to-grid" class="back-button hydro-v2">
          ← Voltar à Visão Geral
        </button>
        <h1>${hydrometer.local}</h1>
        <p class="detail-subtitle hydro-v2">ID: ${hydrometer.id}</p>
        <p class="last-update hydro-v2">Última atualização: <span id="detail-date">Carregando...</span></p>
        <div class="detail-actions hydro-v2">
          <button id="btn-report-consumption" class="btn btn-primary hydro-v2">
            <i class="fas fa-file-alt"></i> Relatório de Consumo
          </button>
        </div>
      </div>

      <div class="metrics-grid hydro-v2 readings">
        <div class="metric-card hydro-v2">
          <p class="metric-label hydro-v2">Leitura Atual</p>
          <p class="metric-value hydro-v2" id="current-reading">0<span class="metric-unit hydro-v2">m³</span></p>
        </div>
      </div>

      <!-- Gráfico de Leituras -->
      <div class="charts-section hydro-v2">
        <div class="chart-container hydro-v2">
          <h3 class="chart-title hydro-v2">Leituras Diárias</h3>
          <div id="daily-readings-chart" style="height: 300px;"></div>
        </div>
      </div>

      <!-- Período de Cobrança Section -->
      <div class="section-title hydro-v2">Período de Cobrança</div>
      <div class="consumption-form hydro-v2">
        <h3>Calcular Consumo por Período</h3>
        <div class="form-grid hydro-v2">
          <div class="form-group hydro-v2">
            <label for="start-date" class="form-label hydro-v2">Data Início:</label>
            <input type="date" id="start-date" class="form-input hydro-v2">
          </div>
          <div class="form-group hydro-v2">
            <label for="end-date" class="form-label hydro-v2">Data Fim:</label>
            <input type="date" id="end-date" class="form-input hydro-v2">
          </div>
          <div class="form-group hydro-v2">
            <button id="calcular" class="btn btn-calculate hydro-v2">
              <i class="fas fa-calculator"></i> Calcular Consumo
            </button>
          </div>
        </div>
        <div id="consumption-result" class="upload-status hydro-v2"></div>
      </div>
    `;
  }

  /**
   * Atualiza a view de detalhes com novos dados
   */
  updateDetailView(dados) {
    try {
      // Log para depuração de data/hora na view de detalhes
      //console.log(`[DEBUG] Detail View - Data recebida:`, dados.leitura?.data);
      //console.log(dados)
      // Atualiza data (corrigindo fuso horário)
      const dateEl = document.getElementById('detail-date');
      if (dateEl && dados.leitura && dados.leitura.data) {
        const formattedDate = ajusteDateTime(dados.leitura.data)
        //console.log(`[DEBUG] Detail View - Data formatada exibida: ${formattedDate}`);
        dateEl.textContent = formattedDate;
      }
      
      // Atualiza última leitura
      document.getElementById('current-reading').innerHTML = `${dados.leitura.leitura}<span class="metric-unit hydro-v2">m³</span>`;
      
      // Atualiza gráficos
      this.drawCharts(dados.grafico);
      
    } catch (error) {
      console.error('Erro ao atualizar view de detalhes:', error);
    }
  }

  /**
   * Desenha os gráficos
   */
  drawCharts(grafico) {
    if (!grafico) {
      console.warn('Dados de gráficos diários não disponíveis.');
      return;
    }

    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Data-Hora');
    dataTable.addColumn('number', 'Leitura');

    // Adiciona 3 horas aos dados do gráfico para exibição correta no fuso horário do Brasil
    const chartData = grafico.map(item => {
      const [hour, value] = item;
      const formattedDate = ajusteDateTime(hour)
      return [formattedDate, value/1000]
    });

    dataTable.addRows(chartData);

    const options = {
      title: 'Leituras Diárias (m³)',
      //curveType: 'function',
      legend: { position: 'bottom' },
      colors: [this.config.colors.primary],
      backgroundColor: this.config.colors.surface,
      hAxis: {
        title: 'Data-Hora',
        textStyle: { color: this.config.colors.textSecondary },
        titleTextStyle: { color: this.config.colors.text }
      },
      vAxis: {
        title: 'Leitura (m³)',
        textStyle: { color: this.config.colors.textSecondary },
        titleTextStyle: { color: this.config.colors.text }
      },
      titleTextStyle: { color: this.config.colors.text },
      chartArea: { width: '80%', height: '70%' }
    };

    const chart = new google.visualization.LineChart(document.getElementById('daily-readings-chart'));
    chart.draw(dataTable, options);
  }

  /**
   * Calcula o consumo por período
   */
  async calculateConsumption() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const resultDiv = document.getElementById('consumption-result');

    if (!startDate || !endDate) {
      resultDiv.innerHTML = '<h3 style="color: var(--mep-danger);">Por favor, selecione as datas de início e fim.</h3>';
      return;
    }

    resultDiv.innerHTML = '<h3 style="color: var(--mep-text-secondary);"><i class="fas fa-spinner fa-spin"></i> Calculando...</h3>';

    try {
      const info = {
          hidrometro: this.selectedHydrometer,
          url: this.url,
          datas:{
            startDate: startDate,
            endDate: endDate
          }
        }
      const response = await fetch('/get_consumo/hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        
        body: JSON.stringify({info: info})
      });

      const data = await response.json();

      if (data.consumo !== undefined) {
        resultDiv.innerHTML = `<h3 style="color: var(--mep-success);">
                    <p><strong>Local:</strong> ${data.local}</p>
                    <p><strong>Consumo no período:</strong> ${data.consumo/1000} m³</p>
                    <p><strong>Leitura inicial :</strong> ${data.leitura1/1000} m³ - ${ajusteDateTime(data.dataL1)}</p>
                    <p><strong>Leitura final :</strong> ${data.leitura2/1000} m³ -${ajusteDateTime(data.dataL2)}</p>
                    </h3>`;
      } else {
        resultDiv.innerHTML = `<h3 style="color: var(--mep-danger);">Erro ao calcular consumo: ${data.error || 'Dados inválidos'}</h3>`;
      }
    } catch (error) {
      console.error('Erro ao calcular consumo:', error);
      resultDiv.innerHTML = '<h3 style="color: var(--mep-danger);">Erro ao calcular consumo.</h3>';
    }
  }

  /**
   * Gera o relatório geral de hidrômetros
   */
  async generateGeneralReport() {
    const startDate = document.getElementById('general-start-date').value;
    const endDate = document.getElementById('general-end-date').value;

    if (!startDate || !endDate) {
      alert('Por favor, selecione as datas de início e fim para gerar o relatório geral.');
      return;
    }

    try {
      const info = {
        url: this.url,
        datas:{
          startDate: startDate,
          endDate: endDate
        },
        hidrometros:this.hydrometers 
      }

      fetch('/get_relatorio/hidro', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ info: info }) // Envia o dado da URL como JSON
      })
      .then(response => response.json())
      .then(dados =>{
        try {
        if (dados.error) {
          console.error('Erro do servidor:', dados.log);
          alert('Erro ao gerar relatório geral de hidrômetros:\n' + data.error);
          return;
        } else {
          alert(`<p style="color: blue;">Dados do relatorio obtido com sucesso! Baixando</p>`)
          //console.log(dados)
          // Definir o cabeçalho do CSV
          const cabecalho = ['id', 'local', 'Consumo(l)', 'Data inicial','Hora inicial', 'Leitura Inicial(l)','Data final','Hora final','Leitura Final(l)'];
          
          // Inicializar a string do CSV com o cabeçalho
          let csvContent = cabecalho.join(';') + '\n';
          
          function formatNumber(num) {
            if (num === null || num === undefined || isNaN(num)) return num;                return Number(num).toFixed(2).replace('.', ','); 
          }
          // Iterar sobre o array de dados e adicionar cada linha ao CSV
          dados.forEach(dados => {
            const linha = [
                  dados.id,
                  dados.nome,
                  formatNumber(dados.consumo.valor),
                  dados.consumo.startDate,
                  dados.consumo.startTime,
                  formatNumber(dados.consumo.startValor),
                  dados.consumo.endDate,
                  dados.consumo.endTime,
                  formatNumber(dados.consumo.endValor)
                ];
            csvContent += linha.join(';') + '\n';
          });
          
          // Criar o arquivo CSV e disparar o download
          const link = document.createElement('a');
          const blob = new Blob([csvContent], { type: 'text/csv' });
          link.href = URL.createObjectURL(blob);
          link.download = `relatorio_hidrometros_${this.url}_${info.datas.startDate}_${info.datas.endDate}.csv` // Nome do arquivo CSV
          document.body.appendChild(link);
          link.click(); 
          link.remove();
          alert('Relatório geral de hidrômetros gerado com sucesso!');
        }
        }catch (error) {
          console.error('Erro ao gerar relatório geral:', error);
          alert('Erro ao gerar relatório geral de hidrômetros.');
        }
      })
    }catch (error) {
      console.error('Erro ao gerar relatório geral:', error);
      alert('Erro ao gerar relatório geral de hidrômetros.');
    }  
  }

  /**
   * Mostra o pop-up de relatório de consumo (disponível em breve)
   */
  showConsumptionReportPopup() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
      popupOverlay.classList.add('show');
    }
  }

  /**
   * Esconde o pop-up
   */
  hidePopup() {
    const popupOverlay = document.getElementById('popup-overlay');
    if (popupOverlay) {
      popupOverlay.classList.remove('show');
    }
  }

  /**
   * Manipula o upload de arquivo de leituras
   */
  async handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    const retornoArquivoDiv = document.getElementById('retornoArquivo');

    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
        const content = reader.result;
        const lines = content.split('\n');

        const leituras = lines.map(line => {
            const l = line.split('\t');
            if (l[21] === undefined || l[9] === undefined || l[15] === undefined || l[23] === undefined) {
                return null; // Ignora linhas incompletas
            }
            const data = l[21].split('/');
            return {
                id: l[9],
                local: l[15],
                data: `${data[2]}/${data[1]}/${data[0]} ${l[22]}`, // Formato YYYY/MM/DD HH:mm
                leitura: l[23]
            };
        }).filter(item => item !== null);

        retornoArquivoDiv.innerText = 'Enviando arquivo ...';

        try {
            const response = await fetch('/set_leituras_hidro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: this.clientKey,  // equivalente ao que era usado no socket
                    leituras: leituras
                })
            });

            const retorno = await response.json();

            if (retorno.error) {
                retornoArquivoDiv.innerHTML = `<h3 style="color:red;">${retorno.error}</h3>`;
                return;
            }

            if (retorno.negados > 0) {
                retornoArquivoDiv.innerHTML = `
                    <h3>Leituras carregadas: ${retorno.inseridos}</h3>
                    <h3>Leituras não carregadas: ${retorno.negados}</h3>
                    ${retorno.log.map(e => `
                        <div class="scrollbox" style="color: var(--mep-danger);">
                            <p><strong>Erro:</strong> ${e.erro}</p>
                        </div>
                    `).join('')}
                `;
            } else {
                retornoArquivoDiv.innerHTML = `<h3>Leituras carregadas: ${retorno.inseridos}</h3>`;
            }

        } catch (error) {
            console.error('Erro ao enviar arquivo:', error);
            retornoArquivoDiv.innerText = 'Erro ao enviar o arquivo para o servidor.';
        }
    };

    reader.onerror = () => {
        retornoArquivoDiv.innerText = 'Erro ao ler o arquivo.';
    };

    reader.readAsText(file);
}

  /**
   * Mostra o spinner de carregamento
   */
  showLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
      loadingDiv.style.display = 'flex';
    }
  }

  /**
   * Esconde o spinner de carregamento
   */
  hideLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
      loadingDiv.style.display = 'none';
    }
  }
}

function ajusteDateTime(data) {
  let date;
  if (typeof data === 'string') {
    const parts = data.split(' ');
    if (parts.length === 2) {
      const datePart = parts[0].split('-');
      const timePart = parts[1];
      const isoString = `${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}`;
      date = new Date(isoString);
      //console.log(`[DEBUG] Detail View - Data original: ${data}, ISO: ${isoString}, Objeto Date: ${date}`);
    } else {
      date = new Date(data);
      //console.log(`[DEBUG] Detail View - Data direta: ${data}, Objeto Date: ${date}`);
    }
  } else {
    date = new Date(data);
    //console.log(`[DEBUG] Detail View - Data como objeto: ${data}, Objeto Date: ${date}`);
  }
  
  const originalHour = date.getHours();
  date.setHours(date.getHours() + 3);
  //console.log(`[DEBUG] Detail View - Hora original: ${originalHour}, Hora corrigida: ${date.getHours()}`);
  
  const formattedDate = date.toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return  formattedDate     
}

// Inicializa o monitor quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new HydrometerMonitorV2();
});

