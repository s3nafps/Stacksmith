import { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { assertProductionEnv, env, isEnabled } from '@/lib/env';

assertProductionEnv();

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [
    isEnabled('ENABLE_DEMO_AUTH')
      ? Credentials({
          name: 'Demo Account',
          credentials: {},
          async authorize() {
            return {
              id: 'mock-user-id',
              name: 'Demo Architect',
              email: 'demo@stacksmith.local',
              image: 'https://avatars.githubusercontent.com/u/9919?v=4',
            };
          },
        })
      : GitHub({
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        }),
  ],
  pages: {
    signIn: '/login',
  },
};
