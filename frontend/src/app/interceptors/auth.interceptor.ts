import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  // 永遠開啟 withCredentials 以支援後端 Session
  let clonedReq = req.clone({ withCredentials: true });

  // 有 token 才加上 Authorization Header
  if (token && token !== 'undefined') {
    clonedReq = clonedReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(clonedReq);
};
