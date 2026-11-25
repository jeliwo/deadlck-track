/* login / register / account page. Talks to /api/auth/* through Auth.api (main.js) */
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

/* only go back to pages on this site (e.g. player.html?id=123), never to another website */
const next = (() => { const n = params.get('next') || ''; return /^[\w-]+\.html(\?[\w=&%.-]*)?$/i.test(n) ? n : 'index.html'; })();

let mode = 'login';
function setMode(m) {
  mode = m;
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
  document.querySelectorAll('[data-only="register"]').forEach(el => el.hidden = m !== 'register');
  $('auth-title').textContent = m === 'login' ? 'Log in' : 'Create account';
  $('auth-submit').textContent = m === 'login' ? 'Log in' : 'Register';
  $('auth-form').password.autocomplete = m === 'login' ? 'current-password' : 'new-password';
  $('auth-error').textContent = '';
}
document.querySelectorAll('.tabs .tab').forEach(t => t.onclick = () => setMode(t.dataset.mode));
setMode(params.get('mode') === 'register' ? 'register' : 'login');

$('auth-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, err = $('auth-error'), btn = $('auth-submit');
  err.textContent = '';
  const body = { email: f.email.value.trim(), password: f.password.value };
  if (mode === 'register') body.username = f.username.value.trim();
  btn.disabled = true;
  try {
    const { token, user } = await Auth.api(mode === 'login' ? '/api/auth/login' : '/api/auth/register', { method: 'POST', body });
    Auth.set(token, user);
    location.href = next;
  } catch (ex) {
    err.textContent = ex.details ? Object.values(ex.details).join(' · ') : (ex.message === 'Failed to fetch' ? 'Cannot reach the server. Is it running?' : ex.message);
    btn.disabled = false;
  }
};

/* ---- account view (when already logged in) ---- */
async function showAccount() {
  let user = Auth.user;
  try { user = (await Auth.api('/api/auth/me')).user; Auth.setUser(user); }   // refresh; clears the token if it expired
  catch (ex) { if (ex.status === 401) return location.reload(); }
  $('logged-out').hidden = true; $('logged-in').hidden = false;
  $('auth-title').textContent = 'Your account';
  $('acc-name').textContent = user.username; $('acc-email').textContent = user.email;
  if (user.accountId) {
    $('acc-claim').innerHTML = `<a href="player.html?id=${user.accountId}">Account ${user.accountId}</a>`;
    $('unclaim').hidden = false;
    $('acc-hint').textContent = 'Open any other player and press Compare to see them next to your claimed profile.';
    Auth.api(`/api/players/${user.accountId}/steam`).then(d => {
      const p = [].concat(d)[0];
      if (p?.personaname) $('acc-claim').firstChild.textContent = `${p.personaname} (${user.accountId})`;
    }).catch(() => {});
  }
}
$('logout').onclick = () => { Auth.clear(); location.href = 'index.html'; };
$('unclaim').onclick = async () => {
  try { Auth.setUser((await Auth.api('/api/auth/me', { method: 'PUT', body: { accountId: null } })).user); location.reload(); }
  catch (ex) { $('acc-hint').textContent = ex.message; }
};

if (Auth.token) showAccount();
