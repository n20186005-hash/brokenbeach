(() => {
  const KEY='brokenbeach-cookie-preferences', DENY='brokenbeach-analytics-denied', MARK='|brokenbeach-analytics-denied|', ID='G-HXM22WWPKP';
  function denied(){try{if(sessionStorage.getItem(DENY)==='1')return true;}catch{}try{return window.name.includes(MARK);}catch{return false;}}
  function markDeny(value){try{value?sessionStorage.setItem(DENY,'1'):sessionStorage.removeItem(DENY);}catch{}try{window.name=window.name.split(MARK).join('')+(value?MARK:'');}catch{}}
  function read(){
    if(denied())return null;
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'null');
      // A stale stored grant must not revive while writes are blocked.
      localStorage.setItem(KEY+'-write-check','1');localStorage.removeItem(KEY+'-write-check');
      return saved && typeof saved.analytics==='boolean'?saved:null;
    }catch{return null;}
  }
  function apply(grant){
    window['ga-disable-'+ID]=!grant;
    if(!grant){window.gtag?.('consent','update',{analytics_storage:'denied'});return;}
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('consent','update',{analytics_storage:'granted'});
    if(document.getElementById('brokenbeach-ga4'))return;
    const script=document.createElement('script');script.id='brokenbeach-ga4';script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ID;document.head.appendChild(script);
    window.gtag('js',new Date());window.gtag('config',ID,{allow_google_signals:false,allow_ad_personalization_signals:false});
  }
  function save(analytics){
    analytics=analytics===true;markDeny(!analytics);apply(analytics);
    try{localStorage.setItem(KEY,JSON.stringify({analytics}));return true;}catch{return false;}
  }
  window.brokenbeachConsent={read,save};
  const saved=read();apply(saved?.analytics===true);
  const status=document.getElementById('cookie-status');const lang=document.documentElement.lang==='en'?'en':'id';
  function choose(value){const stored=save(value);if(status)status.textContent=lang==='id'?(stored?'Pilihan disimpan.':value?'Analitik diizinkan di halaman ini; pilihan tidak dapat disimpan.':'Analitik ditolak sekarang; pilihan tidak dapat disimpan untuk tab/browser baru.'):(stored?'Choice saved.':value?'Analytics allowed on this page; the choice could not be saved.':'Analytics refused now; the choice could not be saved for new tabs/browsers.');}
  document.getElementById('accept-analytics')?.addEventListener('click',()=>choose(true));
  document.getElementById('decline-analytics')?.addEventListener('click',()=>choose(false));
})();
