import { RouteRecordRaw } from 'vue-router';

const routes: readonly RouteRecordRaw[] = [
    {
      path: '/',
      component: async () => (await import('src/app/layouts/Main')).MainLayout,
      children: [
        {
            name: 'Device',
            path: '',
            component: async () => (await import('pages/Device')).DevicePage
        }
        ]
    },
    
    // Always leave this as last one,
    // but you can also remove it
    {
        path: '/:catchAll(.*)*',
        component: async () => (await import('pages/ErrorNotFound')).ErrorNotFoundPage,
        meta: {
            canLoadWithoutFlipper: true
        }
    }
];

export default routes;