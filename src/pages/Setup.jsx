import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  GripVertical, Monitor, Home, Cloud, Activity, Music, Clock, Settings,
  ExternalLink, RotateCcw, Check, X, Loader2, ChevronDown, ChevronUp,
  Eye, EyeOff, Info, Plus, Trash2, Search, Calendar, Camera, StickyNote, Cpu,
  Lightbulb, Bed, ChefHat, Lock, Thermometer, Tv, DoorOpen, Fan, Power, Film, Book, Bell,
  Download, Upload, Link as LinkIcon, Box, Rss, Image, Star, TrendingUp, Timer, Wifi,
  Shield, Server
} from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { homeAssistant } from '../services';
import { getLabel } from '../utils/translations';

// Setup-specific translations
const setupTranslations = {
  // Page titles
  dashboardSetup: { en: 'Dashboard Setup', it: 'Configurazione Dashboard', es: 'Configuración del Panel', fr: 'Configuration du Tableau de Bord', pt: 'Configuração do Painel', de: 'Dashboard-Einrichtung', nl: 'Dashboard-instellingen' },
  configureDesc: { en: 'Configure your ultrawide dashboard panels and integrations', it: 'Configura i pannelli e le integrazioni del tuo dashboard ultrawide', es: 'Configura los paneles e integraciones de tu dashboard ultrawide', fr: 'Configurez les panneaux et intégrations de votre tableau de bord ultrawide', pt: 'Configure os painéis e integrações do seu dashboard ultrawide', de: 'Konfigurieren Sie Ihre Ultrawide-Dashboard-Panels und Integrationen', nl: 'Configureer uw ultrawide dashboard-panelen en integraties' },

  // Tabs
  integrations: { en: 'Integrations', it: 'Integrazioni', es: 'Integraciones', fr: 'Intégrations', pt: 'Integrações', de: 'Integrationen', nl: 'Integraties' },
  panels: { en: 'Panels', it: 'Pannelli', es: 'Paneles', fr: 'Panneaux', pt: 'Painéis', de: 'Panels', nl: 'Panelen' },
  settingsTab: { en: 'Settings', it: 'Impostazioni', es: 'Configuración', fr: 'Paramètres', pt: 'Configurações', de: 'Einstellungen', nl: 'Instellingen' },

  // Connection status
  connecting: { en: 'Connecting...', it: 'Connessione...', es: 'Conectando...', fr: 'Connexion...', pt: 'Conectando...', de: 'Verbinden...', nl: 'Verbinden...' },
  connected: { en: 'Connected', it: 'Connesso', es: 'Conectado', fr: 'Connecté', pt: 'Conectado', de: 'Verbunden', nl: 'Verbonden' },
  configured: { en: 'Configured (not tested)', it: 'Configurato (non testato)', es: 'Configurado (no probado)', fr: 'Configuré (non testé)', pt: 'Configurado (não testado)', de: 'Konfiguriert (nicht getestet)', nl: 'Geconfigureerd (niet getest)' },
  notConfigured: { en: 'Not configured', it: 'Non configurato', es: 'No configurado', fr: 'Non configuré', pt: 'Não configurado', de: 'Nicht konfiguriert', nl: 'Niet geconfigureerd' },

  // Buttons
  testConnection: { en: 'Test Connection', it: 'Testa Connessione', es: 'Probar Conexión', fr: 'Tester la Connexion', pt: 'Testar Conexão', de: 'Verbindung testen', nl: 'Verbinding testen' },
  disconnect: { en: 'Disconnect', it: 'Disconnetti', es: 'Desconectar', fr: 'Déconnecter', pt: 'Desconectar', de: 'Trennen', nl: 'Loskoppelen' },
  add: { en: 'Add', it: 'Aggiungi', es: 'Añadir', fr: 'Ajouter', pt: 'Adicionar', de: 'Hinzufügen', nl: 'Toevoegen' },
  test: { en: 'Test', it: 'Test', es: 'Probar', fr: 'Tester', pt: 'Testar', de: 'Testen', nl: 'Testen' },
  testing: { en: 'Testing', it: 'Testando', es: 'Probando', fr: 'Test en cours', pt: 'Testando', de: 'Teste...', nl: 'Testen...' },
  save: { en: 'Save', it: 'Salva', es: 'Guardar', fr: 'Sauvegarder', pt: 'Salvar', de: 'Speichern', nl: 'Opslaan' },
  reset: { en: 'Reset to Defaults', it: 'Ripristina Predefiniti', es: 'Restablecer Valores', fr: 'Réinitialiser', pt: 'Restaurar Padrões', de: 'Zurücksetzen', nl: 'Standaard herstellen' },
  viewDashboard: { en: 'View Dashboard', it: 'Visualizza Dashboard', es: 'Ver Dashboard', fr: 'Voir le Tableau de Bord', pt: 'Ver Dashboard', de: 'Dashboard anzeigen', nl: 'Dashboard bekijken' },

  // Integration titles
  homeAssistant: { en: 'Home Assistant', it: 'Home Assistant', es: 'Home Assistant', fr: 'Home Assistant', pt: 'Home Assistant', de: 'Home Assistant', nl: 'Home Assistant' },
  uptimeKuma: { en: 'Uptime Kuma', it: 'Uptime Kuma', es: 'Uptime Kuma', fr: 'Uptime Kuma', pt: 'Uptime Kuma', de: 'Uptime Kuma', nl: 'Uptime Kuma' },
  weather: { en: 'Weather', it: 'Meteo', es: 'Clima', fr: 'Météo', pt: 'Clima', de: 'Wetter', nl: 'Weer' },
  tautulliPlex: { en: 'Tautulli (Plex)', it: 'Tautulli (Plex)', es: 'Tautulli (Plex)', fr: 'Tautulli (Plex)', pt: 'Tautulli (Plex)', de: 'Tautulli (Plex)', nl: 'Tautulli (Plex)' },
  calendars: { en: 'Calendars', it: 'Calendari', es: 'Calendarios', fr: 'Calendriers', pt: 'Calendários', de: 'Kalender', nl: "Agenda's" },
  cameras: { en: 'Cameras', it: 'Telecamere', es: 'Cámaras', fr: 'Caméras', pt: 'Câmeras', de: 'Kameras', nl: "Camera's" },
  clocks: { en: 'Clocks', it: 'Orologi', es: 'Relojes', fr: 'Horloges', pt: 'Relógios', de: 'Uhren', nl: 'Klokken' },
  notes: { en: 'Notes', it: 'Note', es: 'Notas', fr: 'Notes', pt: 'Notas', de: 'Notizen', nl: 'Notities' },
  quickLinks: { en: 'Quick Links', it: 'Link Rapidi', es: 'Enlaces Rápidos', fr: 'Liens Rapides', pt: 'Links Rápidos', de: 'Schnelllinks', nl: 'Snelkoppelingen' },
  systemMonitors: { en: 'System Monitors', it: 'Monitor di Sistema', es: 'Monitores del Sistema', fr: 'Moniteurs Système', pt: 'Monitores do Sistema', de: 'Systemmonitore', nl: 'Systeemmonitoren' },
  mediaArrStack: { en: 'Media (Arr Stack)', it: 'Media (Arr Stack)', es: 'Media (Arr Stack)', fr: 'Médias (Arr Stack)', pt: 'Mídia (Arr Stack)', de: 'Medien (Arr Stack)', nl: 'Media (Arr Stack)' },
  downloadClients: { en: 'Download Clients', it: 'Client di Download', es: 'Clientes de Descarga', fr: 'Clients de Téléchargement', pt: 'Clientes de Download', de: 'Download-Clients', nl: 'Download-clients' },
  dockerPortainer: { en: 'Docker / Portainer', it: 'Docker / Portainer', es: 'Docker / Portainer', fr: 'Docker / Portainer', pt: 'Docker / Portainer', de: 'Docker / Portainer', nl: 'Docker / Portainer' },
  rssFeeds: { en: 'RSS Feeds', it: 'Feed RSS', es: 'Feeds RSS', fr: 'Flux RSS', pt: 'Feeds RSS', de: 'RSS-Feeds', nl: 'RSS-feeds' },
  posterDiscovery: { en: 'Poster Discovery', it: 'Scoperta Poster', es: 'Descubrimiento de Posters', fr: 'Découverte de Posters', pt: 'Descoberta de Pôsteres', de: 'Poster-Entdeckung', nl: 'Poster-ontdekking' },
  markets: { en: 'Markets', it: 'Mercati', es: 'Mercados', fr: 'Marchés', pt: 'Mercados', de: 'Märkte', nl: 'Markten' },

  // Form labels
  url: { en: 'URL', it: 'URL', es: 'URL', fr: 'URL', pt: 'URL', de: 'URL', nl: 'URL' },
  apiKey: { en: 'API Key', it: 'Chiave API', es: 'Clave API', fr: 'Clé API', pt: 'Chave API', de: 'API-Schlüssel', nl: 'API-sleutel' },
  token: { en: 'Token', it: 'Token', es: 'Token', fr: 'Jeton', pt: 'Token', de: 'Token', nl: 'Token' },
  username: { en: 'Username', it: 'Nome utente', es: 'Usuario', fr: "Nom d'utilisateur", pt: 'Usuário', de: 'Benutzername', nl: 'Gebruikersnaam' },
  password: { en: 'Password', it: 'Password', es: 'Contraseña', fr: 'Mot de passe', pt: 'Senha', de: 'Passwort', nl: 'Wachtwoord' },
  name: { en: 'Name', it: 'Nome', es: 'Nombre', fr: 'Nom', pt: 'Nome', de: 'Name', nl: 'Naam' },
  city: { en: 'City', it: 'Città', es: 'Ciudad', fr: 'Ville', pt: 'Cidade', de: 'Stadt', nl: 'Stad' },
  timezone: { en: 'Timezone', it: 'Fuso orario', es: 'Zona horaria', fr: 'Fuseau horaire', pt: 'Fuso horário', de: 'Zeitzone', nl: 'Tijdzone' },

  // Help text
  connectFirst: { en: 'Connect first to add entities', it: 'Connetti prima per aggiungere entità', es: 'Conecta primero para añadir entidades', fr: "Connectez d'abord pour ajouter des entités", pt: 'Conecte primeiro para adicionar entidades', de: 'Zuerst verbinden um Entitäten hinzuzufügen', nl: 'Verbind eerst om entiteiten toe te voegen' },
  dashboardEntities: { en: 'DASHBOARD ENTITIES', it: 'ENTITÀ DASHBOARD', es: 'ENTIDADES DEL PANEL', fr: 'ENTITÉS DU TABLEAU DE BORD', pt: 'ENTIDADES DO PAINEL', de: 'DASHBOARD-ENTITÄTEN', nl: 'DASHBOARD-ENTITEITEN' },

  // Appearance section
  appearance: { en: 'Appearance', it: 'Aspetto', es: 'Apariencia', fr: 'Apparence', pt: 'Aparência', de: 'Erscheinungsbild', nl: 'Uiterlijk' },
  theme: { en: 'Theme', it: 'Tema', es: 'Tema', fr: 'Thème', pt: 'Tema', de: 'Design', nl: 'Thema' },
  accentColor: { en: 'Accent Color', it: 'Colore Accento', es: 'Color de Acento', fr: "Couleur d'Accent", pt: 'Cor de Destaque', de: 'Akzentfarbe', nl: 'Accentkleur' },
  fontStyle: { en: 'Font Style', it: 'Stile Carattere', es: 'Estilo de Fuente', fr: 'Style de Police', pt: 'Estilo de Fonte', de: 'Schriftstil', nl: 'Letterstijl' },
  language: { en: 'Language', it: 'Lingua', es: 'Idioma', fr: 'Langue', pt: 'Idioma', de: 'Sprache', nl: 'Taal' },
  custom: { en: 'Custom', it: 'Personalizzato', es: 'Personalizado', fr: 'Personnalisé', pt: 'Personalizado', de: 'Benutzerdefiniert', nl: 'Aangepast' },
  languageNote: { en: 'Affects date/time formatting and all labels', it: 'Influisce sulla formattazione data/ora e tutte le etichette', es: 'Afecta el formato de fecha/hora y todas las etiquetas', fr: 'Affecte le format date/heure et tous les libellés', pt: 'Afeta a formatação de data/hora e todos os rótulos', de: 'Beeinflusst Datum/Uhrzeit-Format und alle Beschriftungen', nl: 'Beïnvloedt datum/tijd opmaak en alle labels' },

  // Behavior section
  behavior: { en: 'Behavior', it: 'Comportamento', es: 'Comportamiento', fr: 'Comportement', pt: 'Comportamento', de: 'Verhalten', nl: 'Gedrag' },
  autoScroll: { en: 'Auto Scroll', it: 'Scorrimento Automatico', es: 'Desplazamiento Automático', fr: 'Défilement Automatique', pt: 'Rolagem Automática', de: 'Automatisches Scrollen', nl: 'Automatisch scrollen' },
  autoScrollDesc: { en: 'Automatically cycle through panels', it: 'Cicla automaticamente tra i pannelli', es: 'Cicla automáticamente entre paneles', fr: 'Faire défiler automatiquement les panneaux', pt: 'Ciclar automaticamente pelos painéis', de: 'Automatisch durch Panels wechseln', nl: 'Automatisch door panelen bladeren' },
  scrollInterval: { en: 'Scroll interval', it: 'Intervallo scorrimento', es: 'Intervalo de desplazamiento', fr: 'Intervalle de défilement', pt: 'Intervalo de rolagem', de: 'Scrollintervall', nl: 'Scroll-interval' },

  // Standby Mode
  standbyMode: { en: 'Standby Mode', it: 'Modalit\u00e0 Standby', es: 'Modo Standby', fr: 'Mode Veille', pt: 'Modo Standby', de: 'Standby-Modus', nl: 'Standby-modus' },
  standbyDesc: { en: 'Show a screensaver with background image after idle', it: 'Mostra uno screensaver dopo un periodo di inattivit\u00e0', es: 'Mostrar un salvapantallas tras inactividad', fr: "Afficher un \u00e9cran de veille apr\u00e8s inactivit\u00e9", pt: 'Mostrar prote\u00e7\u00e3o de tela ap\u00f3s inatividade', de: 'Bildschirmschoner nach Inaktivit\u00e4t anzeigen', nl: 'Screensaver tonen na inactiviteit' },
  idleTimeout: { en: 'Idle timeout', it: 'Timeout inattivit\u00e0', es: 'Tiempo de espera', fr: "D\u00e9lai d'inactivit\u00e9", pt: 'Tempo de inatividade', de: 'Leerlauf-Timeout', nl: 'Time-out bij inactiviteit' },
  backgroundImage: { en: 'Background Image URL', it: 'URL immagine di sfondo', es: 'URL de imagen de fondo', fr: "URL de l'image de fond", pt: 'URL da imagem de fundo', de: 'Hintergrundbild-URL', nl: 'Achtergrondafbeelding URL' },
  backgroundPreset: { en: 'Background Preset', it: 'Sfondo predefinito', es: 'Fondo predefinido', fr: 'Fond pr\u00e9d\u00e9fini', pt: 'Fundo predefinido', de: 'Hintergrund-Voreinstellung', nl: 'Achtergrond-voorinstelling' },
  infoOverlays: { en: 'Info Overlays', it: 'Overlay informativi', es: 'Superposiciones', fr: 'Superpositions', pt: 'Sobreposi\u00e7\u00f5es', de: 'Info-Overlays', nl: 'Info-overlays' },
  overlayPosition: { en: 'Overlay Position', it: 'Posizione overlay', es: 'Posici\u00f3n', fr: 'Position', pt: 'Posi\u00e7\u00e3o', de: 'Overlay-Position', nl: 'Overlay-positie' },
  dimLevel: { en: 'Background dim', it: 'Oscuramento sfondo', es: 'Oscurecimiento', fr: 'Assombrissement', pt: 'Escurecimento', de: 'Abdunklung', nl: 'Achtergrond dimmen' },

  // Panel order
  panelOrder: { en: 'Panel Order', it: 'Ordine Pannelli', es: 'Orden de Paneles', fr: 'Ordre des Panneaux', pt: 'Ordem dos Painéis', de: 'Panel-Reihenfolge', nl: 'Paneel-volgorde' },
  dragToReorder: { en: 'Drag to reorder. Toggle to enable/disable.', it: 'Trascina per riordinare. Attiva/disattiva per abilitare/disabilitare.', es: 'Arrastra para reordenar. Alterna para activar/desactivar.', fr: 'Glissez pour réorganiser. Basculez pour activer/désactiver.', pt: 'Arraste para reordenar. Alterne para ativar/desativar.', de: 'Ziehen zum Neuordnen. Umschalten zum Aktivieren/Deaktivieren.', nl: 'Sleep om te herschikken. Schakel om in/uit te schakelen.' },

  // Events
  events: { en: 'events', it: 'eventi', es: 'eventos', fr: 'événements', pt: 'eventos', de: 'Termine', nl: 'evenementen' },
  eventsFound: { en: 'events found', it: 'eventi trovati', es: 'eventos encontrados', fr: 'événements trouvés', pt: 'eventos encontrados', de: 'Termine gefunden', nl: 'evenementen gevonden' },

  // Calendar help
  calendarHelp: { en: 'iCal URL: Works with Google Calendar, Apple Calendar, Outlook, or any calendar with iCal export.', it: 'URL iCal: Funziona con Google Calendar, Apple Calendar, Outlook o qualsiasi calendario con esportazione iCal.', es: 'URL iCal: Funciona con Google Calendar, Apple Calendar, Outlook o cualquier calendario con exportación iCal.', fr: 'URL iCal: Fonctionne avec Google Calendar, Apple Calendar, Outlook ou tout calendrier avec export iCal.', pt: 'URL iCal: Funciona com Google Calendar, Apple Calendar, Outlook ou qualquer calendário com exportação iCal.', de: 'iCal-URL: Funktioniert mit Google Calendar, Apple Calendar, Outlook oder jedem Kalender mit iCal-Export.', nl: 'iCal URL: Werkt met Google Calendar, Apple Calendar, Outlook of elke agenda met iCal-export.' },
  addCalendar: { en: 'Add Calendar', it: 'Aggiungi Calendario', es: 'Añadir Calendario', fr: 'Ajouter un Calendrier', pt: 'Adicionar Calendário', de: 'Kalender hinzufügen', nl: 'Agenda toevoegen' },
  calendarName: { en: 'Calendar name', it: 'Nome calendario', es: 'Nombre del calendario', fr: 'Nom du calendrier', pt: 'Nome do calendário', de: 'Kalendername', nl: 'Agendanaam' },

  // Add Clock help
  addClock: { en: 'Add Clock', it: 'Aggiungi Orologio', es: 'Añadir Reloj', fr: 'Ajouter une Horloge', pt: 'Adicionar Relógio', de: 'Uhr hinzufügen', nl: 'Klok toevoegen' },
  clocksHelp: { en: 'Add multiple clocks for different timezones.', it: 'Aggiungi più orologi per diversi fusi orari.', es: 'Agrega múltiples relojes para diferentes zonas horarias.', fr: 'Ajoutez plusieurs horloges pour différents fuseaux horaires.', pt: 'Adicione vários relógios para diferentes fusos horários.', de: 'Fügen Sie mehrere Uhren für verschiedene Zeitzonen hinzu.', nl: 'Voeg meerdere klokken toe voor verschillende tijdzones.' },
  eachClockWeather: { en: 'Each clock can have its own city for weather display.', it: 'Ogni orologio può avere la propria città per la visualizzazione del meteo.', es: 'Cada reloj puede tener su propia ciudad para mostrar el clima.', fr: 'Chaque horloge peut avoir sa propre ville pour l\'affichage météo.', pt: 'Cada relógio pode ter sua própria cidade para exibição do clima.', de: 'Jede Uhr kann ihre eigene Stadt für die Wetteranzeige haben.', nl: 'Elke klok kan zijn eigen stad hebben voor weerweergave.' },
  configureWeatherApi: { en: 'Configure Weather API key above to add weather to clocks.', it: 'Configura la chiave API meteo sopra per aggiungere il meteo agli orologi.', es: 'Configura la clave API del clima arriba para agregar el clima a los relojes.', fr: 'Configurez la clé API météo ci-dessus pour ajouter la météo aux horloges.', pt: 'Configure a chave API do clima acima para adicionar clima aos relógios.', de: 'Konfigurieren Sie den Wetter-API-Schlüssel oben, um Wetter zu Uhren hinzuzufügen.', nl: 'Configureer de weer API-sleutel hierboven om weer aan klokken toe te voegen.' },

  // Countdowns
  countdowns: { en: 'Countdowns', it: 'Conto alla rovescia', es: 'Cuentas regresivas', fr: 'Comptes à rebours', pt: 'Contagens regressivas', de: 'Countdowns', nl: 'Aftellers' },
  countdownsHelp: { en: 'Add countdowns to track days until important events. They display on the Clock panel.', it: 'Aggiungi conti alla rovescia per monitorare i giorni fino agli eventi importanti. Vengono visualizzati nel pannello Orologio.', es: 'Agrega cuentas regresivas para rastrear los días hasta eventos importantes. Se muestran en el panel del Reloj.', fr: 'Ajoutez des comptes à rebours pour suivre les jours jusqu\'à des événements importants. Ils s\'affichent sur le panneau Horloge.', pt: 'Adicione contagens regressivas para acompanhar os dias até eventos importantes. Eles são exibidos no painel do Relógio.', de: 'Fügen Sie Countdowns hinzu, um Tage bis zu wichtigen Ereignissen zu verfolgen. Sie werden im Uhr-Panel angezeigt.', nl: 'Voeg aftellers toe om dagen tot belangrijke evenementen bij te houden. Ze worden weergegeven op het Klok-paneel.' },
  addCountdown: { en: 'Add Countdown', it: 'Aggiungi Conto alla Rovescia', es: 'Añadir Cuenta Regresiva', fr: 'Ajouter un Compte à Rebours', pt: 'Adicionar Contagem Regressiva', de: 'Countdown hinzufügen', nl: 'Afteller toevoegen' },
  countdownName: { en: 'Event name', it: 'Nome evento', es: 'Nombre del evento', fr: "Nom de l'événement", pt: 'Nome do evento', de: 'Eventname', nl: 'Evenementnaam' },
  targetDate: { en: 'Target date', it: 'Data obiettivo', es: 'Fecha objetivo', fr: 'Date cible', pt: 'Data alvo', de: 'Zieldatum', nl: 'Doeldatum' },

  // Notes
  addNote: { en: 'Add Note', it: 'Aggiungi Nota', es: 'Añadir Nota', fr: 'Ajouter une Note', pt: 'Adicionar Nota', de: 'Notiz hinzufügen', nl: 'Notitie toevoegen' },
  notesHelp: { en: 'Add notes and reminders that will display on the Notes panel.', it: 'Aggiungi note e promemoria che verranno visualizzati nel pannello Note.', es: 'Agrega notas y recordatorios que se mostrarán en el panel de Notas.', fr: 'Ajoutez des notes et rappels qui s\'afficheront dans le panneau Notes.', pt: 'Adicione notas e lembretes que serão exibidos no painel de Notas.', de: 'Fügen Sie Notizen und Erinnerungen hinzu, die im Notizen-Panel angezeigt werden.', nl: 'Voeg notities en herinneringen toe die worden weergegeven in het Notities-paneel.' },

  // Quick Links
  addLink: { en: 'Add Link', it: 'Aggiungi Link', es: 'Añadir Enlace', fr: 'Ajouter un Lien', pt: 'Adicionar Link', de: 'Link hinzufügen', nl: 'Link toevoegen' },

  // Cameras help
  camerasHelp: { en: 'Browsers can\'t play RTSP directly. Use Scrypted Rebroadcast, go2rtc, or Frigate to convert RTSP to HLS/MJPEG.', it: 'I browser non possono riprodurre RTSP direttamente. Usa Scrypted Rebroadcast, go2rtc o Frigate per convertire RTSP in HLS/MJPEG.', es: 'Los navegadores no pueden reproducir RTSP directamente. Usa Scrypted Rebroadcast, go2rtc o Frigate para convertir RTSP a HLS/MJPEG.', fr: 'Les navigateurs ne peuvent pas lire RTSP directement. Utilisez Scrypted Rebroadcast, go2rtc ou Frigate pour convertir RTSP en HLS/MJPEG.', pt: 'Os navegadores não podem reproduzir RTSP diretamente. Use Scrypted Rebroadcast, go2rtc ou Frigate para converter RTSP para HLS/MJPEG.', de: 'Browser können RTSP nicht direkt abspielen. Verwenden Sie Scrypted Rebroadcast, go2rtc oder Frigate um RTSP in HLS/MJPEG zu konvertieren.', nl: 'Browsers kunnen RTSP niet direct afspelen. Gebruik Scrypted Rebroadcast, go2rtc of Frigate om RTSP naar HLS/MJPEG te converteren.' },
  addCamera: { en: 'Add Camera', it: 'Aggiungi Telecamera', es: 'Añadir Cámara', fr: 'Ajouter une Caméra', pt: 'Adicionar Câmera', de: 'Kamera hinzufügen', nl: 'Camera toevoegen' },

  // RSS
  addFeed: { en: 'Add Feed', it: 'Aggiungi Feed', es: 'Añadir Feed', fr: 'Ajouter un Flux', pt: 'Adicionar Feed', de: 'Feed hinzufügen', nl: 'Feed toevoegen' },

  // Status page
  useStatusPage: { en: 'Use public status page', it: 'Usa pagina di stato pubblica', es: 'Usar página de estado pública', fr: 'Utiliser la page de statut publique', pt: 'Usar página de status pública', de: 'Öffentliche Statusseite verwenden', nl: 'Gebruik openbare statuspagina' },
  statusPageSlug: { en: 'Status Page Slug', it: 'Slug Pagina di Stato', es: 'Slug de Página de Estado', fr: 'Slug de la Page de Statut', pt: 'Slug da Página de Status', de: 'Statusseiten-Slug', nl: 'Statuspagina-slug' },

  // Loading
  loading: { en: 'Loading...', it: 'Caricamento...', es: 'Cargando...', fr: 'Chargement...', pt: 'Carregando...', de: 'Laden...', nl: 'Laden...' }
};

