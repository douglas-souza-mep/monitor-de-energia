/**
 * Energy Monitor Dashboard V2
 * Sistema de monitoramento de medidores de energia com visualização em grid
 * 
 * Otimizado para carregar dados iniciais em uma única requisição (v2).
 * Inclui a função de utilidade formatDateForDisplay para parsing robusto de data.
 */

class EnergyMonitorV2 {
  constructor() {
    this.medidores = [];
    this.clientKey = window.CLIENT_KEY; // Obtém a chave do cliente
    this.config = getClientConfig(this.clientKey); // Carrega a configuração do cliente
    
    if (!this.config) {
      console.error("Configuração do cliente não encontrada. Usando fallback.");
      // Fallback para uma configuração padrão ou erro
      //this.config = getClientConfig("santaMonica"); // Exemplo de fallback
    }

    this.url = this.config.api.baseUrl; // URL base da API do cliente
    this.clientMQTT = null;
    this.currentView = 'grid'; // 'grid' ou 'detail'
    this.selectedMeter = null;
    this.metersData = new Map(); // Cache dos dados dos medidores
    
    this.init();
  }

  /**
   * UTILIDADE: Cria um objeto Date robusto a partir de uma string YYYY-MM-DD HH:mm:ss
   * Aplica a correção de fuso horário de +3 horas.
   * @param {string} dateString - Data no formato YYYY-MM-DD HH:mm:ss
   * @returns {Date | null} Objeto Date corrigido ou null se inválido.
   */
  _createCorrectedDate(dateString) {
    if (typeof dateString !== 'string') {
        return null;
    }
    
    // Regex para extrair YYYY, MM, DD, HH, mm, ss
    const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    
    let date;
    if (parts) {
        // Cria a data manualmente: new Date(year, monthIndex, day, hours, minutes, seconds)
        // monthIndex é 0-based (Mês - 1)
        date = new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]);
    } else {
        // Tenta o parsing padrão como fallback
        date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
        return null;
    }

    // Adiciona 3 horas para compensar o fuso horário (mantendo a lógica original)
    //date.setHours(date.getHours() + 3);
    
    return date;
  }

  /**
   * UTILIDADE: Formata um objeto Date para exibição
   * @param {string} dateString - Data no formato YYYY-MM-DD HH:mm:ss
   * @returns {string} Data formatada ou 'Data Inválida'.
   */
  formatDateForDisplay(dateString) {
    const date = this._createCorrectedDate(dateString);
    
    if (!date) {
        return 'Data Inválida';
    }
    
    return date.toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
      // Evita disparar o detalhe se clicar no checkbox de alertas
      if (e.target.closest('.alert-toggle-container')) {
        return;
      }

      const meterCard = e.target.closest('.meter-card');
      if (meterCard && this.currentView === 'grid') {
        const meterId = meterCard.dataset.meterId;
        
        // **OTIMIZAÇÃO APLICADA AQUI:** Carrega os dados detalhados sob demanda
        this.loadMeterData(meterId).then(dados => {
            if (dados) {
                this.showMeterDetail(meterId);
            } else {
                alert('Não foi possível carregar os dados detalhados do medidor.');
            }
        });
      }
    });

    // Listener para o checkbox de alertas
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('alert-checkbox')) {
        const meterId = e.target.dataset.meterId;
        const enabled = e.target.checked;
        this.toggleAlerts(meterId, enabled);
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
  }

  /**
   * Envia comando para habilitar/desabilitar alertas
   */
  async toggleAlerts(meterId, enabled) {
    try {
      const response = await fetch('/v2/editarAlertas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: this.url,
          tipo: 'energ',
          id: meterId,
          habilitado: enabled
        })
      });

      const result = await response.json();

      if (response.ok && result.status === 'ok') {
        const status = enabled ? 'ativados' : 'desativados';
        alert(`Alertas para o medidor ${meterId} foram ${status} com sucesso!`);
        
        // Atualiza o estado no cache local
        const medidor = this.medidores.find(m => m.id === meterId);
        if (medidor) {
          medidor.alertasHabilitados = enabled;
        }
      } else {
        throw new Error(result.message || 'Erro ao processar solicitação');
      }
    } catch (error) {
      console.error('Erro ao alternar alertas:', error);
      alert(`Erro: ${error.message}`);
      
      // Reverte o checkbox em caso de erro
      const checkbox = document.querySelector(`.alert-checkbox[data-meter-id="${meterId}"]`);
      if (checkbox) {
        checkbox.checked = !enabled;
      }
    }
  }

  /**
   * Carrega dados iniciais de forma otimizada (v2)
   * Usa a rota consolidada para obter dados do usuário e de todos os medidores em 1 requisição.
   */
  async loadUserData() {
    try {
      // **REQUISIÇÃO ÚNICA PARA DADOS INICIAIS**
      const response = await fetch('/v2/get-dados-iniciais/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url })
      });

      const dadosIniciais = await response.json();
      
      if (dadosIniciais.error) {
        throw new Error(dadosIniciais.error);
      }

      // 1. Atualiza a lista de medidores (usada para gerar o HTML do grid)
      this.medidores = dadosIniciais.medidores.map(m => ({
        id: m.id.toString(), // Garante que o ID é string para consistência
        local: m.local,
        // Se a informação de alertas não vier, o padrão é habilitado (true)
        alertasHabilitados: m.alertasHabilitados !== undefined ? m.alertasHabilitados : true
      }));
      
      // 2. Armazena os dados de resumo no cache metersData
      dadosIniciais.medidores.forEach(medidor => {
        // Adapta o objeto de resumo para o formato que updateMeterCard espera (formato v1)
        const adaptedData = {
          id: medidor.id.toString(),
          leitura: {
            pft: medidor.pft,
            data: medidor.data // A data já está no formato do banco
          },
          // Simula a estrutura de consumo para o updateMeterCard (Consumo Diário)
          graficos: {
            // O updateMeterCard espera um array de arrays, com o último elemento sendo o consumo de hoje
            semanal: [['Hoje', medidor.consumoDiario]] 
          }
        };
        this.metersData.set(medidor.id.toString(), adaptedData);
      });
      
      console.log('Dados iniciais otimizados carregados. Medidores:', this.medidores);
      return this.medidores;
    } catch (error) {
      console.error('Erro ao carregar dados iniciais otimizados:', error);
      return [];
    }
  }

  /**
   * Inicia a página principal
   */
  async startPage() {
    try {
      this.showLoading();
      
      // Carrega dados dos medidores (agora otimizado)
      await this.loadUserData();
      
      // loadAllMetersData() foi removida, pois os dados iniciais já estão no cache.
      
      // Configura conexão MQTT
      this.setupMQTTConnection();
      
      // Mostra a view de grid
      this.showGridView();
      
    } catch (error) {
      console.error('Erro ao iniciar página:', error);
      this.hideLoading();
    }
  }

  // loadAllMetersData() foi removida, pois não é mais necessária.

  /**
   * Carrega dados de um medidor específico (para detalhes - usa rota v2)
   */
  async loadMeterData(meterId) {
    try {
      // Usa a nova rota para obter dados detalhados (que usa a função v1 getDataStart)
      const response = await fetch('/v2/get-dados-detalhados/energ', {
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
      
      if (dados.error) {
        console.error(`Erro ao carregar dados detalhados do medidor ${meterId}:`, dados.error);
        return null;
      }
      
      // Armazena o dado detalhado (formato v1 completo) no cache
      this.metersData.set(meterId.toString(), dados);
      
      return dados;
    } catch (error) {
      console.error(`Erro ao carregar dados detalhados do medidor ${meterId}:`, error);
      return null;
    }
  }

  /**
   * Configura conexão MQTT
   */
  setupMQTTConnection() {
    try {
      const clientId = 'web_client_'+this.url+'_' + Math.random().toString(16).substr(2, 8);

      this.clientMQTT = mqtt.connect(this.config.mqtt.broker, {
        username: this.config.mqtt.username,
        password: this.config.mqtt.password,
        path: this.config.mqtt.path,
        clientId: clientId, 
        keepalive: 60,      // Garante que o ping ocorra a cada 60s
        reconnectPeriod: 5000, // Tenta reconectar a cada 5s se cair
        connectTimeout: 30 * 1000
      });

      this.clientMQTT.on('connect', () => {
        console.log('Conectado ao broker MQTT');
        
        const topics = [this.config.mqtt.energyTopic];
        
        this.clientMQTT.subscribe(topics, (err) => {
          if (err) {
            console.error('Erro ao subscrever aos tópicos', err);
          } else {
            console.log('Subscrito aos tópicos:', topics.join(', '));
          }
        });
      });

      // **ADAPTAÇÃO MQTT:** A função handleMQTTMessage agora usa a nova utilidade de data.
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
      case this.config.mqtt.energyTopic:
        try {
          const leitura = JSON.parse(message.toString());
          console.log('Nova leitura:', leitura.id);
          
          // Atualiza o cache
          const meterId = leitura.id.toString();
          const cachedData = this.metersData.get(meterId);
          
          if (cachedData) {
            cachedData.leitura = leitura;
            this.metersData.set(meterId, cachedData);
            
            // Se estiver na view de grid, atualiza o card
            if (this.currentView === 'grid') {
              this.updateMeterCard(meterId, cachedData);
            }
            
            // Se estiver na view de detalhes do medidor atual, atualiza a tela
            if (this.currentView === 'detail' && this.selectedMeter === meterId) {
              this.updateDetailView(cachedData);
            }
          }
        } catch (e) {
          console.error('Erro ao processar mensagem MQTT:', e);
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
      <div class="grid-header mep-v2">
        <h1>Monitoramento de Energia - Visão Geral</h1>
        <p class="grid-subtitle mep-v2">Clique em um medidor para ver os detalhes</p>
      </div>
      
      <div class="grid-actions mep-v2">
        <div class="report-general-form mep-v2">
          <h3 class="form-title mep-v2">Relatório Geral</h3>
          <div class="form-row mep-v2">
            <div class="form-group mep-v2">
              <label for="general-start-date" class="form-label mep-v2">Data de Início:</label>
              <input type="date" id="general-start-date" class="form-input mep-v2" required>
            </div>
            <div class="form-group mep-v2">
              <label for="general-end-date" class="form-label mep-v2">Data de Término:</label>
              <input type="date" id="general-end-date" class="form-input mep-v2" required>
            </div>
            <div class="form-group mep-v2">
              <button id="btn-report-general" class="btn btn-report-general mep-v2">
                <i class="fas fa-file-csv"></i> Gerar Relatório Geral
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="meters-grid mep-v2">
        ${this.medidores.map(medidor => `
          <div class="meter-card mep-v2" data-meter-id="${medidor.id}">
            <div class="meter-header mep-v2">
              <div class="meter-title-group">
                <h3 class="meter-name mep-v2">${medidor.local}</h3>
                <span class="meter-id mep-v2">ID: ${medidor.id}</span>
              </div>
              <div class="alert-toggle-container mep-v2" title="Habilitar/Desabilitar Alertas">
                <label class="switch-label mep-v2">Alertas</label>
                <input type="checkbox" class="alert-checkbox mep-v2" 
                  data-meter-id="${medidor.id}" 
                  ${medidor.alertasHabilitados ? 'checked' : ''}>
              </div>
            </div>
            
            <div class="meter-consumption mep-v2">
              <div class="consumption-value mep-v2" id="consumption-${medidor.id}">
                <span class="value">--</span>
                <span class="unit">kWh</span>
              </div>
              <div class="consumption-label mep-v2">Consumo Hoje</div>
            </div>
            
            <div class="meter-info mep-v2">
              <div class="info-item mep-v2">
                <span class="info-label mep-v2">Fator de Potência:</span>
                <span class="info-value mep-v2" id="pf-${medidor.id}">--</span>
              </div>
              <div class="info-item mep-v2">
                <span class="info-label mep-v2">Última Atualização:</span>
                <span class="info-value mep-v2" id="date-${medidor.id}">--</span>
              </div>
            </div>
            
            <div class="meter-status mep-v2" id="status-${medidor.id}">
              <span class="status-indicator mep-v2"></span>
              <span class="status-text mep-v2">Aguardando dados...</span>
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
      // Consumo hoje (Ajustado para o novo formato de dados de resumo)
      const consumptionEl = document.getElementById(`consumption-${meterId}`);
      // Verifica se a estrutura de dados é a nova (resumo) ou a antiga (detalhe)
      const consumoHoje = dados.graficos && dados.graficos.semanal 
        ? dados.graficos.semanal[dados.graficos.semanal.length - 1][1] // Novo formato (resumo)
        : dados.consumos && dados.consumos.consumo // Formato antigo (detalhe) - fallback, mas o ideal é usar o dado de resumo
      
      if (consumptionEl && consumoHoje !== undefined) {
        consumptionEl.querySelector('.value').textContent = parseFloat(consumoHoje).toFixed(2);
      } else if (consumptionEl) {
        // Se for o formato antigo (detalhe)
        if (dados.consumos && dados.consumos.consumo) {
          consumptionEl.querySelector('.value').textContent = parseFloat(dados.consumos.consumo).toFixed(2);
        } else {
          consumptionEl.querySelector('.value').textContent = '--';
        }
      }
      
      // Fator de potência total
      const pfEl = document.getElementById(`pf-${meterId}`);
      if (pfEl && dados.leitura) {
        pfEl.textContent = dados.leitura.pft || '--';
      }
      
      // Data da última transmissão (USANDO A NOVA FUNÇÃO DE UTILIDADE)
      const dateEl = document.getElementById(`date-${meterId}`);
      if (dateEl && dados.leitura && dados.leitura.data) {
        dateEl.textContent = this.formatDateForDisplay(dados.leitura.data);
      }
      
      // Status do medidor
      const statusEl = document.getElementById(`status-${meterId}`);
      if (statusEl && dados.leitura && dados.leitura.data) {
        const now = new Date();
        
        // Processa a data usando a nova utilidade
        const lastUpdate = this._createCorrectedDate(dados.leitura.data);
        
        if (!lastUpdate) {
          statusEl.innerHTML = `<span class="status-indicator mep-v2 offline"></span><span class="status-text mep-v2">Offline</span>`;
          return;
        }

        const diffMinutes = (now - lastUpdate) / (1000 * 60);
        
        // Verifica se a configuração de interface existe
        const statusConfig = this.config.interface?.meterCard?.statusThresholds || {
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
        
        statusEl.innerHTML = `<span class="status-indicator mep-v2 ${statusClass}"></span><span class="status-text mep-v2">${statusText}</span>`;
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
    const dados = this.metersData.get(meterId.toString());
    
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
      <div class="detail-header mep-v2">
        <button id="back-to-grid" class="back-button mep-v2">
          ← Voltar à Visão Geral
        </button>
        <div class="detail-title-row">
          <h1>${medidor.local}</h1>
          <div class="alert-toggle-container detail-alert mep-v2">
            <label class="switch-label mep-v2">Alertas</label>
            <input type="checkbox" class="alert-checkbox mep-v2" 
              data-meter-id="${medidor.id}" 
              ${medidor.alertasHabilitados ? 'checked' : ''}>
          </div>
        </div>
        <p class="detail-subtitle mep-v2">ID: ${medidor.id}</p>
        <p class="last-update mep-v2">Última atualização: <span id="detail-date">Carregando...</span></p>
        
      </div>

      <!-- Voltage Section -->
      <div class="section-title mep-v2">Tensão (V)</div>
      <div class="metrics-grid mep-v2 voltage">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="va">0<span class="metric-unit mep-v2">V</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="vb">0<span class="metric-unit mep-v2">V</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="vc">0<span class="metric-unit mep-v2">V</span></p>
        </div>
      </div>

      <!-- Current Section -->
      <div class="section-title mep-v2">Corrente (A)</div>
      <div class="metrics-grid mep-v2 current">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="ia">0<span class="metric-unit mep-v2">A</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="ib">0<span class="metric-unit mep-v2">A</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="ic">0<span class="metric-unit mep-v2">A</span></p>
        </div>
        <div class="metric-card mep-v2 total">
          <p class="metric-label mep-v2">Total</p>
          <p class="metric-value mep-v2" id="it">0<span class="metric-unit mep-v2">A</span></p>
        </div>
      </div>

      <!-- Power Factor Section -->
      <div class="section-title mep-v2">Fator de Potência</div>
      <div class="metrics-grid mep-v2 power-factor">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="pfa">0.00</p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="pfb">0.00</p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="pfc">0.00</p>
        </div>
        <div class="metric-card mep-v2 total">
          <p class="metric-label mep-v2">Total</p>
          <p class="metric-value mep-v2" id="pft">0.00</p>
        </div>
      </div>

      <!-- Active Power Section -->
      <div class="section-title mep-v2">Potência Ativa (W)</div>
      <div class="metrics-grid mep-v2 active-power">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="pa">0<span class="metric-unit mep-v2">W</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="pb">0<span class="metric-unit mep-v2">W</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="pc">0<span class="metric-unit mep-v2">W</span></p>
        </div>
        <div class="metric-card mep-v2 total">
          <p class="metric-label mep-v2">Total</p>
          <p class="metric-value mep-v2" id="pt">0<span class="metric-unit mep-v2">W</span></p>
        </div>
      </div>

      <!-- Consumption Section -->
      <div class="section-title mep-v2">Consumo (kWh)</div>
      <div class="metrics-grid mep-v2 consumption">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Hoje</p>
          <p class="metric-value mep-v2" id="cd">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Ontem</p>
          <p class="metric-value mep-v2" id="cda">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Consumo Mensal</p>
          <p class="metric-value mep-v2" id="cm">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Mês Anterior</p>
          <p class="metric-value mep-v2" id="cma">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section mep-v2">
        <div class="charts-grid mep-v2 chart-single">
          <div class="chart-container mep-v2">
            <div id="chart_div1"></div>
          </div>
        </div>
        
        <div class="charts-grid mep-v2 chart-double">
          <div class="chart-container mep-v2">
            <div id="chart_div2"></div>
          </div>
          <div class="chart-container mep-v2">
            <div id="chart_div3"></div>
          </div>
        </div>
      </div>

      <!-- Consumption Calculator -->
      <div class="consumption-calculator mep-v2">
        <h3 class="calculator-title mep-v2">Período de Cobrança</h3>
        <form id="event-form" class="calculator-form mep-v2">
          <div class="form-group mep-v2">
            <label for="start-date" class="form-label mep-v2">Data de Início:</label>
            <input type="date" id="start-date" class="form-input mep-v2" required>
          </div>
          
          <div class="form-group mep-v2">
            <label for="end-date" class="form-label mep-v2">Data de Término:</label>
            <input type="date" id="end-date" class="form-input mep-v2" required>
          </div>
          
          <div class="button-group mep-v2">
            <button id="calcular" type="submit" class="btn btn-primary mep-v2">
              📊 Calcular Consumo
            </button>
            <button id="btn-report-consumption" type="button" class="btn btn-secondary mep-v2">
              📋 Relatório de Consumo
            </button>
          </div>
        </form>
      </div>

      <!-- Results Section -->
      <div class="results-section mep-v2 results-grid">
        <div class="chart-container mep-v2">
          <div id="chart_consumo"></div>
        </div>
        <div class="result-container mep-v2">
          <div id="result">
            <div class="text-center mep-v2">
              <p class="text-secondary mep-v2">Selecione um período e clique em "Calcular Consumo" para ver os resultados.</p>
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
      // Atualiza data (USANDO A NOVA FUNÇÃO DE UTILIDADE)
      const dateEl = document.getElementById('detail-date');
      if (dateEl && dados.leitura && dados.leitura.data) {
        dateEl.textContent = dados.leitura.data;
      }
      
      // Atualiza tensões
      document.getElementById('va').innerHTML = `${dados.leitura.uarms}<span class="metric-unit mep-v2">V</span>`;
      document.getElementById('vb').innerHTML = `${dados.leitura.ubrms}<span class="metric-unit mep-v2">V</span>`;
      document.getElementById('vc').innerHTML = `${dados.leitura.ucrms}<span class="metric-unit mep-v2">V</span>`;
      
      // Atualiza correntes
      document.getElementById('ia').innerHTML = `${dados.leitura.iarms}<span class="metric-unit mep-v2">A</span>`;
      document.getElementById('ib').innerHTML = `${dados.leitura.ibrms}<span class="metric-unit mep-v2">A</span>`;
      document.getElementById('ic').innerHTML = `${dados.leitura.icrms}<span class="metric-unit mep-v2">A</span>`;
      document.getElementById('it').innerHTML = `${dados.leitura.itrms}<span class="metric-unit mep-v2">A</span>`;
      
      // Atualiza fatores de potência
      document.getElementById('pfa').textContent = dados.leitura.pfa;
      document.getElementById('pfb').textContent = dados.leitura.pfb;
      document.getElementById('pfc').textContent = dados.leitura.pfc;
      document.getElementById('pft').textContent = dados.leitura.pft;
      
      // Atualiza potências ativas
      document.getElementById('pa').innerHTML = `${dados.leitura.pa}<span class="metric-unit mep-v2">W</span>`;
      document.getElementById('pb').innerHTML = `${dados.leitura.pb}<span class="metric-unit mep-v2">W</span>`;
      document.getElementById('pc').innerHTML = `${dados.leitura.pc}<span class="metric-unit mep-v2">W</span>`;
      document.getElementById('pt').innerHTML = `${dados.leitura.pt}<span class="metric-unit mep-v2">W</span>`;
      
      // Atualiza consumos
      document.getElementById('cd').innerHTML = `${dados.graficos.semanal[dados.graficos.semanal.length-1][1]}<span class="metric-unit mep-v2">kWh</span>`;
      document.getElementById('cda').innerHTML = `${dados.consumos.consumoDiaAnterior}<span class="metric-unit mep-v2">kWh</span>`;
      document.getElementById('cm').innerHTML = `${dados.consumos.consumoMensal}<span class="metric-unit mep-v2">kWh</span>`;
      document.getElementById('cma').innerHTML = `${dados.consumos.consumoMesAnterior}<span class="metric-unit mep-v2">kWh</span>`;
      
      // Atualiza gráficos
      fetch('/get_grafico_diario/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url, medidor: dados.id, data:dados.leitura.data }) // Envia o dado da URL como JSON
      })
      .then(response => response.json())
      .then(dadosDiarios => {
        dados.graficos.diario = dadosDiarios.diario
        this.drawCharts(dados.graficos);
      })
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
      //console.log(dados.diario)
      data1.addRows(dados.diario);

      const options1 = {
        title: 'Consumo Hoje',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Horário' },
        vAxis: { title: 'Potência (W)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: [this.config.colors.primary]
      };

      // Gráfico semestral
      const data2 = new google.visualization.DataTable();
      data2.addColumn('string', 'Datas');
      data2.addColumn('number', 'Consumo');
      data2.addRows(dados.semestral);

      const options2 = {
        title: 'Consumo Mensal (Últimos 6 meses)',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Mês' },
        vAxis: { title: 'Consumo (kWh)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: [this.config.colors.accent  || '#2ecc71']
      };

      // Gráfico semanal
      const data3 = new google.visualization.DataTable();
      data3.addColumn('string', 'Datas');
      data3.addColumn('number', 'Consumo');
      data3.addRows(dados.semanal);

      const options3 = {
        title: 'Consumo Semanal (Últimos 7 dias)',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Data' },
        vAxis: { title: 'Consumo (kWh)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: [this.config.colors.accent || '#e67e22']
      };

      const chart1 = new google.visualization.AreaChart(document.getElementById('chart_div1'));
      chart1.draw(data1, options1);

      const chart2 = new google.visualization.ColumnChart(document.getElementById('chart_div2'));
      chart2.draw(data2, options2);

      const chart3 = new google.visualization.ColumnChart(document.getElementById('chart_div3'));
      chart3.draw(data3, options3);

    } catch (error) {
      console.error('Erro ao desenhar gráficos:', error);
    }
  }

  /**
   * Calcula consumo para um período específico
   */
  async calculateConsumption(e) {
    try {
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e término.');
        return;
      }
      
      this.showLoading();
      
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
              //local: medidor.local
            }
        })
      });
      
      const dados = await response.json();
      this.hideLoading();
      
      if (dados.error) {
        alert('Erro ao calcular consumo: ' + dados.error);
        return;
      }
      
      this.displayCalculationResults(dados);
      this.drawConsumptionChart(dados.grafico, this.selectedMeter, this.medidores.find(m => m.id === this.selectedMeter).local);
      
    } catch (error) {
      console.error('Erro ao calcular consumo:', error);
      this.hideLoading();
      alert('Erro ao calcular consumo. Tente novamente.');
    }
  }

  /**
   * Exibe resultados do cálculo de consumo
   */
  displayCalculationResults(dados) {
    const resultContainer = document.getElementById('result');
    
    // Converte as strings que vêm da API em objetos Date
    const dataInicio = new Date(dados.dataL1);
    const dataFim = new Date(dados.dataL2);

    const formatOptions = { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Sao_Paulo'
    };

    resultContainer.innerHTML = `
      <div class="calculation-results mep-v2">
        <h4 class="results-title mep-v2">Resultado do Período</h4>
        <div class="result-item mep-v2">
          <span class="result-label mep-v2">Consumo Total:</span>
          <span class="result-value mep-v2">${parseFloat(dados.consumo).toFixed(2)} kWh</span>
        </div>
        <div class="result-item mep-v2">
          <span class="result-label mep-v2">Início:</span>
          <span class="result-value mep-v2">
            ${dataInicio.toLocaleString('pt-BR', formatOptions)}
          </span>
        </div>
        <div class="result-item mep-v2">
          <span class="result-label mep-v2">Término:</span>
          <span class="result-value mep-v2">
            ${dataFim.toLocaleString('pt-BR', formatOptions)}
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Gera relatório geral para todos os medidores
   */
  async generateGeneralReport() {
    try {
      const startDate = document.getElementById('general-start-date').value;
      const endDate = document.getElementById('general-end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e término para o relatório geral.');
        return;
      }
      
      this.showLoading();
      
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
      this.hideLoading();
      
      if (dados.error) {
        alert('Erro ao gerar relatório: ' + dados.error);
        return;
      }
      
      this.downloadCSV(dados.relatorio);
      
    } catch (error) {
      console.error('Erro ao gerar relatório geral:', error);
      this.hideLoading();
      alert('Erro ao gerar relatório geral. Tente novamente.');
    }
  }

  /**
   * Mostra popup para relatório de consumo detalhado
   */
  async showConsumptionReportPopup() {
    try {
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e término.');
        return;
      }
      
      this.showLoading();
      
      const response = await fetch('/get_relatorio_detalhado/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: this.url,
          medidor: this.selectedMeter,
          startDate,
          endDate
        })
      });
      console.log("aguardando resposta")
      const dados = await response.json();
      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>..")
      console.log('Dados recebidos para relatório detalhado:', dados);

      this.hideLoading();

      if (dados.error) {
        alert('Erro ao gerar relatório: ' + dados.error);
        return;
      }
      
      this.downloadCSV(dados.relatorio);
      
    } catch (error) {
      console.error('Erro ao gerar relatório de consumo:', error);
      this.hideLoading();
      alert('Erro ao gerar relatório de consumo. Tente novamente.');
    }
  }

  /**
   * Faz download de dados em formato CSV
   */
  downloadCSV(dados) {
    try {
      if (!dados || dados.length === 0) {
        alert('Não há dados para exportar.');
        return;
      }
      
      let csvContent = "Nome;ID;Consumo (kWh);Data Inicio;Data Fim\n";
      
      dados.forEach(item => {
        const linha = [
          item.nome,
          item.id,
          item.NovoConsumo,
          //item.consumo.valor,
          item.consumo.startDate,
          item.consumo.endDate,
          //item.consumo.startValor,
          //item.consumo.endValor
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
        colors: [this.config.colors.primary],
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
    return `<div style="padding: 8px;"><strong>Data:</strong> ${formattedDate}  
<strong>Leitura:</strong> ${value} kWh</div>`;
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
