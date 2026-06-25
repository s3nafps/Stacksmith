import { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [
    process.env.MOCK_GITHUB === 'true'
      ? Credentials({
          name: 'Demo Account',
          credentials: {},
          async authorize() {
            // Return mock user for edge runtime routing compatibility
            return {
              id: 'mock-user-id',
              name: 'Demo Architect',
              email: 'demo@infrapack.dev',
              image: 'https://avatars.githubusercontent.com/u/9919?v=4',
            };
          },
        })
      : GitHub({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
  ],
  pages: {
    signIn: '/login',
  },
};
