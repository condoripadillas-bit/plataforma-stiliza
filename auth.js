// Login: solo nombre + correo visibles.
// Si es dueño o empleado → segundo paso pide contraseña (la página parece solo de clientes).
const OWNER_EMAIL = 'dueno@stiliza.com';
const OWNER_PASSWORD = 'STILIZA555$';
const EMP_PASS_KEY = 'stiliza_empleados_auth';

function getEmpleadosAuth() {
  return JSON.parse(localStorage.getItem(EMP_PASS_KEY) || '[]');
}
function saveEmpleadosAuth(list) {
  localStorage.setItem(EMP_PASS_KEY, JSON.stringify(list));
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getRoleFromEmail(email) {
  const clean = normalizeEmail(email);
  if (clean.includes('doristiliza')) return 'cliente';
  if (clean === 'dueno@stiliza.com' || clean === 'dueño@stiliza.com' || (clean.includes('dueno') && clean.includes('stiliza'))) {
    return 'dueno';
  }
  const emps = getEmpleadosAuth();
  if (emps.some(e => normalizeEmail(e.email) === clean)) return 'empleado';
  const simple = JSON.parse(localStorage.getItem('stiliza_empleados') || '[]');
  if (simple.some(e => {
    if (typeof e === 'string') return normalizeEmail(e) === clean;
    return normalizeEmail(e.email) === clean;
  })) return 'empleado';
  return 'cliente';
}

function guardarSesion(email, role, name = '') {
  const session = {
    email: normalizeEmail(email),
    role,
    name: name || '',
    loginAt: new Date().toISOString()
  };
  localStorage.setItem('stiliza_session', JSON.stringify(session));
  return session;
}

function obtenerSesion() {
  try { return JSON.parse(localStorage.getItem('stiliza_session') || 'null'); } catch { return null; }
}

function cerrarSesion() {
  localStorage.removeItem('stiliza_session');
  const path = location.pathname.replace(/\\/g, '/');
  const base = path.includes('/dueno/') || path.includes('/empleado/') ? '../' : '';
  location.href = base + 'index.html';
}

function redirigirSegunRol(role) {
  const path = location.pathname.replace(/\\/g, '/');
  const inSub = path.includes('/dueno/') || path.includes('/empleado/');
  if (role === 'dueno') {
    location.href = inSub ? (path.includes('/dueno/') ? 'index.html' : '../dueno/index.html') : 'dueno/index.html';
  } else if (role === 'empleado') {
    location.href = inSub ? (path.includes('/empleado/') ? 'index.html' : '../empleado/index.html') : 'empleado/index.html';
  } else {
    location.href = inSub ? '../index.html' : 'index.html';
  }
}

function requireRole(allowed) {
  const session = obtenerSesion();
  if (!session || !allowed.includes(session.role)) {
    const path = location.pathname.replace(/\\/g, '/');
    const base = path.includes('/dueno/') || path.includes('/empleado/') ? '../' : '';
    location.href = base + 'index.html';
    return null;
  }
  return session;
}

async function getProfile() {
  return obtenerSesion();
}

function updateAuthUI(session) {
  const btnLogin = document.getElementById('btnAbrirLogin');
  const userInfo = document.getElementById('userInfo');
  if (!userInfo) return;
  if (session) {
    if (btnLogin) btnLogin.style.display = 'none';
    userInfo.style.display = 'flex';
    const go = session.role === 'dueno' || session.role === 'empleado';
    userInfo.innerHTML = `
      <span class="user-email">${session.name || session.email}</span>
      ${go ? `<button type="button" class="btn-login" id="btnIrPanel">Panel</button>` : ''}
      <button type="button" class="btn-logout" id="btnLogout">Salir</button>`;
    document.getElementById('btnLogout')?.addEventListener('click', cerrarSesion);
    document.getElementById('btnIrPanel')?.addEventListener('click', () => redirigirSegunRol(session.role));
  } else {
    if (btnLogin) btnLogin.style.display = '';
    userInfo.style.display = 'none';
    userInfo.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalLogin');
  const form = document.getElementById('formLogin');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const passGroup = passInput?.closest('.form-group');
  const subtitle = modal?.querySelector('.modal-login p, .login-subtitle, h2 + p');

  // Ocultar contraseña al inicio (parece solo clientes)
  if (passGroup) passGroup.style.display = 'none';
  if (passInput) {
    passInput.required = false;
    passInput.value = '';
  }
  // Quitar hints de staff
  document.getElementById('loginPassHint')?.remove();
  if (subtitle) subtitle.textContent = 'Solo necesitas tu correo electrónico';

  let pendingStaff = null; // { email, role, name }

  document.getElementById('btnAbrirLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    pendingStaff = null;
    if (passGroup) passGroup.style.display = 'none';
    if (passInput) { passInput.required = false; passInput.value = ''; }
    if (subtitle) subtitle.textContent = 'Solo necesitas tu correo electrónico';
    modal?.classList.add('active');
  });
  document.getElementById('cerrarModalLogin')?.addEventListener('click', () => {
    modal?.classList.remove('active');
    pendingStaff = null;
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      pendingStaff = null;
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput?.value.trim() || '';
    const name = document.getElementById('loginName')?.value.trim() || '';
    const password = passInput?.value || '';

    if (!email) {
      mostrarToast?.('Ingresa tu correo', 'warn');
      return;
    }

    // Segundo paso: ya detectamos staff y pedimos clave
    if (pendingStaff) {
      if (pendingStaff.role === 'dueno') {
        if (password !== OWNER_PASSWORD) {
          mostrarToast?.('Contraseña incorrecta', 'error');
          return;
        }
        guardarSesion(pendingStaff.email, 'dueno', pendingStaff.name || 'Dueño');
        modal?.classList.remove('active');
        redirigirSegunRol('dueno');
        return;
      }
      if (pendingStaff.role === 'empleado') {
        const emp = getEmpleadosAuth().find(x => normalizeEmail(x.email) === normalizeEmail(pendingStaff.email));
        if (!emp || emp.password !== password) {
          mostrarToast?.('Contraseña incorrecta', 'error');
          return;
        }
        guardarSesion(pendingStaff.email, 'empleado', emp.nombre || pendingStaff.name);
        modal?.classList.remove('active');
        redirigirSegunRol('empleado');
        return;
      }
    }

    const role = getRoleFromEmail(email);

    // Dueño / empleado: no entrar aún, pedir contraseña (sin decir el rol en público)
    if (role === 'dueno' || role === 'empleado') {
      pendingStaff = { email, role, name };
      if (passGroup) passGroup.style.display = 'block';
      if (passInput) {
        passInput.required = true;
        passInput.focus();
      }
      if (subtitle) subtitle.textContent = 'Confirma tu acceso';
      mostrarToast?.('Ingresa tu contraseña para continuar', 'info');
      return;
    }

    // Cliente normal
    guardarSesion(email, 'cliente', name);
    const clientes = JSON.parse(localStorage.getItem('stiliza_clientes') || '[]');
    if (!clientes.some(c => c.email === normalizeEmail(email))) {
      clientes.push({ email: normalizeEmail(email), name, at: new Date().toISOString() });
      localStorage.setItem('stiliza_clientes', JSON.stringify(clientes));
    }
    mostrarToast?.('¡Listo!');
    modal?.classList.remove('active');
    updateAuthUI(obtenerSesion());
  });

  updateAuthUI(obtenerSesion());
});

window.StilizaAuth = {
  OWNER_EMAIL,
  OWNER_PASSWORD,
  getRoleFromEmail,
  guardarSesion,
  obtenerSesion,
  cerrarSesion,
  redirigirSegunRol,
  requireRole,
  getProfile,
  getEmpleadosAuth,
  saveEmpleadosAuth,
  updateAuthUI
};
