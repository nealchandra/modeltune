export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!about|contact|sales|login|api/inngest).{1,})'],
};
