export function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
}

export function jfetch(url, opts) {
  return fetch(url, Object.assign({
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  }, opts || {})).then(function(res){
    if (!res.ok) return res.json().then(function(j){ throw new Error(j.error || 'Request failed'); });
    return res.json();
  });
}
