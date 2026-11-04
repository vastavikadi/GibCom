export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/ask/:path*',
    '/explore/:path*',
    '/teach/:path*',
    '/insights/:path*',
    '/actions/:path*',
    '/admin/:path*',
  ],
};

