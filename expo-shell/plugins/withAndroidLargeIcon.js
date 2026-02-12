const { withDangerousMod, withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SERVICE_NAME = 'CustomFirebaseMessagingService';

const serviceFileContent = `package com.jhcol.bridgeshell;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class CustomFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        if (remoteMessage.getNotification() != null) {
            String title = remoteMessage.getNotification().getTitle();
            String body = remoteMessage.getNotification().getBody();
            Map<String, String> data = remoteMessage.getData();
            showNotificationWithLargeIcon(title, body, data);
        } else {
             super.onMessageReceived(remoteMessage);
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }

    private void showNotificationWithLargeIcon(String title, String body, Map<String, String> data) {
        String channelId = data.containsKey("channelId") ? data.get("channelId") : "default";

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Default Channel",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Default notification channel");
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        int largeIconResId = getResources().getIdentifier("notification_icon_large", "drawable", getPackageName());
        Bitmap largeIcon = null;
        if (largeIconResId != 0) {
            largeIcon = BitmapFactory.decodeResource(getResources(), largeIconResId);
        } else {
            largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        }

        Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (intent != null) {
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            for (Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }

        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                (int) System.currentTimeMillis(),
                intent,
                pendingIntentFlags
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(getResources().getIdentifier("notification_icon_small", "drawable", getPackageName()))
                .setLargeIcon(largeIcon)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(pendingIntent);

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }
}
`;

// Add Firebase Messaging dependency to build.gradle
const withFirebaseDependency = (config) => {
    return withAppBuildGradle(config, (config) => {
        const contents = config.modResults.contents;

        // Check if dependency already exists
        if (!contents.includes('com.google.firebase:firebase-messaging')) {
            // Add to dependencies block
            const dependenciesRegex = /dependencies\s*\{/;
            if (dependenciesRegex.test(contents)) {
                config.modResults.contents = contents.replace(
                    dependenciesRegex,
                    `dependencies {
    implementation("com.google.firebase:firebase-messaging:24.0.0")`
                );
            }
        }

        return config;
    });
};

const withCustomFirebaseService = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const packagePath = config.android.package.replace(/\./g, path.sep);
            const destPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath, `${SERVICE_NAME}.java`);

            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, serviceFileContent);

            // Copy large icon
            const iconSrcPath = path.join(projectRoot, 'assets', 'notification-icon-large.png');
            const iconDestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable', 'notification_icon_large.png');

            fs.mkdirSync(path.dirname(iconDestPath), { recursive: true });

            if (fs.existsSync(iconSrcPath)) {
                fs.copyFileSync(iconSrcPath, iconDestPath);
            } else {
                console.warn('Large icon not found at ' + iconSrcPath);
            }

            return config;
        },
    ]);
};

const withCustomManifest = (config) => {
    return withAndroidManifest(config, async (config) => {
        const mainApplication = config.modResults.manifest.application[0];
        const service = {
            $: {
                'android:name': '.CustomFirebaseMessagingService',
                'android:exported': 'false',
            },
            'intent-filter': [
                {
                    action: [
                        {
                            $: {
                                'android:name': 'com.google.firebase.MESSAGING_EVENT',
                            },
                        },
                    ],
                },
            ],
        };

        if (!mainApplication.service) {
            mainApplication.service = [];
        }

        const exists = mainApplication.service.some(s => s.$['android:name'] === '.CustomFirebaseMessagingService');
        if (!exists) {
            mainApplication.service.push(service);
        }

        return config;
    });
};

module.exports = (config) => {
    config = withFirebaseDependency(config);
    config = withCustomFirebaseService(config);
    config = withCustomManifest(config);
    return config;
};
