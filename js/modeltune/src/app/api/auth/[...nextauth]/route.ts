import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import { Adapter } from 'next-auth/adapters';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

import { PrismaClient } from '@js/db';

const prisma = new PrismaClient();

const handler = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // }),
    GithubProvider({
      clientId: 'c0c4b8d025577fb4ceed',
      clientSecret: 'f9af17776c0ed922da2267d7ae0abe0b42dc3da1',
    }),
  ],
});

export { handler as GET, handler as POST };