// Helper to get setup translation
function t(key, language) {
  const lang = (language || 'en-GB').split('-')[0];
  return setupTranslations[key]?.[lang] || setupTranslations[key]?.en || key;
}

const panelIcons = {
  'home-assistant': Home,
  'weather': Cloud,
  'uptime-kuma': Activity,
  'media': Music,
  'clock': Clock,
  'tautulli': Tv,
  'cameras': Camera,
  'calendar': Calendar,
  'notes': StickyNote,
  'system': Cpu,
  'arr': Film,
  'downloads': Download,
  'quicklinks': LinkIcon,
  'docker': Box,
  'rss': Rss,
  'poster': Image,
  'markets': TrendingUp,
  'unifi': Wifi,
  'pihole': Shield,
  'proxmox': Server,
  'sonarr-calendar': Tv
};

const availableIcons = [
  { name: 'Lightbulb', icon: Lightbulb },
  { name: 'Bed', icon: Bed },
  { name: 'ChefHat', icon: ChefHat },
  { name: 'Lock', icon: Lock },
  { name: 'Thermometer', icon: Thermometer },
  { name: 'Tv', icon: Tv },
  { name: 'DoorOpen', icon: DoorOpen },
  { name: 'Fan', icon: Fan },
  { name: 'Power', icon: Power },
  { name: 'Home', icon: Home },
];

const entityTypes = [
  { value: 'toggle', label: 'Toggle' },
  { value: 'display', label: 'Display' },
  { value: 'scene', label: 'Scene' },
];

// Reusable form input
function FormInput({ label, type = 'text', value, onChange, placeholder, helpText, secret = false }) {
  const [showSecret, setShowSecret] = useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={secret && !showSecret ? 'password' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '10px 12px', paddingRight: secret ? '40px' : '12px',
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px',
            color: 'var(--text-primary)', fontSize: '14px', fontFamily: secret ? 'var(--font-mono)' : 'inherit', outline: 'none'
          }}
        />
        {secret && (
          <button type="button" onClick={() => setShowSecret(!showSecret)}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {helpText && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} />{helpText}</p>}
    </div>
  );
}

function StandbyUploadGallery({ currentUrl, onSelect }) {
  const [uploads, setUploads] = useState([]);

  const loadUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/uploads');
      const data = await res.json();
      setUploads(Array.isArray(data) ? data : []);
    } catch { setUploads([]); }
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('File too large (max 20MB)'); return; }
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok && data.url) {
        onSelect(data.url);
        loadUploads();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
    e.target.value = '';
  };

  const handleDelete = async (file, e) => {
    e.stopPropagation();
    if (currentUrl === file.url) onSelect('');
    try {
      await fetch(`/api/upload?file=${encodeURIComponent(file.name)}`, { method: 'DELETE' });
      loadUploads();
    } catch {}
  };

  return (
    <>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
        My Uploads
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Upload button */}
        <label style={{
          width: '90px', height: '52px', borderRadius: '8px',
          border: '2px dashed rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px',
          cursor: 'pointer', transition: 'border-color 0.2s', flexShrink: 0
        }}>
          <Upload size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>Upload</span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
        </label>
        {/* Uploaded images */}
        {uploads.map(file => {
          const isSelected = currentUrl === file.url;
          return (
            <div key={file.name} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => onSelect(file.url)}
                style={{
                  width: '90px', height: '52px', borderRadius: '8px', overflow: 'hidden',
                  border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer', padding: 0, transition: 'border-color 0.2s'
                }}
              >
                <img src={file.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
              </button>
              <button
                onClick={(e) => handleDelete(file, e)}
                style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: '#ef4444', border: 'none', color: '#fff',
                  fontSize: '10px', lineHeight: '18px', textAlign: 'center',
                  cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
        {uploads.length === 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>No uploads yet</span>
        )}
      </div>
    </>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
      <div className={`toggle-switch ${checked ? 'active' : ''}`} onClick={() => onChange(!checked)} style={{ cursor: 'pointer' }} />
      {label && <span style={{ fontSize: '14px' }}>{label}</span>}
    </div>
  );
}

function ConnectionStatus({ status, language }) {
  if (!status) return <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('notConfigured', language)}</span>;
  if (status.connecting) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '13px' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />{t('connecting', language)}</span>;
  if (status.connected) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '13px' }}><Check size={14} />{t('connected', language)}{status.version && ` (v${status.version})`}{status.location && ` - ${status.location}`}</span>;
  if (status.configured) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px' }}><Settings size={14} />{t('configured', language)}</span>;
  if (status.error) return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '13px' }}><X size={14} />{status.error}</span>;
  return <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('notConfigured', language)}</span>;
}

