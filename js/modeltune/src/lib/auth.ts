import { PrismaAdapter } from '@auth/prisma-adapter';
import { DefaultSession, NextAuthOptions } from 'next-auth';
import { Adapter } from 'next-auth/adapters';
import EmailProvider from 'next-auth/providers/email';
import GithubProvider from 'next-auth/providers/github';

import { prisma } from '@js/db';

import { sendVerificationRequest } from './mailer';

export type User = DefaultSession['user'];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    EmailProvider({
      name: 'email',
      server: '',
      from: 'modeltune@resend.dev',
      sendVerificationRequest,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),
  ],
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    redirect: ({ url, baseUrl }) => {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return url;
    },
  },
};
