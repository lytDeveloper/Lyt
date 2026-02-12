export default ({ config }) => {
    return {
        ...config,
        extra: {
            ...config.extra,
            webviewUrl: process.env.EXPO_PUBLIC_WEBVIEW_URL || 'https://bridge-app-git-staging-culgamyuns-projects.vercel.app?_vercel_share=KIqK99rjkimOEdLxPzVE9k7A1sQGDP9w',
        },

    };
};