// HA Entity Configurator with multi-select
function HAEntityConfigurator({ entities, onChange, isConnected }) {
  const [haEntities, setHaEntities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [editingIcon, setEditingIcon] = useState(null);
  const [selected, setSelected] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);

  // Load entities when connected or when picker opens
  const loadEntities = () => {
    if (homeAssistant.isConnected()) {
      const allEntities = Object.keys(homeAssistant.entities).map(id => ({
        id, state: homeAssistant.entities[id]
      }));
      console.log('[HAConfig] Loaded', allEntities.length, 'entities');
      setHaEntities(allEntities);
    }
  };

  useEffect(() => {
    if (isConnected) {
      setTimeout(loadEntities, 500);
    }
  }, [isConnected]);

  useEffect(() => {
    if (showPicker && isConnected) {
      loadEntities();
      setSelected([]);
      setSearchTerm('');
    }
  }, [showPicker]);

  const filteredEntities = haEntities.filter(e => 
    e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.state?.attributes?.friendly_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (entityId) => {
    setSelected(prev => 
      prev.includes(entityId) 
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const addSelectedEntities = () => {
    const newEntities = selected.map(entityId => {
      const entity = haEntities.find(e => e.id === entityId);
      const friendlyName = entity?.state?.attributes?.friendly_name;
      const domain = entityId.split('.')[0];
      let icon = 'Power', type = 'toggle';
      if (domain === 'light') icon = 'Lightbulb';
      else if (domain === 'lock') icon = 'Lock';
      else if (domain === 'climate' || domain === 'sensor') { icon = 'Thermometer'; type = 'display'; }
      else if (domain === 'scene') { icon = 'Tv'; type = 'scene'; }
      else if (domain === 'fan') icon = 'Fan';
      else if (domain === 'cover') icon = 'DoorOpen';
      else if (domain === 'switch') icon = 'Power';
      else if (domain === 'media_player') { icon = 'Tv'; type = 'display'; }
      
      return { id: entityId, name: friendlyName || entityId.split('.')[1].replace(/_/g, ' '), icon, type };
    });
    
    onChange([...entities, ...newEntities]);
    setShowPicker(false);
    setSelected([]);
    setSearchTerm('');
  };

  const removeEntity = (index) => onChange(entities.filter((_, i) => i !== index));
  const updateEntity = (index, field, value) => onChange(entities.map((e, i) => i === index ? { ...e, [field]: value } : e));
  const getIcon = (name) => availableIcons.find(i => i.name === name)?.icon || Power;

  // Drag and drop handlers
  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newEntities = [...entities];
    const [dragged] = newEntities.splice(dragIndex, 1);
    newEntities.splice(index, 0, dragged);
    onChange(newEntities);
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1px', color: 'var(--accent-primary)', margin: 0 }}>
          DASHBOARD ENTITIES ({entities.length})
        </h4>
        <button onClick={() => setShowPicker(true)} disabled={!isConnected}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: isConnected ? 'var(--accent-glow)' : 'var(--bg-secondary)', border: `1px solid ${isConnected ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius: '6px', color: isConnected ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: isConnected ? 'pointer' : 'not-allowed', fontSize: '12px', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>
          <Plus size={14} />Add
        </button>
      </div>

      {!isConnected && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Connect to Home Assistant first to add entities</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {entities.map((entity, index) => {
          const IconComp = getIcon(entity.icon);
          return (
            <div
              key={entity.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                background: dragIndex === index ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                border: `1px solid ${dragIndex === index ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'grab',
                opacity: dragIndex === index ? 0.8 : 1,
                transition: 'all 0.15s ease'
              }}>
              <GripVertical size={16} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }} />
              <div style={{ position: 'relative' }}>
                <button onClick={() => setEditingIcon(editingIcon === index ? null : index)}
                  style={{ width: '40px', height: '40px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-primary)' }}>
                  <IconComp size={20} />
                </button>
                {editingIcon === index && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', zIndex: 100 }}>
                    {availableIcons.map(({ name, icon: Icon }) => (
                      <button key={name} onClick={() => { updateEntity(index, 'icon', name); setEditingIcon(null); }}
                        style={{ width: '32px', height: '32px', background: entity.icon === name ? 'var(--accent-glow)' : 'var(--bg-card)', border: `1px solid ${entity.icon === name ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: entity.icon === name ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input type="text" value={entity.name} onChange={(e) => updateEntity(index, 'name', e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', padding: '2px 0', outline: 'none' }} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entity.id}</div>
              </div>
              <select value={entity.type} onChange={(e) => updateEntity(index, 'type', e.target.value)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 8px', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                {entityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={() => removeEntity(index)}
                style={{ width: '32px', height: '32px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {entities.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>No entities configured</div>}
      </div>

      {showPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowPicker(false)}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', width: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '1px', color: 'var(--accent-primary)', marginBottom: '12px' }}>
                SELECT ENTITIES {selected.length > 0 && `(${selected.length} selected)`}
              </h3>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search entities..." autoFocus
                  style={{ width: '100%', padding: '10px 12px 10px 40px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {filteredEntities.slice(0, 100).map(entity => {
                const isAdded = entities.some(e => e.id === entity.id);
                const isSelected = selected.includes(entity.id);
                const name = entity.state?.attributes?.friendly_name;
                return (
                  <div key={entity.id} 
                    onClick={() => !isAdded && toggleSelect(entity.id)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px', 
                      background: isSelected ? 'var(--accent-glow)' : isAdded ? 'var(--bg-secondary)' : 'var(--bg-card)', 
                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                      borderRadius: '6px', marginBottom: '4px', 
                      cursor: isAdded ? 'not-allowed' : 'pointer', 
                      opacity: isAdded ? 0.5 : 1 
                    }}>
                    <div style={{ 
                      width: '20px', height: '20px', 
                      border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: '4px',
                      background: isSelected ? 'var(--accent-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={14} style={{ color: '#000' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
                        {name || entity.id.split('.')[1].replace(/_/g, ' ')}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        {entity.id}{isAdded && ' (already added)'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredEntities.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No entities found</div>}
              {filteredEntities.length > 100 && <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '12px' }}>Showing first 100. Refine search.</div>}
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button onClick={() => setShowPicker(false)} 
                style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                Cancel
              </button>
              <button onClick={addSelectedEntities} disabled={selected.length === 0}
                style={{ padding: '10px 20px', background: selected.length > 0 ? 'var(--accent-primary)' : 'var(--bg-secondary)', border: 'none', borderRadius: '6px', color: selected.length > 0 ? '#000' : 'var(--text-muted)', cursor: selected.length > 0 ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '600' }}>
                Add {selected.length > 0 ? `${selected.length} Entities` : 'Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Weather Locations Component
function WeatherLocationList({ locations, onChange, clocks, onClocksChange }) {
  const addLocation = () => {
    const id = Date.now().toString();
    const name = `Location ${locations.length + 1}`;
    const newLoc = {
      id,
      name,
      provider: 'openweathermap',
      apiKey: '',
      apiUrl: '',
      city: '',
      units: 'metric',
      enabled: true
    };
    onChange([...locations, newLoc]);

    // Also add a corresponding clock with the same name and default timezone
    if (onClocksChange) {
      const newClock = {
        id: `clock-${id}`,
        name,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        enabled: true
      };
      onClocksChange([...(clocks || []), newClock]);
    }
  };

  const updateLocation = (id, field, value) => {
    onChange(locations.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLocation = (id) => {
    onChange(locations.filter(l => l.id !== id));
  };

  return (
    <div>
      {locations.map((loc) => (
        <div key={loc.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={loc.name}
              onChange={(e) => updateLocation(loc.id, 'name', e.target.value)}
              placeholder="Location name"
              style={{ flex: 1, minWidth: '120px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
            />
            <select
              value={loc.provider}
              onChange={(e) => updateLocation(loc.id, 'provider', e.target.value)}
              style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11px' }}
            >
              <option value="openweathermap">OpenWeatherMap</option>
              <option value="custom">Custom API</option>
            </select>
            <select
              value={loc.units}
              onChange={(e) => updateLocation(loc.id, 'units', e.target.value)}
              style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11px' }}
            >
              <option value="metric">°C</option>
              <option value="imperial">°F</option>
            </select>
            <Toggle checked={loc.enabled} onChange={(enabled) => updateLocation(loc.id, 'enabled', enabled)} />
            <button onClick={() => removeLocation(loc.id)}
              style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
          </div>

          {loc.provider === 'openweathermap' ? (
            <>
              <input
                type="text"
                value={loc.apiKey}
                onChange={(e) => updateLocation(loc.id, 'apiKey', e.target.value)}
                placeholder="OpenWeatherMap API Key"
                style={{ width: '100%', padding: '8px 12px', marginBottom: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
              />
              <input
                type="text"
                value={loc.city}
                onChange={(e) => updateLocation(loc.id, 'city', e.target.value)}
                placeholder="City name (e.g., London, UK)"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
              />
            </>
          ) : (
            <>
              <input
                type="text"
                value={loc.apiUrl}
                onChange={(e) => updateLocation(loc.id, 'apiUrl', e.target.value)}
                placeholder="Custom API URL (use {lat}, {lon}, {units} placeholders)"
                style={{ width: '100%', padding: '8px 12px', marginBottom: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
              />
              <input
                type="text"
                value={loc.city}
                onChange={(e) => updateLocation(loc.id, 'city', e.target.value)}
                placeholder="City for geocoding (or leave empty for browser location)"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
              />
            </>
          )}
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
            {loc.provider === 'custom' && '💡 Custom API should return JSON with temp, humidity, condition, icon fields'}
          </div>
        </div>
      ))}
      <button onClick={addLocation}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add Location
      </button>
    </div>
  );
}

// Arr Service Input with Test Button
function ArrServiceInput({ service, config, onChange, testEndpoint, serviceLabel }) {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  const testService = async () => {
    if (!config.url || !config.apiKey) {
      setStatus({ success: false, error: 'URL and API Key required' });
      return;
    }
    setTesting(true);
    setStatus(null);

    try {
      const baseUrl = config.url.replace(/\/$/, '');
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(`${baseUrl}${testEndpoint}`)}&apiKey=${encodeURIComponent(config.apiKey)}`;

      const res = await fetch(proxyUrl, {
        headers: { 'X-Api-Key': config.apiKey }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Different services return different data
      let info = '';
      if (service === 'overseerr') {
        info = `v${data.version || 'connected'}`;
      } else if (service === 'radarr') {
        info = Array.isArray(data) ? `${data.length} movies` : 'connected';
      } else if (service === 'sonarr') {
        info = Array.isArray(data) ? `${data.length} series` : 'connected';
      } else if (service === 'readarr') {
        info = Array.isArray(data) ? `${data.length} books` : 'connected';
      } else {
        info = 'connected';
      }

      setStatus({ success: true, info });
    } catch (err) {
      setStatus({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  // Clear status when config changes
  useEffect(() => {
    setStatus(null);
  }, [config.url, config.apiKey]);

  return (
    <div style={{ borderLeft: status ? `3px solid ${status.success ? 'var(--success)' : 'var(--danger)'}` : '3px solid transparent', paddingLeft: '12px', marginLeft: '-12px' }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>URL</label>
        <input
          type="text"
          value={config.url || ''}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder={`http://192.168.1.x:${service === 'overseerr' ? '5055' : service === 'radarr' ? '7878' : service === 'sonarr' ? '8989' : '8787'}`}
          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px' }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>API Key</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
            placeholder="Settings → General → API Key"
            style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '14px' }}
          />
          <button
            onClick={testService}
            disabled={testing || !config.url || !config.apiKey}
            style={{
              padding: '10px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: config.url && config.apiKey ? 'var(--accent-primary)' : 'var(--text-muted)',
              cursor: config.url && config.apiKey ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            {testing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Testing</> : <><Check size={14} /> Test</>}
          </button>
        </div>
      </div>
      {status && (
        <div style={{
          padding: '10px 12px',
          background: status.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${status.success ? 'var(--success)' : 'var(--danger)'}`,
          borderRadius: '6px',
          fontSize: '12px',
          color: status.success ? 'var(--success)' : 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {status.success ? <><Check size={14} /> Connected - {status.info}</> : <><X size={14} /> {status.error}</>}
        </div>
      )}
    </div>
  );
}

// Calendar List Component with individual testing and persistent status
function CalendarList({ calendars, onChange, onStatusChange, language }) {
  const { connectionStatus, setConnectionStatus } = useDashboardStore();
  // Initialize calStatus from persisted calendar test results
  const [calStatus, setCalStatus] = useState(() => {
    // Try to restore from calendars that have testResult stored
    const initial = {};
    calendars.forEach(cal => {
      if (cal.testResult) {
        initial[cal.id] = cal.testResult;
      }
    });
    return initial;
  });
  const [testing, setTesting] = useState({});
  const colors = ['#4285f4', '#ea4335', '#34a853', '#fbbc04', '#9c27b0', '#ff5722'];

  // Report status changes to parent and persist to store
  useEffect(() => {
    const enabledCals = calendars.filter(c => c.enabled && c.url);
    const testedCals = enabledCals.filter(c => calStatus[c.id]?.success);
    const totalEvents = Object.values(calStatus).reduce((sum, s) => sum + (s?.eventCount || 0), 0);
    const status = {
      configured: enabledCals.length > 0,
      connected: testedCals.length > 0,
      testedCount: testedCals.length,
      totalCount: enabledCals.length,
      totalEvents
    };

    if (onStatusChange) {
      onStatusChange(status);
    }

    // Persist calendar connection status to store
    setConnectionStatus('calendars', status);
  }, [calStatus, calendars, onStatusChange, setConnectionStatus]);

  const addCalendar = () => {
    const newCal = {
      id: Date.now().toString(),
      name: `${t('calendars', language).slice(0, -1)} ${calendars.length + 1}`,
      url: '',
      color: colors[calendars.length % colors.length],
      enabled: true
    };
    onChange([...calendars, newCal]);
  };

  const updateCalendar = (id, field, value) => {
    onChange(calendars.map(c => c.id === id ? { ...c, [field]: value } : c));
    if (field === 'url') {
      setCalStatus(prev => ({ ...prev, [id]: null }));
      // Also clear testResult when URL changes
      onChange(calendars.map(c => c.id === id ? { ...c, [field]: value, testResult: null } : c));
    }
  };

  const removeCalendar = (id) => {
    onChange(calendars.filter(c => c.id !== id));
    setCalStatus(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const testCalendar = async (cal) => {
    if (!cal.url) {
      setCalStatus(prev => ({ ...prev, [cal.id]: { success: false, error: 'No URL provided' } }));
      return;
    }
    setTesting(prev => ({ ...prev, [cal.id]: true }));
    setCalStatus(prev => ({ ...prev, [cal.id]: null }));

    try {
      // Convert webcal:// to https:// (Apple Calendar uses webcal protocol)
      let calendarUrl = cal.url.trim();
      if (calendarUrl.startsWith('webcal://')) {
        calendarUrl = calendarUrl.replace('webcal://', 'https://');
      }
      // Always use proxy for external calendar URLs (CORS)
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(calendarUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      // Check if it's valid iCal format
      if (!text.includes('BEGIN:VCALENDAR')) {
        throw new Error('Not a valid iCal format');
      }
      const eventCount = (text.match(/BEGIN:VEVENT/g) || []).length;
      const result = { success: true, eventCount };
      setCalStatus(prev => ({ ...prev, [cal.id]: result }));

      // Persist test result to the calendar object so it survives refresh
      onChange(calendars.map(c => c.id === cal.id ? { ...c, testResult: result } : c));
    } catch (err) {
      const result = { success: false, error: err.message };
      setCalStatus(prev => ({ ...prev, [cal.id]: result }));
      onChange(calendars.map(c => c.id === cal.id ? { ...c, testResult: result } : c));
    } finally {
      setTesting(prev => ({ ...prev, [cal.id]: false }));
    }
  };

  return (
    <div>
      {calendars.map((cal) => {
        const status = calStatus[cal.id];
        const isLoading = testing[cal.id];
        return (
          <div key={cal.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px', borderLeft: status ? `3px solid ${status.success ? 'var(--success)' : 'var(--danger)'}` : '3px solid transparent' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <input type="color" value={cal.color} onChange={(e) => updateCalendar(cal.id, 'color', e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
              <input type="text" value={cal.name} onChange={(e) => updateCalendar(cal.id, 'name', e.target.value)} placeholder={t('calendarName', language)}
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <Toggle checked={cal.enabled} onChange={(enabled) => updateCalendar(cal.id, 'enabled', enabled)} />
              <button onClick={() => removeCalendar(cal.id)} style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" value={cal.url} onChange={(e) => updateCalendar(cal.id, 'url', e.target.value)} placeholder="iCal URL (https://...ics)"
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
              <button onClick={() => testCalendar(cal)} disabled={isLoading || !cal.url}
                style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: cal.url ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: cal.url ? 'pointer' : 'not-allowed', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                {isLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {t('testing', language)}</> : <><Check size={12} /> {t('test', language)}</>}
              </button>
            </div>
            {status && (
              <div style={{ marginTop: '8px', padding: '8px 10px', background: status.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${status.success ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '4px', fontSize: '11px', color: status.success ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {status.success ? <><Check size={12} /> {t('connected', language)} - {status.eventCount} {t('eventsFound', language)}</> : <><X size={12} /> {status.error}</>}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={addCalendar}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> {t('addCalendar', language)}
      </button>
    </div>
  );
}

// Clock List Component
function ClockList({ clocks, onChange, weatherApiKey }) {
  const commonTimezones = [
    { label: 'Local', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
    // Americas
    { label: 'New York', value: 'America/New_York' },
    { label: 'Los Angeles', value: 'America/Los_Angeles' },
    { label: 'Chicago', value: 'America/Chicago' },
    { label: 'Toronto', value: 'America/Toronto' },
    { label: 'São Paulo', value: 'America/Sao_Paulo' },
    // Europe
    { label: 'London', value: 'Europe/London' },
    { label: 'Paris', value: 'Europe/Paris' },
    { label: 'Berlin', value: 'Europe/Berlin' },
    { label: 'Amsterdam', value: 'Europe/Amsterdam' },
    { label: 'Moscow', value: 'Europe/Moscow' },
    // Africa
    { label: 'Accra (Ghana)', value: 'Africa/Accra' },
    { label: 'Lagos', value: 'Africa/Lagos' },
    { label: 'Cairo', value: 'Africa/Cairo' },
    { label: 'Johannesburg', value: 'Africa/Johannesburg' },
    { label: 'Nairobi', value: 'Africa/Nairobi' },
    // Asia
    { label: 'Dubai', value: 'Asia/Dubai' },
    { label: 'Mumbai', value: 'Asia/Kolkata' },
    { label: 'Singapore', value: 'Asia/Singapore' },
    { label: 'Hong Kong', value: 'Asia/Hong_Kong' },
    { label: 'Tokyo', value: 'Asia/Tokyo' },
    { label: 'Shanghai', value: 'Asia/Shanghai' },
    { label: 'Seoul', value: 'Asia/Seoul' },
    // Oceania
    { label: 'Sydney', value: 'Australia/Sydney' },
    { label: 'Auckland', value: 'Pacific/Auckland' },
  ];

  const addClock = () => {
    const newClock = {
      id: Date.now().toString(),
      name: `Clock ${clocks.length + 1}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      city: '',
      enabled: true
    };
    onChange([...clocks, newClock]);
  };

  const updateClock = (id, field, value) => {
    onChange(clocks.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeClock = (id) => {
    onChange(clocks.filter(c => c.id !== id));
  };

  return (
    <div>
      {clocks.map((clock) => (
        <div key={clock.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: weatherApiKey ? '8px' : 0 }}>
            <input
              type="text"
              value={clock.name}
              onChange={(e) => updateClock(clock.id, 'name', e.target.value)}
              placeholder="Clock name"
              style={{ flex: 1, minWidth: '100px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
            />
            <select
              value={clock.timezone}
              onChange={(e) => updateClock(clock.id, 'timezone', e.target.value)}
              style={{ flex: 1, minWidth: '150px', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
            >
              {commonTimezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>
              ))}
            </select>
            <Toggle checked={clock.enabled} onChange={(enabled) => updateClock(clock.id, 'enabled', enabled)} />
            <button onClick={() => removeClock(clock.id)}
              style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
          </div>
          {/* City for weather - only show if API key is configured */}
          {weatherApiKey && (
            <input
              type="text"
              value={clock.city || ''}
              onChange={(e) => updateClock(clock.id, 'city', e.target.value)}
              placeholder="City for weather (e.g., London, UK) - optional"
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
            />
          )}
        </div>
      ))}
      <button onClick={addClock}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add Clock
      </button>
    </div>
  );
}

// Countdown List Component
function CountdownList({ countdowns, onChange }) {
  const addCountdown = () => {
    const newCountdown = {
      id: Date.now().toString(),
      name: '',
      targetDate: '',
      enabled: true
    };
    onChange([...countdowns, newCountdown]);
  };

  const updateCountdown = (id, field, value) => {
    onChange(countdowns.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCountdown = (id) => {
    onChange(countdowns.filter(c => c.id !== id));
  };

  return (
    <div>
      {countdowns.map((countdown) => (
        <div key={countdown.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={countdown.name}
              onChange={(e) => updateCountdown(countdown.id, 'name', e.target.value)}
              placeholder="Event name (e.g. Baby Due)"
              style={{ flex: 1, minWidth: '140px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
            />
            <input
              type="date"
              value={countdown.targetDate}
              onChange={(e) => updateCountdown(countdown.id, 'targetDate', e.target.value)}
              style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', colorScheme: 'dark' }}
            />
            <Toggle checked={countdown.enabled} onChange={(enabled) => updateCountdown(countdown.id, 'enabled', enabled)} />
            <button onClick={() => removeCountdown(countdown.id)}
              style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={addCountdown}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add Countdown
      </button>
    </div>
  );
}

// Notes List Component
function NotesList({ notes, onChange }) {
  const addNote = () => {
    const colors = ['var(--accent-primary)', 'var(--warning)', 'var(--success)', '#9c27b0', '#ff5722', '#607d8b'];
    const newNote = {
      id: Date.now().toString(),
      text: '',
      createdAt: Date.now(),
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    onChange([...notes, newNote]);
  };

  const updateNote = (id, text) => {
    onChange(notes.map(n => n.id === id ? { ...n, text } : n));
  };

  const removeNote = (id) => {
    onChange(notes.filter(n => n.id !== id));
  };

  return (
    <div>
      {notes.map((note) => (
        <div key={note.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px', borderLeft: `3px solid ${note.color || 'var(--accent-primary)'}` }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <textarea
              value={note.text}
              onChange={(e) => updateNote(note.id, e.target.value)}
              placeholder="Write your note..."
              rows={2}
              style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button onClick={() => removeNote(note.id)}
              style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={addNote}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add Note
      </button>
    </div>
  );
}

// Quick Links List Component
const LINK_ICONS = [
  { name: 'link', icon: LinkIcon },
  { name: 'home', icon: Home },
  { name: 'server', icon: Activity },
  { name: 'cloud', icon: Cloud },
  { name: 'monitor', icon: Monitor },
  { name: 'settings', icon: Settings },
  { name: 'film', icon: Film },
  { name: 'tv', icon: Tv },
  { name: 'calendar', icon: Calendar },
  { name: 'cpu', icon: Cpu },
  { name: 'lock', icon: Lock }
];

const LINK_COLORS = ['#4285f4', '#00d4ff', '#34a853', '#fbbc04', '#ea4335', '#9333ea', '#f97316', '#ec4899', '#6b7280'];

function QuickLinksList({ links, onChange }) {
  const [editingIcon, setEditingIcon] = useState(null);
  const [editingColor, setEditingColor] = useState(null);

  const addLink = () => {
    const newLink = {
      id: Date.now().toString(),
      name: '',
      url: '',
      description: '',
      icon: 'link',
      color: LINK_COLORS[Math.floor(Math.random() * LINK_COLORS.length)]
    };
    onChange([...links, newLink]);
  };

  const updateLink = (id, field, value) => {
    onChange(links.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLink = (id) => {
    onChange(links.filter(l => l.id !== id));
  };

  const getIcon = (name) => LINK_ICONS.find(i => i.name === name)?.icon || LinkIcon;

  return (
    <div>
      {links.map((link) => {
        const IconComp = getIcon(link.icon);
        return (
          <div key={link.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px', borderLeft: `3px solid ${link.color || 'var(--accent-primary)'}` }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
              {/* Icon selector */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setEditingIcon(editingIcon === link.id ? null : link.id); setEditingColor(null); }}
                  style={{ width: '36px', height: '36px', background: `${link.color || 'var(--accent-primary)'}20`, border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: link.color || 'var(--accent-primary)' }}>
                  <IconComp size={18} />
                </button>
                {editingIcon === link.id && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', zIndex: 100 }}>
                    {LINK_ICONS.map(({ name, icon: Icon }) => (
                      <button key={name} onClick={() => { updateLink(link.id, 'icon', name); setEditingIcon(null); }}
                        style={{ width: '32px', height: '32px', background: link.icon === name ? `${link.color}30` : 'var(--bg-card)', border: `1px solid ${link.icon === name ? link.color : 'var(--border-color)'}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: link.icon === name ? link.color : 'var(--text-secondary)' }}>
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Color selector */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setEditingColor(editingColor === link.id ? null : link.id); setEditingIcon(null); }}
                  style={{ width: '24px', height: '24px', background: link.color || 'var(--accent-primary)', border: '2px solid var(--bg-card)', borderRadius: '4px', cursor: 'pointer' }} />
                {editingColor === link.id && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', display: 'flex', gap: '4px', zIndex: 100 }}>
                    {LINK_COLORS.map(color => (
                      <button key={color} onClick={() => { updateLink(link.id, 'color', color); setEditingColor(null); }}
                        style={{ width: '24px', height: '24px', background: color, border: link.color === color ? '2px solid white' : 'none', borderRadius: '4px', cursor: 'pointer' }} />
                    ))}
                  </div>
                )}
              </div>
              <input type="text" value={link.name} onChange={(e) => updateLink(link.id, 'name', e.target.value)} placeholder="Link name"
                style={{ flex: 1, minWidth: '100px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <button onClick={() => removeLink(link.id)}
                style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" value={link.url} onChange={(e) => updateLink(link.id, 'url', e.target.value)} placeholder="URL (https://...)"
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
            </div>
            <input type="text" value={link.description || ''} onChange={(e) => updateLink(link.id, 'description', e.target.value)} placeholder="Description (optional)"
              style={{ width: '100%', marginTop: '8px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} />
          </div>
        );
      })}
      <button onClick={addLink}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add Quick Link
      </button>
    </div>
  );
}

// System List Component with individual testing
function SystemList({ systems, onChange }) {
  const [sysStatus, setSysStatus] = useState({});
  const [testing, setTesting] = useState({});

  const addSystem = () => {
    const newSys = {
      id: Date.now().toString(),
      name: `System ${systems.length + 1}`,
      apiUrl: '',
      refreshInterval: 5000,
      enabled: true
    };
    onChange([...systems, newSys]);
  };

  const updateSystem = (id, field, value) => {
    onChange(systems.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (field === 'apiUrl') setSysStatus(prev => ({ ...prev, [id]: null }));
  };

  const removeSystem = (id) => {
    onChange(systems.filter(s => s.id !== id));
  };

  const testSystem = async (sys) => {
    if (!sys.apiUrl) {
      setSysStatus(prev => ({ ...prev, [sys.id]: { success: false, error: 'No URL provided' } }));
      return;
    }
    setTesting(prev => ({ ...prev, [sys.id]: true }));
    setSysStatus(prev => ({ ...prev, [sys.id]: null }));

    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(sys.apiUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Check for expected fields (cpu, memory, etc)
      const hasStats = data.cpu !== undefined || data.mem !== undefined || data.memory !== undefined;
      if (!hasStats) {
        throw new Error('Response missing cpu/memory data');
      }
      setSysStatus(prev => ({ ...prev, [sys.id]: { success: true, cpu: data.cpu, mem: data.mem || data.memory } }));
    } catch (err) {
      setSysStatus(prev => ({ ...prev, [sys.id]: { success: false, error: err.message } }));
    } finally {
      setTesting(prev => ({ ...prev, [sys.id]: false }));
    }
  };

  return (
    <div>
      {systems.map((sys) => {
        const status = sysStatus[sys.id];
        const isLoading = testing[sys.id];
        return (
          <div key={sys.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px', borderLeft: status ? `3px solid ${status.success ? 'var(--success)' : 'var(--danger)'}` : '3px solid transparent' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input type="text" value={sys.name} onChange={(e) => updateSystem(sys.id, 'name', e.target.value)} placeholder="System name"
                style={{ flex: 1, minWidth: '120px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} />
              <Toggle checked={sys.enabled} onChange={(enabled) => updateSystem(sys.id, 'enabled', enabled)} />
              <button onClick={() => removeSystem(sys.id)} style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" value={sys.apiUrl} onChange={(e) => updateSystem(sys.id, 'apiUrl', e.target.value)}
                placeholder="API URL (e.g., http://192.168.1.x:61208/api/4/quicklook)"
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
              <button onClick={() => testSystem(sys)} disabled={isLoading || !sys.apiUrl}
                style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: sys.apiUrl ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: sys.apiUrl ? 'pointer' : 'not-allowed', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                {isLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Testing</> : <><Check size={12} /> Test</>}
              </button>
            </div>
            {status && (
              <div style={{ marginTop: '8px', padding: '8px 10px', background: status.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${status.success ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '4px', fontSize: '11px', color: status.success ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {status.success ? <><Check size={12} /> Connected - CPU: {status.cpu?.toFixed(1)}%, Mem: {status.mem?.toFixed(1)}%</> : <><X size={12} /> {status.error}</>}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={addSystem}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add System
      </button>
    </div>
  );
}

// Scrypted Configuration with real connection testing
function ScryptedConfig({ config, onChange }) {
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(null);

  const testConnection = async () => {
    if (!config.url) {
      setStatus({ success: false, error: 'URL required' });
      return;
    }

    setTesting(true);
    setStatus(null);

    try {
      const baseUrl = config.url.replace(/\/$/, '');

      // Step 1: Login
      const loginUrl = `/api/proxy?url=${encodeURIComponent(`${baseUrl}/login`)}`;

      const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: config.username,
          password: config.password
        })
      });

      if (!loginRes.ok) {
        throw new Error(`Login failed: HTTP ${loginRes.status}`);
      }

      // Capture Set-Cookie header for cookie-based auth
      // Try both the standard header and our custom header (browsers may block Set-Cookie)
      const setCookie = loginRes.headers.get('set-cookie') || loginRes.headers.get('x-scrypted-cookie');
      console.log('[Scrypted Test] Cookie header:', setCookie);

      const loginData = await loginRes.json();
      console.log('[Scrypted Test] Login response:', JSON.stringify(loginData));

      // Scrypted returns different formats depending on version
      // Could be: token, authorization, accessToken, or nested in a response object
      let token = loginData.token || loginData.authorization || loginData.accessToken ||
                  loginData.access_token || loginData?.response?.token;

      // If still no token, the response might BE the token (just a string)
      if (!token && typeof loginData === 'string') {
        token = loginData;
      }

      // Login successful - that's all we can verify via REST API
      // Scrypted uses WebSocket (Engine.IO) for device listing, not REST
      // For camera streams, users need to use Scrypted's Webhook plugin URLs
      setStatus({ success: true, message: 'Login successful! Add camera URLs below.' });

    } catch (err) {
      console.error('[Scrypted Test]', err);
      setStatus({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="text"
        value={config.url || ''}
        onChange={(e) => onChange({ ...config, url: e.target.value })}
        placeholder="Scrypted URL (e.g., https://192.168.1.100:10443)"
        style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={config.username || ''}
          onChange={(e) => onChange({ ...config, username: e.target.value })}
          placeholder="Username"
          style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
        />
        <input
          type="password"
          value={config.password || ''}
          onChange={(e) => onChange({ ...config, password: e.target.value })}
          placeholder="Password"
          style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }}
        />
        <button
          onClick={testConnection}
          disabled={testing || !config.url}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: config.url ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: config.url ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}
        >
          {testing ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Testing</> : <><Check size={12} /> Test</>}
        </button>
      </div>
      {status && (
        <div style={{
          padding: '8px 10px',
          background: status.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${status.success ? 'var(--success)' : 'var(--danger)'}`,
          borderRadius: '4px',
          fontSize: '11px',
          color: status.success ? 'var(--success)' : 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {status.success ? <><Check size={12} /> {status.message}</> : <><X size={12} /> {status.error}</>}
        </div>
      )}
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
        Get camera snapshot URLs from Scrypted's Webhook plugin. Add them as URL cameras below.
      </div>
    </div>
  );
}

// Camera List Component with individual testing
function CameraList({ cameras, onChange, haConnected }) {
  const [camStatus, setCamStatus] = useState({});
  const [testing, setTesting] = useState({});

  const addCamera = () => {
    const newCam = {
      id: Date.now().toString(),
      name: `Camera ${cameras.length + 1}`,
      source: 'url',
      streamType: 'snapshot',
      entityId: '',
      url: '',
      enabled: true
    };
    onChange([...cameras, newCam]);
  };

  const updateCamera = (id, field, value) => {
    onChange(cameras.map(c => c.id === id ? { ...c, [field]: value } : c));
    if (field === 'url' || field === 'entityId') setCamStatus(prev => ({ ...prev, [id]: null }));
  };

  const removeCamera = (id) => {
    onChange(cameras.filter(c => c.id !== id));
  };

  const testCamera = async (cam) => {
    // go2rtc cameras - test by registering stream
    if (cam.streamType === 'go2rtc') {
      if (!cam.rtspUrl) {
        setCamStatus(prev => ({ ...prev, [cam.id]: { success: false, error: 'No RTSP URL provided' } }));
        return;
      }
      setTesting(prev => ({ ...prev, [cam.id]: true }));
      try {
        const streamName = `cam_${cam.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let source = cam.rtspUrl.trim();
        if (source.startsWith('rtsps://')) source = source.replace('rtsps://', 'rtspx://');
        source = source.replace(/[?&]enableSrtp\b/i, '');

        const res = await fetch('/api/go2rtc/streams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streams: { [streamName]: source } })
        });
        const data = await res.json();
        if (data.results?.[streamName]?.ok) {
          setCamStatus(prev => ({ ...prev, [cam.id]: { success: true } }));
        } else {
          throw new Error(data.results?.[streamName]?.body || `HTTP ${data.results?.[streamName]?.status}`);
        }
      } catch (err) {
        setCamStatus(prev => ({ ...prev, [cam.id]: { success: false, error: err.message } }));
      } finally {
        setTesting(prev => ({ ...prev, [cam.id]: false }));
      }
      return;
    }

    // Home Assistant cameras
    if (cam.source === 'ha') {
      if (!cam.entityId) {
        setCamStatus(prev => ({ ...prev, [cam.id]: { success: false, error: 'No entity ID provided' } }));
        return;
      }
      setCamStatus(prev => ({ ...prev, [cam.id]: { success: haConnected, error: haConnected ? null : 'Home Assistant not connected' } }));
      return;
    }

    // Scrypted cameras - test webhook URL
    if (cam.source === 'scrypted') {
      if (!cam.webhookUrl) {
        setCamStatus(prev => ({ ...prev, [cam.id]: { success: false, error: 'No webhook URL provided' } }));
        return;
      }
      // Test the webhook URL
      setTesting(prev => ({ ...prev, [cam.id]: true }));
      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(cam.webhookUrl)}`;
        const res = await fetch(proxyUrl, { method: 'HEAD' });
        if (res.ok) {
          setCamStatus(prev => ({ ...prev, [cam.id]: { success: true } }));
        } else {
          // Try GET as fallback
          const getRes = await fetch(proxyUrl);
          if (getRes.ok) {
            setCamStatus(prev => ({ ...prev, [cam.id]: { success: true } }));
          } else {
            throw new Error(`HTTP ${getRes.status}`);
          }
        }
      } catch (err) {
        setCamStatus(prev => ({ ...prev, [cam.id]: { success: false, error: err.message } }));
      } finally {
        setTesting(prev => ({ ...prev, [cam.id]: false }));
      }
      return;
    }

    // Direct URL cameras
    const testUrl = cam.url;
    if (!testUrl) {
      setCamStatus(prev => ({ ...prev, [cam.id]: { success: false, error: 'No URL provided' } }));
      return;
    }

    setTesting(prev => ({ ...prev, [cam.id]: true }));
    setCamStatus(prev => ({ ...prev, [cam.id]: null }));

    try {
      // For cameras, we try to fetch the URL and check content type
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(testUrl)}`;
      const res = await fetch(proxyUrl, { method: 'HEAD' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = res.headers.get('content-type') || '';
      const isValid = contentType.includes('image') || contentType.includes('video') || contentType.includes('mpegurl') || contentType.includes('octet-stream');

      if (isValid || res.ok) {
        setCamStatus(prev => ({ ...prev, [cam.id]: { success: true } }));
      } else {
        throw new Error('Invalid content type');
      }
    } catch (err) {
      // Try GET as fallback (some servers don't support HEAD)
      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(testUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          setCamStatus(prev => ({ ...prev, [cam.id]: { success: true } }));
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err2) {
        setCamStatus(prev => ({ ...prev, [cam.id]: { success: false, error: err2.message } }));
      }
    } finally {
      setTesting(prev => ({ ...prev, [cam.id]: false }));
    }
  };

  return (
    <div>
      {cameras.map((cam) => {
        const status = camStatus[cam.id];
        const isLoading = testing[cam.id];
        const isGo2rtc = cam.streamType === 'go2rtc';
        const hasUrl = isGo2rtc ? cam.rtspUrl : cam.source === 'ha' ? cam.entityId : cam.source === 'scrypted' ? cam.webhookUrl : cam.url;

        return (
          <div key={cam.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '12px', borderLeft: status ? `3px solid ${status.success ? 'var(--success)' : 'var(--danger)'}` : isGo2rtc ? '3px solid rgba(34,197,94,0.3)' : '3px solid transparent' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input type="text" value={cam.name} onChange={(e) => updateCamera(cam.id, 'name', e.target.value)} placeholder="Camera name"
                style={{ flex: 1, minWidth: '120px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} />
              {/* Only show source dropdown for non-go2rtc cameras */}
              {!isGo2rtc && (
                <select value={cam.source} onChange={(e) => updateCamera(cam.id, 'source', e.target.value)}
                  style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11px' }}>
                  <option value="url">Direct URL</option>
                  <option value="ha">Home Assistant</option>
                  <option value="scrypted">Scrypted</option>
                  <option value="homebridge">Homebridge</option>
                </select>
              )}
              <select value={cam.streamType || 'snapshot'} onChange={(e) => updateCamera(cam.id, 'streamType', e.target.value)}
                style={{ padding: '8px 10px', background: 'var(--bg-card)', border: `1px solid ${isGo2rtc ? 'rgba(34,197,94,0.4)' : 'var(--border-color)'}`, borderRadius: '6px', color: isGo2rtc ? '#22c55e' : 'var(--text-primary)', fontSize: '11px', fontWeight: isGo2rtc ? '600' : '400' }}>
                <option value="snapshot">Snapshot</option>
                <option value="go2rtc">RTSP Live (go2rtc)</option>
                <option value="mjpeg">MJPEG</option>
                <option value="hls">HLS (.m3u8)</option>
              </select>
              <Toggle checked={cam.enabled} onChange={(enabled) => updateCamera(cam.id, 'enabled', enabled)} />
              <button onClick={() => removeCamera(cam.id)} style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
            {/* go2rtc: just the RTSP URL */}
            {isGo2rtc ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" value={cam.rtspUrl || ''} onChange={(e) => updateCamera(cam.id, 'rtspUrl', e.target.value)}
                  placeholder="rtsps://192.168.1.1:7441/AbCdEf123 (RTSP/RTSPS URL)"
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
                <button onClick={() => testCamera(cam)} disabled={isLoading || !hasUrl}
                  style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: hasUrl ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: hasUrl ? 'pointer' : 'not-allowed', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                  {isLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Testing</> : <><Check size={12} /> Test</>}
                </button>
              </div>
            ) : (
              /* Other sources: HA entity ID, Scrypted webhook, or direct URL */
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {cam.source === 'ha' ? (
                  <input type="text" value={cam.entityId} onChange={(e) => updateCamera(cam.id, 'entityId', e.target.value)} placeholder="Entity ID (camera.front_door)"
                    style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
                ) : cam.source === 'scrypted' ? (
                  <input type="text" value={cam.webhookUrl || ''} onChange={(e) => updateCamera(cam.id, 'webhookUrl', e.target.value)} placeholder="Scrypted Webhook URL (from Webhook plugin)"
                    style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
                ) : (
                  <input type="text" value={cam.url} onChange={(e) => updateCamera(cam.id, 'url', e.target.value)}
                    placeholder={cam.streamType === 'hls' ? 'HLS stream URL (.m3u8)' : cam.streamType === 'mjpeg' ? 'MJPEG stream URL' : 'Snapshot URL (refreshes periodically)'}
                    style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
                )}
                <button onClick={() => testCamera(cam)} disabled={isLoading || !hasUrl}
                  style={{ padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: hasUrl ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: hasUrl ? 'pointer' : 'not-allowed', fontSize: '11px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                  {isLoading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Testing</> : <><Check size={12} /> Test</>}
                </button>
              </div>
            )}
            {status && (
              <div style={{ marginTop: '8px', padding: '8px 10px', background: status.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${status.success ? 'var(--success)' : 'var(--danger)'}`, borderRadius: '4px', fontSize: '11px', color: status.success ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {status.success ? <><Check size={12} /> Connected</> : <><X size={12} /> {status.error}</>}
              </div>
            )}
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {isGo2rtc && '💡 Paste RTSP/RTSPS URL from your camera (UniFi, Hikvision, etc). Thumbnails and live stream handled automatically by go2rtc.'}
              {!isGo2rtc && cam.source === 'scrypted' && cam.streamType === 'mjpeg' && '💡 LIVE — True MJPEG stream via /getVideoStream.'}
              {!isGo2rtc && cam.source === 'scrypted' && cam.streamType === 'snapshot' && '💡 Paste base Webhook URL from Scrypted. Refreshes every 5 seconds.'}
              {!isGo2rtc && cam.source === 'ha' && cam.streamType === 'mjpeg' && '💡 LIVE — Continuous MJPEG stream via HA camera proxy.'}
              {!isGo2rtc && cam.streamType === 'mjpeg' && cam.source !== 'ha' && cam.source !== 'scrypted' && '💡 LIVE — True MJPEG stream (go2rtc, Frigate, etc)'}
              {!isGo2rtc && cam.streamType === 'hls' && '💡 HLS works with go2rtc, Frigate, or any HLS source'}
              {!isGo2rtc && cam.streamType === 'snapshot' && '💡 Snapshots refresh every few seconds'}
            </div>
          </div>
        );
      })}
      <button onClick={addCamera}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add Camera
      </button>
    </div>
  );
}

// RSS Feed List Component with individual status testing
function RSSFeedList({ feeds, onChange }) {
  const [feedStatus, setFeedStatus] = useState({});
  const [testing, setTesting] = useState({});
  const colors = ['#ff6600', '#4285f4', '#34a853', '#ea4335', '#9c27b0', '#00d4ff'];

  const addFeed = () => {
    const newFeed = {
      id: Date.now().toString(),
      name: `Feed ${feeds.length + 1}`,
      url: '',
      color: colors[feeds.length % colors.length],
      enabled: true
    };
    onChange([...feeds, newFeed]);
  };

  const updateFeed = (id, field, value) => {
    onChange(feeds.map(f => f.id === id ? { ...f, [field]: value } : f));
    // Clear status when URL changes
    if (field === 'url') {
      setFeedStatus(prev => ({ ...prev, [id]: null }));
    }
  };

  const removeFeed = (id) => {
    onChange(feeds.filter(f => f.id !== id));
  };

  const testFeed = async (feed) => {
    if (!feed.url) {
      setFeedStatus(prev => ({ ...prev, [feed.id]: { success: false, error: 'No URL provided' } }));
      return;
    }

    setTesting(prev => ({ ...prev, [feed.id]: true }));
    setFeedStatus(prev => ({ ...prev, [feed.id]: null }));

    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(feed.url)}`;

      const res = await fetch(proxyUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');

      // Check for parse errors
      const parseError = xml.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid XML format');
      }

      // Check for RSS or Atom
      const isAtom = xml.querySelector('feed');
      const isRSS = xml.querySelector('channel');

      if (!isAtom && !isRSS) {
        throw new Error('Not a valid RSS/Atom feed');
      }

      const entries = isAtom
        ? xml.querySelectorAll('entry')
        : xml.querySelectorAll('item');

      setFeedStatus(prev => ({
        ...prev,
        [feed.id]: { success: true, itemCount: entries.length }
      }));
    } catch (err) {
      setFeedStatus(prev => ({
        ...prev,
        [feed.id]: { success: false, error: err.message }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [feed.id]: false }));
    }
  };

  return (
    <div>
      {feeds.map((feed) => {
        const status = feedStatus[feed.id];
        const isLoading = testing[feed.id];

        return (
          <div key={feed.id} style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            borderLeft: status ? `3px solid ${status.success ? 'var(--success)' : 'var(--danger)'}` : '3px solid transparent'
          }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="color"
                value={feed.color}
                onChange={(e) => updateFeed(feed.id, 'color', e.target.value)}
                style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={feed.name}
                onChange={(e) => updateFeed(feed.id, 'name', e.target.value)}
                placeholder="Feed name"
                style={{ flex: 1, minWidth: '100px', padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
              />
              <Toggle checked={feed.enabled} onChange={(enabled) => updateFeed(feed.id, 'enabled', enabled)} />
              <button onClick={() => removeFeed(feed.id)}
                style={{ padding: '8px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={feed.url}
                onChange={(e) => updateFeed(feed.id, 'url', e.target.value)}
                placeholder="RSS/Atom feed URL (https://...)"
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
              />
              <button
                onClick={() => testFeed(feed)}
                disabled={isLoading || !feed.url}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: feed.url ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: feed.url ? 'pointer' : 'not-allowed',
                  fontSize: '11px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap'
                }}
              >
                {isLoading ? (
                  <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Testing</>
                ) : (
                  <><Check size={12} /> Test</>
                )}
              </button>
            </div>
            {status && (
              <div style={{
                marginTop: '8px',
                padding: '8px 10px',
                background: status.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${status.success ? 'var(--success)' : 'var(--danger)'}`,
                borderRadius: '4px',
                fontSize: '11px',
                color: status.success ? 'var(--success)' : 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {status.success ? (
                  <><Check size={12} /> Connected - {status.itemCount} items found</>
                ) : (
                  <><X size={12} /> {status.error}</>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={addFeed}
        style={{ width: '100%', padding: '12px', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
        <Plus size={16} /> Add RSS Feed
      </button>
    </div>
  );
}

function IntegrationCard({ title, icon: Icon, enabled, onToggle, status, onConnect, onDisconnect, children, language }) {
  const [expanded, setExpanded] = useState(false); // Start collapsed
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border-color)' : 'none' }} onClick={() => setExpanded(!expanded)}>
        <Icon size={24} style={{ color: enabled ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '600', letterSpacing: '1px', marginBottom: '4px' }}>{title}</div>
          <ConnectionStatus status={status} language={language} />
        </div>
        <Toggle checked={enabled} onChange={onToggle} />
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      {expanded && (
        <div style={{ padding: '20px' }}>
          {children}
          {onConnect && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={onConnect} disabled={!enabled || status?.connecting}
                style={{ padding: '10px 20px', background: enabled ? 'var(--accent-glow)' : 'var(--bg-secondary)', border: `1px solid ${enabled ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius: '6px', color: enabled ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {status?.connecting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />{t('connecting', language)}</> : <><Check size={14} />{t('testConnection', language)}</>}
              </button>
              {status?.connected && (
                <button onClick={onDisconnect} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--danger)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1px' }}>{t('disconnect', language)}</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Setup() {
  const {
    _hasHydrated,
    panels, togglePanel, reorderPanels, updatePanelConfig,
    integrations, updateIntegration, connectionStatus,
    connectHomeAssistant, connectUptimeKuma, connectWeather, connectTautulli, connectUnifi, connectPihole, connectProxmox,
    disconnectHomeAssistant, disconnectUptimeKuma, disconnectWeather, disconnectTautulli, disconnectUnifi, disconnectPihole, disconnectProxmox,
    testTmdbConnection, testTraktConnection, resetPosterConnection,
    settings, updateSettings, resetToDefaults
  } = useDashboardStore();

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('integrations');
  const language = settings?.language || 'en-GB';

  // Get calendar status from store (persisted)
  const calendarStatus = connectionStatus?.calendars || { configured: false, connected: false };

  // Auto-connect all enabled integrations on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (integrations.homeAssistant.enabled && integrations.homeAssistant.url && integrations.homeAssistant.token) {
        connectHomeAssistant();
      }
      if (integrations.uptimeKuma.enabled && integrations.uptimeKuma.url) {
        connectUptimeKuma();
      }
      // Weather: connect if API key exists (and clocks have cities or legacy mode)
      if (integrations.weather.apiKey) {
        connectWeather();
      }
      if (integrations.tautulli.enabled && integrations.tautulli.url && integrations.tautulli.apiKey) {
        connectTautulli();
      }
      if (integrations.unifi?.enabled && integrations.unifi?.url) {
        connectUnifi();
      }
    };
    autoConnect();
  }, []); // Only run once on mount

  // Reconnect weather when clocks with cities change or when weather API key changes
  useEffect(() => {
    if (!integrations.weather.apiKey) return;

    const clocksWithCities = (integrations.clocks || []).filter(c => c.enabled !== false && c.city?.trim());
    if (clocksWithCities.length > 0) {
      // Debounce reconnect to avoid hammering API while typing
      const timeout = setTimeout(() => {
        connectWeather();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [integrations.weather.apiKey, integrations.clocks, connectWeather]);

  const handleDragStart = (e, index) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, index) => { e.preventDefault(); if (draggedIndex === null || draggedIndex === index) return; reorderPanels(draggedIndex, index); setDraggedIndex(index); };
  const handleDragEnd = () => setDraggedIndex(null);

  const haPanel = panels.find(p => p.id === 'home-assistant');
  const enabledPanels = panels.filter(p => p.enabled);

  // Show loading while waiting for store hydration
  if (!_hasHydrated) {
    return (
      <div className="setup-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)', marginBottom: '16px' }} />
          <p style={{ fontSize: '18px' }}>{t('loading', language) || 'Loading...'}</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div className="setup-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '700',
            color: 'var(--accent-primary)',
            background: 'var(--accent-glow)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontFamily: 'var(--font-display)',
            letterSpacing: '2px'
          }}>
            XDASHBOARD
          </span>
          <h1>{t('dashboardSetup', language)}</h1>
        </div>
        <p>{t('configureDesc', language)}</p>
      </div>

      <div className="setup-content">
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link to="/display" className="setup-link"><Monitor size={16} />{t('viewDashboard', language)}<ExternalLink size={14} /></Link>
          <button className="setup-link" onClick={resetToDefaults} style={{ cursor: 'pointer' }}><RotateCcw size={16} />{t('reset', language)}</button>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
          {[
            { key: 'integrations', label: t('integrations', language) },
            { key: 'panels', label: t('panels', language) },
            { key: 'settings', label: t('settingsTab', language) }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '10px 20px', background: activeTab === tab.key ? 'var(--bg-panel)' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'integrations' && (
          <div>
            <IntegrationCard title={t('homeAssistant', language)} icon={Home} enabled={integrations.homeAssistant.enabled}
              onToggle={() => updateIntegration('homeAssistant', { enabled: !integrations.homeAssistant.enabled })}
              status={connectionStatus.homeAssistant} onConnect={connectHomeAssistant} onDisconnect={disconnectHomeAssistant} language={language}>
              <FormInput label={`${t('homeAssistant', language)} URL`} value={integrations.homeAssistant.url}
                onChange={(url) => updateIntegration('homeAssistant', { url })} placeholder="http://homeassistant.local:8123" />
              <FormInput label="Long-Lived Access Token" value={integrations.homeAssistant.token}
                onChange={(token) => updateIntegration('homeAssistant', { token })} placeholder="eyJ0eXAiOiJKV1QiLC..." helpText="Profile → Long-Lived Access Tokens" secret />
              <HAEntityConfigurator
                entities={haPanel?.config?.entities || []}
                onChange={(entities) => updatePanelConfig('home-assistant', { entities })}
                isConnected={connectionStatus.homeAssistant?.connected}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('uptimeKuma', language)} icon={Activity} enabled={integrations.uptimeKuma.enabled}
              onToggle={() => updateIntegration('uptimeKuma', { enabled: !integrations.uptimeKuma.enabled })}
              status={connectionStatus.uptimeKuma} onConnect={connectUptimeKuma} onDisconnect={disconnectUptimeKuma} language={language}>
              <FormInput label={`${t('uptimeKuma', language)} URL`} value={integrations.uptimeKuma.url}
                onChange={(url) => updateIntegration('uptimeKuma', { url })} placeholder="https://status.example.com" />
              <div style={{ marginBottom: '16px' }}>
                <Toggle checked={integrations.uptimeKuma.useStatusPage} onChange={(useStatusPage) => updateIntegration('uptimeKuma', { useStatusPage })} label={t('useStatusPage', language)} />
              </div>
              {integrations.uptimeKuma.useStatusPage ? (
                <FormInput label={t('statusPageSlug', language)} value={integrations.uptimeKuma.statusPageSlug}
                  onChange={(statusPageSlug) => updateIntegration('uptimeKuma', { statusPageSlug })} placeholder="default" />
              ) : (
                <FormInput label={t('apiKey', language)} value={integrations.uptimeKuma.apiKey}
                  onChange={(apiKey) => updateIntegration('uptimeKuma', { apiKey })} placeholder="uk_..." secret />
              )}
            </IntegrationCard>

            <IntegrationCard title={t('weather', language)} icon={Cloud} enabled={!!integrations.weather.apiKey}
              onToggle={() => {}}
              status={connectionStatus.weather} onConnect={connectWeather} onDisconnect={disconnectWeather} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>OpenWeatherMap:</strong> <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>openweathermap.org/api</a>
              </div>
              <FormInput label={`OpenWeatherMap ${t('apiKey', language)}`} value={integrations.weather.apiKey}
                onChange={(apiKey) => updateIntegration('weather', { apiKey })} placeholder="API key" secret />

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>Units</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[{ value: 'metric', label: 'Celsius (°C)' }, { value: 'imperial', label: 'Fahrenheit (°F)' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="units" checked={(integrations.weather.units || 'metric') === opt.value} onChange={() => updateIntegration('weather', { units: opt.value })} style={{ accentColor: 'var(--accent-primary)' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {integrations.weather.apiKey && (
                <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '6px', fontSize: '11px', color: 'var(--success)' }}>
                  ✓ API key {t('configured', language)}
                </div>
              )}
            </IntegrationCard>

            <IntegrationCard title={t('tautulliPlex', language)} icon={Tv} enabled={integrations.tautulli.enabled} language={language}
              onToggle={() => updateIntegration('tautulli', { enabled: !integrations.tautulli.enabled })}
              status={connectionStatus.tautulli} onConnect={connectTautulli} onDisconnect={disconnectTautulli}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--warning)' }}>Important:</strong> Enable CORS in Tautulli: Settings → Web Interface → Check "Allow API requests from any origin (CORS)"
              </div>
              <FormInput label="Tautulli URL" value={integrations.tautulli.url}
                onChange={(url) => updateIntegration('tautulli', { url })} placeholder="http://192.168.1.x:7171" helpText="Your Tautulli URL with port (e.g. 7171, 8181)" />
              <FormInput label="API Key" value={integrations.tautulli.apiKey}
                onChange={(apiKey) => updateIntegration('tautulli', { apiKey })} placeholder="Your Tautulli API key" helpText="Settings → Web Interface → API Key" secret />

              {/* Tab visibility options */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '10px', color: 'var(--text-secondary)' }}>Show Tabs</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Toggle
                    checked={panels.find(p => p.id === 'tautulli')?.config?.showActivity || false}
                    onChange={(v) => updatePanelConfig('tautulli', { showActivity: v })}
                    label="Now Playing"
                  />
                  <Toggle
                    checked={panels.find(p => p.id === 'tautulli')?.config?.showRecent !== false}
                    onChange={(v) => updatePanelConfig('tautulli', { showRecent: v })}
                    label="Recently Added"
                  />
                  <Toggle
                    checked={panels.find(p => p.id === 'tautulli')?.config?.showHistory !== false}
                    onChange={(v) => updatePanelConfig('tautulli', { showHistory: v })}
                    label="History"
                  />
                  <Toggle
                    checked={panels.find(p => p.id === 'tautulli')?.config?.showStats || false}
                    onChange={(v) => updatePanelConfig('tautulli', { showStats: v })}
                    label="Stats (Library counts, top users)"
                  />
                </div>
              </div>
            </IntegrationCard>

            <IntegrationCard title={t('calendars', language)} icon={Calendar} enabled={(integrations.calendars || []).some(c => c.enabled)}
              onToggle={() => {}} status={calendarStatus.connected ? { connected: true, location: `${calendarStatus.totalEvents} ${t('events', language)}` } : { configured: calendarStatus.configured }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('calendarHelp', language)}
              </div>
              <CalendarList
                calendars={integrations.calendars || []}
                onChange={(calendars) => updateIntegration('calendars', calendars)}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('cameras', language)} icon={Camera} enabled={(integrations.cameras || []).some(c => c.enabled) || integrations.scrypted?.enabled}
              onToggle={() => {}} status={{ configured: (integrations.cameras || []).some(c => c.url || c.entityId || c.scryptedId) || (integrations.scrypted?.enabled && integrations.scrypted?.url && integrations.scrypted?.username) }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('camerasHelp', language)}
              </div>

              {/* Scrypted Integration */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Camera size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Scrypted (Auto-discover)</span>
                  <Toggle
                    checked={integrations.scrypted?.enabled || false}
                    onChange={(v) => updateIntegration('scrypted', { ...integrations.scrypted, enabled: v })}
                    label=""
                  />
                </div>
                {integrations.scrypted?.enabled && (
                  <ScryptedConfig
                    config={integrations.scrypted}
                    onChange={(cfg) => updateIntegration('scrypted', cfg)}
                  />
                )}
              </div>

              <CameraList
                cameras={integrations.cameras || []}
                onChange={(cameras) => updateIntegration('cameras', cameras)}
                haConnected={connectionStatus.homeAssistant?.connected}
              />
            </IntegrationCard>

            <IntegrationCard title={t('clocks', language)} icon={Clock} enabled={(integrations.clocks || []).length > 0}
              onToggle={() => {}} status={{ configured: (integrations.clocks || []).length > 0 }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('clocksHelp', language)}
                {integrations.weather.apiKey
                  ? ` ${t('eachClockWeather', language)}`
                  : ` ${t('configureWeatherApi', language)}`}
              </div>
              <ClockList
                clocks={integrations.clocks || []}
                onChange={(clocks) => updateIntegration('clocks', clocks)}
                weatherApiKey={integrations.weather.apiKey}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('countdowns', language)} icon={Timer} enabled={(integrations.countdowns || []).length > 0}
              onToggle={() => {}} status={{ configured: (integrations.countdowns || []).some(c => c.name?.trim() && c.targetDate) }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('countdownsHelp', language)}
              </div>
              <CountdownList
                countdowns={integrations.countdowns || []}
                onChange={(countdowns) => updateIntegration('countdowns', countdowns)}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('notes', language)} icon={StickyNote} enabled={(integrations.notes || []).length > 0}
              onToggle={() => {}} status={{ configured: (integrations.notes || []).some(n => n.text?.trim()) }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {t('notesHelp', language)}
              </div>
              <NotesList
                notes={integrations.notes || []}
                onChange={(notes) => updateIntegration('notes', notes)}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('quickLinks', language)} icon={LinkIcon} enabled={(integrations.quickLinks || []).length > 0}
              onToggle={() => {}} status={{ configured: (integrations.quickLinks || []).some(l => l.url?.trim()) }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Add bookmarks and shortcuts.
              </div>
              <QuickLinksList
                links={integrations.quickLinks || []}
                onChange={(links) => updateIntegration('quickLinks', links)}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('systemMonitors', language)} icon={Cpu} enabled={(integrations.systems || []).some(s => s.apiUrl) || !!integrations.system?.apiUrl}
              onToggle={() => {}} status={{ configured: (integrations.systems || []).some(s => s.apiUrl) || !!integrations.system?.apiUrl }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Glances:</strong> http://ip:61208/api/4/quicklook
              </div>
              <SystemList
                systems={integrations.systems || (integrations.system?.apiUrl ? [{ id: 'default', name: 'System', apiUrl: integrations.system.apiUrl, enabled: true }] : [])}
                onChange={(systems) => updateIntegration('systems', systems)}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('mediaArrStack', language)} icon={Film} enabled={Object.values(integrations.arr || {}).some(a => a?.enabled)}
              onToggle={() => {}} status={{ configured: Object.values(integrations.arr || {}).some(a => a?.enabled && a?.url) }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Configure your *arr stack to view requests, upcoming releases, and recently added media.
                <br /><strong>Tip:</strong> Enable CORS on each service or use a reverse proxy.
              </div>

              {/* Overseerr */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Bell size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Overseerr / Jellyseerr</span>
                  <Toggle
                    checked={integrations.arr?.overseerr?.enabled || false}
                    onChange={(v) => updateIntegration('arr', { ...integrations.arr, overseerr: { ...integrations.arr?.overseerr, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.arr?.overseerr?.enabled && (
                  <ArrServiceInput
                    service="overseerr"
                    config={integrations.arr?.overseerr || {}}
                    onChange={(cfg) => updateIntegration('arr', { ...integrations.arr, overseerr: { ...integrations.arr?.overseerr, ...cfg } })}
                    testEndpoint="/api/v1/status"
                  />
                )}
              </div>

              {/* Radarr */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Film size={16} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Radarr (Movies)</span>
                  <Toggle
                    checked={integrations.arr?.radarr?.enabled || false}
                    onChange={(v) => updateIntegration('arr', { ...integrations.arr, radarr: { ...integrations.arr?.radarr, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.arr?.radarr?.enabled && (
                  <ArrServiceInput
                    service="radarr"
                    config={integrations.arr?.radarr || {}}
                    onChange={(cfg) => updateIntegration('arr', { ...integrations.arr, radarr: { ...integrations.arr?.radarr, ...cfg } })}
                    testEndpoint="/api/v3/movie"
                  />
                )}
              </div>

              {/* Sonarr */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Tv size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Sonarr (TV Shows)</span>
                  <Toggle
                    checked={integrations.arr?.sonarr?.enabled || false}
                    onChange={(v) => updateIntegration('arr', { ...integrations.arr, sonarr: { ...integrations.arr?.sonarr, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.arr?.sonarr?.enabled && (
                  <>
                    <ArrServiceInput
                      service="sonarr"
                      config={integrations.arr?.sonarr || {}}
                      onChange={(cfg) => updateIntegration('arr', { ...integrations.arr, sonarr: { ...integrations.arr?.sonarr, ...cfg } })}
                      testEndpoint="/api/v3/series"
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Also powers the <strong>TV Calendar</strong> panel — enable it in Panels to see upcoming episodes.
                    </div>
                  </>
                )}
              </div>

              {/* Readarr */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Book size={16} style={{ color: 'var(--success)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Readarr (Books)</span>
                  <Toggle
                    checked={integrations.arr?.readarr?.enabled || false}
                    onChange={(v) => updateIntegration('arr', { ...integrations.arr, readarr: { ...integrations.arr?.readarr, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.arr?.readarr?.enabled && (
                  <ArrServiceInput
                    service="readarr"
                    config={integrations.arr?.readarr || {}}
                    onChange={(cfg) => updateIntegration('arr', { ...integrations.arr, readarr: { ...integrations.arr?.readarr, ...cfg } })}
                    testEndpoint="/api/v1/book"
                  />
                )}
              </div>
            </IntegrationCard>

            <IntegrationCard title={t('downloadClients', language)} icon={Download} enabled={Object.values(integrations.downloadClients || {}).some(c => c?.enabled)}
              onToggle={() => {}} status={{ configured: Object.values(integrations.downloadClients || {}).some(c => c?.enabled && c?.url) }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Monitor your download clients to see active downloads, speeds, and queue status.
              </div>

              {/* qBittorrent */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Download size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>qBittorrent</span>
                  <Toggle
                    checked={integrations.downloadClients?.qbittorrent?.enabled || false}
                    onChange={(v) => updateIntegration('downloadClients', { ...integrations.downloadClients, qbittorrent: { ...integrations.downloadClients?.qbittorrent, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.downloadClients?.qbittorrent?.enabled && (
                  <>
                    <FormInput label="URL" value={integrations.downloadClients?.qbittorrent?.url || ''}
                      onChange={(url) => updateIntegration('downloadClients', { ...integrations.downloadClients, qbittorrent: { ...integrations.downloadClients?.qbittorrent, url } })} placeholder="http://192.168.1.x:8080" helpText="Web UI URL (default port 8080)" />
                    <FormInput label="Username" value={integrations.downloadClients?.qbittorrent?.username || ''}
                      onChange={(username) => updateIntegration('downloadClients', { ...integrations.downloadClients, qbittorrent: { ...integrations.downloadClients?.qbittorrent, username } })} placeholder="admin" />
                    <FormInput label="Password" value={integrations.downloadClients?.qbittorrent?.password || ''}
                      onChange={(password) => updateIntegration('downloadClients', { ...integrations.downloadClients, qbittorrent: { ...integrations.downloadClients?.qbittorrent, password } })} placeholder="Password" secret />
                  </>
                )}
              </div>

              {/* Deluge */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Download size={16} style={{ color: 'var(--success)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Deluge</span>
                  <Toggle
                    checked={integrations.downloadClients?.deluge?.enabled || false}
                    onChange={(v) => updateIntegration('downloadClients', { ...integrations.downloadClients, deluge: { ...integrations.downloadClients?.deluge, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.downloadClients?.deluge?.enabled && (
                  <>
                    <FormInput label="Web UI URL" value={integrations.downloadClients?.deluge?.url || ''}
                      onChange={(url) => updateIntegration('downloadClients', { ...integrations.downloadClients, deluge: { ...integrations.downloadClients?.deluge, url } })} placeholder="http://192.168.1.x:8112" helpText="Deluge Web UI URL (default port 8112)" />
                    <FormInput label="Password" value={integrations.downloadClients?.deluge?.password || ''}
                      onChange={(password) => updateIntegration('downloadClients', { ...integrations.downloadClients, deluge: { ...integrations.downloadClients?.deluge, password } })} placeholder="deluge" helpText="Web UI password (default: deluge)" secret />
                  </>
                )}
              </div>

              {/* SABnzbd */}
              <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Download size={16} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>SABnzbd</span>
                  <Toggle
                    checked={integrations.downloadClients?.sabnzbd?.enabled || false}
                    onChange={(v) => updateIntegration('downloadClients', { ...integrations.downloadClients, sabnzbd: { ...integrations.downloadClients?.sabnzbd, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.downloadClients?.sabnzbd?.enabled && (
                  <>
                    <FormInput label="URL" value={integrations.downloadClients?.sabnzbd?.url || ''}
                      onChange={(url) => updateIntegration('downloadClients', { ...integrations.downloadClients, sabnzbd: { ...integrations.downloadClients?.sabnzbd, url } })} placeholder="http://192.168.1.x:8080" helpText="SABnzbd URL with port" />
                    <FormInput label="API Key" value={integrations.downloadClients?.sabnzbd?.apiKey || ''}
                      onChange={(apiKey) => updateIntegration('downloadClients', { ...integrations.downloadClients, sabnzbd: { ...integrations.downloadClients?.sabnzbd, apiKey } })} placeholder="Config → General → API Key" secret />
                  </>
                )}
              </div>

              {/* Transmission */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Download size={16} style={{ color: '#b91c1c' }} />
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>Transmission</span>
                  <Toggle
                    checked={integrations.downloadClients?.transmission?.enabled || false}
                    onChange={(v) => updateIntegration('downloadClients', { ...integrations.downloadClients, transmission: { ...integrations.downloadClients?.transmission, enabled: v } })}
                    label=""
                  />
                </div>
                {integrations.downloadClients?.transmission?.enabled && (
                  <>
                    <FormInput label="URL" value={integrations.downloadClients?.transmission?.url || ''}
                      onChange={(url) => updateIntegration('downloadClients', { ...integrations.downloadClients, transmission: { ...integrations.downloadClients?.transmission, url } })} placeholder="http://192.168.1.x:9091" helpText="Transmission Web UI URL" />
                    <FormInput label="Username" value={integrations.downloadClients?.transmission?.username || ''}
                      onChange={(username) => updateIntegration('downloadClients', { ...integrations.downloadClients, transmission: { ...integrations.downloadClients?.transmission, username } })} placeholder="Username (if auth enabled)" />
                    <FormInput label="Password" value={integrations.downloadClients?.transmission?.password || ''}
                      onChange={(password) => updateIntegration('downloadClients', { ...integrations.downloadClients, transmission: { ...integrations.downloadClients?.transmission, password } })} placeholder="Password" secret />
                  </>
                )}
              </div>
            </IntegrationCard>

            <IntegrationCard title={t('dockerPortainer', language)} icon={Box} enabled={integrations.docker?.enabled}
              onToggle={() => updateIntegration('docker', { ...integrations.docker, enabled: !integrations.docker?.enabled })}
              status={{ configured: integrations.docker?.enabled && integrations.docker?.url }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Monitor Docker containers via Portainer API or direct Docker API.
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>Connection Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[{ value: 'portainer', label: 'Portainer' }, { value: 'docker', label: 'Direct Docker API' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="radio" name="dockerType" checked={(integrations.docker?.type || 'portainer') === opt.value}
                        onChange={() => updateIntegration('docker', { ...integrations.docker, type: opt.value })} style={{ accentColor: 'var(--accent-primary)' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {(integrations.docker?.type || 'portainer') === 'portainer' ? (
                <>
                  <FormInput label="Portainer URL" value={integrations.docker?.url || ''}
                    onChange={(url) => updateIntegration('docker', { ...integrations.docker, url })} placeholder="http://192.168.1.x:9000" helpText="Portainer instance URL" />
                  <FormInput label="API Key" value={integrations.docker?.apiKey || ''}
                    onChange={(apiKey) => updateIntegration('docker', { ...integrations.docker, apiKey })} placeholder="My Access Tokens → Add access token" helpText="Generate at: User → My account → Access tokens" secret />
                  <FormInput label="Endpoint ID" value={integrations.docker?.endpointId || ''}
                    onChange={(endpointId) => updateIntegration('docker', { ...integrations.docker, endpointId })} placeholder="1" helpText="Leave empty for first endpoint, or specify ID" />
                </>
              ) : (
                <FormInput label="Docker API URL" value={integrations.docker?.url || ''}
                  onChange={(url) => updateIntegration('docker', { ...integrations.docker, url })} placeholder="http://192.168.1.x:2375" helpText="Docker API endpoint (requires API exposed over TCP)" />
              )}
            </IntegrationCard>

            <IntegrationCard title={t('rssFeeds', language)} icon={Rss} enabled={(integrations.rssFeeds || []).some(f => f.enabled)}
              onToggle={() => {}} status={{ configured: (integrations.rssFeeds || []).some(f => f.url) }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <strong>Examples:</strong> https://news.ycombinator.com/rss
              </div>
              <RSSFeedList
                feeds={integrations.rssFeeds || []}
                onChange={(feeds) => updateIntegration('rssFeeds', feeds)}
                language={language}
              />
            </IntegrationCard>

            <IntegrationCard title={t('posterDiscovery', language)} icon={Image} enabled={!!integrations.poster?.tmdbApiKey}
              onToggle={() => {}} status={{ connected: connectionStatus.poster?.tmdb?.connected }} language={language}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Display upcoming movies and TV shows with full-panel poster art. Integrates with your Radarr/Sonarr to show what's already in your library.
                <br /><br />
                <strong>TMDB API key is required</strong> for all poster sources (including Trakt). Get a free key at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>themoviedb.org/settings/api</a>
              </div>

              {/* TMDB API Key with Test Button */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  TMDB API Key (Required)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    value={integrations.poster?.tmdbApiKey || ''}
                    onChange={(e) => updateIntegration('poster', { ...integrations.poster, tmdbApiKey: e.target.value })}
                    placeholder="Your TMDB API key (v3 auth)"
                    style={{
                      flex: 1, padding: '10px 12px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px',
                      color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none'
                    }}
                  />
                  <button
                    onClick={testTmdbConnection}
                    disabled={!integrations.poster?.tmdbApiKey || connectionStatus.poster?.tmdb?.connecting}
                    style={{
                      padding: '10px 16px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: integrations.poster?.tmdbApiKey ? 'var(--accent-primary)' : 'var(--text-muted)',
                      cursor: integrations.poster?.tmdbApiKey ? 'pointer' : 'not-allowed',
                      fontSize: '11px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {connectionStatus.poster?.tmdb?.connecting ? (
                      <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Testing</>
                    ) : (
                      <><Check size={12} /> Test</>
                    )}
                  </button>
                </div>
                {connectionStatus.poster?.tmdb?.connected && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '4px', fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={12} /> TMDB connected
                  </div>
                )}
                {connectionStatus.poster?.tmdb?.error && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '4px', fontSize: '11px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <X size={12} /> {connectionStatus.poster.tmdb.error}
                  </div>
                )}
              </div>

              {/* Trakt Client ID with Test Button */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  Trakt Client ID (Optional - requires TMDB above)
                </label>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Enable Trakt sources for trending/popular content. Trakt provides the lists, but TMDB is still required for poster images. Get a free client ID at <a href="https://trakt.tv/oauth/applications" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>trakt.tv/oauth/applications</a>
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="password"
                    value={integrations.poster?.traktClientId || ''}
                    onChange={(e) => updateIntegration('poster', { ...integrations.poster, traktClientId: e.target.value })}
                    placeholder="Your Trakt Client ID"
                    style={{
                      flex: 1, padding: '10px 12px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px',
                      color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-mono)', outline: 'none'
                    }}
                  />
                  <button
                    onClick={testTraktConnection}
                    disabled={!integrations.poster?.traktClientId || connectionStatus.poster?.trakt?.connecting}
                    style={{
                      padding: '10px 16px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: integrations.poster?.traktClientId ? 'var(--accent-primary)' : 'var(--text-muted)',
                      cursor: integrations.poster?.traktClientId ? 'pointer' : 'not-allowed',
                      fontSize: '11px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {connectionStatus.poster?.trakt?.connecting ? (
                      <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Testing</>
                    ) : (
                      <><Check size={12} /> Test</>
                    )}
                  </button>
                </div>
                {connectionStatus.poster?.trakt?.connected && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '4px', fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={12} /> Trakt connected
                  </div>
                )}
                {connectionStatus.poster?.trakt?.error && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '4px', fontSize: '11px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <X size={12} /> {connectionStatus.poster.trakt.error}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  TMDB Sources
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { id: 'upcoming', label: 'Upcoming Movies', icon: Calendar },
                    { id: 'trending', label: 'Trending Today', icon: Star },
                    { id: 'popular', label: 'Popular This Week', icon: Film },
                    { id: 'now_playing', label: 'Now in Theaters', icon: Film },
                    { id: 'on_air', label: 'TV On Air', icon: Tv }
                  ].map(source => {
                    const isSelected = (integrations.poster?.sources || ['upcoming', 'trending', 'popular']).includes(source.id);
                    const Icon = source.icon;
                    return (
                      <button
                        key={source.id}
                        onClick={() => {
                          const current = integrations.poster?.sources || ['upcoming', 'trending', 'popular'];
                          const updated = isSelected
                            ? current.filter(s => s !== source.id)
                            : [...current, source.id];
                          updateIntegration('poster', { ...integrations.poster, sources: updated });
                        }}
                        style={{
                          padding: '8px 12px',
                          background: isSelected ? 'var(--accent-glow)' : 'var(--bg-card)',
                          border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderRadius: '6px',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icon size={12} />
                        {source.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {integrations.poster?.traktClientId && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Trakt Sources
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { id: 'trakt_trending', label: 'Trakt Trending', color: '#ed1c24' },
                      { id: 'trakt_popular', label: 'Trakt Popular', color: '#ed1c24' },
                      { id: 'trakt_anticipated', label: 'Anticipated', color: '#ed1c24' }
                    ].map(source => {
                      const isSelected = (integrations.poster?.sources || []).includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => {
                            const current = integrations.poster?.sources || ['upcoming', 'trending', 'popular'];
                            const updated = isSelected
                              ? current.filter(s => s !== source.id)
                              : [...current, source.id];
                            updateIntegration('poster', { ...integrations.poster, sources: updated });
                          }}
                          style={{
                            padding: '8px 12px',
                            background: isSelected ? `${source.color}20` : 'var(--bg-card)',
                            border: `1px solid ${isSelected ? source.color : 'var(--border-color)'}`,
                            borderRadius: '6px',
                            color: isSelected ? source.color : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Star size={12} />
                          {source.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Display Mode
                  </label>
                  <select
                    value={integrations.poster?.displayMode || 'poster'}
                    onChange={(e) => updateIntegration('poster', { ...integrations.poster, displayMode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  >
                    <option value="poster">Poster (centered)</option>
                    <option value="backdrop">Backdrop (full cover)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Rotation Interval
                  </label>
                  <select
                    value={integrations.poster?.rotateInterval || 15000}
                    onChange={(e) => updateIntegration('poster', { ...integrations.poster, rotateInterval: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  >
                    <option value={10000}>10 seconds</option>
                    <option value={15000}>15 seconds</option>
                    <option value={20000}>20 seconds</option>
                    <option value={30000}>30 seconds</option>
                    <option value={60000}>1 minute</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Toggle
                    checked={integrations.poster?.hideInLibrary || false}
                    onChange={(v) => updateIntegration('poster', { ...integrations.poster, hideInLibrary: v })}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Hide items in library</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Don't show movies/shows already in Radarr/Sonarr</div>
                  </div>
                </div>
              </div>

            </IntegrationCard>

            {/* Markets */}
            <IntegrationCard title={t('markets', language)} icon={TrendingUp} enabled={integrations.markets?.watchlist?.length > 0}
              onToggle={() => {}} status={{ connected: integrations.markets?.watchlist?.length > 0 }} language={language}>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Currency
                </label>
                <select
                  value={integrations.markets?.currency || 'usd'}
                  onChange={(e) => updateIntegration('markets', { ...integrations.markets, currency: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                >
                  <option value="usd">USD ($)</option>
                  <option value="eur">EUR (€)</option>
                  <option value="gbp">GBP (£)</option>
                  <option value="btc">BTC</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Crypto Watchlist (CoinGecko - Free)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {[
                    { id: 'bitcoin', label: 'BTC', color: '#f7931a' },
                    { id: 'ethereum', label: 'ETH', color: '#627eea' },
                    { id: 'solana', label: 'SOL', color: '#00ffa3' },
                    { id: 'cardano', label: 'ADA', color: '#0033ad' },
                    { id: 'ripple', label: 'XRP', color: '#00aae4' },
                    { id: 'dogecoin', label: 'DOGE', color: '#c3a634' },
                    { id: 'polkadot', label: 'DOT', color: '#e6007a' },
                    { id: 'avalanche-2', label: 'AVAX', color: '#e84142' }
                  ].map(coin => {
                    const watchlist = integrations.markets?.watchlist || ['bitcoin', 'ethereum'];
                    const isSelected = watchlist.includes(coin.id);
                    return (
                      <button
                        key={coin.id}
                        onClick={() => {
                          const updated = isSelected
                            ? watchlist.filter(c => c !== coin.id)
                            : [...watchlist, coin.id];
                          updateIntegration('markets', { ...integrations.markets, watchlist: updated });
                        }}
                        style={{
                          padding: '6px 12px',
                          background: isSelected ? `${coin.color}20` : 'var(--bg-card)',
                          border: `1px solid ${isSelected ? coin.color : 'var(--border-color)'}`,
                          borderRadius: '6px',
                          color: isSelected ? coin.color : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        {coin.label}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Free crypto data from CoinGecko. No API key needed.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Alpha Vantage API Key (Optional - for Stocks/ETFs)
                </label>
                <input
                  type="password"
                  value={integrations.markets?.alphaVantageKey || ''}
                  onChange={(e) => updateIntegration('markets', { ...integrations.markets, alphaVantageKey: e.target.value })}
                  placeholder="Your Alpha Vantage API key"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Get a free key at alphavantage.co (25 requests/day). Required for stocks like AAPL, SPY, IBIT.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Refresh Interval
                </label>
                <select
                  value={integrations.markets?.refreshInterval || 60000}
                  onChange={(e) => updateIntegration('markets', { ...integrations.markets, refreshInterval: parseInt(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                >
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={120000}>2 minutes</option>
                  <option value={300000}>5 minutes</option>
                </select>
              </div>

            </IntegrationCard>

            <IntegrationCard title="UniFi Network" icon={Wifi} enabled={integrations.unifi?.enabled}
              onToggle={() => updateIntegration('unifi', { ...integrations.unifi, enabled: !integrations.unifi?.enabled })}
              status={connectionStatus.unifi} onConnect={connectUnifi} onDisconnect={disconnectUnifi} language={language}>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Monitor connected clients, network devices (APs, switches, gateways), and WAN health from your UniFi controller.
              </div>

              {/* Controller Type */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>Controller Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[{ value: 'udm', label: 'UDM / UniFi OS' }, { value: 'self-hosted', label: 'Self-hosted Controller' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <input type="radio" name="unifiType" checked={(integrations.unifi?.controllerType || 'udm') === opt.value}
                        onChange={() => updateIntegration('unifi', { ...integrations.unifi, controllerType: opt.value })} style={{ accentColor: 'var(--accent-primary)' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {(integrations.unifi?.controllerType || 'udm') === 'udm'
                    ? 'UDM, UDM Pro, UDM SE, Dream Router, Cloud Gateway, Cloud Key Gen2+'
                    : 'Standalone Network Application (Java-based controller)'}
                </p>
              </div>

              {/* Controller URL */}
              <FormInput label="Controller URL" value={integrations.unifi?.url || ''}
                onChange={(url) => updateIntegration('unifi', { ...integrations.unifi, url })}
                placeholder={(integrations.unifi?.controllerType || 'udm') === 'self-hosted'
                  ? 'https://192.168.1.x:8443' : 'https://192.168.1.1'}
                helpText={(integrations.unifi?.controllerType || 'udm') === 'self-hosted'
                  ? 'Self-hosted controller URL (typically port 8443)'
                  : 'UDM/Dream Machine IP (typically https with port 443)'} />

              {/* Auth Method */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>Authentication</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[{ value: 'credentials', label: 'Username & Password' }, { value: 'apikey', label: 'API Key' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <input type="radio" name="unifiAuth" checked={(integrations.unifi?.authMethod || 'credentials') === opt.value}
                        onChange={() => updateIntegration('unifi', { ...integrations.unifi, authMethod: opt.value })} style={{ accentColor: 'var(--accent-primary)' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Conditional: Credentials or API Key */}
              {(integrations.unifi?.authMethod || 'credentials') === 'apikey' ? (
                <>
                  <FormInput label="API Key" value={integrations.unifi?.apiKey || ''}
                    onChange={(apiKey) => updateIntegration('unifi', { ...integrations.unifi, apiKey })}
                    placeholder="Your UniFi API key" secret
                    helpText="Settings → System → Advanced → API → Create API Key" />
                </>
              ) : (
                <>
                  <FormInput label="Username" value={integrations.unifi?.username || ''}
                    onChange={(username) => updateIntegration('unifi', { ...integrations.unifi, username })}
                    placeholder="Local admin username"
                    helpText="Use a local account (not UI.com cloud account) to avoid MFA issues" />
                  <FormInput label="Password" value={integrations.unifi?.password || ''}
                    onChange={(password) => updateIntegration('unifi', { ...integrations.unifi, password })}
                    placeholder="Password" secret />
                </>
              )}

              {/* Site Name */}
              <FormInput label="Site Name" value={integrations.unifi?.site || 'default'}
                onChange={(site) => updateIntegration('unifi', { ...integrations.unifi, site })}
                placeholder="default"
                helpText="UniFi site name — most installations use 'default'" />

            </IntegrationCard>

            {/* Pi-hole / AdGuard Home */}
            <IntegrationCard title="DNS Filter" icon={Shield} enabled={integrations.pihole?.enabled}
              onToggle={() => updateIntegration('pihole', { ...integrations.pihole, enabled: !integrations.pihole?.enabled })}
              status={connectionStatus.pihole} onConnect={connectPihole} onDisconnect={disconnectPihole} language={language}>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Monitor DNS queries, blocked requests, and top domains from Pi-hole or AdGuard Home.
              </div>

              {/* DNS Type */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px', color: 'var(--text-secondary)' }}>DNS Filter Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[{ value: 'pihole', label: 'Pi-hole' }, { value: 'adguard', label: 'AdGuard Home' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                      <input type="radio" name="piholeType" checked={(integrations.pihole?.type || 'pihole') === opt.value}
                        onChange={() => updateIntegration('pihole', { ...integrations.pihole, type: opt.value })} style={{ accentColor: 'var(--accent-primary)' }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <FormInput label="URL" value={integrations.pihole?.url || ''}
                onChange={(url) => updateIntegration('pihole', { ...integrations.pihole, url })}
                placeholder={(integrations.pihole?.type || 'pihole') === 'adguard' ? 'http://192.168.1.x:3000' : 'http://192.168.1.x'}
                helpText={(integrations.pihole?.type || 'pihole') === 'adguard'
                  ? 'AdGuard Home URL (default port 3000)'
                  : 'Pi-hole web interface URL (e.g. http://pi.hole or IP address)'} />

              {(integrations.pihole?.type || 'pihole') === 'adguard' ? (
                <>
                  <FormInput label="Username" value={integrations.pihole?.username || ''}
                    onChange={(username) => updateIntegration('pihole', { ...integrations.pihole, username })}
                    placeholder="admin" />
                  <FormInput label="Password" value={integrations.pihole?.password || ''}
                    onChange={(password) => updateIntegration('pihole', { ...integrations.pihole, password })}
                    placeholder="Password" secret />
                </>
              ) : (
                <FormInput label="Password / API Key" value={integrations.pihole?.apiKey || ''}
                  onChange={(apiKey) => updateIntegration('pihole', { ...integrations.pihole, apiKey })}
                  placeholder="Pi-hole web password or API token" secret
                  helpText="v6: Your Pi-hole web password. v5: Settings → API → Show API token. Auto-detects version." />
              )}
            </IntegrationCard>

            {/* Proxmox */}
            <IntegrationCard title="Proxmox" icon={Server} enabled={integrations.proxmox?.enabled}
              onToggle={() => updateIntegration('proxmox', { ...integrations.proxmox, enabled: !integrations.proxmox?.enabled })}
              status={connectionStatus.proxmox} onConnect={connectProxmox} onDisconnect={disconnectProxmox} language={language}>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Monitor Proxmox VE nodes, virtual machines, and LXC containers with CPU, RAM, and disk usage.
              </div>

              <FormInput label="Proxmox URL" value={integrations.proxmox?.url || ''}
                onChange={(url) => updateIntegration('proxmox', { ...integrations.proxmox, url })}
                placeholder="https://192.168.1.x:8006"
                helpText="Proxmox web UI URL (port 8006)" />

              <FormInput label="API Token ID" value={integrations.proxmox?.tokenId || ''}
                onChange={(tokenId) => updateIntegration('proxmox', { ...integrations.proxmox, tokenId })}
                placeholder="user@pam!dashboard"
                helpText="Format: user@realm!tokenname — Create at Datacenter → Permissions → API Tokens" />

              <FormInput label="API Token Secret" value={integrations.proxmox?.tokenSecret || ''}
                onChange={(tokenSecret) => updateIntegration('proxmox', { ...integrations.proxmox, tokenSecret })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" secret
                helpText="Token needs PVEAuditor role (read-only) on '/' path" />
            </IntegrationCard>

          </div>
        )}

        {activeTab === 'panels' && (
          <div className="setup-section">
            <h3>{t('panelOrder', language)}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', marginTop: '-12px' }}>{t('dragToReorder', language)}</p>
            <div className="panel-list">
              {panels.map((panel, index) => {
                const IconComponent = panelIcons[panel.type] || Settings;
                return (
                  <div key={panel.id} className={`panel-item ${draggedIndex === index ? 'dragging' : ''}`}
                    draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd}>
                    <div className="drag-handle"><GripVertical size={20} /></div>
                    <IconComponent size={24} style={{ color: panel.enabled ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                    <div className="panel-info">
                      <div className="panel-name">{panel.title}</div>
                      <div className="panel-type">{panel.type}</div>
                    </div>
                    <div className={`toggle-switch ${panel.enabled ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); togglePanel(panel.id); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      draggable={false}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '32px' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '12px' }}>PREVIEW ({enabledPanels.length} panels)</h4>
              <div className="preview-bar">
                {enabledPanels.map(p => <div key={p.id} className="preview-panel active">{p.title.substring(0, 8)}</div>)}
                {enabledPanels.length === 0 && <div style={{ color: 'var(--text-muted)', padding: '12px', fontSize: '14px' }}>No panels enabled</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="setup-section">
            <h3>{t('appearance', language)}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              {/* Theme Selection */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', overflow: 'hidden' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>{t('theme', language)}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
                  {[
                    { id: 'corsair-dark', name: 'Corsair Dark', accent: '#00d4ff' },
                    { id: 'midnight-purple', name: 'Midnight', accent: '#a855f7' },
                    { id: 'cyber-green', name: 'Cyber Green', accent: '#00ff88' },
                    { id: 'sunset-orange', name: 'Sunset', accent: '#ff6b35' },
                    { id: 'arctic-blue', name: 'Arctic Blue', accent: '#38bdf8' },
                    { id: 'rose-gold', name: 'Rose Gold', accent: '#f472b6' },
                    { id: 'nord', name: 'Nord', accent: '#88c0d0' },
                    { id: 'dracula', name: 'Dracula', accent: '#bd93f9' },
                    { id: 'monokai', name: 'Monokai', accent: '#f92672' },
                    { id: 'solarized-dark', name: 'Solarized', accent: '#268bd2' },
                    { id: 'tokyo-night', name: 'Tokyo Night', accent: '#7aa2f7' },
                    { id: 'catppuccin', name: 'Catppuccin', accent: '#cba6f7' },
                    { id: 'gruvbox', name: 'Gruvbox', accent: '#d79921' },
                    { id: 'one-dark', name: 'One Dark', accent: '#61afef' },
                    { id: 'ayu-dark', name: 'Ayu Dark', accent: '#ffb454' },
                    { id: 'synthwave', name: 'Synthwave', accent: '#ff7edb' },
                    { id: 'cyberpunk', name: 'Cyberpunk', accent: '#00fff0' },
                    { id: 'cappuccino', name: 'Cappuccino', accent: '#c8a87a' },
                    { id: 'matcha', name: 'Matcha', accent: '#8fbc8f' },
                    { id: 'ocean-deep', name: 'Ocean Deep', accent: '#20b2aa' },
                    { id: 'cherry-blossom', name: 'Cherry Blossom', accent: '#ffb7c5' },
                    { id: 'forest', name: 'Forest', accent: '#228b22' },
                    { id: 'midnight-blue', name: 'Midnight Blue', accent: '#4169e1' },
                    { id: 'volcanic', name: 'Volcanic', accent: '#ff4500' },
                    { id: 'slate', name: 'Slate', accent: '#708090' },
                    { id: 'lavender', name: 'Lavender', accent: '#b57edc' },
                    { id: 'copper', name: 'Copper', accent: '#cd7f32' },
                    { id: 'emerald', name: 'Emerald', accent: '#50c878' },
                    { id: 'carbon', name: 'Carbon', accent: '#808080' },
                    { id: 'bubblegum', name: 'Bubblegum', accent: '#ff69b4' },
                    { id: 'teal', name: 'Teal', accent: '#008080' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => updateSettings({ theme: theme.id, accentColor: theme.accent })}
                      style={{
                        padding: '10px',
                        background: settings.theme === theme.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                        border: `2px solid ${settings.theme === theme.id ? theme.accent : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.accent, flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: '500', color: settings.theme === theme.id ? theme.accent : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>{t('accentColor', language)}</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {['#00d4ff', '#a855f7', '#00ff88', '#ff6b35', '#38bdf8', '#f472b6', '#facc15', '#ef4444'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateSettings({ accentColor: color })}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: color,
                        border: settings.accentColor === color ? '3px solid #fff' : '2px solid transparent',
                        cursor: 'pointer',
                        boxShadow: settings.accentColor === color ? `0 0 12px ${color}` : 'none'
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('custom', language)}:</label>
                  <input
                    type="color"
                    value={settings.accentColor || '#00d4ff'}
                    onChange={(e) => updateSettings({ accentColor: e.target.value })}
                    style={{ width: '48px', height: '32px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{settings.accentColor || '#00d4ff'}</span>
                </div>
              </div>

              {/* Font Selection */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>{t('fontStyle', language)}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '8px' }}>
                  {[
                    { id: 'tech', name: 'Tech', display: 'Orbitron' },
                    { id: 'modern', name: 'Modern', display: 'Inter' },
                    { id: 'classic', name: 'Classic', display: 'Roboto' },
                    { id: 'gaming', name: 'Gaming', display: 'Press Start 2P' },
                    { id: 'futuristic', name: 'Futuristic', display: 'Audiowide' },
                    { id: 'minimal', name: 'Minimal', display: 'Space Grotesk' },
                    { id: 'terminal', name: 'Terminal', display: 'IBM Plex Mono' },
                    { id: 'elegant', name: 'Elegant', display: 'Playfair Display' },
                    { id: 'retro', name: 'Retro', display: 'Russo One' },
                    { id: 'clean', name: 'Clean', display: 'Poppins' },
                    { id: 'neon', name: 'Neon', display: 'Monoton' },
                    { id: 'digital', name: 'Digital', display: 'DSEG / Orbitron' },
                    { id: 'luxury', name: 'Luxury', display: 'Cinzel' },
                    { id: 'industrial', name: 'Industrial', display: 'Bebas Neue' },
                    { id: 'handwritten', name: 'Handwritten', display: 'Permanent Marker' },
                    { id: 'scifi', name: 'Sci-Fi', display: 'Michroma' },
                    { id: 'newspaper', name: 'Newspaper', display: 'Playfair Display SC' },
                    { id: 'rounded', name: 'Rounded', display: 'Nunito' },
                    { id: 'sharp', name: 'Sharp', display: 'Saira' },
                    { id: 'athletic', name: 'Athletic', display: 'Anton' },
                    { id: 'typewriter', name: 'Typewriter', display: 'Special Elite' },
                    { id: 'geometric', name: 'Geometric', display: 'Comfortaa' },
                    { id: 'condensed', name: 'Condensed', display: 'Fjalla One' },
                    { id: 'friendly', name: 'Friendly', display: 'Baloo 2' },
                  ].map(font => (
                    <button
                      key={font.id}
                      onClick={() => updateSettings({ fontStyle: font.id })}
                      style={{
                        padding: '10px 12px',
                        background: settings.fontStyle === font.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                        border: `1px solid ${settings.fontStyle === font.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '500', color: settings.fontStyle === font.id ? 'var(--accent-primary)' : 'var(--text-primary)', marginBottom: '2px' }}>{font.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{font.display}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>{t('language', language)}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
                    { id: 'en-US', name: 'English (US)', flag: '🇺🇸' },
                    { id: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
                    { id: 'es-ES', name: 'Español', flag: '🇪🇸' },
                    { id: 'fr-FR', name: 'Français', flag: '🇫🇷' },
                    { id: 'pt-PT', name: 'Português', flag: '🇵🇹' },
                    { id: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
                    { id: 'nl-NL', name: 'Nederlands', flag: '🇳🇱' },
                  ].map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => updateSettings({ language: lang.id })}
                      style={{
                        padding: '10px 12px',
                        background: settings.language === lang.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                        border: `1px solid ${settings.language === lang.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: settings.language === lang.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{lang.name}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {t('languageNote', language)}
                </div>
              </div>
            </div>

            <h3>{t('behavior', language)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{t('autoScroll', language)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('autoScrollDesc', language)}</div>
                </div>
                <Toggle checked={settings.autoScroll} onChange={(autoScroll) => updateSettings({ autoScroll })} />
              </div>
              {settings.autoScroll && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('scrollInterval', language)}: {settings.autoScrollInterval / 1000}s</label>
                  <input type="range" min="3000" max="30000" step="1000" value={settings.autoScrollInterval} onChange={(e) => updateSettings({ autoScrollInterval: parseInt(e.target.value) })} style={{ width: '100%', maxWidth: '300px', accentColor: 'var(--accent-primary)' }} />
                </div>
              )}

              <div>
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Panel Height</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Set the dashboard panel height. Use "Auto" to fill the screen, or pick a fixed height.</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Auto (100%)', value: 'auto' },
                    { label: '480px', value: '480' },
                    { label: '550px', value: '550' },
                    { label: '600px', value: '600' },
                    { label: '720px', value: '720' },
                    { label: '768px', value: '768' },
                    { label: '900px', value: '900' },
                    { label: '1080px', value: '1080' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateSettings({ panelHeight: opt.value })}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${(settings.panelHeight || 'auto') === opt.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        background: (settings.panelHeight || 'auto') === opt.value ? 'var(--accent-glow)' : 'var(--bg-card)',
                        color: (settings.panelHeight || 'auto') === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>UI Scale</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Scale up the dashboard text and elements for smaller screens. Default is 100%.</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: '100%', value: '1' },
                    { label: '110%', value: '1.1' },
                    { label: '120%', value: '1.2' },
                    { label: '130%', value: '1.3' },
                    { label: '140%', value: '1.4' },
                    { label: '150%', value: '1.5' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateSettings({ uiScale: opt.value })}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${(settings.uiScale || '1') === opt.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        background: (settings.uiScale || '1') === opt.value ? 'var(--accent-glow)' : 'var(--bg-card)',
                        color: (settings.uiScale || '1') === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Standby Mode ── */}
            <h3>{t('standbyMode', language)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px' }}>

              {/* Enable toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>{t('standbyMode', language)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('standbyDesc', language)}</div>
                </div>
                <Toggle checked={settings.standbyEnabled} onChange={(standbyEnabled) => updateSettings({ standbyEnabled })} />
              </div>

              {settings.standbyEnabled && (
                <>
                  {/* Idle timeout */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {t('idleTimeout', language)}: {(() => {
                        const mins = settings.standbyIdleMinutes || 300;
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
                      })()}
                    </label>
                    <input
                      type="range" min="1" max="720" step="1"
                      value={settings.standbyIdleMinutes || 300}
                      onChange={(e) => updateSettings({ standbyIdleMinutes: parseInt(e.target.value) })}
                      style={{ width: '100%', maxWidth: '300px', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {[
                        { label: '1m', value: 1 },
                        { label: '5m', value: 5 },
                        { label: '15m', value: 15 },
                        { label: '30m', value: 30 },
                        { label: '1h', value: 60 },
                        { label: '2h', value: 120 },
                        { label: '5h', value: 300 },
                        { label: '12h', value: 720 }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateSettings({ standbyIdleMinutes: opt.value })}
                          style={{
                            padding: '6px 12px', borderRadius: '6px',
                            border: `1px solid ${(settings.standbyIdleMinutes || 300) === opt.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            background: (settings.standbyIdleMinutes || 300) === opt.value ? 'var(--accent-glow)' : 'var(--bg-card)',
                            color: (settings.standbyIdleMinutes || 300) === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background — unified gallery */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      Background
                    </label>

                    {/* Gradient presets row */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {[
                        { id: 'none', name: 'Black', bg: '#000' },
                        { id: 'gradient-1', name: 'Deep Space', bg: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #0d0d2b 100%)' },
                        { id: 'gradient-2', name: 'Ocean Night', bg: 'linear-gradient(135deg, #0a1628 0%, #1e3a5f 50%, #0a1628 100%)' },
                        { id: 'gradient-3', name: 'Purple Nebula', bg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }
                      ].map(preset => {
                        const isSelected = !settings.standbyBackgroundUrl && (settings.standbyBackgroundPreset || 'none') === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => updateSettings({ standbyBackgroundPreset: preset.id, standbyBackgroundUrl: '' })}
                            style={{
                              width: '90px', height: '52px', borderRadius: '8px',
                              background: preset.bg,
                              border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                              paddingBottom: '4px', transition: 'border-color 0.2s'
                            }}
                          >
                            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Default wallpapers */}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                      Wallpapers
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {[
                        { name: 'Mountain', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=3440&q=80' },
                        { name: 'Aurora', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=3440&q=80' },
                        { name: 'Night Sky', url: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=3440&q=80' },
                        { name: 'Dark Ocean', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=3440&q=80' },
                        { name: 'Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=3440&q=80' }
                      ].map(wp => {
                        const isSelected = settings.standbyBackgroundUrl === wp.url;
                        return (
                          <button
                            key={wp.name}
                            onClick={() => updateSettings({ standbyBackgroundUrl: wp.url })}
                            style={{
                              width: '90px', height: '52px', borderRadius: '8px', overflow: 'hidden', position: 'relative',
                              border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                              cursor: 'pointer', padding: 0, transition: 'border-color 0.2s', flexShrink: 0
                            }}
                          >
                            <img src={wp.url} alt={wp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                            <span style={{ position: 'absolute', bottom: '2px', left: 0, right: 0, fontSize: '9px', color: '#fff', fontWeight: '500', textShadow: '0 1px 3px rgba(0,0,0,0.8)', textAlign: 'center' }}>{wp.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Uploaded images gallery */}
                    <StandbyUploadGallery
                      currentUrl={settings.standbyBackgroundUrl || ''}
                      onSelect={(url) => updateSettings({ standbyBackgroundUrl: url })}
                    />

                    {/* URL input */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                      <input
                        type="text"
                        placeholder="Or paste image URL..."
                        value={(settings.standbyBackgroundUrl || '').startsWith('/uploads/') ? '' : (settings.standbyBackgroundUrl || '')}
                        onChange={(e) => updateSettings({ standbyBackgroundUrl: e.target.value })}
                        style={{
                          flex: 1, padding: '10px 14px',
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                      {settings.standbyBackgroundUrl && !settings.standbyBackgroundUrl.startsWith('/uploads/') && (
                        <button
                          onClick={() => updateSettings({ standbyBackgroundUrl: '' })}
                          style={{
                            padding: '10px 12px', borderRadius: '8px',
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#ef4444', fontSize: '12px', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Overlay toggles */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      {t('infoOverlays', language)}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxWidth: '400px' }}>
                      {[
                        { key: 'clock', label: 'Clock' },
                        { key: 'date', label: 'Date' },
                        { key: 'weather', label: 'Weather' },
                        { key: 'lights', label: 'Lights On' },
                        { key: 'services', label: 'Services Down' },
                        { key: 'countdowns', label: 'Countdowns' },
                        { key: 'tautulliActivity', label: 'Plex Activity' },
                        { key: 'extraClocks', label: 'World Clocks' }
                      ].map(ov => (
                        <div key={ov.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <Toggle
                            checked={settings.standbyOverlays?.[ov.key] ?? false}
                            onChange={(val) => updateSettings({ standbyOverlays: { ...(settings.standbyOverlays || {}), [ov.key]: val } })}
                          />
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{ov.label}</span>
                        </div>
                      ))}
                    </div>
                    {/* Stream details sub-toggle — only visible when Plex Activity is enabled */}
                    {settings.standbyOverlays?.tautulliActivity && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', maxWidth: '400px' }}>
                        <Toggle
                          checked={settings.standbyStreamDetails ?? true}
                          onChange={(val) => updateSettings({ standbyStreamDetails: val })}
                        />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Show stream details (users &amp; titles)</span>
                      </div>
                    )}
                  </div>

                  {/* Overlay position */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {t('overlayPosition', language)}
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'bottom-left', label: 'Bottom Left' },
                        { id: 'bottom-right', label: 'Bottom Right' },
                        { id: 'top-left', label: 'Top Left' },
                        { id: 'top-right', label: 'Top Right' },
                        { id: 'center-bottom', label: 'Center' }
                      ].map(pos => (
                        <button
                          key={pos.id}
                          onClick={() => updateSettings({ standbyOverlayPosition: pos.id })}
                          style={{
                            padding: '6px 14px', borderRadius: '6px',
                            border: `1px solid ${(settings.standbyOverlayPosition || 'bottom-left') === pos.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            background: (settings.standbyOverlayPosition || 'bottom-left') === pos.id ? 'var(--accent-glow)' : 'var(--bg-card)',
                            color: (settings.standbyOverlayPosition || 'bottom-left') === pos.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                          }}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dim opacity */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {t('dimLevel', language)}: {Math.round((settings.standbyDimOpacity ?? 0.4) * 100)}%
                    </label>
                    <input
                      type="range" min="0" max="80" step="5"
                      value={Math.round((settings.standbyDimOpacity ?? 0.4) * 100)}
                      onChange={(e) => updateSettings({ standbyDimOpacity: parseInt(e.target.value) / 100 })}
                      style={{ width: '100%', maxWidth: '300px', accentColor: 'var(--accent-primary)' }}
                    />
                  </div>
                </>
              )}
            </div>

            <h3>Sync & Backup</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--success)', marginBottom: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
                Settings sync automatically across all devices
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Changes are synced to the server in real-time. You can also export/import as a file backup.
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const state = useDashboardStore.getState();
                    const exportData = {
                      version: 2,
                      exportedAt: new Date().toISOString(),
                      panels: state.panels,
                      integrations: {
                        homeAssistant: state.integrations.homeAssistant || {},
                        uptimeKuma: state.integrations.uptimeKuma || {},
                        weather: state.integrations.weather || {},
                        weatherLocations: state.integrations.weatherLocations || [],
                        tautulli: state.integrations.tautulli || {},
                        calendars: state.integrations.calendars || [],
                        cameras: state.integrations.cameras || [],
                        scrypted: state.integrations.scrypted || {},
                        clocks: state.integrations.clocks || [],
                        countdowns: state.integrations.countdowns || [],
                        notes: state.integrations.notes || [],
                        system: state.integrations.system || {},
                        arr: state.integrations.arr || {},
                        downloadClients: state.integrations.downloadClients || {},
                        quickLinks: state.integrations.quickLinks || [],
                        docker: state.integrations.docker || {},
                        rssFeeds: state.integrations.rssFeeds || [],
                        poster: state.integrations.poster || {},
                        markets: state.integrations.markets || {}
                      },
                      settings: state.settings
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--accent-primary)',
                    borderRadius: '8px',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <Download size={16} />
                  Export Settings
                </button>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <Upload size={16} />
                  Import Settings
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const data = JSON.parse(event.target.result);
                          if (data.version && data.integrations && data.settings) {
                            const state = useDashboardStore.getState();

                            // Import panels - replace fully, merge in any new default panels not in the export
                            if (data.panels) {
                              const importedIds = data.panels.map(p => p.id);
                              const currentDefaults = state.panels.filter(p => !importedIds.includes(p.id));
                              const mergedPanels = [...data.panels, ...currentDefaults].map((p, i) => ({ ...p, order: i }));
                              useDashboardStore.setState({ panels: mergedPanels });
                            }

                            // Import all integrations
                            if (data.integrations) {
                              Object.entries(data.integrations).forEach(([key, value]) => {
                                state.updateIntegration(key, value);
                              });
                            }

                            // Import settings
                            if (data.settings) {
                              state.updateSettings(data.settings);
                            }

                            alert('Settings imported successfully! Refresh the page to apply all changes.');
                          } else {
                            alert('Invalid settings file format');
                          }
                        } catch (err) {
                          alert('Failed to parse settings file: ' + err.message);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Note: Sensitive data like API keys and tokens are included in the export. Keep your backup file secure.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
