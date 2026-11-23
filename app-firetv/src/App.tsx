// App pomniii para Fire TV (Vega): abre el Salón de juegos a pantalla completa.
// Los juegos van dentro de la app (assets/juegos, copiados al fabricarla), así
// que arranca al momento y se juega con el mando del Stick aunque no haya red.
// El mando del móvil usa la sala de Cloudflare cuya dirección va en config.js.
import {WebView} from '@amazon-devices/webview';
import * as React from 'react';
import {useEffect, useRef} from 'react';
import {BackHandler, View, StyleSheet} from 'react-native';
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from '@amazon-devices/react-native-kepler';
import {
  WebViewErrorEvent,
  WebViewMessageEvent,
  WebViewNavigationEvent,
} from '@amazon-devices/webview/dist/types/WebViewTypes';

// El botón Atrás del mando se lo pasamos al salón (abre la pausa, vuelve al
// menú…). Cuando ya está en el menú principal, el salón pide cerrar la app.
const ATRAS =
  "try{Salon.entrada({fuente:'tv',tipo:'tecla',accion:'atras',estado:'abajo'})}catch(e){};true;";

export const App = () => {
  const webRef = useRef<any>(null);
  usePreventHideSplashScreen();
  const hideSplashScreenCallback = useHideSplashScreenCallback();

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      webRef.current?.injectJavaScript(ATRAS);
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        style={styles.webview}
        allowSystemKeyEvents
        allowsDefaultMediaControl
        domStorageEnabled
        hasTVPreferredFocus
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        source={{uri: 'file:///pkg/assets/juegos/index.html'}}
        onLoad={(_event: WebViewNavigationEvent) => hideSplashScreenCallback()}
        onMessage={(event: WebViewMessageEvent) => {
          if (event.nativeEvent.data === 'salir') {
            BackHandler.exitApp();
          }
        }}
        onError={({nativeEvent: {code, url, description}}: WebViewErrorEvent) => {
          console.error(`[pomniii] (${code}: ${url}) ${description}`);
          hideSplashScreenCallback();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0d0a12'},
  webview: {backgroundColor: '#0d0a12'},
});
