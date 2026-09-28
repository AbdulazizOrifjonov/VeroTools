// Polyfills first: Intl.PluralRules is required by i18next plurals and is missing on some Hermes builds.
import 'intl-pluralrules';
import { registerRootComponent } from 'expo';
import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App) and sets up the
// environment for Expo Go as well as native builds.
registerRootComponent(App);
