export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/playground/:path*', '/tune/:path*', '/settings/:path*'],
};
