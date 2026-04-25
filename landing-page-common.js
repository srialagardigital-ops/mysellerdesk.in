/* MySellerDesk auth + routing helpers */
(function(){
  const cfg = window.SELLERDESK_CONFIG || {};
  function trimSlash(v){ return (v || '').replace(/\/$/, ''); }

  window.getSiteUrl = function(){
    return trimSlash(cfg.SITE_URL || window.location.origin);
  };

  window.getAppUrl = function(){
    return trimSlash(cfg.APP_URL || window.location.origin);
  };

  window.getDashboardUrl = function(params){
    const base = getAppUrl() + (cfg.DASHBOARD_PATH || '/index.html');
    if(!params) return base;
    const url = new URL(base, window.location.href);
    Object.keys(params).forEach(function(key){
      if(params[key] !== undefined && params[key] !== null && params[key] !== ''){
        url.searchParams.set(key, params[key]);
      }
    });
    return url.toString();
  };

  window.redirectToDashboard = function(payload){
    const target = getDashboardUrl(payload || {});
    window.location.href = target;
  };
})();

function openModal(tab){
  document.getElementById('authModal').classList.add('show');
  switchTab(tab || 'login');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal(){
  document.getElementById('authModal').classList.remove('show');
  document.body.style.overflow = '';
  var err = document.getElementById('login-error');
  if(err) err.style.display = 'none';
}

function closeModal(id){
  if(id){
    var el = document.getElementById(id);
    if(el) el.classList.remove('show');
  } else {
    closeAuthModal();
  }
}

function switchTab(tab){
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.modal-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  var err = document.getElementById('login-error');
  if(err) err.style.display = 'none';
}

/* ── FIXED: Cookie-based storage so session works across subdomains ── */
function getSupabaseClient(){
  const cfg = window.SELLERDESK_CONFIG || {};
  if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
    console.error('MySellerDesk: SUPABASE_URL or SUPABASE_ANON_KEY missing in landing-page-config.js');
    return null;
  }

  const cookieAdapter = {
    getItem(key){
      const match = document.cookie.split('; ').find(r => r.startsWith(key + '='));
      return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
    },
    setItem(key, value){
      const exp = new Date(Date.now() + 7*24*60*60*1000).toUTCString();
      document.cookie = key+'='+encodeURIComponent(value)+'; Expires='+exp+'; Path=/; Domain=.mysellerdesk.in; SameSite=Lax; Secure';
    },
    removeItem(key){
      document.cookie = key+'=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=.mysellerdesk.in';
      document.cookie = key+'=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
    }
  };

  return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      storageKey: 'sd_supabase_auth',
      storage: cookieAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

async function handleLogin(){
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errDiv = document.getElementById('login-error');

  if(!email || !pass){
    errDiv.textContent = 'Enter email & password';
    errDiv.style.display = 'block';
    return;
  }

  const client = getSupabaseClient();
  if(!client){
    errDiv.textContent = 'Configuration error. Please contact support.';
    errDiv.style.display = 'block';
    return;
  }

  const btn = document.querySelector('#panel-login .btn-modal-primary');
  if(btn){ btn.textContent = 'Logging in\u2026'; btn.disabled = true; }

  const { data, error } = await client.auth.signInWithPassword({ email, password: pass });

  if(btn){ btn.textContent = 'Log in to MySellerDesk'; btn.disabled = false; }

  if(error){
    errDiv.textContent = error.message;
    errDiv.style.display = 'block';
    return;
  }

  const user = data.user;

  /* try to fetch shop_name from profiles */
  const { data: profile } = await client
    .from('profiles')
    .select('shop_name, plan')
    .eq('id', user.id)
    .single();

  if(profile && profile.shop_name){
    sessionStorage.setItem('sd_shop_name', profile.shop_name);
  }

  window.location.href = getDashboardUrl({ auth:'1', email: user.email });
}

async function handleSignup(){
  const shop  = document.getElementById('signup-shop').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;

  if(!shop || !email || !pass){
    alert('Please fill all fields');
    return;
  }
  if(pass.length < 8){
    alert('Password must be at least 8 characters');
    return;
  }

  const client = getSupabaseClient();
  if(!client){
    alert('Configuration error. Please contact support.');
    return;
  }

  const btn = document.querySelector('#panel-signup .btn-modal-primary');
  if(btn){ btn.textContent = 'Creating account\u2026'; btn.disabled = true; }

  const { data, error } = await client.auth.signUp({ email, password: pass });

  if(btn){ btn.textContent = 'Create Free Account \u2192'; btn.disabled = false; }

  if(error){
    alert(error.message);
    return;
  }

  const user = data.user;

  /* Supabase returns session=null when email confirmation is ON */
  if(!data.session){
    closeAuthModal();
    alert('\u2705 Account created! Please check your email to confirm your address, then log in.');
    sessionStorage.setItem('sd_pending_shop', shop);
    return;
  }

  /* insert profile */
  const { error: profileError } = await client.from('profiles').insert({
    id: user.id,
    shop_name: shop,
    email: email
  });

  if(profileError && profileError.code !== '23505'){
    console.warn('Profile insert error:', profileError.message);
  }

  sessionStorage.setItem('sd_shop_name', shop);

  window.location.href = getDashboardUrl({ auth:'1', email, shop });
}
