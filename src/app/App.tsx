import { lazy, Suspense } from 'react';
import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import { cleanupUrl, handleOAuthCallback } from '@/external/deriv-core';
import ChunkLoader from '@/components/loader/chunk-loader';
import LocalStorageSyncWrapper from '@/components/localStorage-sync-wrapper';
import RoutePromptDialog from '@/components/route-prompt-dialog';
import { useAccountSwitching } from '@/hooks/useAccountSwitching';
import { useLanguageFromURL } from '@/hooks/useLanguageFromURL';
import { StoreProvider } from '@/hooks/useStore';
import { isPreviewMode, PREVIEW_BASE_PATH } from '@/utils/is-preview-mode';
import { localize, TranslationProvider } from '@deriv-com/translations';
import CoreStoreProvider from './CoreStoreProvider';
import i18nInstance from './i18n';
import './app-root.scss';

const Layout = lazy(() => import('../components/layout'));
const AppRoot = lazy(() => import('./app-root'));
const LandingPage = lazy(() => import('../pages/landing/landing'));

const LanguageHandler = ({ children }: { children: React.ReactNode }) => {
    useLanguageFromURL();
    return <>{children}</>;
};

const AppProviders = ({ children }: { children: React.ReactNode }) => (
    <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
        <LanguageHandler>
            <StoreProvider>
                <LocalStorageSyncWrapper>
                    <RoutePromptDialog />
                    <CoreStoreProvider>{children}</CoreStoreProvider>
                </LocalStorageSyncWrapper>
            </StoreProvider>
        </LanguageHandler>
    </TranslationProvider>
);

const AppShell = () => (
    <Suspense fallback={<ChunkLoader message={localize('Please wait while we connect to the server...')} />}>
        <AppProviders>
            <Layout />
        </AppProviders>
    </Suspense>
);

const LandingShell = () => (
    <Suspense fallback={<ChunkLoader message={localize('Loading SilverBulletFX...')} />}>
        <LandingPage />
    </Suspense>
);

const routerBasename = isPreviewMode() ? PREVIEW_BASE_PATH : undefined;

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            {/* Public marketing landing page. The trading workspace is intentionally separated at /app. */}
            <Route path='/' element={<LandingShell />} />

            {/* Main SilverBulletFX workspace. Existing dashboard/bot-builder behaviour is preserved here. */}
            <Route path='/app' element={<AppShell />}>
                <Route index element={<AppRoot />} />
            </Route>

            {/* App Builder preview keeps the existing /preview entry point. */}
            <Route path='/preview' element={<AppShell />}>
                <Route index element={<AppRoot />} />
            </Route>
        </>
    ),
    { basename: routerBasename }
);

function App() {
    useAccountSwitching();

    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('code')) return;

        const handleCallback = async () => {
            try {
                const authInfo = await handleOAuthCallback(window.location.href, {
                    clientId: process.env.NEXT_PUBLIC_DERIV_APP_ID || '',
                    redirectUri: window.location.origin,
                    scopes: 'trade',
                });

                const { DerivWSAccountsService } = await import('@/services/derivws-accounts.service');
                const accounts = await DerivWSAccountsService.fetchAccountsList(authInfo.access_token);

                if (accounts && accounts.length > 0) {
                    DerivWSAccountsService.storeAccounts(accounts);
                    const firstAccount = accounts[0];
                    localStorage.setItem('active_loginid', firstAccount.account_id);
                    const isDemo =
                        firstAccount.account_id.startsWith('VRT') || firstAccount.account_id.startsWith('VRTC');
                    localStorage.setItem('account_type', isDemo ? 'demo' : 'real');

                    const { api_base } = await import('@/external/bot-skeleton');
                    await api_base.init(true);
                    window.location.replace('/app#dashboard');
                } else {
                    console.error('No accounts returned after authentication');
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
            } finally {
                cleanupUrl(window.location.origin);
            }
        };

        handleCallback();
    }, []);

    return <RouterProvider router={router} />;
}

export default App;
