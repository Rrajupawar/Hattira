// index.ts (project root)
import 'react-native-url-polyfill/auto'; // ← first line
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);