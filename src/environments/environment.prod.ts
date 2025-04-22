export const environment = {
  production: true,
  apiUrl: '/api',
  cacheTTL: 300000, // 5 minutos en ms
  version: '1.0.0',
  defaultPaginationSize: 20,
  refreshTokenInterval: 840000, // 14 minutos en ms (para refrescar antes de los 15min)
  fileUploadSizeLimit: 10485760, // 10MB
  sessionTimeoutWarning: 840000, // 14 minutos en ms
  enableDebugLogs: false
};
