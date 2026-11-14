import '../css/tokens.css';
import '../css/base.css';
import '../css/shell.css';
import '../css/auth.css';
import '../css/forecast-form.css';
import '../css/results.css';
import '../css/chart.css';
import '../css/feedback.css';
import '../css/responsive.css';

import { elements } from './dom.js';
import { initializeAuth, logout, startLogin } from './features/auth/auth.js';
import { bindForecastForm } from './features/forecast/forecast-controller.js';
import { bindNavigation } from './ui/navigation.js';

function bindAuthControls() {
  elements.headerLoginButton.addEventListener('click', startLogin);
  elements.authLoginButton.addEventListener('click', startLogin);
  elements.logoutButton.addEventListener('click', logout);
}

function startApplication() {
  bindAuthControls();
  bindForecastForm();
  bindNavigation();
  initializeAuth();
}

startApplication();
