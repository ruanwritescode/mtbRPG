import './styles.css';
import { App } from './ui/app';

const app = new App(document.getElementById('app')!);
// A handle for poking at the game from the console or a test script.
(window as unknown as { mtbrpg: App }).mtbrpg = app;
