package com.soxlo.messenger;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private PermissionRequest pendingWebPermission;
    private static final int MEDIA_PERMISSION_REQUEST = 42;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(false);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " SOXLO-Messenger-Android/2.0");

        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!request.getOrigin().toString().startsWith("https://soxlo-production.github.io")) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                            && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.getResources());
                    } else {
                        pendingWebPermission = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, MEDIA_PERMISSION_REQUEST);
                    }
                });
            }
        });

        webView.loadUrl("https://soxlo-production.github.io/Soxlo-Production/messenger.html?android=1");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MEDIA_PERMISSION_REQUEST && pendingWebPermission != null) {
            boolean granted = grantResults.length > 0;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    granted = false;
                    break;
                }
            }
            if (granted) pendingWebPermission.grant(pendingWebPermission.getResources());
            else pendingWebPermission.deny();
            pendingWebPermission = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
