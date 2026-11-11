import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import { WebView } from 'react-native-webview';
import { marketplaceHTML } from '@/generated/market-html';

/** Native shell for the same complete offline frontend used in browsers. */
export default function NativeLayout() {
  const web = useRef<WebView<{}>>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const keyboard = (open: boolean) => web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('market-native-keyboard',{detail:${open}}));true;`);
    const show = Keyboard.addListener('keyboardDidShow', () => keyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => keyboard(false));
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      web.current?.injectJavaScript(`window.ReactNativeWebView.postMessage(JSON.stringify({type:'back',handled:!!window.handleAndroidBack?.()}));true;`);
      return true;
    });
    return () => { subscription.remove(); show.remove(); hide.remove(); };
  }, []);
  const openExternal = (url: string) => {
    if (/^(https?:|tel:|mailto:|whatsapp:)/i.test(url)) void Linking.openURL(url).catch(() => setError('This link could not be opened on this device.'));
  };
  return <SafeAreaProvider><SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView behavior="padding" style={styles.web}>
    <WebView<{}> ref={web} style={styles.web} source={{ html: marketplaceHTML, baseUrl: 'https://agromitra.local/' }}
      originWhitelist={['*']} mixedContentMode={__DEV__ ? 'always' : 'never'} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback
      automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" removeIosKeyboardObserver
      onShouldStartLoadWithRequest={request => {
        if (request.url.startsWith('https://agromitra.local/') || request.url === 'about:blank' || request.url.startsWith('data:') || request.url.startsWith('blob:')) return true;
        openExternal(request.url); return false;
      }}
      onOpenWindow={event => openExternal(event.nativeEvent.targetUrl)}
      onError={() => setError('The offline marketplace could not load. Restart the app.')}
      onMessage={event => {
        try {
          const message = JSON.parse(event.nativeEvent.data);
          if (message.type === 'back' && !message.handled) BackHandler.exitApp();
          if (message.type === 'print' && typeof message.html === 'string') void Print.printAsync({ html: message.html }).catch(() => setError('Printing was cancelled or unavailable.'));
        } catch { setError('The device action could not be completed.'); }
      }} />
    </KeyboardAvoidingView>
    {!!error && <View style={styles.error}><Text onPress={() => setError('')}>{error}</Text></View>}
  </SafeAreaView></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafbf7' },
  web: { flex: 1, backgroundColor: '#fafbf7' },
  error: { padding: 12, backgroundColor: '#f8e9dc' },
});
