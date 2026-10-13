// Ponto de entrada: carrega os estilos globais e liga o app.
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/lists.css';
import { startApp } from './ui/app.js';

startApp(document.getElementById('app')).catch((e) => {
  console.error(e);
  document.getElementById('app').insertAdjacentHTML('afterbegin', '<p style="padding:16px">Não consegui iniciar o app. Recarregue a página.</p>');
});
