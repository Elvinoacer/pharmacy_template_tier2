// Runs before paint; storage can be unavailable in privacy-restricted browsers.
export const themeBootstrap = `(function(){try{var m=localStorage.getItem('aether-theme')||localStorage.getItem('aether-admin-theme');var d=m==='dark'||(m!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.adminTheme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})()`;

