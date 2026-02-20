// Centralized translations for the dashboard
// Add new languages by extending each label object

export const translations = {
  // Common labels
  allDay: { en: 'All day', it: 'Tutto il giorno', es: 'Todo el día', fr: 'Toute la journée', pt: 'O dia todo', de: 'Ganztägig', nl: 'Hele dag' },
  today: { en: 'Today', it: 'Oggi', es: 'Hoy', fr: "Aujourd'hui", pt: 'Hoje', de: 'Heute', nl: 'Vandaag' },
  tomorrow: { en: 'Tomorrow', it: 'Domani', es: 'Mañana', fr: 'Demain', pt: 'Amanhã', de: 'Morgen', nl: 'Morgen' },
  upcoming: { en: 'Upcoming', it: 'Prossimi', es: 'Próximos', fr: 'À venir', pt: 'Próximos', de: 'Anstehend', nl: 'Aankomend' },
  loading: { en: 'Loading...', it: 'Caricamento...', es: 'Cargando...', fr: 'Chargement...', pt: 'Carregando...', de: 'Laden...', nl: 'Laden...' },
  connecting: { en: 'CONNECTING', it: 'CONNESSIONE', es: 'CONECTANDO', fr: 'CONNEXION', pt: 'CONECTANDO', de: 'VERBINDEN', nl: 'VERBINDEN' },
  notConnected: { en: 'NOT CONNECTED', it: 'NON CONNESSO', es: 'NO CONECTADO', fr: 'NON CONNECTÉ', pt: 'NÃO CONECTADO', de: 'NICHT VERBUNDEN', nl: 'NIET VERBONDEN' },
  connected: { en: 'Connected', it: 'Connesso', es: 'Conectado', fr: 'Connecté', pt: 'Conectado', de: 'Verbunden', nl: 'Verbonden' },
  error: { en: 'Error', it: 'Errore', es: 'Error', fr: 'Erreur', pt: 'Erro', de: 'Fehler', nl: 'Fout' },
  noData: { en: 'No data', it: 'Nessun dato', es: 'Sin datos', fr: 'Aucune donnée', pt: 'Sem dados', de: 'Keine Daten', nl: 'Geen gegevens' },

  // Calendar
  calendar: { en: 'Calendar', it: 'Calendario', es: 'Calendario', fr: 'Calendrier', pt: 'Calendário', de: 'Kalender', nl: 'Agenda' },
  noEvents: { en: 'No events this week', it: 'Nessun evento questa settimana', es: 'Sin eventos esta semana', fr: 'Aucun événement cette semaine', pt: 'Sem eventos esta semana', de: 'Keine Termine diese Woche', nl: 'Geen evenementen deze week' },
  loadingEvents: { en: 'Loading events...', it: 'Caricamento eventi...', es: 'Cargando eventos...', fr: 'Chargement des événements...', pt: 'Carregando eventos...', de: 'Termine laden...', nl: 'Evenementen laden...' },
  addCalendars: { en: 'Add calendars in Setup', it: 'Aggiungi calendari in Setup', es: 'Agregar calendarios en Setup', fr: 'Ajouter des calendriers dans Setup', pt: 'Adicionar calendários em Setup', de: 'Kalender in Setup hinzufügen', nl: "Agenda's toevoegen in Setup" },

  // Weather
  weather: { en: 'Weather', it: 'Meteo', es: 'Clima', fr: 'Météo', pt: 'Clima', de: 'Wetter', nl: 'Weer' },
  loadingWeather: { en: 'Loading weather for', it: 'Caricamento meteo per', es: 'Cargando clima para', fr: 'Chargement météo pour', pt: 'Carregando clima para', de: 'Wetter laden für', nl: 'Weer laden voor' },
  addCity: { en: 'Add a city to this clock for weather', it: 'Aggiungi una città a questo orologio per il meteo', es: 'Agrega una ciudad a este reloj para el clima', fr: 'Ajoutez une ville à cette horloge pour la météo', pt: 'Adicione uma cidade a este relógio para o clima', de: 'Fügen Sie diesem Uhr eine Stadt für das Wetter hinzu', nl: 'Voeg een stad toe aan deze klok voor het weer' },
  addApiKey: { en: 'Add weather API key in Setup', it: 'Aggiungi la chiave API meteo in Setup', es: 'Agrega la clave API del clima en Setup', fr: 'Ajoutez la clé API météo dans Setup', pt: 'Adicione a chave API do clima em Setup', de: 'Wetter-API-Schlüssel im Setup hinzufügen', nl: 'Voeg weer API-sleutel toe in Setup' },
  humidity: { en: 'Humidity', it: 'Umidità', es: 'Humedad', fr: 'Humidité', pt: 'Humidade', de: 'Feuchtigkeit', nl: 'Vochtigheid' },
  wind: { en: 'Wind', it: 'Vento', es: 'Viento', fr: 'Vent', pt: 'Vento', de: 'Wind', nl: 'Wind' },
  feelsLike: { en: 'Feels like', it: 'Percepito', es: 'Sensación', fr: 'Ressenti', pt: 'Sensação', de: 'Gefühlt', nl: 'Voelt als' },

  // Uptime
  uptime: { en: 'Uptime', it: 'Tempo di attività', es: 'Tiempo activo', fr: 'Disponibilité', pt: 'Tempo de atividade', de: 'Verfügbarkeit', nl: 'Uptime' },
  services: { en: 'Services', it: 'Servizi', es: 'Servicios', fr: 'Services', pt: 'Serviços', de: 'Dienste', nl: 'Services' },
  allServicesUp: { en: 'All services up', it: 'Tutti i servizi attivi', es: 'Todos los servicios activos', fr: 'Tous les services en ligne', pt: 'Todos os serviços ativos', de: 'Alle Dienste aktiv', nl: 'Alle services actief' },
  servicesDown: { en: 'services down', it: 'servizi inattivi', es: 'servicios caídos', fr: 'services hors ligne', pt: 'serviços inativos', de: 'Dienste ausgefallen', nl: 'services offline' },
  noServices: { en: 'No services configured', it: 'Nessun servizio configurato', es: 'Sin servicios configurados', fr: 'Aucun service configuré', pt: 'Nenhum serviço configurado', de: 'Keine Dienste konfiguriert', nl: 'Geen services geconfigureerd' },
  noMonitors: { en: 'No monitors found', it: 'Nessun monitor trovato', es: 'No se encontraron monitores', fr: 'Aucun moniteur trouvé', pt: 'Nenhum monitor encontrado', de: 'Keine Monitore gefunden', nl: 'Geen monitors gevonden' },
  connectUptimeKuma: { en: 'Connect Uptime Kuma in Setup', it: 'Connetti Uptime Kuma in Setup', es: 'Conectar Uptime Kuma en Setup', fr: 'Connecter Uptime Kuma dans Setup', pt: 'Conectar Uptime Kuma em Setup', de: 'Uptime Kuma in Setup verbinden', nl: 'Verbind Uptime Kuma in Setup' },
  online: { en: 'Online', it: 'Online', es: 'En línea', fr: 'En ligne', pt: 'Online', de: 'Online', nl: 'Online' },
  offline: { en: 'Offline', it: 'Offline', es: 'Desconectado', fr: 'Hors ligne', pt: 'Offline', de: 'Offline', nl: 'Offline' },

  // Media/Tautulli
  nowPlaying: { en: 'Now Playing', it: 'In riproduzione', es: 'Reproduciendo', fr: 'En lecture', pt: 'Reproduzindo', de: 'Wird abgespielt', nl: 'Nu aan het spelen' },
  recentlyAdded: { en: 'Recently Added', it: 'Aggiunti di recente', es: 'Añadidos recientemente', fr: 'Ajoutés récemment', pt: 'Adicionados recentemente', de: 'Kürzlich hinzugefügt', nl: 'Recent toegevoegd' },
  history: { en: 'History', it: 'Cronologia', es: 'Historial', fr: 'Historique', pt: 'Histórico', de: 'Verlauf', nl: 'Geschiedenis' },
  stats: { en: 'Stats', it: 'Statistiche', es: 'Estadísticas', fr: 'Statistiques', pt: 'Estatísticas', de: 'Statistiken', nl: 'Statistieken' },
  noActivity: { en: 'No activity', it: 'Nessuna attività', es: 'Sin actividad', fr: 'Aucune activité', pt: 'Sem atividade', de: 'Keine Aktivität', nl: 'Geen activiteit' },
  noHistory: { en: 'No history', it: 'Nessuna cronologia', es: 'Sin historial', fr: 'Aucun historique', pt: 'Sem histórico', de: 'Kein Verlauf', nl: 'Geen geschiedenis' },
  nothingPlaying: { en: 'Nothing playing', it: 'Nessuna riproduzione', es: 'Nada reproduciendo', fr: 'Rien en lecture', pt: 'Nada reproduzindo', de: 'Nichts wird abgespielt', nl: 'Niets aan het spelen' },
  loadingStats: { en: 'Loading stats...', it: 'Caricamento statistiche...', es: 'Cargando estadísticas...', fr: 'Chargement des statistiques...', pt: 'Carregando estatísticas...', de: 'Statistiken laden...', nl: 'Statistieken laden...' },
  topUsers: { en: 'TOP USERS', it: 'UTENTI TOP', es: 'USUARIOS TOP', fr: 'TOP UTILISATEURS', pt: 'TOP USUÁRIOS', de: 'TOP BENUTZER', nl: 'TOP GEBRUIKERS' },
  days: { en: 'DAYS', it: 'GIORNI', es: 'DÍAS', fr: 'JOURS', pt: 'DIAS', de: 'TAGE', nl: 'DAGEN' },
  movies: { en: 'Movies', it: 'Film', es: 'Películas', fr: 'Films', pt: 'Filmes', de: 'Filme', nl: 'Films' },
  shows: { en: 'Shows', it: 'Serie', es: 'Series', fr: 'Séries', pt: 'Séries', de: 'Serien', nl: 'Series' },
  episodes: { en: 'Episodes', it: 'Episodi', es: 'Episodios', fr: 'Épisodes', pt: 'Episódios', de: 'Episoden', nl: 'Afleveringen' },
  artists: { en: 'Artists', it: 'Artisti', es: 'Artistas', fr: 'Artistes', pt: 'Artistas', de: 'Künstler', nl: 'Artiesten' },
  albums: { en: 'Albums', it: 'Album', es: 'Álbumes', fr: 'Albums', pt: 'Álbuns', de: 'Alben', nl: 'Albums' },
  plays: { en: 'plays', it: 'riproduzioni', es: 'reproducciones', fr: 'lectures', pt: 'reproduções', de: 'Wiedergaben', nl: 'afgespeeld' },

  // Downloads
  downloads: { en: 'Downloads', it: 'Download', es: 'Descargas', fr: 'Téléchargements', pt: 'Downloads', de: 'Downloads', nl: 'Downloads' },
  noDownloads: { en: 'No active downloads', it: 'Nessun download attivo', es: 'Sin descargas activas', fr: 'Aucun téléchargement actif', pt: 'Sem downloads ativos', de: 'Keine aktiven Downloads', nl: 'Geen actieve downloads' },
  queued: { en: 'Queued', it: 'In coda', es: 'En cola', fr: 'En file', pt: 'Na fila', de: 'Warteschlange', nl: 'In wachtrij' },
  downloading: { en: 'Downloading', it: 'Scaricamento', es: 'Descargando', fr: 'Téléchargement', pt: 'Baixando', de: 'Wird heruntergeladen', nl: 'Downloaden' },

  // System
  system: { en: 'System', it: 'Sistema', es: 'Sistema', fr: 'Système', pt: 'Sistema', de: 'System', nl: 'Systeem' },
  cpu: { en: 'CPU', it: 'CPU', es: 'CPU', fr: 'CPU', pt: 'CPU', de: 'CPU', nl: 'CPU' },
  memory: { en: 'Memory', it: 'Memoria', es: 'Memoria', fr: 'Mémoire', pt: 'Memória', de: 'Speicher', nl: 'Geheugen' },
  disk: { en: 'Disk', it: 'Disco', es: 'Disco', fr: 'Disque', pt: 'Disco', de: 'Festplatte', nl: 'Schijf' },
  network: { en: 'Network', it: 'Rete', es: 'Red', fr: 'Réseau', pt: 'Rede', de: 'Netzwerk', nl: 'Netwerk' },

  // Docker
  docker: { en: 'Docker', it: 'Docker', es: 'Docker', fr: 'Docker', pt: 'Docker', de: 'Docker', nl: 'Docker' },
  containers: { en: 'Containers', it: 'Contenitori', es: 'Contenedores', fr: 'Conteneurs', pt: 'Containers', de: 'Container', nl: 'Containers' },
  running: { en: 'Running', it: 'In esecuzione', es: 'Ejecutando', fr: 'En cours', pt: 'Executando', de: 'Läuft', nl: 'Actief' },
  stopped: { en: 'Stopped', it: 'Arrestato', es: 'Detenido', fr: 'Arrêté', pt: 'Parado', de: 'Gestoppt', nl: 'Gestopt' },

  // Cameras
  cameras: { en: 'Cameras', it: 'Telecamere', es: 'Cámaras', fr: 'Caméras', pt: 'Câmeras', de: 'Kameras', nl: "Camera's" },
  noCameras: { en: 'No cameras configured', it: 'Nessuna telecamera configurata', es: 'Sin cámaras configuradas', fr: 'Aucune caméra configurée', pt: 'Nenhuma câmera configurada', de: 'Keine Kameras konfiguriert', nl: "Geen camera's geconfigureerd" },
  live: { en: 'LIVE', it: 'LIVE', es: 'EN VIVO', fr: 'EN DIRECT', pt: 'AO VIVO', de: 'LIVE', nl: 'LIVE' },

  // RSS
  rss: { en: 'RSS', it: 'RSS', es: 'RSS', fr: 'RSS', pt: 'RSS', de: 'RSS', nl: 'RSS' },
  news: { en: 'News', it: 'Notizie', es: 'Noticias', fr: 'Actualités', pt: 'Notícias', de: 'Nachrichten', nl: 'Nieuws' },
  noNews: { en: 'No news', it: 'Nessuna notizia', es: 'Sin noticias', fr: 'Aucune actualité', pt: 'Sem notícias', de: 'Keine Nachrichten', nl: 'Geen nieuws' },

  // Posters
  posters: { en: 'Posters', it: 'Poster', es: 'Pósters', fr: 'Affiches', pt: 'Pôsteres', de: 'Poster', nl: 'Posters' },
  trending: { en: 'Trending', it: 'Di tendenza', es: 'Tendencias', fr: 'Tendances', pt: 'Em alta', de: 'Trending', nl: 'Trending' },
  popular: { en: 'Popular', it: 'Popolari', es: 'Populares', fr: 'Populaires', pt: 'Populares', de: 'Beliebt', nl: 'Populair' },

  // Home Assistant
  homeAssistant: { en: 'Home Assistant', it: 'Home Assistant', es: 'Home Assistant', fr: 'Home Assistant', pt: 'Home Assistant', de: 'Home Assistant', nl: 'Home Assistant' },
  on: { en: 'ON', it: 'ACCESO', es: 'ENCENDIDO', fr: 'ALLUMÉ', pt: 'LIGADO', de: 'AN', nl: 'AAN' },
  off: { en: 'OFF', it: 'SPENTO', es: 'APAGADO', fr: 'ÉTEINT', pt: 'DESLIGADO', de: 'AUS', nl: 'UIT' },
  unavailable: { en: 'Unavailable', it: 'Non disponibile', es: 'No disponible', fr: 'Indisponible', pt: 'Indisponível', de: 'Nicht verfügbar', nl: 'Niet beschikbaar' },

  // Panel connection messages
  connectHomeAssistantInSetup: { en: 'Connect Home Assistant in Setup', it: 'Connetti Home Assistant in Setup', es: 'Conectar Home Assistant en Configuración', fr: 'Connecter Home Assistant dans Setup', pt: 'Conectar Home Assistant em Configurações', de: 'Home Assistant in Setup verbinden', nl: 'Verbind Home Assistant in Setup' },
  connectTautulliInSetup: { en: 'Connect Tautulli in Setup', it: 'Connetti Tautulli in Setup', es: 'Conectar Tautulli en Configuración', fr: 'Connecter Tautulli dans Setup', pt: 'Conectar Tautulli em Configurações', de: 'Tautulli in Setup verbinden', nl: 'Verbind Tautulli in Setup' },
  waitingForHomeAssistant: { en: 'Waiting for Home Assistant...', it: 'In attesa di Home Assistant...', es: 'Esperando Home Assistant...', fr: 'En attente de Home Assistant...', pt: 'Aguardando Home Assistant...', de: 'Warten auf Home Assistant...', nl: 'Wachten op Home Assistant...' },
  waitingForTautulli: { en: 'Waiting for Tautulli...', it: 'In attesa di Tautulli...', es: 'Esperando Tautulli...', fr: 'En attente de Tautulli...', pt: 'Aguardando Tautulli...', de: 'Warten auf Tautulli...', nl: 'Wachten op Tautulli...' },
  addEntitiesInSetup: { en: 'Add entities in Setup', it: 'Aggiungi entità in Setup', es: 'Agregar entidades en Configuración', fr: 'Ajouter des entités dans Setup', pt: 'Adicionar entidades em Configurações', de: 'Entitäten im Setup hinzufügen', nl: 'Voeg entiteiten toe in Setup' },

  // Smart Home
  smartHome: { en: 'Smart Home', it: 'Casa Intelligente', es: 'Casa Inteligente', fr: 'Maison Connectée', pt: 'Casa Inteligente', de: 'Smart Home', nl: 'Smart Home' },
  clockWeather: { en: 'Clock & Weather', it: 'Orologio e Meteo', es: 'Reloj y Clima', fr: 'Horloge et Météo', pt: 'Relógio e Clima', de: 'Uhr & Wetter', nl: 'Klok & Weer' },
  plex: { en: 'Plex', it: 'Plex', es: 'Plex', fr: 'Plex', pt: 'Plex', de: 'Plex', nl: 'Plex' },
  discover: { en: 'Discover', it: 'Scopri', es: 'Descubrir', fr: 'Découvrir', pt: 'Descobrir', de: 'Entdecken', nl: 'Ontdekken' },

  // Notes
  notesPanelEmpty: { en: 'Add notes in Setup', it: 'Aggiungi note in Setup', es: 'Agregar notas en Configuración', fr: 'Ajouter des notes dans Setup', pt: 'Adicionar notas em Configurações', de: 'Notizen im Setup hinzufügen', nl: 'Voeg notities toe in Setup' },

  // Quick Links
  quickLinksEmpty: { en: 'Add links in Setup', it: 'Aggiungi link in Setup', es: 'Agregar enlaces en Configuración', fr: 'Ajouter des liens dans Setup', pt: 'Adicionar links em Configurações', de: 'Links im Setup hinzufügen', nl: 'Voeg links toe in Setup' },
  noQuickLinks: { en: 'No quick links yet', it: 'Nessun link rapido', es: 'Sin enlaces rápidos', fr: 'Aucun lien rapide', pt: 'Sem links rápidos', de: 'Keine Schnelllinks', nl: 'Geen snelkoppelingen' },
  clickToAddLink: { en: 'Click + to add your first link', it: 'Clicca + per aggiungere il tuo primo link', es: 'Haz clic en + para agregar tu primer enlace', fr: 'Cliquez sur + pour ajouter votre premier lien', pt: 'Clique em + para adicionar seu primeiro link', de: 'Klicken Sie auf +, um Ihren ersten Link hinzuzufügen', nl: 'Klik op + om je eerste link toe te voegen' },

  // Cameras
  addCamerasInSetup: { en: 'Add cameras in Setup', it: 'Aggiungi telecamere in Setup', es: 'Agregar cámaras en Configuración', fr: 'Ajouter des caméras dans Setup', pt: 'Adicionar câmeras em Configurações', de: 'Kameras im Setup hinzufügen', nl: "Voeg camera's toe in Setup" },

  // Notes panel
  noNotes: { en: 'No notes', it: 'Nessuna nota', es: 'Sin notas', fr: 'Aucune note', pt: 'Sem notas', de: 'Keine Notizen', nl: 'Geen notities' },
  addNotesInSetup: { en: 'Add notes in Setup', it: 'Aggiungi note in Setup', es: 'Agregar notas en Configuración', fr: 'Ajouter des notes dans Setup', pt: 'Adicionar notas em Configurações', de: 'Notizen im Setup hinzufügen', nl: 'Voeg notities toe in Setup' },

  // System panel
  configureSystemInSetup: { en: 'Configure System API in Setup', it: 'Configura API Sistema in Setup', es: 'Configurar API del Sistema en Configuración', fr: 'Configurer l\'API Système dans Setup', pt: 'Configurar API do Sistema em Configurações', de: 'System-API im Setup konfigurieren', nl: 'Configureer Systeem API in Setup' },

  // Media/Arr panel
  configureArrInSetup: { en: 'Configure Arr services in Setup', it: 'Configura servizi Arr in Setup', es: 'Configurar servicios Arr en Configuración', fr: 'Configurer les services Arr dans Setup', pt: 'Configurar serviços Arr em Configurações', de: 'Arr-Dienste im Setup konfigurieren', nl: 'Configureer Arr services in Setup' },
  arrServices: { en: 'Overseerr, Radarr, Sonarr, Readarr', it: 'Overseerr, Radarr, Sonarr, Readarr', es: 'Overseerr, Radarr, Sonarr, Readarr', fr: 'Overseerr, Radarr, Sonarr, Readarr', pt: 'Overseerr, Radarr, Sonarr, Readarr', de: 'Overseerr, Radarr, Sonarr, Readarr', nl: 'Overseerr, Radarr, Sonarr, Readarr' },
  media: { en: 'Media', it: 'Media', es: 'Media', fr: 'Médias', pt: 'Mídia', de: 'Medien', nl: 'Media' },

  // Downloads panel
  configureDownloadsInSetup: { en: 'Configure download clients in Setup', it: 'Configura client di download in Setup', es: 'Configurar clientes de descarga en Configuración', fr: 'Configurer les clients de téléchargement dans Setup', pt: 'Configurar clientes de download em Configurações', de: 'Download-Clients im Setup konfigurieren', nl: 'Configureer download-clients in Setup' },
  downloadClients: { en: 'qBittorrent, Deluge, SABnzbd, Transmission', it: 'qBittorrent, Deluge, SABnzbd, Transmission', es: 'qBittorrent, Deluge, SABnzbd, Transmission', fr: 'qBittorrent, Deluge, SABnzbd, Transmission', pt: 'qBittorrent, Deluge, SABnzbd, Transmission', de: 'qBittorrent, Deluge, SABnzbd, Transmission', nl: 'qBittorrent, Deluge, SABnzbd, Transmission' },

  // Docker panel
  configureDockerInSetup: { en: 'Configure Docker in Setup', it: 'Configura Docker in Setup', es: 'Configurar Docker en Configuración', fr: 'Configurer Docker dans Setup', pt: 'Configurar Docker em Configurações', de: 'Docker im Setup konfigurieren', nl: 'Configureer Docker in Setup' },
  dockerTypes: { en: 'Portainer or Direct Docker API', it: 'Portainer o API Docker diretta', es: 'Portainer o API de Docker directa', fr: 'Portainer ou API Docker directe', pt: 'Portainer ou API Docker direta', de: 'Portainer oder direkte Docker-API', nl: 'Portainer of directe Docker API' },

  // RSS panel
  configureRssInSetup: { en: 'Configure RSS feeds in Setup', it: 'Configura feed RSS in Setup', es: 'Configurar feeds RSS en Configuración', fr: 'Configurer les flux RSS dans Setup', pt: 'Configurar feeds RSS em Configurações', de: 'RSS-Feeds im Setup konfigurieren', nl: 'Configureer RSS-feeds in Setup' },
  rssHint: { en: 'Add news, blogs, or any RSS/Atom feed', it: 'Aggiungi notizie, blog o qualsiasi feed RSS/Atom', es: 'Agrega noticias, blogs o cualquier feed RSS/Atom', fr: 'Ajoutez des actualités, blogs ou tout flux RSS/Atom', pt: 'Adicione notícias, blogs ou qualquer feed RSS/Atom', de: 'Nachrichten, Blogs oder beliebige RSS/Atom-Feeds hinzufügen', nl: 'Voeg nieuws, blogs of elke RSS/Atom-feed toe' },
  rssFeed: { en: 'RSS Feed', it: 'Feed RSS', es: 'Feed RSS', fr: 'Flux RSS', pt: 'Feed RSS', de: 'RSS-Feed', nl: 'RSS-feed' },

  // Poster panel
  configurePosterInSetup: { en: 'Configure TMDB API key in Setup', it: 'Configura chiave API TMDB in Setup', es: 'Configurar clave API TMDB en Configuración', fr: 'Configurer la clé API TMDB dans Setup', pt: 'Configurar chave API TMDB em Configurações', de: 'TMDB-API-Schlüssel im Setup konfigurieren', nl: 'Configureer TMDB API-sleutel in Setup' },
  posterHint: { en: 'Get a free API key at themoviedb.org', it: 'Ottieni una chiave API gratuita su themoviedb.org', es: 'Obtén una clave API gratuita en themoviedb.org', fr: 'Obtenez une clé API gratuite sur themoviedb.org', pt: 'Obtenha uma chave API gratuita em themoviedb.org', de: 'Holen Sie sich einen kostenlosen API-Schlüssel bei themoviedb.org', nl: 'Verkrijg een gratis API-sleutel op themoviedb.org' },

  // Now Playing panel (MediaPanel)
  nowPlayingPanel: { en: 'Now Playing', it: 'In riproduzione', es: 'Reproduciendo', fr: 'En lecture', pt: 'Reproduzindo', de: 'Wird abgespielt', nl: 'Nu aan het spelen' },
  waitingForHomeAssistant: { en: 'Waiting for Home Assistant...', it: 'In attesa di Home Assistant...', es: 'Esperando Home Assistant...', fr: 'En attente de Home Assistant...', pt: 'Aguardando Home Assistant...', de: 'Warten auf Home Assistant...', nl: 'Wachten op Home Assistant...' },
  noMediaPlayersFound: { en: 'No media players found', it: 'Nessun lettore multimediale trovato', es: 'No se encontraron reproductores', fr: 'Aucun lecteur trouvé', pt: 'Nenhum reprodutor encontrado', de: 'Keine Mediaplayer gefunden', nl: 'Geen mediaspelers gevonden' },
  playing: { en: 'PLAYING', it: 'IN RIPRODUZIONE', es: 'REPRODUCIENDO', fr: 'EN LECTURE', pt: 'REPRODUZINDO', de: 'SPIELT AB', nl: 'SPEELT' },
  selectPlayer: { en: 'Select player', it: 'Seleziona lettore', es: 'Seleccionar reproductor', fr: 'Sélectionner lecteur', pt: 'Selecionar reprodutor', de: 'Player auswählen', nl: 'Selecteer speler' },
  active: { en: 'active', it: 'attivo', es: 'activo', fr: 'actif', pt: 'ativo', de: 'aktiv', nl: 'actief' },
  playerOff: { en: 'Player Off', it: 'Lettore spento', es: 'Reproductor apagado', fr: 'Lecteur éteint', pt: 'Reprodutor desligado', de: 'Player aus', nl: 'Speler uit' },
  idle: { en: 'Idle', it: 'Inattivo', es: 'Inactivo', fr: 'Inactif', pt: 'Inativo', de: 'Ruhend', nl: 'Inactief' },
  paused: { en: 'Paused', it: 'In pausa', es: 'Pausado', fr: 'En pause', pt: 'Pausado', de: 'Pausiert', nl: 'Gepauzeerd' },
  nothingPlayingShort: { en: 'Nothing Playing', it: 'Nessuna riproduzione', es: 'Nada reproduciendo', fr: 'Rien en lecture', pt: 'Nada tocando', de: 'Nichts abgespielt', nl: 'Niets aan het spelen' },

  // Camera panel
  noCamerasFound: { en: 'No cameras found', it: 'Nessuna telecamera trovata', es: 'No se encontraron cámaras', fr: 'Aucune caméra trouvée', pt: 'Nenhuma câmera encontrada', de: 'Keine Kameras gefunden', nl: "Geen camera's gevonden" },
  waitingForConnection: { en: 'Waiting for connection...', it: 'In attesa di connessione...', es: 'Esperando conexión...', fr: 'En attente de connexion...', pt: 'Aguardando conexão...', de: 'Warten auf Verbindung...', nl: 'Wachten op verbinding...' },
  cameraUnavailable: { en: 'Camera unavailable', it: 'Telecamera non disponibile', es: 'Cámara no disponible', fr: 'Caméra indisponible', pt: 'Câmera indisponível', de: 'Kamera nicht verfügbar', nl: 'Camera niet beschikbaar' },
  noStreamUrl: { en: 'No stream URL', it: 'Nessun URL di streaming', es: 'Sin URL de transmisión', fr: 'Pas d\'URL de flux', pt: 'Sem URL de stream', de: 'Keine Stream-URL', nl: 'Geen stream URL' },

  // Notes panel extras
  notes: { en: 'Notes', it: 'Note', es: 'Notas', fr: 'Notes', pt: 'Notas', de: 'Notizen', nl: 'Notities' },

  // Quick Links panel
  quickLinks: { en: 'Quick Links', it: 'Link rapidi', es: 'Enlaces rápidos', fr: 'Liens rapides', pt: 'Links rápidos', de: 'Schnelllinks', nl: 'Snelkoppelingen' },

  // Docker panel extras
  noContainersFound: { en: 'No containers found', it: 'Nessun container trovato', es: 'No se encontraron contenedores', fr: 'Aucun conteneur trouvé', pt: 'Nenhum container encontrado', de: 'Keine Container gefunden', nl: 'Geen containers gevonden' },
  unhealthy: { en: 'unhealthy', it: 'non integro', es: 'no saludable', fr: 'défaillant', pt: 'não saudável', de: 'fehlerhaft', nl: 'ongezond' },

  // RSS panel extras
  allFeedsFailedToLoad: { en: 'All feeds failed to load', it: 'Caricamento di tutti i feed fallito', es: 'Todos los feeds fallaron al cargar', fr: 'Tous les flux ont échoué', pt: 'Todos os feeds falharam ao carregar', de: 'Alle Feeds konnten nicht geladen werden', nl: 'Alle feeds konden niet laden' },
  noFeedItems: { en: 'No feed items', it: 'Nessun elemento nel feed', es: 'Sin elementos de feed', fr: 'Aucun élément de flux', pt: 'Sem itens de feed', de: 'Keine Feed-Elemente', nl: 'Geen feed-items' },
  checkFeedUrlsInSetup: { en: 'Check feed URLs in Setup', it: 'Controlla URL feed in Setup', es: 'Verifica URLs de feeds en Configuración', fr: 'Vérifiez les URLs dans Setup', pt: 'Verifique URLs dos feeds em Configurações', de: 'Feed-URLs im Setup überprüfen', nl: 'Controleer feed-URLs in Setup' },
  failed: { en: 'failed', it: 'fallito', es: 'fallido', fr: 'échoué', pt: 'falhou', de: 'fehlgeschlagen', nl: 'mislukt' },
  all: { en: 'All', it: 'Tutti', es: 'Todos', fr: 'Tous', pt: 'Todos', de: 'Alle', nl: 'Alle' },

  // Poster panel extras
  noContentToDisplay: { en: 'No content to display', it: 'Nessun contenuto da mostrare', es: 'Sin contenido para mostrar', fr: 'Aucun contenu à afficher', pt: 'Sem conteúdo para exibir', de: 'Kein Inhalt anzuzeigen', nl: 'Geen inhoud om weer te geven' },
  tmdbRequired: { en: 'TMDB is required for poster images, even when using Trakt', it: 'TMDB è richiesto per le immagini, anche con Trakt', es: 'TMDB es necesario para las imágenes, incluso con Trakt', fr: 'TMDB est requis pour les images, même avec Trakt', pt: 'TMDB é necessário para imagens, mesmo com Trakt', de: 'TMDB wird für Bilder benötigt, auch mit Trakt', nl: 'TMDB is vereist voor afbeeldingen, ook met Trakt' },
  available: { en: 'AVAILABLE', it: 'DISPONIBILE', es: 'DISPONIBLE', fr: 'DISPONIBLE', pt: 'DISPONÍVEL', de: 'VERFÜGBAR', nl: 'BESCHIKBAAR' },
  inLibrary: { en: 'IN LIBRARY', it: 'IN LIBRERIA', es: 'EN BIBLIOTECA', fr: 'DANS LA BIBLIOTHÈQUE', pt: 'NA BIBLIOTECA', de: 'IN BIBLIOTHEK', nl: 'IN BIBLIOTHEEK' },

  // Arr panel extras
  noItemsToDisplay: { en: 'No items to display', it: 'Nessun elemento da mostrare', es: 'Sin elementos para mostrar', fr: 'Aucun élément à afficher', pt: 'Sem itens para exibir', de: 'Keine Elemente anzuzeigen', nl: 'Geen items om weer te geven' },
  requests: { en: 'Requests', it: 'Richieste', es: 'Solicitudes', fr: 'Demandes', pt: 'Solicitações', de: 'Anfragen', nl: 'Verzoeken' },
  requested: { en: 'Requested', it: 'Richiesto', es: 'Solicitado', fr: 'Demandé', pt: 'Solicitado', de: 'Angefragt', nl: 'Aangevraagd' },
  recent: { en: 'Recent', it: 'Recenti', es: 'Recientes', fr: 'Récents', pt: 'Recentes', de: 'Neueste', nl: 'Recent' },
  missing: { en: 'Missing', it: 'Mancanti', es: 'Faltantes', fr: 'Manquants', pt: 'Faltando', de: 'Fehlend', nl: 'Ontbrekend' },
  books: { en: 'Books', it: 'Libri', es: 'Libros', fr: 'Livres', pt: 'Livros', de: 'Bücher', nl: 'Boeken' },

  // Markets panel
  markets: { en: 'Markets', it: 'Mercati', es: 'Mercados', fr: 'Marchés', pt: 'Mercados', de: 'Märkte', nl: 'Markten' },
  configureMarketsInSetup: { en: 'Configure watchlist in Setup', it: 'Configura watchlist in Setup', es: 'Configurar watchlist en Configuración', fr: 'Configurer watchlist dans Setup', pt: 'Configurar watchlist em Configurações', de: 'Watchlist im Setup konfigurieren', nl: 'Configureer watchlist in Setup' },
  marketsHint: { en: 'Track crypto, stocks & ETFs', it: 'Traccia crypto, azioni & ETF', es: 'Sigue crypto, acciones y ETFs', fr: 'Suivez crypto, actions et ETF', pt: 'Acompanhe crypto, ações e ETFs', de: 'Verfolge Krypto, Aktien & ETFs', nl: 'Volg crypto, aandelen & ETFs' },
  noMarketData: { en: 'No market data', it: 'Nessun dato di mercato', es: 'Sin datos de mercado', fr: 'Pas de données de marché', pt: 'Sem dados de mercado', de: 'Keine Marktdaten', nl: 'Geen marktgegevens' }
};

// Helper function to get a label in the current language
export function getLabel(key, language = 'en-GB') {
  const lang = language.split('-')[0];
  return translations[key]?.[lang] || translations[key]?.en || key;
}

// Hook-friendly helper
export function useTranslation(language) {
  return (key) => getLabel(key, language);
}

export default translations;
